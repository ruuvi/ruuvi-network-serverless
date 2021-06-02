#!/bin/bash
if [ $# -eq 0 ]
then
  RSTAGE=dev
else
  RSTAGE=$1
fi
STAGE=$RSTAGE IS_INTEGRATION_TEST=true jest --bail

date
