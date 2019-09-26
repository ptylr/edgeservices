# EdgeAngular - A Lambda@Edge Function for URI rewriting in Angular Applications
A Lambda, executed upon CloudFront's "Origin Request" behaviour, to re-write requests for Angular Applications, where
an existing file qualification has not been supplied.

![EdgeAngular Sequence Diagram](https://ptylr.com/img/repos/edgeangular-sequence-diagram.png "EdgeAngular Sequence Diagram")

## Why?
A CloudFronted-S3 Bucket will not be able to route Angular requests correctly to /index.html. This Lambda@Edge Function
rewrites Angular URI paths against /index.html.

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
5) Browse to your resource(s) using SEO-optimised URIs.

## Credit
Thanks to <a href="https://github.com/richard-lund">Richard Lund</a> for the debugging & refactoring.

## License
All yours. MIT License. Do what you will, at your own risk!