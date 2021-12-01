#!/bin/bash
#sudo apt update
#sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
#curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
#sudo apt -y install nodejs
#sudo apt -y  install gcc g++ make
#node --version
#npm --version
#sudo npm i --save-dev

# Global Tooling
if [ "$1" == "--include-serverless" ]; then
	sudo npm i -g jest@26.6.3
	sudo npm i -g serverless@2.48.0
fi
