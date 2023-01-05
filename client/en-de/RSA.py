import sys, os, ast
from Crypto.PublicKey import RSA
from Crypto import Random


def encrypt(message, key):
	publicKey = key.publickey()
	enc = publicKey.encrypt(message, 32)
	return enc


def decrypt(message, key):
	return key.decrypt(message)


def main():
	key = RSA.generate(4096)
	key1 = key.publickey().exportKey('PEM')
	key2 = key.exportKey('PEM')
	
	key1 = RSA.importKey(key1)
	key2 = RSA.importKey(key2)
	message = b"abc"
	x = encrypt(message, key2)
	print(decrypt(x, key2))

if __name__ == '__main__':
	main()
