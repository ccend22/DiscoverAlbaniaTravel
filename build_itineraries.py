import json, glob, os, csv
from collections import defaultdict

groups = {}
group_order = []

NON_WEEKDAY_FIELDS = [
    "route_code", "route_long_name",
    "agency_name", "agency_url", "agency_id_vat", "from_stop_code", "to_stop_code",
    "arrival_time", "duration_min", "distance_km", "ticket_price",
    "planned_seats", "free_seats", "taken_seats", "can_board",
]


def fmt_time(sec):
    if sec is None:
        return ""
    h = int(sec // 3600) % 24
    m = int((sec % 3600) // 60)
    return f"{h:02d}:{m:02d}"


for fpath in sorted(glob.glob("data/trips_raw*/*.json")):
    d = json.load(open(fpath, encoding="utf-8"))
    if "response" in d and "origin" in d:
        origin = d["origin"]
        destination = d["destination"]
        resp = d.get("response") or {}
    else:
        base = os.path.basename(fpath).replace("data_trips_raw_", "").replace(".json", "")
        parts = base.split("__")
        origin = {"name": parts[0] if parts else ""}
        destination = {"name": parts[1] if len(parts) > 1 else ""}
        resp = d

    result = resp.get("result") or {}
    plan = result.get("plan") or {}
    itineraries = plan.get("itineraries") or []
    for it in itineraries:
        transfers = it.get("transfers")
        legs = it.get("legs") or []
        for leg in legs:
            if leg.get("mode") != "BUS":
                continue
            calendar = leg.get("calendar") or {}
            weekday = calendar.get("weekday")
            service_date = calendar.get("date")

            natural_key = (
                leg.get("route"),
                leg.get("from", {}).get("name"),
                leg.get("to", {}).get("name"),
                fmt_time(calendar.get("start")),
            )

            row = {
                "query_origin": origin["name"],
                "query_destination": destination["name"],
                "route_code": leg.get("route"),
                "route_long_name": leg.get("routeLongName"),
                "agency_name": leg.get("agencyName"),
                "agency_url": leg.get("agencyUrl"),
                "agency_id_vat": leg.get("agencyId"),
                "from_stop": leg.get("from", {}).get("name"),
                "from_stop_code": leg.get("from", {}).get("stopCode"),
                "to_stop": leg.get("to", {}).get("name"),
                "to_stop_code": leg.get("to", {}).get("stopCode"),
                "departure_time": fmt_time(calendar.get("start")),
                "arrival_time": fmt_time(calendar.get("stop")),
                "duration_min": round(leg.get("duration", 0) / 60, 1) if leg.get("duration") else "",
                "distance_km": round(leg.get("distance", 0) / 1000, 1) if leg.get("distance") else "",
                "ticket_price": leg.get("ticketPrice"),
                "planned_seats": calendar.get("plannedSeats"),
                "free_seats": calendar.get("freeSeats"),
                "taken_seats": calendar.get("takenSeats"),
                "can_board": calendar.get("canBoard"),
                "itinerary_transfers": transfers,
            }

            if natural_key not in groups:
                groups[natural_key] = {"first": row, "weekdays": set(), "service_date_example": service_date}
                group_order.append(natural_key)
            g = groups[natural_key]
            if weekday is not None:
                g["weekdays"].add(weekday)

            mismatches = [f for f in NON_WEEKDAY_FIELDS if g["first"].get(f) != row.get(f)]
            if mismatches:
                print(f"WARNING: natural key {natural_key} has differing {mismatches} "
                      f"(first={ {f: g['first'].get(f) for f in mismatches} }, "
                      f"new={ {f: row.get(f) for f in mismatches} }) — keeping first-seen values")

print("total distinct scheduled departures (natural key):", len(group_order))

rows = []
for key in group_order:
    g = groups[key]
    row = dict(g["first"])
    row["weekdays"] = ",".join(str(w) for w in sorted(g["weekdays"]))
    row["service_date_example"] = g["service_date_example"]
    rows.append(row)

fieldnames = [
    "query_origin", "query_destination", "route_code", "route_long_name",
    "agency_name", "agency_url", "agency_id_vat",
    "from_stop", "from_stop_code", "to_stop", "to_stop_code",
    "departure_time", "arrival_time", "duration_min", "distance_km",
    "ticket_price", "weekdays", "service_date_example",
    "planned_seats", "free_seats", "taken_seats", "can_board", "itinerary_transfers",
]

with open("data/itineraries.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

json.dump(rows, open("data/itineraries.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("saved data/itineraries.csv and data/itineraries.json")
