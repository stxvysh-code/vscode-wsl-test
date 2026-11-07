"""Collect OSM businesses with a phone and without a website, tile by tile.

Resumable: every finished tile is stored in OUT/<city>/<i>_<j>.json.
"""
import json, os, ssl, sys, time, urllib.parse, urllib.request

OUT = sys.argv[1]
ONLY = sys.argv[2:]  # optional list of city names
MIRRORS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")

CITIES = {
    "Москва": (55.55, 37.30, 55.95, 37.90),
    "Санкт-Петербург": (59.80, 30.10, 60.10, 30.55),
    "Новосибирск": (54.90, 82.75, 55.12, 83.15),
    "Екатеринбург": (56.74, 60.45, 56.94, 60.75),
    "Казань": (55.70, 48.95, 55.88, 49.30),
    "Нижний Новгород": (56.20, 43.75, 56.38, 44.10),
    "Челябинск": (55.05, 61.25, 55.27, 61.55),
    "Самара": (53.10, 50.05, 53.33, 50.35),
    "Уфа": (54.62, 55.85, 54.85, 56.15),
    "Ростов-на-Дону": (47.17, 39.55, 47.32, 39.85),
    "Краснодар": (44.98, 38.88, 45.13, 39.12),
    "Омск": (54.88, 73.20, 55.08, 73.50),
    "Воронеж": (51.59, 39.05, 51.76, 39.32),
    "Волгоград": (48.45, 44.30, 48.85, 44.65),
    "Красноярск": (55.95, 92.70, 56.10, 93.10),
    "Тюмень": (57.07, 65.40, 57.21, 65.70),
    "Саратов": (51.45, 45.85, 51.65, 46.10),
    "Пермь": (57.90, 56.05, 58.10, 56.40),
}
DLAT, DLON = 0.1, 0.15
KEYS = ["shop", "amenity", "leisure", "tourism", "office", "craft", "healthcare"]
PHONES = ["phone", "contact:phone", "contact:mobile"]


def tiles(b):
    s, w, n, e = b
    i = 0
    lat = s
    while lat < n - 1e-9:
        j = 0
        lon = w
        while lon < e - 1e-9:
            yield i, j, (round(lat, 4), round(lon, 4), round(min(lat + DLAT, n), 4), round(min(lon + DLON, e), 4))
            lon += DLON
            j += 1
        lat += DLAT
        i += 1


def query(bb):
    box = "(%s,%s,%s,%s)" % bb
    sels = []
    for k in KEYS:
        for p in PHONES:
            sels.append(f'nwr["{k}"]["{p}"][!"website"][!"contact:website"]{box};')
    return "[out:json][timeout:120];\n(\n" + "\n".join(sels) + "\n);\nout center meta;\n"


def fetch(q, url):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "lead-collector/1.0"})
    with urllib.request.urlopen(req, timeout=200, context=CTX) as r:
        body = r.read()
    if body.lstrip()[:1] != b"{":
        raise RuntimeError("non-json " + body[-200:].decode("utf-8", "replace").replace("\n", " "))
    d = json.loads(body)
    rem = d.get("remark") or ""
    if "error" in rem.lower() or "timed out" in rem.lower():
        raise RuntimeError("remark " + rem[:200])
    return d


WORKERS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


def main():
    import queue, threading
    todo = queue.Queue()
    total = 0
    for city, b in CITIES.items():
        if ONLY and city not in ONLY:
            continue
        os.makedirs(os.path.join(OUT, city), exist_ok=True)
        for i, j, bb in tiles(b):
            f = os.path.join(OUT, city, f"{i}_{j}.json")
            if not os.path.exists(f):
                todo.put((city, i, j, bb, f, 0)); total += 1
    print(f"tiles to fetch: {total}", flush=True)
    done = [0]
    lock = threading.Lock()

    def work(url):
        host = url.split("/")[2]
        fails = 0
        while True:
            try:
                city, i, j, bb, f, tries = todo.get_nowait()
            except queue.Empty:
                return
            if os.path.exists(f):
                continue
            t0 = time.time()
            try:
                d = fetch(query(bb), url)
                json.dump(d["elements"], open(f + ".tmp", "w"), ensure_ascii=False)
                os.replace(f + ".tmp", f)
                with lock:
                    done[0] += 1
                    print(f"[{done[0]}/{total}] {city} {i}_{j}: {len(d['elements'])} el, {time.time()-t0:.0f}s via {host}", flush=True)
                fails = 0
                time.sleep(1)
            except Exception as e:  # noqa
                fails += 1
                print(f"  {host} {city} {i}_{j} (try {tries+1}): {str(e)[:110]}", flush=True)
                todo.put((city, i, j, bb, f, tries + 1))
                time.sleep(min(5 * fails, 60))

    ts = [threading.Thread(target=work, args=(u,)) for u in WORKERS]
    for t in ts:
        t.start(); time.sleep(3)
    for t in ts:
        t.join()
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
