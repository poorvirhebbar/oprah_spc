#!/bin/bash
sudo cp spc.1.gz /usr/share/man/man8/spc.1.gz
sudo rm /usr/local/bin/spc
sudo ln -s $(pwd)/spc /usr/local/bin/spc
python3 install.py
