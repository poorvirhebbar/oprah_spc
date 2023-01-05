#!/bin/bash
wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip
sudo apt-get install nodejs npm
sudo npm i -g nodemon
sudo apt-get install sqlite3
npm i
