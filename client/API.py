import sys, os, requests, spcUtil, mimetypes
data = spcUtil.getData()

tempDir = data["tempDir"]
obsDir = data["obsDir"]

def relpath(path1, path2):
	ans = os.path.relpath(path1, path2)
	return "/" if ans=="." else "/" + ans

def checkUrl(url):
	session = authenticate()
	while not session.get( data['url'] +"/api/status", verify=True).json()['success']=="true":
		url = input("incorrect url, please check again")
	return url

def authenticate():
	print("Authenticating...")
	session = requests.Session()
	if session.post(data['url']+'/api/login', verify=True, data={'username': data['uname'], 'password': data['passwd']}).json()['success']:
		print("Authentication Successful")
		return session


def ls(folder, session):
	lst = session.post(data['url'] + '/api/list', verify=True, data = {"path": relpath(folder, obsDir)})
	return lst

def create(folder, session):
	print("Creating directory %s at server"%relpath(folder, obsDir))
	return session.post(data['url'] + '/api/create', verify=True, data={'path': relpath(folder, obsDir)})

#***********************************save files at appropriate
def download(filename, session):
	#Will return data of file
	print("downloading "+ filename)
	content = session.post(data['url'] + '/api/download', verify=True, data={"path": relpath(filename, obsDir)}).content
	file = open(tempDir + relpath(filename, obsDir), "wb")
	file.write(content)
	file.close()

#****************************************************

def upload_file(filename, session):
	print("uploading" + filename)
	file = open(tempDir + relpath(filename, obsDir), "rb")
	session.post(data['url'] + '/api/upload/file', verify=True,files = {'file': (relpath(filename, obsDir), file, mimetypes.guess_type(filename)[0])} ,data={"path": relpath(filename, obsDir)})
	file.close()

def remove(path, session):
	print("removing %s from server"%path)
	session.post(data['url'] + '/api/remove', verify=True, data={"path": relpath(path, obsDir)})

# *********************tobe checked what exactly does file Hash return
def fileHash(path, session):
	# print(relpath(path))
	return session.post(data['url'] + '/api/hash', verify=True, data={"path": relpath(path, obsDir)}).json()["hash"]
# *****************************************************
def walkServer(path, func, session):
	nodes = ls(path, session).json()['data']
	nodes = list(zip(nodes[0], nodes[1]))

	for typ, node in nodes:
		if typ == 0 and node:
			walkServer(path+"/"+node, func, session)
		else:
			func(path+"/"+node)



def lockSync(session):
	return session.post(data['url'] + '/api/lock/freeze', verify=True).json()['lock']

def unlockSync(session):
	session.post(data['url'] + '/api/lock/revoke', verify=True)
