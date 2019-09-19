# EdgeDefault - A Lambda@Edge Function for Default Document SEO-optimised/friendly URLs
A Lambda, executed upon CloudFront's "Origin Request" behaviour, to append a default document (index.html) to any
un-qualified request URI, allowing the display of SEO-optimised/friendly URIs.

![EdgeDefault Sequence Diagram](https://ptylr.com/img/repos/edgedefault-sequence-diagram.png "EdgeDefault Sequence Diagram")

## Why?
When configured correctly, using AWS Origin Access Identity policies, a CloudFronted-S3 Bucket, will not be configured
for static website hosting, and therefore will not be able to automatically convert un-qualified URIs (e.g. https://serverless.skunkworks.ptylr.com/bootstrap/) to SEO-optimised/
qualified ones (e.g. https://serverless.skunkworks.ptylr.com/bootstrap/index.html). This results in a poor end-user and
SEO experience.

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

## License
All yours. MIT License. Do what you will, at your own risk!