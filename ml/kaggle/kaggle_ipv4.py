# Runs the Kaggle CLI over IPv4 (this network advertises IPv6 but cannot route it).
import socket, sys
_g = socket.getaddrinfo
socket.getaddrinfo = lambda h, p, f=0, *a, **k: _g(h, p, socket.AF_INET, *a, **k)
from kaggle.cli import main
sys.argv = ['kaggle'] + sys.argv[1:]
main()
