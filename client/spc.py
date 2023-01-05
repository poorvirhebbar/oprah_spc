import sys, os, getpass, argparse, API, spcUtil, sync, hashlib



def schema(args):
	parser = argparse.ArgumentParser(description='get or set schema type and key', usage='''\33[32;1mspc schema [<query>]\33[0;0m''', prog='spc-schema')
	parser.add_argument('query', choices=['get', 'set'], help='set schema type and key')
	parser.add_argument('scheme', choices['AES_CBC', "AES_CTR"], help= 'schema type')
	args = parser.parse_args(args)
	
	if(args.query == "get"):
		print(spcUtil.getData("schema"))
	else:
		sync.main(["pull"])
		spcUtil.saveData({"schema":scheme})
		sync.main(["push", "--forced"])
		pass


def config(args):
	'''configure spc parametres'''
	parser = argparse.ArgumentParser(description='change configuration', usage='''\33[32;1mspc config <field> [<value>]\33[0;0m''', prog='spc-config')
	parser.add_argument('field', choices=['uname', 'passwd', 'obsDir', 'url', 'key', 'tempDir'], help='field to be read/written. for schema, a prompt will be launched')
	parser.add_argument('value', type=str, metavar='<value>', nargs='?', help='field value to be written')
	args = parser.parse_args(args)
	if(args.value == None):
		print(spcUtil.getData(args.field))
	else:
		spcUtil.saveData({args.field: args.value})
		#TODO check data before saving


def init():
	'''initializing the cloud'''
	print('''
		\33[33;1mSPC client-side configuation\33[0;0m
	''')

	'''make directories and files for storing data'''
	print("Creating config folder")
	try:
		os.makedirs(os.getenv("HOME")+"/.config/SPC")
	except FileExistsError:
		print(".config already exists")


	'''take inputs from user'''
	'''1. uname '''
	uname = input("Enter the username: ")

	passwd = getpass.getpass("Enter the password:")
	# uname, passwd = spcUtil.checkPass(uname, passwd)
	print("account successfully verified")

	obsDir = input("Enter the observing directory: ")
	# spcUtil.checkdir(obsDir)

	schemaList = ["AES_CBC", "AES_CTR"]
	print("Enter Schema from the givenlist\n", schemaList)
	schema = input()

	'''ask location of temporary directory''' 
	tempDir = os.getenv("HOME")+"/temp/SPC"
	try:
		os.makedirs(tempDir)
	except FileExistsError:
		pass

	url = input("Enter Server url: ")
	# url = API.checkurl(url)

	key = input("Enter the passcode, make sure nobody is watching: ")
	key =  hashlib.sha256("a".encode()).digest()
	data1 = {"uname":uname, "passwd": passwd, "obsDir": obsDir, "schema": schema, "key": key, "url": url, "tempDir":tempDir}

	spcUtil.saveData(data1)

	print("Congratulations, your can be on a cloud nine")


def main():
	'''Calls other commands'''
	parser = argparse.ArgumentParser(description='oprah-spc linux client v1.0.0', usage='''\33[32;1mspc <command> [<args>]\33[0;0m''', prog='spc', formatter_class=lambda prog: argparse.HelpFormatter(prog,max_help_position=30))
	parser.add_argument("command", choices = ["init", "config", "schema", "sync"], help = "subcommand to run")
	args = parser.parse_args(sys.argv[1:2])

	if args.command == "init":
		init()
	elif args.command == "config":
		config(sys.argv[2:])
	elif args.command == "schema":
		schema(sys.argv[2:])
	elif args.command == "sync":
		sync.sync(sys.argv[2:])
	else:
	# don't worry argparse will take care that things don't reach here
		pass

if __name__ == '__main__':
	main()
