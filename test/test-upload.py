import os
import requests
import mimetypes

url = 'http://localhost:3000/api/'
data = './data'

try:
    session = requests.Session()
    response = session.post(url+'login', data={'username': 'nikhil', 'password': 'nikhil@123'})
    print(response.text)
    response = session.post(url+'create', data={'path': '/wow'})
    print(response.text)
    response = session.post(url+'upload/file', files={'file': ('document.pdf', open('./data/iitb/document.pdf', 'rb'), mimetypes.guess_type('./data/iitb/document.pdf')[0])}, data={'path': '/wow/real.pdf'})
    print(response.text)
    response = session.get(url+'logout')
    print(response.text)
except:
    print("An error occured")
