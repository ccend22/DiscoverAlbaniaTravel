#!/bin/bash
cd /Users/ccend/Downloads/etransport_scraper
total=$(wc -l < data/manifest.jsonl)
count=0
while IFS= read -r line; do
  count=$((count+1))
  out=$(echo "$line" | jq -r '.out')
  payload=$(echo "$line" | jq -r '.payload')
  if [ -f "$out" ]; then
    continue
  fi
  curl -s --max-time 20 -X POST "https://www.etransport.al/api/trips" -H "Content-Type: application/json" -d @"$payload" -o "$out"
  if [ $((count % 25)) -eq 0 ]; then
    echo "progress: $count/$total"
  fi
done < data/manifest.jsonl
echo "ALL DONE: $count/$total"
