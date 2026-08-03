#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -x ".venv/bin/python3" ]; then
  python_bin=".venv/bin/python3"
else
  python_bin="python3"
fi

"$python_bin" fetch_trips_playwright.py "$@"
