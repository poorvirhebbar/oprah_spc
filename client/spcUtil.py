import sys, os, pickle, requests, hashlib, API

home = os.getenv("HOME")
loc = os.path.expanduser(home + "/.config/SPC")


'''expects data to be a dict'''
'''dumps the dictionary into a pickle file'''
## TODO: Case handling ##
def saveData(data):
	if isinstance(data, dict):
		storedData = {}
		try:
			file = open(loc + "/data.pickle","rb")
			storedData = pickle.load(file)
			file.close()
		except:
			pass

		if(isinstance(data,dict)):
			data = {**storedData, **data}

		file = open(loc + "/data.pickle","wb")
		pickle.dump(data,file)
		file.close()
	else:
		print("You fucked up once before, please give a dict")


'''returns the corrosponding option'''
'''returns the saves dictionary if no argument is provided'''
## TODO: Case handling ##
def getData(option = "all"):
	file = open(loc + "/data.pickle","rb")
	storedData = pickle.load(file)
	file.close()
	if(option == "all"):
		return storedData
	else:
		return storedData[option]


def clearData():
	file = open(loc + "/data.pickle", "wb")
	pickle.dump({}, file)
	file.close()


def walk(folder, func, TopDown = True):
	for root, dirs, files in os.walk(folder, topdown = TopDown):
		for file in files:
			func(root+"/"+file)


#it is sha256 sum, but I'm a comicbook nerd, so it's shazam
def shazam(filename):
    h = hashlib.sha256()
    with open(getData("tempDir") +"/"+API.relpath(filename, getData("obsDir")), 'rb', buffering=0) as f:
        for b in iter(lambda : f.read(128*1024), b''):
            h.update(b)
    return h.hexdigest()



def checkPass(uname, passwd):
	while not API.authenticate().json()["success"]=="true":
		print("Invalid Credentials, Please enter them again (press ^c to give up)")
		uname = input("Enter username again")
		passwd = input("Enter passwd again")
	return uname, passwd

def checkDir(dirname):
	while not os.path.exists(dirname):
		dirname = input("Incorrect path, enter path again")
	try:
		os.makedirs(dirname)
	except FileExistsError:
		pass
	return dirname

if __name__ == '__main__':
	walk(os.getcwd(), print)