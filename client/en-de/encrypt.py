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

	encryption_schema = spcUtil.getData()["schema"]
	################################

	file = open(filename, "rb")
	content = file.read()
	file.close()
	encryptedText = None

	key = spcUtil.getData("key")

	if(encryption_schema == "RSA"):
		encryptedText = RSA.encrypt(content, key)
	elif(encryption_schema == "AES_CBC"):
		encryptedText = AES_CBC.encrypt(content, key)
	elif(encryption_schema == "AES_CTR"):
		encryptedText = AES_CTR.encrypt(content, key)
	elif(encryption_schema == "RAS-OAEP"):
		pass
	else:
		print("encryption scheme not supported")

	# encryptedText = base64.b64decode(encryptedText)
	# filename = spcUtil.getData("tempDir") + "/" + os.path.basename(filename)

	encfilename = spcUtil.getData("tempDir") + API.relpath(filename, spcUtil.getData("obsDir"))
	encryptedFile = open(encfilename,"wb")
	encryptedFile.write(encryptedText)
	encryptedFile.close()

if __name__ == '__main__':
	main(sys.argv)