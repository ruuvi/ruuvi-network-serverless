#!/bin/bash

#https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash
for i in "$@"; do
  case $i in
    -s=*|--stage=*)
      RSTAGE="${i#*=}"
      shift # past argument=value
      ;;
    -*|--*)
      echo "Unknown option $i"
      exit 1
      ;;
    *)
      ;;
  esac
done

if [ -z ${RSTAGE+x} ];
then
    RSTAGE=dev
fi

STAGE=$RSTAGE IS_INTEGRATION_TEST=true jest --bail --runInBand --coverage

date
