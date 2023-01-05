# MENTIONS
* We don't have a domain name, so our SSL certificates are not trusted, which means it is very easy to do a MITM attack. To be more secure, make sure manually that the key is same through a different network.
* To get new SSL certificates, run `./crt.sh`

# SETUP
```bash
# if no nodejs
sudo apt-get install nodejs npm
# if no nodemon
sudo npm i -g nodemon
# if no sqlite3
sudo apt-get install sqlite3
# setting up local dependencies
npm i
```

# RUN
```bash
npm start
```
