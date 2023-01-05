import os, sys, base64
from Crypto import Random
from Crypto.Cipher import AES

BS = 16
def pad(s):
    return s + (BS - len(s) % BS) * (chr(BS - len(s) % BS).encode('utf-8'))

def unpad(s):
    return s[:-ord(s[len(s)-1:])]


def encrypt(message, key):
    message = pad(message)
    iv = (bytearray(16).decode('utf-8')).encode('utf-8')
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return cipher.encrypt(message)

def decrypt(enc, key):
    iv = (bytearray(16).decode('utf-8')).encode('utf-8')
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(enc))

def main(argv):
    a = b"a"
    b = encrypt(b"a", b'\xd6\x1d*5\x88\xdc\x17l\x04v\xecK\xcek\xe1\xfb\xcc\xcf\xa9\x99I\xf2#Y\x1d\xef*-\x13a{\xc0')
    print(b)

if __name__ == '__main__':
    main(sys.argv)