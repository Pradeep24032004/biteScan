"""Downloads Creative Commons food photos from Openverse (openverse.org) for dishes Commons lacks.

Only licences that allow commercial use (CC0, PDM, CC BY, CC BY-SA). Wikimedia results are skipped
because fetch_commons.py already covers them. Each photo's credit goes to data/openverse/ATTRIBUTION.csv.

    .venv/bin/python fetch_openverse.py                 # all dishes in QUERIES
    .venv/bin/python fetch_openverse.py --only ragi_mudde set_dosa
"""

import argparse
import csv
import json
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# This network advertises IPv6 but can't route it; force IPv4 (see fetch_commons.py).
_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda host, port, family=0, *a, **k: _getaddrinfo(host, port, socket.AF_INET, *a, **k)

API = 'https://api.openverse.org/v1/images/'
USER_AGENT = 'BiteScan-dataset-builder/0.1 (personal project)'
OUT = Path('data/openverse')
MAX_PER_CLASS = 150
FOREIGN_MAX = 80
FOREIGN = {'pizza', 'burger', 'french_fries', 'pasta', 'hakka_noodles', 'club_sandwich', 'caesar_salad',
           'fried_chicken', 'grilled_chicken', 'shawarma', 'chocolate_cake', 'ice_cream', 'donut'}

# food id -> search phrases. A result is kept only if its title or tags contain one of the phrases,
# which filters out loose matches (e.g. "dosa" for a photo of a restaurant sign).
QUERIES: dict[str, list[str]] = {
    # South Indian / Bangalore: missing or weak in Commons
    'ragi_mudde': ['ragi mudde', 'ragi ball', 'ragi kali'],
    'bisi_bele_bath': ['bisi bele bath', 'bisibelebath', 'bisi bele baath'],
    'chitranna': ['chitranna', 'lemon rice'],
    'set_dosa': ['set dosa'],
    'pesarattu': ['pesarattu'],
    'neer_dosa': ['neer dosa'],
    'rava_dosa': ['rava dosa'],
    'plain_dosa': ['plain dosa', 'sada dosa'],
    'chow_chow_bath': ['chow chow bath', 'khara bath kesari bath'],
    'thatte_idli': ['thatte idli'],
    'akki_roti': ['akki roti', 'akki rotti'],
    'vangi_bath': ['vangi bath', 'vangibath'],
    'puliyogare': ['puliyogare', 'tamarind rice', 'puliyodharai'],
    'rasam': ['rasam'],
    'sambar': ['sambar', 'sambhar'],
    'ven_pongal': ['ven pongal', 'khara pongal'],
    'khara_bath': ['upma', 'khara bath', 'uppittu'],
    'curd_rice': ['curd rice', 'thayir sadam'],
    'filter_coffee': ['filter coffee', 'filter kaapi', 'south indian coffee'],
    'mysore_bonda': ['mysore bonda'],
    'mirchi_bajji': ['mirchi bajji', 'mirchi bhaji', 'chilli bajji'],
    'avial': ['avial', 'aviyal'],
    'obbattu': ['obbattu', 'holige', 'puran poli'],
    'rava_idli': ['rava idli'],
    'masala_puri': ['masala puri'],
    'coconut_chutney': ['coconut chutney'],
    'benne_masala_dosa': ['benne dosa', 'butter dosa'],
    # A few foreign dishes that are common in India (ids must exist in src/data/foods.ts).
    # Capped lower than Indian dishes so they don't dominate training.
    'pizza': ['pizza'],
    'burger': ['hamburger', 'burger', 'cheeseburger'],
    'french_fries': ['french fries'],
    'pasta': ['spaghetti', 'pasta'],
    'hakka_noodles': ['chow mein', 'hakka noodles', 'stir fried noodles'],
    'club_sandwich': ['club sandwich', 'sandwich'],
    'caesar_salad': ['caesar salad', 'green salad'],
    'fried_chicken': ['fried chicken'],
    'grilled_chicken': ['grilled chicken'],
    'shawarma': ['shawarma'],
    'chocolate_cake': ['chocolate cake'],
    'ice_cream': ['ice cream'],
    'donut': ['doughnut', 'donut'],
}

ALLOWED_LICENSES = {'cc0', 'pdm', 'by', 'by-sa'}


def get_json(url: str):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503):
                time.sleep(10 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'Gave up: {url}')


def download(url: str, dest: Path) -> bool:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            if len(data) < 5000:  # placeholder or broken image
                return False
            dest.write_bytes(data)
            return True
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                time.sleep(5 * (attempt + 1))
                continue
            return False
        except Exception:
            time.sleep(3)
    return False


def matches(result: dict, phrases: list[str]) -> bool:
    text = ' '.join([result.get('title') or ''] + [t.get('name', '') for t in result.get('tags') or []]).lower()
    text = re.sub(r'[^a-z0-9 ]+', ' ', text)
    return any(re.search(rf'\b{re.escape(p)}\b', text) for p in phrases)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--only', nargs='*')
    args = p.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    attribution = OUT / 'ATTRIBUTION.csv'
    seen = set()
    if attribution.exists():
        with attribution.open() as f:
            seen = {row['id'] for row in csv.DictReader(f)}
    new_file = not attribution.exists()

    with attribution.open('a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['file', 'food_id', 'id', 'title', 'creator', 'license', 'source', 'url'])
        if new_file:
            writer.writeheader()
        for food_id, phrases in QUERIES.items():
            if args.only and food_id not in args.only:
                continue
            folder = OUT / food_id
            folder.mkdir(exist_ok=True)
            kept = len(list(folder.glob('*.jpg')))
            limit = FOREIGN_MAX if food_id in FOREIGN else MAX_PER_CLASS
            for phrase in phrases:
                page = 1
                while kept < limit and page <= 12:  # anonymous API: 20 per page, 240 max
                    q = urllib.parse.urlencode({'q': phrase, 'license_type': 'commercial', 'page_size': 20,
                                                'page': page, 'mature': 'false'})
                    try:
                        data = get_json(f'{API}?{q}')
                    except Exception as e:
                        print(f'  {food_id}: search failed ({e})', flush=True)
                        break
                    results = data.get('results') or []
                    if not results:
                        break
                    for r in results:
                        if kept >= limit or r['id'] in seen:
                            continue
                        if (r.get('source') or '').startswith('wikimedia') or not matches(r, phrases):
                            continue
                        # "commercial" also returns no-derivatives licences; training is a derivative use.
                        if (r.get('license') or '') not in ALLOWED_LICENSES:
                            continue
                        url = r.get('thumbnail') or r.get('url')
                        rel = f"{food_id}/{r['id']}.jpg"
                        if url and download(url, OUT / rel):
                            seen.add(r['id'])
                            kept += 1
                            writer.writerow({'file': rel, 'food_id': food_id, 'id': r['id'], 'title': r.get('title'),
                                             'creator': r.get('creator'), 'license': f"{r.get('license')} {r.get('license_version') or ''}".strip(),
                                             'source': r.get('source'), 'url': r.get('foreign_landing_url')})
                            f.flush()
                        time.sleep(0.3)
                    if page >= (data.get('page_count') or 1):
                        break
                    page += 1
                    time.sleep(1)
            print(f'  {food_id}: {kept} photos', flush=True)


if __name__ == '__main__':
    main()
