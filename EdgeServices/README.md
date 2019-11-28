# EdgeServices - A Pair of Lambda@Edge Functions for Executing Common Operations on Request
A pair of Lambda Functions:

 * OriginRequest - Executed upon CloudFront's "Origin Request" behaviour, to modify requests for certain conditions,
 such as checking for authorization, adding a default document, restricting certain folders, rewrites and redirects;
 * OriginResponse - Executed upon CloudFront's "Origin Response" behaviour, to modify responses for certain conditions,
 such as mapping errors to new content and/or adding headers.
 
![EdgeServices Sequence Diagram](https://ptylr.com/img/repos/edgeservices-sequence-diagram.png "EdgeServices Sequence Diagram")

## Why?
Moving a complex server-side application into the cloud requires new solutions to things that were previously solved
via web.config, web.xml or .htaccess. This suite of Lambda@Edge functionality is intended, in conjunction with the OriginResponse
function, to meet those requirements, where the origin is an Amazon S3 Bucket.

## Deployment
1) Create two new Lambda Functions (OriginRequest and OriginResponse), using the latest version of Node.js (I used 10.x at the time of writing);
2) Ensure the Lambda Functions can execute with the required permissions. I use the following policy via IAM:
    ```
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                "Resource": [
                    "arn:aws:logs:*:*:*"
                ]
            }
        ]
    }
    ```
    
3) Deploy new versions to Lambda@Edge;
4) Configure "Origin Request" and "Origin Response" Behaviours to call the ARN of Lambda Functions, with the current version;
5) Add a `/config.json` file on your S3 origin;
6) Set Bucket Policy to allow access to your bucket and also to allow the HTTP Referer header with the name and Region of your
Lambda Functions (below is an example):
    ```
    {
        "Version": "2008-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity EVKCL8WKOLIUT"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::ptylr-com-s3bucket-16w98h5h9thdp/*"
            },
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::ptylr-com-s3bucket-16w98h5h9thdp/*",
                "Condition": {
                    "StringLike": {
                        "aws:Referer": [
                            "us-east-1.ptylr-com-OriginRequestLambdaFunction-AD7023KLJFUT",
                            "us-east-1.ptylr-com-OriginResponseLambdaFunction-133YYDV9TFHG"
                        ]
                    }
                }
            }
        ]
    }
    ```

7) Browse to your resource(s).

## Configuration
There are a number of options available for the `config.json` file:

1) `defaultDocument` can be used to request a default document where the url ends with `/`:
    ```
    {
        "defaultDocument": "index.html"
    }
    ```
2) `authorize` can be used to restrict access to the whole site, or to a selection of paths therein:
    ```
    {
        "authorize": {
            "paths": [
                "^/secure"
            ],
            "user1": "{Base64 Encoded Password}",
            "user2": "{Base64 Encoded Password}"
        }
    }
    ```
    If `paths` is not provided, or if the `request.uri` does not match any entries, no authorization is required. 
    Otherwise if no `Authorization` header is provided, or if the value does not match one of the supplied credentials, 
    the user will be required to enter credentials using HTTP 401 Basic authorization.
3) `restrictedPaths` can be used to forbid access to paths within the site, using regular expressions:
    ```
    {
        "restrictedPaths": [
            "/{Restricted File Path e.g., passwords.json}",
            "^/secret
        ]
    }
    ```
    If the `request.uri` matches any of the entries, `HTTP 403 Forbidden` will be returned to the user.
4) `rewrites` can be used to rewrite or redirect requests, using a syntax similar to a `.htaccess` file:
    ```
    "rewrites": [
        "^/original/$ /new/index.html [R=302,L]",
        ["%{REQUEST_PATH} !html?$ [NC]", "%{REQUEST_PATH} !-d", "%{REQUEST_PATH} !-f", "%{REQUEST_PATH}.html -f", "^(.*)$ $1.html [L]"],
        "^/oldpath/(\\d*)/(.*)$ /newpath/$2/$1 [L]",
        "^/topsecret.*$ [F,L]",
        "^/deadlink.*$ [G]",
        "^/foo$ /bar [H=^baz.com$]"
    ]
    ```
    Each entry is applied to the request, in order, and the result is applied to the request. The format is intended to closely match the `mod_rewrite` instruction set.
    
    If the entry is a single string, it must contain:
    * a test expression, which is tested against the `request.uri`;
    * a result expression which is applied to the `request.uri`;
    * an optional set of additional instructions to be applied.

    If the entry is an array, the final element in the array must be as for a string, above. The previous elements are conditions that are applied in order, and must all be successful for the final rule to be evaluated and applied. A condition contains:
    * an item to test - either `%{REQUEST_PATH}` or `%{HTTP_HOST}`;
    * a regular expression for the item to match
    * an optional set of additional instructions to be applied.

5) `errors` can be used to show friendly content when an http error status is returned:
    ```
    {
        "errors": {
            "403": { "url": "/404.html", "status": "404", "statusDescription": "Not Found", "headers": { "Content-Type": "text/html" } },
            "404": "/404.html",
            "500": "/500.html"
        }
    }
    ```
    If `response.status` matches a key in the `errors` object, that uri will be returned. If the uri includes a domain, it will be fetched directly. If not, the file will be loaded from the S3 origin. Try not to have that resource return an error as well, otherwise bad things will happen recursively.

    If the value is an array, the `url` property will be applied as above. The `status` and `statusDescription` properties can be used to change the status that will be returned to the client. Finally the `header` property allows for any additional headers to be set that will help the client to process the information that is sent.

6) `headers` can be used to add custom headers to a response:
    ```
    {
        "headers": [{
            "X-Custom": "Custom Value",
            "Access-Control-Allow-Origin": "*"
        },{
            "path": "\\.(jpe?g|gif|png)$",
            "Cache-Control": "public, max-age=31536001",
            "Access-Control-Allow-Origin": ""
        }]
    }
    ```
    Entries are applied in order.

    If the entry has no `path` variable, the headers will be added to all responses. If a path is supplied, it is tested against the `request.uri` and the headers applied if a match is found.

    All keys inside the `headers` object will be added to the response. If the value is `""` and the named response header is currently set, it will be removed from the response.

## Credit
ReWrite capability inspired by <a href="https://github.com/marksteele/edge-rewrite">marksteele/edge-rewrite</a>.

Written by <a href="https://github.com/richard-lund">Richard Lund</a> and <a href="https://github.com/ptylr">Paul Taylor</a>.

## License
All yours. MIT License. Do what you will, at your own risk!