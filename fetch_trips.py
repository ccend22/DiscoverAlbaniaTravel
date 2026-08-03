import json, urllib.request, time, sys, os

def post(url, payload, retries=3):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json","User-Agent":"Mozilla/5.0"}, method="POST")
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            if attempt == retries - 1:
                return {"error": str(e)}
            time.sleep(1.5 * (attempt + 1))

BASE = "https://www.etransport.al/api"
DATE = "2026-08-03"

parsed = json.load(open("data/parsed_routes.json"))

def endpoint_info(match):
    kind, obj = match
    if kind == 'station':
        return {"latitude": obj['latitude'], "longitude": obj['longitude'], "name": obj['name'], "isCity": False}
    elif kind == 'city_of_station':
        return {"latitude": obj['latitude'], "longitude": obj['longitude'], "name": obj['city']['name'], "isCity": True}
    else:  # city
        # cities.json entries may lack lat/lon; fall back needed
        return {"latitude": obj.get('latitude'), "longitude": obj.get('longitude'), "name": obj['name'], "isCity": True}

pairs = {}
for p in parsed:
    o = endpoint_info(p['origin_match'])
    d = endpoint_info(p['dest_match'])
    key = (o['name'], d['name'])
    if key not in pairs:
        pairs[key] = (o, d)

print("unique pairs:", len(pairs), file=sys.stderr)

results_index = []
done = 0
skipped_no_coords = 0
for (oname, dname), (o, d) in pairs.items():
    if o.get('latitude') is None or d.get('latitude') is None:
        skipped_no_coords += 1
        continue
    fname = f"data/trips_raw/{oname}__{dname}.json".replace("/", "_")
    if os.path.exists(fname):
        done += 1
        continue
    payload = {
        "origin": o,
        "destination": d,
        "date": DATE,
        "time": "00:01",
        "arriveBy": False,
        "passengers": {"adults": 1, "children": 0, "elders": 0, "total": 1},
        "maxTransfers": "0"
    }
    resp = post(f"{BASE}/trips", payload)
    with open(fname, "w", encoding="utf-8") as f:
        json.dump({"origin": o, "destination": d, "response": resp}, f, ensure_ascii=False)
    done += 1
    if done % 25 == 0:
        print(f"progress: {done}/{len(pairs)}", file=sys.stderr)
    time.sleep(0.25)

print(f"DONE. fetched={done} skipped_no_coords={skipped_no_coords} total_pairs={len(pairs)}", file=sys.stderr)
