import json, urllib.request

def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

BASE = "https://www.etransport.al/api"

for blogId, label in [(1, "news"), (2, "activities")]:
    all_posts = []
    page = 0
    per_page = 50
    while True:
        d = post(f"{BASE}/blog/posts", {"mainPosts": None, "blogId": blogId, "pagination": {"currentPage": page, "itemsPerPage": per_page}})
        res = d["result"] or []
        all_posts.extend(res)
        total = d["pagination"]["totalResults"]
        if len(all_posts) >= total or not res:
            break
        page += 1
    json.dump(all_posts, open(f"data/blog_{label}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(label, len(all_posts))
