#!/bin/bash

# Runs a spec on all targets

LOG_FILE=stress.log

if [ $# -eq 1 ]; then
	SPEC=$1

	echo "STARTING STRESS TEST WITH CONFIGURATION" >> $LOG_FILE
	cat $SPEC >> $LOG_FILE
	echo "" >> $LOG_FILE

	echo "KALTIOT" >> $LOG_FILE 
	./run.sh "$SPEC" "targets/kaltiot.json" >> $LOG_FILE
	echo "" >> $LOG_FILE
	echo "WHEREOS" >> $LOG_FILE 
	./run.sh "$SPEC" "targets/whereos.json" >> $LOG_FILE
	echo "" >> $LOG_FILE
	echo "MUHWU" >> $LOG_FILE 
	./run.sh "$SPEC" "targets/muhwu.json" >> $LOG_FILE
else
	echo "Usage: ./run_all.sh SPEC"
	exit -1
fi

echo "All done. View $LOG_FILE for results."
