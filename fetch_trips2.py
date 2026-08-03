import json, subprocess, time, sys, os

BASE = "https://www.etransport.al/api"
DATE = "2026-08-03"

def post(url, payload, retries=2):
    data = json.dumps(payload)
    for attempt in range(retries):
        try:
            r = subprocess.run(
                ["curl","-s","--max-time","20","-X","POST",url,
                 "-H","Content-Type: application/json","-d", data],
                capture_output=True, text=True, timeout=25
            )
            if r.returncode == 0 and r.stdout:
                return json.loads(r.stdout)
        except Exception as e:
            pass
        time.sleep(1)
    return {"error": "failed"}

parsed = json.load(open("data/parsed_routes.json"))

def endpoint_info(match):
    kind, obj = match
    if kind == 'station':
        return {"latitude": obj['latitude'], "longitude": obj['longitude'], "name": obj['name'], "isCity": False}
    elif kind == 'city_of_station':
        return {"latitude": obj['latitude'], "longitude": obj['longitude'], "name": obj['city']['name'], "isCity": True}
    else:
        return {"latitude": obj.get('latitude'), "longitude": obj.get('longitude'), "name": obj['name'], "isCity": True}

pairs = {}
for p in parsed:
    o = endpoint_info(p['origin_match'])
    d = endpoint_info(p['dest_match'])
    key = (o['name'], d['name'])
    if key not in pairs:
        pairs[key] = (o, d)

items = list(pairs.items())
print(f"unique pairs: {len(items)}", flush=True)

start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end_idx = int(sys.argv[2]) if len(sys.argv) > 2 else len(items)

for i in range(start_idx, min(end_idx, len(items))):
    (oname, dname), (o, d) = items[i]
    fname = f"data/trips_raw/{oname}__{dname}.json".replace("/", "_")
    if os.path.exists(fname):
        continue
    payload = {
        "origin": o, "destination": d, "date": DATE, "time": "00:01",
        "arriveBy": False,
        "passengers": {"adults": 1, "children": 0, "elders": 0, "total": 1},
        "maxTransfers": "0"
    }
    t0 = time.time()
    resp = post(f"{BASE}/trips", payload)
    elapsed = time.time() - t0
    with open(fname, "w", encoding="utf-8") as f:
        json.dump({"origin": o, "destination": d, "response": resp}, f, ensure_ascii=False)
    print(f"[{i+1}/{len(items)}] {oname} -> {dname} ({elapsed:.1f}s)", flush=True)
