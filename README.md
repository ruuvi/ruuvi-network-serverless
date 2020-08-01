# Ruuvi Network (Serverless)

Completely serverless implementation of the Ruuvi Network.

![Ruuvi Network Serverless Architecture](/doc/serverless.png)

## Installation

1. Clone the respository (`git clone git@github.com:Muhwu/ruuvi-network-serverless.git`)
2. Install the Serverless Framework (https://www.serverless.com/framework/docs/providers/aws/guide/installation/)
3. Set AWS Credentials in ~/.aws/credentials (Profile `ruuvi` by default; can be found in AWS "My Security Credentials")
```
[ruuvi]
aws_access_key_id=<Your access key>
aws_secret_access_key=<Your secret access key>
region=eu-central-1
```
4. Run `serverless deploy`

If everything is set up correctly, it will update the stack to match the state in the cloned repository.

Note! This has not yet been tested with multiple points of deployment.

Enjoy!

## Current Status

### Receiver
- [ ] CloudFront for Throttling
- [x] API Gateway forwards payloads to Receiver Lambda
- [ ] Receiver Lambda authorizes request
- [x] Receiver Lambda validates request (rudimentary)
- [x] Receiver relays data to SQS

### Writer
- [x] Reader Lambda reads from SQS
- [x] Reader Lambda writes to DynamoDB

### Client API
- [ ] Register User
- [ ] Claim RuuviTag
- [x] Read Sensor Data (currently authorized with static Bearer string)
- [ ] Advanced querying (by Date / etc)

### Cleaners / Archivers
- [ ] Lambda to archive to S3
