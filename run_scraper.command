#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install it from https://www.python.org/downloads/"
  exit 1
fi

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m playwright install chromium
python scrape_etransport.py --output etransport_output --show-browser

echo ""
echo "Finished. Open: $(pwd)/etransport_output/etransport_data.xlsx"
