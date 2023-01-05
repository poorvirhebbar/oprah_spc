import os, sys, base64
from Crypto import Random
from Crypto.Cipher import AES

BS = 32
def pad(s):
    return s + (BS - len(s) % BS) * chr(BS - len(s) % BS).encode('utf-8')

def unpad(s):
    return s[:-ord(s[len(s)-1:])]


def encrypt(message, key):
    message = pad(message)
    iv = Random.new().read(AES.block_size)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return (iv+cipher.encrypt(message))

def decrypt(enc, key):
    iv = enc[:AES.block_size]
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(enc[AES.block_size:])).decode('utf-8')

def main():
    pass

if __name__ == '__main__':
    main()