import sys, os, binascii
from Crypto.Cipher import AES
from Crypto.Util import Counter


def int_of_string(iv):
	return int(binascii.hexlify(iv), 16)


def encrypt(message, key):
	iv = (bytearray(16).decode('utf-8')).encode('utf-8')
	ctr = Counter.new(128, initial_value=int_of_string(iv))
	cipher = AES.new(key, AES.MODE_CTR, counter=ctr)
	return cipher.encrypt(message)


def decrypt(enc, key):
	iv = (bytearray(16).decode('utf-8')).encode('utf-8')
	ctr = Counter.new(128, initial_value=int_of_string(iv))
	cipher = AES.new(key, AES.MODE_CTR, counter=ctr)
	return cipher.decrypt(enc)

def main(argv):
	filename = argv[1]
	a = open(filename, "rb")
	cont = a.read()
	a.close()
	key = os.urandom(16)
	b = encrypt(cont, key)
	g = open("enc.txt", "wb")
	g.write(b)
	g.close()
	h = open("enc.txt", "rb")
	b = h.read()
	h.close()
	c = decrypt(b, key)
	f = open("write.txt","wb")
	f.write(c)
	f.close()


if __name__ == '__main__':
	main(sys.argv)