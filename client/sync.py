import sys, os, requests, argparse, API, spcUtil, time
sys.path.insert(0,os.path.expanduser("en-de"))
import encrypt, decrypt


obsDir = spcUtil.getData("obsDir")
tempDir = spcUtil.getData("tempDir")

def sendFile(filename, mode, forced,session):
	print("Sending Decision being made for "+ filename)
	# print(filename)
	#encrypt file
	encrypt.main(filename)
	#compute hash
	localHash = spcUtil.shazam(filename)
	serverHash = API.fileHash(filename, session)
#************************************************************************* *to be checked!
	if serverHash == False:
# ***************************************************************************8
		API.upload_file(filename, session)
	#if hash is different, ask what to do, overwrite server file or not
	elif localHash!=serverHash:
		if forced:
			API.upload_file(filename, session)
		elif (mode=="custom" and input("Do you want to overwrite file at server(yes/no)")=="yes"):
			API.upload_file(filename, session)


def getFile(filename, mode, forced, session):
	print("Getting Decision being made for "+ filename)
	if os.path.isfile(filename):
		#encrypt file
		encrypt.main(filename)
		#compute hash
		localHash = spcUtil.shazam(filename)
		serverHash = API.fileHash(filename, session)
		#if hash is different, ask what to do, overwrite server file or not
		if(localHash!=serverHash):
			if forced :
				API.download(filename,session)
				decrypt.main(filename)
				
			elif (mode=="custom" and input("Do you want to overwrite file at client(yes/no)")=="yes"):
				API.download(filename,session)
				decrypt.main(filename)

	else:
		API.download(filename, session)
		decrypt.main(filename)
	


def replicateLocalDirStruct(session):
	for root, dirs, files in os.walk(obsDir):
		API.create(root, session)
		try: 
			os.makedirs(tempDir + API.relpath(root, obsDir))
		except:
			pass

def replicateServerDirStruct(path ,session):
	nodes = API.ls(path, session).json()['data']
	nodes = list(zip(nodes[0], nodes[1]))
	# print(nodes)
	for typ, node in nodes:
		if typ==0:
			try:
				# print(path)
				os.makedirs(path + "/" + node)
			except:
				print("sorry")
				pass
			try:
				os.makedirs(tempDir + relpath(path, obsDir))
			except:
				replicateServerDirStruct(path+"/"+node, session)

# def delete_extra_folder_in_client(filen)

def delete_client_extra_file(filename, session):


	print("Removing Decision being made for "+ filename)

	serverHash = API.fileHash(filename, session)
	#***********************************to be checked what the serverHash returns
	if (serverHash==False):
	#***********************************************************************
		os.remove(filename)

def delete_server_extra_file(filename, session):
	print("Removing Decision being made for "+ filename)
	if not os.path.isfile(filename):
		API.remove(filename,session)

def delete_server_extra_folder(session):
	for root, dirs, files in os.walk(obsDir):
		folderHash = API.fileHash(root, session)
		if(folderHash!=""):
			API.remove(root)

def delete_client_extra_folder(path, session):
	nodes = API.ls(path, session).json()['data']
	nodes = list(zip(nodes[0], nodes[1]))
	for typ, node in nodes:
		if typ==0 and os.path.isdir(path+"/"+node):
			try:
				os.remove(path + "/" + node)
			except:
				print("sorry")
				pass
			try:
				os.remove(tempDir + relpath(path, obsDir))
			except:
				replicateServerDirStruct(path+"/"+node, session)


def sync(args):
	'''synchronizing everything'''


	parser = argparse.ArgumentParser(description='synchronize', usage='''\33[32;1mspc sync [mode] [--force]  \33[0;0m''', prog='spc-config')
	parser.add_argument('mode', choices	=["pull", "push", "custom"], help="The mode of synchronizing")
	parser.add_argument('--forced', help="forced sync", action="store_true")

	args = parser.parse_args(args)

	session = API.authenticate()





	# if args.forced:
	# 	if args.mode=="custom":
	# 		print("Forcing custom doesn't make sense, anyway continuing with your sync")

	# if args.mode == "push" or args.mode == "custom":
	# 	send = lambda filename: sendFile(filename, args.mode, args.forced, session)
	# 	spcUtil.walk(obsDir, send)

	# if args.mode == "pull" or args.mode == "custom":
	# 	get = lambda filename: getFile(filename, args.mode, args.forced, session)
	# 	API.walkServer(obsDir, get, session)

	# API.lockSync(session)


	lock = API.lock(session)
	while lock[0]==True:
		print("please wait for %d seconds"%lock[1])


	replicateLocalDirStruct(session)
	replicateServerDirStruct(obsDir + "/" ,session)
	send = lambda filename: sendFile(filename, args.mode, args.forced, session)
	get = lambda filename: getFile(filename, args.mode, args.forced, session)
	delete_client_extra = lambda filename: delete_client_extra_file(filename,session)
	delete_server_extra = lambda filename: delete_server_extra_file(filename,session)
	# delete_folder = lambda filename: 


	if args.mode == "push" and args.forced == True :
		spcUtil.walk(obsDir, send)
		#delete everything which is extra in server
		API.walkServer(obsDir,delete_server_extra,session)
		delete_server_extra_folder(session)


	if args.mode == "push" and args.forced == False :
		spcUtil.walk(obsDir, send)

	if args.mode == "pull" and args.forced == True :
		API.walkServer(obsDir, get, session)
		#delete everything which is extra in client
		spcUtil.walk(obsDir,delete_client_extra)
		delete_server_extra_folder(obsDir + "/" ,session)

	if args.mode == "pull" and args.forced == False :
		API.walkServer(obsDir, get, session)

	if args.mode == "custom":
		spcUtil.walk(obsDir, send)
		API.walkServer(obsDir, get, session)

	if args.mode == "idealSync":
		spcUtil.walk(obsDir, send)
		API.walkServer(obsDir, get, session)


	API.unlockSync()
