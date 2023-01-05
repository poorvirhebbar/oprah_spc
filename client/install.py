import sys, os

home = os.getenv("HOME")

configFolder = home+"/.config/SPC"
try:
	os.makedirs(home+"/.config/SPC")
except:
	pass

try:
	os.makedirs(home+"/.temp/")