import os
import requests

url = 'http://localhost:3000/api/'
data = './data'

session = requests.Session()
response = session.post(url+'login', data={'username': 'nikhil', 'password': 'nikhil@123'})
print(response.text)
response = session.post(url+'download', data={'path': '/wow/real.pdf'})
f = open('new.pdf', 'wb+');
f.write(response.content);
response = session.get(url+'logout')
print(response.text)
