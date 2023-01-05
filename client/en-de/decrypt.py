import sys,os, base64
cwd = os.getcwd()
sys.path.insert(0,os.path.expanduser(cwd))
import API, spcUtil, AES_CBC, AES_CTR, RSA


def main(argv):

	################################
	'''The arguments'''
	filename = None
	if isinstance(argv, list):
		filename = argv[1]
	else:
		filename = argv
	encryption_schema = spcUtil.getData("schema")
	################################

	encfilename = spcUtil.getData("tempDir") + API.relpath(filename, spcUtil.getData("obsDir"))
	# filename = spcUtil.getData("tempDir") + "/" + os.path.basename(filename)
	file = open(encfilename, "rb")
	text = file.read()
	file.close()
	decryptedText = None

	key = spcUtil.getData("key")

	if(encryption_schema == "RSA"):
		decryptedText = RSA.decrypt(text,key)
	elif(encryption_schema == "AES_CBC"):
		decryptedText = AES_CBC.decrypt(text,key)
	elif(encryption_schema == "AES_CTR"):
		decryptedText = AES_CTR.decrypt(text,key)
	# elif(encryption_schema == "RAS-OAEP"):
	# 	pass
	else:
		print("encryption scheme not supported")

	# filename = spcUtil.getData("obsDir") + "/" + os.path.basename(filename)
	print(filename)
	decryptedFile = open(filename,"wb")
	decryptedFile.write(decryptedText)
	decryptedFile.close()

if __name__ == '__main__':
	main(sys.argv)