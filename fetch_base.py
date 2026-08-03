import json, urllib.request

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

BASE = "https://www.etransport.al/api"

# Stations
d = post(f"{BASE}/stations", {"pagination":{"currentPage":0,"itemsPerPage":100,"totalResults":0}})
stations = d["result"]
json.dump(stations, open("data/stations.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print("stations:", len(stations))

# Cities (with content)
d = post(f"{BASE}/cities", {"name":None,"pagination":{"currentPage":0,"itemsPerPage":100,"totalResults":0}})
cities = d["result"]
json.dump(cities, open("data/cities.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print("cities:", len(cities))

# Companies - paginate through all 398
all_companies = []
page = 0
per_page = 100
while True:
    d = post(f"{BASE}/companies", {"pagination":{"currentPage":page,"itemsPerPage":per_page,"totalResults":0}})
    res = d["result"]
    all_companies.extend(res)
    total = d["pagination"]["totalResults"]
    print(f"page {page}: got {len(res)} (total so far {len(all_companies)} / {total})")
    if len(all_companies) >= total or not res:
        break
    page += 1
# drop logoWeb (base64 images) to keep file manageable, save separately if needed
for c in all_companies:
    c.pop("logoWeb", None)
json.dump(all_companies, open("data/companies.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print("companies:", len(all_companies))
