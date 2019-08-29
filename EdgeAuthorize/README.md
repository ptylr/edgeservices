# EdgeAuthorize
A Lambda, executed upon CloudFront's "Origin Request" behaviour, to check for the presence of a password configuration
file within the root of the S3 origin, providing Basic Authentication as instructed.

![EdgeAuthorize Sequence Diagram](https://ptylr.com/img/repos/edgeauthorize-sequence-diagram.png "EdgeAuthorize Sequence Diagram")

## Why?
I have a use-case, where I need to have a customer manage the usernames and passwords that are used for Basic
Authentication, by deploying a file to the one place that they have access (the origin). I want a single Lambda
function, without needing to deploy new versions each time the usernames and passwords change.

## Knowns
* Each request makes a plain-text (HTTP) request within the Amazon network to the S3 origin, in order to locate and read
configuration information - therefore, it is _not_ safe to use a non-Amazon origin;
* As each request makes the request back to the S3 origin, there is a latency in fetching the file. Although some
re-hydrating of existing containers in Lambda does exist, this is not documented - you should load test your implementation to see whether this is a suitable solution for you;
* The Lambda is designed to be called upon "Origin Request", which means that the response can be cached in CloudFront.
Whitelisting the "Authorization" header on the request, and using as a cache-key should prevent unauthorized access - however, this should be thoroughly tested.

## Deployment
1) Create a new Lambda Function, using the latest version of Node.js (I used 10.x at the time of writing);
2) Ensure the Lambda can execute at with the required permissions. I use the following policy via IAM:
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
3) Deploy a new version to Lambda@Edge;
4) Configure "Origin Request" Behaviour to call ARN of Lambda, with the current version;
5) Deploy /password.json within your S3 Bucket. See the example below (username, password):
    ```
    {
        "authorized": {
            "ptylr1": "ptylr1",
            "ptylr2": "ptylr2"
        }
    }
    ```
6) Browse to your newly protected resource(s).

## License
All yours. MIT License. Do what you will, at your own risk!