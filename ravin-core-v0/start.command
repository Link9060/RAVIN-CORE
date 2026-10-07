#!/bin/bash
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
else
  echo "Python 3 is not installed or is blocked on this Mac."
  echo "Try opening Terminal and running: python3 --version"
  read -n 1 -s -r -p "Press any key to close..."
fi
