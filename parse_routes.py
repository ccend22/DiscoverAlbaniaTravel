import json, re, unicodedata

comps = json.load(open("data/companies.json"))
stations = json.load(open("data/stations.json"))
cities = json.load(open("data/cities.json"))

def norm(s):
    s = s.strip().lower()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

# Build lookup: normalized city/station name -> best matching station/city record with coords
name_index = {}
for s in stations:
    name_index.setdefault(norm(s['name']), []).append(('station', s))
    name_index.setdefault(norm(s['city']['name']), []).append(('city_of_station', s))
for c in cities:
    name_index.setdefault(norm(c['name']), []).append(('city', c))

ALIASES = {
    'b curri': 'bajram curri',
    'vau dejes': 'vau i dejes',
    'kamze': 'kamez',
    'lezhe': 'lezhe',
}

def find_place(token):
    n = norm(token)
    n = ALIASES.get(n, n)
    if n in name_index:
        return name_index[n][0]
    # try partial match
    for key, entries in name_index.items():
        if n and (n in key or key in n):
            return entries[0]
    return None

def split_route(route_str):
    s = route_str.replace('–','-').replace('—','-')
    # strip parenthetical notes for splitting purposes but keep original
    parts = [p.strip() for p in s.split('-') if p.strip()]
    return parts

route_to_companies = {}
for c in comps:
    for r in (c.get('routes') or []):
        route_to_companies.setdefault(r, []).append({'id': c['id'], 'name': c['name'], 'vat': c.get('vat')})

parsed = []
unmatched = []
for route_str, comp_list in route_to_companies.items():
    parts = split_route(route_str)
    if len(parts) < 2:
        unmatched.append(route_str)
        continue
    # strip parenthetical/slash notes from endpoint candidates for matching
    def clean(p):
        p = re.sub(r'\(.*?\)', '', p)
        p = p.split('/')[0]
        return p.strip()
    first = clean(parts[0])
    last = clean(parts[-1])
    if norm(first) == norm(last) and len(parts) >= 3:
        dest = clean(parts[1])
    else:
        dest = last
    origin_match = find_place(first)
    dest_match = find_place(dest)
    if not dest_match:
        # fallback: try every other token in the route (middle waypoints) for a match
        for cand in parts[1:]:
            cand_clean = clean(cand)
            if norm(cand_clean) == norm(first):
                continue
            m = find_place(cand_clean)
            if m:
                dest = cand_clean
                dest_match = m
                break
    parsed.append({
        'route_str': route_str,
        'parts': parts,
        'origin_raw': first,
        'dest_raw': dest,
        'origin_match': origin_match,
        'dest_match': dest_match,
        'companies': comp_list
    })

matched = [p for p in parsed if p['origin_match'] and p['dest_match']]
missing = [p for p in parsed if not (p['origin_match'] and p['dest_match'])]
print('total routes:', len(route_to_companies))
print('parsed ok (both endpoints matched):', len(matched))
print('missing matches:', len(missing))
for m in missing[:30]:
    print(' MISSING:', m['route_str'], '-> origin_raw=', m['origin_raw'], 'match=', bool(m['origin_match']), '| dest_raw=', m['dest_raw'], 'match=', bool(m['dest_match']))

json.dump(parsed, open('data/parsed_routes.json','w',encoding='utf-8'), ensure_ascii=False, indent=2, default=lambda o: o)
