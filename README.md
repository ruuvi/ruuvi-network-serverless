# Ruuvi Network (Serverless)

Completely serverless implementation of the Ruuvi Network.

![Ruuvi Network Serverless Architecture](/doc/serverless.png)

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
