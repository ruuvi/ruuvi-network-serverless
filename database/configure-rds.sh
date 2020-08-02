#!/bin/bash
aws rds modify-db-cluster \
    --db-cluster-identifier "ruuvi-main" \
    --enable-iam-database-authentication \
    --apply-immediately \
    --profile ruuvi