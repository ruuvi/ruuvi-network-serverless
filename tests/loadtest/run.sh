#!/bin/bash

if [ $# -eq 2 ]; then
	SPEC=$1
	TARGET=$2

	node gatewayTest.js --target "$TARGET" --spec "$SPEC"
else
	echo "Usage: ./run_all.sh SPEC TARGET"
fi
