"""Downloads openly licensed dish photos from Wikimedia Commons.

Every Commons file carries its own license from the person who took it, so unlike
web-scraped datasets we know each photo may be used commercially. Attribution for
each photo is written to data/commons/ATTRIBUTION.csv (required by CC BY / BY-SA).

    .venv/bin/python fetch_commons.py            # all dishes
    .venv/bin/python fetch_commons.py --no-sa    # exclude share-alike (CC BY-SA) photos
"""

import argparse
import csv
import http.client
import json
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

# Some networks advertise IPv6 but can't route it; Python then waits the full timeout on every
# request before falling back. Commons works fine over IPv4, so use it directly.
_getaddrinfo = socket.getaddrinfo
socket.getaddrinfo = lambda host, port, family=0, *args, **kwargs: _getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)

API = 'https://commons.wikimedia.org/w/api.php'
USER_AGENT = 'BiteScan-dataset-builder/0.1 (personal project; contact via Commons talk page)'
OUT = Path('data/commons')
THUMB_WIDTH = 500  # a standard Wikimedia thumbnail size; other widths return the full original
MAX_PER_CLASS = 400
FOREIGN_MAX = 80
FOREIGN = {'pizza', 'burger', 'french_fries', 'pasta', 'hakka_noodles', 'club_sandwich', 'caesar_salad',
           'fried_chicken', 'grilled_chicken', 'shawarma', 'chocolate_cake', 'ice_cream', 'donut',
           'brownie', 'cupcake', 'cheesecake', 'cookies', 'chocolate_milkshake', 'cold_coffee', 'fresh_juice',
           'watermelon_juice', 'iced_tea'}

# BiteScan food id -> Commons categories as (name, depth). depth=1 also pulls direct subcategories.
CATEGORIES: dict[str, list[tuple[str, int]]] = {
    'idli': [('Idli', 1)],
    'thatte_idli': [('Thatte idli', 0)],
    'rava_idli': [('Rava idli', 0)],
    'plain_dosa': [('Dosa', 0)],
    'masala_dosa': [('Masala Dosa', 1)],
    'benne_masala_dosa': [('Benne dosa', 0)],
    'set_dosa': [('Set dosa', 0)],
    'rava_dosa': [('Rava dosa', 0)],
    'neer_dosa': [('Neer dosa', 1)],
    'pesarattu': [('Pesarattu', 0)],
    'uttapam': [('Uttapam', 1)],
    'medu_vada': [('Medu Vada', 0), ('Medu vada', 0), ('Uzhunnu Vada', 0)],
    'masala_vada': [('Masala vada', 0)],
    'khara_bath': [('Upma', 0), ('Rava upma', 0)],
    'kesari_bath': [('Kesari', 0), ('Suji ka halwa', 0)],
    'chow_chow_bath': [('Chow chow bath', 0)],
    'poha': [('Poha', 0)],
    'ven_pongal': [('Pongal (dish)', 1)],
    'akki_roti': [('Akki rotti', 0)],
    'ragi_roti': [('Ragi rotti', 0)],
    'poori': [('Poori', 0), ('Puri (food)', 0)],
    'steamed_rice': [('Cooked rice', 0), ('White rice', 0)],
    'ragi_mudde': [('Ragi Mudde', 0)],
    'bisi_bele_bath': [('Bisi Bele Bath', 0)],
    'vangi_bath': [('Vangi bath', 0)],
    'chitranna': [('Chitranna', 0), ('Lemon rice', 1)],
    'puliyogare': [('Pulihora', 0)],
    'curd_rice': [('Curd rice', 0)],
    'veg_biryani': [('Vegetable biryani', 0), ('Veg Biryani', 0)],
    'khichdi': [('Khichdi', 0), ('Khichri', 0)],
    'chapati': [('Chapati', 0)],
    'parotta': [('Parotta', 1)],
    'butter_naan': [('Naan', 0)],
    'sambar': [('Sambar (dish)', 1)],
    'rasam': [('Rasam', 0)],
    'coconut_chutney': [('Coconut chutney', 0)],
    'dal': [('Dal tadka', 0), ('Dal fry', 0)],
    'palya': [('Poriyal', 0)],
    'chole': [('Chana masala', 0)],
    'paneer_butter_masala': [('Butter paneer', 0)],
    'chicken_biryani': [('Chicken biryani', 1)],
    'mutton_biryani': [('Mutton biryani', 0)],
    'chicken_curry': [('Chicken curry', 0)],
    'chicken_kebab': [('Seekh kabab', 0), ('Chicken seekh kebab', 0)],
    'fish_fry': [('Fish fry', 0)],
    'omelette': [('Omelette', 0)],
    'gobi_manchurian': [('Gobi manchurian', 0)],
    'samosa': [('Samosas', 0)],
    'pav_bhaji': [('Pav bhaji', 0), ('Pav Bhaji', 0)],
    'chole_bhature': [('Chole bhature', 0), ('Chhole bhature', 0)],
    'masala_puri': [('Masala puri', 0)],
    'pani_puri': [('Panipuri', 0), ('Pani Puri', 0)],
    'mysore_pak': [('Mysore pak', 0)],
    'gulab_jamun': [('Gulab jamun', 1)],
    'obbattu': [('Obbattu', 0), ('Holige', 0)],
    'payasa': [('Payasam', 1)],
    'tender_coconut': [('Green coconut', 0)],
    'appam': [('Appam', 0)],
    'puttu': [('Puttu', 0), ('Chiratta Puttu', 0)],
    'idiyappam': [('Idiyappam', 0)],
    'paniyaram': [('Paniyaram', 0), ('Kuzhi Paniyaram', 0)],
    'aloo_paratha': [('Aloo paratha', 0), ('Alu paratha', 0)],
    'plain_paratha': [('Paratha', 0)],
    'tandoori_roti': [('Tandoori roti', 0)],
    'thepla': [('Thepla', 0)],
    'rajma_chawal': [('Rajma Chawal', 0)],
    'rajma': [('Rajma', 0)],
    'jeera_rice': [('Jeera rice', 0)],
    'veg_pulao': [('Pulao', 0)],
    'veg_fried_rice': [('Fried rice', 0)],
    'veg_thali': [('Indian thali', 0), ('Gujarati thali', 0)],
    'dal_makhani': [('Dal makhani', 0)],
    'palak_paneer': [('Palak paneer', 0)],
    'matar_paneer': [('Matar paneer', 0)],
    'kadai_paneer': [('Kadai paneer', 0)],
    'paneer_tikka': [('Paneer tikka', 0)],
    'aloo_gobi': [('Aloo gobi', 0)],
    'bhindi_masala': [('Bhindi masala', 0)],
    'baingan_bharta': [('Baingan bharta', 0)],
    'kadhi': [('Kadhi', 0)],
    'avial': [('Avial', 0)],
    'raita': [('Raita', 0)],
    'papad': [('Papadams', 0), ('Papadums', 0)],
    'egg_bhurji': [('Egg bhurji', 0)],
    'butter_chicken': [('Butter chicken', 0)],
    'chicken_tikka': [('Chicken tikka', 0)],
    'tandoori_chicken': [('Tandoori chicken', 0)],
    'chicken_65': [('Chicken 65', 0)],
    'mutton_curry': [('Mutton curry', 0)],
    'keema': [('Keema', 0)],
    'fish_curry': [('Fish curry', 0), ('Fish curries of Kerala', 0)],
    'vada_pav': [('Vada pav', 0), ('Vada Pav', 0)],
    'misal_pav': [('Misal Pav', 0), ('Misal', 0)],
    'dhokla': [('Dhokla', 0), ('Khaman', 0)],
    'bhel_puri': [('Bhelpuri', 0)],
    'sev_puri': [('Sev Puri', 0)],
    'dabeli': [('Dabeli', 0)],
    'kachori': [('Kachori', 0)],
    'onion_pakoda': [('Pakora', 0)],
    'aloo_tikki': [('Aloo tikki', 0), ('Aloo Tikki', 0)],
    'kathi_roll': [('Kathi roll', 0), ('Kati roll', 0)],
    'veg_momos': [('Momo', 0)],
    'maggi': [('Maggi instant noodles', 0)],
    'jalebi': [('Jalebi', 0)],
    'rasgulla': [('Rasgulla', 0)],
    'rasmalai': [('Rasmalai', 0)],
    'besan_ladoo': [('Besan laddu', 0)],
    'boondi_ladoo': [('Boondi laddu', 0)],
    'kaju_katli': [('Kaju katli', 0)],
    'gajar_halwa': [('Gajar ka halwa', 0), ('Carrot Halwa', 0)],
    'kulfi': [('Kulfi', 0)],
    'sweet_lassi': [('Lassi', 0)],
    'sugarcane_juice': [('Sugarcane juice', 0)],
    # A few foreign dishes common in India, capped at FOREIGN_MAX so Indian dishes dominate training.
    'pizza': [('Pizzas', 0)],
    'burger': [('Hamburgers', 1)],
    'french_fries': [('French fries', 0)],
    'pasta': [('Spaghetti', 0)],
    'hakka_noodles': [('Chow mein', 0)],
    'club_sandwich': [('Sandwiches', 0)],
    'caesar_salad': [('Caesar salad', 0)],
    'fried_chicken': [('Fried chicken', 0)],
    'grilled_chicken': [('Grilled chicken', 0)],
    'shawarma': [('Shawarma', 0)],
    'chocolate_cake': [('Chocolate cakes', 0)],
    'ice_cream': [('Ice cream', 0)],
    'donut': [('Doughnuts', 0)],
    # Indian sweets (uncapped) — the main dessert focus.
    'kaju_katli': [('Kaju katli', 0)],
    'boondi_ladoo': [('Boondi laddu', 0), ('Motichoor laddu', 0)],
    'peda': [('Peda', 1)],
    'barfi': [('Barfi', 1)],
    'coconut_barfi': [('Coconut barfi', 0)],
    'kalakand': [('Kalakand', 0)],
    'sandesh': [('Sandesh', 1)],
    'modak': [('Modak', 1)],
    'shrikhand': [('Shrikhand', 0)],
    'rabri': [('Rabri', 1)],
    'falooda': [('Falooda', 0)],
    'basundi': [('Basundi', 0)],
    'malpua': [('Malpua', 1)],
    'ghevar': [('Ghevar', 0)],
    'chikki': [('Chikki', 1)],
    # Western desserts and drinks, capped like other foreign dishes.
    'brownie': [('Brownies', 0)],
    'cupcake': [('Cupcakes', 0)],
    'cheesecake': [('Cheesecakes', 0)],
    'cookies': [('Chocolate chip cookies', 0)],
    'chocolate_milkshake': [('Milkshakes', 0)],
    'cold_coffee': [('Iced coffee', 0)],
    'fresh_juice': [('Orange juice', 0)],
    'watermelon_juice': [('Watermelon juice', 1)],
    'iced_tea': [('Iced tea', 0)],
}

PHOTO_MIMES = {'image/jpeg', 'image/png', 'image/webp'}


def fetch(url: str, timeout: int, data: bytes | None = None) -> bytes:
    """GET (or POST when data is given) with retries for rate limits and brief network drops."""
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504):
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead):
            pass
        time.sleep(min(60, 5 * (attempt + 1)))
    raise RuntimeError(f'Gave up after retries: {url}')


def api(**params):
    params.update(format='json', formatversion=2)
    # POST, because batches of long file titles can exceed the URL length limit.
    return json.loads(fetch(API, timeout=30, data=urllib.parse.urlencode(params).encode()))


def category_members(name: str, member_type: str) -> list[dict]:
    members, cont = [], {}
    while True:
        r = api(action='query', list='categorymembers', cmtitle=f'Category:{name}',
                cmtype=member_type, cmlimit=500, **cont)
        members += r['query']['categorymembers']
        if 'continue' not in r:
            return members
        cont = r['continue']
        time.sleep(0.5)


def resolve_redirect(name: str) -> str:
    """Commons marks renamed categories with a {{Category redirect}} template instead of a real redirect."""
    r = api(action='query', titles=f'Category:{name}', prop='revisions', rvprop='content', rvslots='main')
    page = r['query']['pages'][0]
    text = (page.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', '')
    m = re.search(r'\{\{\s*(?:Category redirect|Cat redirect)\s*\|\s*(?:Category:)?([^}|]+)', text, re.I)
    return m.group(1).strip() if m else name


def files_in(name: str, depth: int) -> set[str]:
    name = resolve_redirect(name)
    titles = {m['title'] for m in category_members(name, 'file')}
    if depth > 0:
        for sub in category_members(name, 'subcat'):
            titles |= files_in(sub['title'].removeprefix('Category:'), depth - 1)
    return titles


def license_ok(short_name: str, allow_sa: bool) -> bool:
    s = short_name.lower().replace('_', ' ')
    if re.search(r'\b(nc|nd)\b', s) or 'non-commercial' in s:
        return False
    if s.startswith('cc0') or s.startswith('public domain') or s.startswith('pd'):
        return True
    if s.startswith('cc by-sa') or s.startswith('cc-by-sa'):
        return allow_sa
    return s.startswith('cc by') or s.startswith('cc-by')


def strip_html(s: str) -> str:
    return re.sub(r'<[^>]+>', '', s or '').strip()


def file_info(titles: list[str]) -> list[dict]:
    infos = []
    for i in range(0, len(titles), 50):
        r = api(action='query', titles='|'.join(titles[i:i + 50]), prop='imageinfo',
                iiprop='url|mime|extmetadata', iiurlwidth=THUMB_WIDTH)
        infos += r['query']['pages']
        time.sleep(0.5)
    return infos


def download(url: str, dest: Path) -> bool:
    try:
        dest.write_bytes(fetch(url, timeout=60))
        return True
    except Exception as e:
        print(f'    skipped {url}: {e}', flush=True)
        return False


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--no-sa', action='store_true', help='Exclude CC BY-SA photos')
    p.add_argument('--only', nargs='*', help='Only these food ids')
    args = p.parse_args()

    wanted = {k: v for k, v in CATEGORIES.items() if not args.only or k in args.only}

    print('Listing category files…', flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    cache_path = OUT / 'listing_cache.json'
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    titles_by_food: dict[str, set[str]] = {}
    for food_id, cats in wanted.items():
        key = f'{food_id}:{cats}'
        if key not in cache:
            titles = set()
            for name, depth in cats:
                titles |= files_in(name, depth)
            cache[key] = sorted(titles)
            cache_path.write_text(json.dumps(cache))
        titles_by_food[food_id] = set(cache[key])
        print(f'  {food_id}: {len(titles_by_food[food_id])} files', flush=True)

    # A photo filed under two dishes (e.g. idli with sambar) would teach the model conflicting labels.
    owners = defaultdict(set)
    for food_id, titles in titles_by_food.items():
        for t in titles:
            owners[t].add(food_id)
    shared = {t for t, o in owners.items() if len(o) > 1}

    attribution_path = OUT / 'ATTRIBUTION.csv'
    existing = set()
    if attribution_path.exists():
        with attribution_path.open() as f:
            existing = {row['file'] for row in csv.DictReader(f)}
    new_file = not attribution_path.exists()
    with attribution_path.open('a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['file', 'food_id', 'title', 'author', 'license', 'source'])
        if new_file:
            writer.writeheader()
        summary = {}
        for food_id, titles in titles_by_food.items():
            limit = FOREIGN_MAX if food_id in FOREIGN else MAX_PER_CLASS
            candidates = sorted(titles - shared)[:limit * 2]
            kept = rejected = 0
            folder = OUT / food_id
            folder.mkdir(exist_ok=True)
            for page in file_info(candidates):
                if kept >= limit:
                    break
                ii = (page.get('imageinfo') or [None])[0]
                if not ii or ii.get('mime') not in PHOTO_MIMES:
                    continue
                meta = ii.get('extmetadata', {})
                lic = meta.get('LicenseShortName', {}).get('value', '')
                if not license_ok(lic, allow_sa=not args.no_sa):
                    rejected += 1
                    continue
                rel = f'{food_id}/{page["pageid"]}.jpg'
                if rel not in existing:
                    if not download(ii.get('thumburl') or ii['url'], OUT / rel):
                        continue
                    writer.writerow({
                        'file': rel,
                        'food_id': food_id,
                        'title': page['title'],
                        'author': strip_html(meta.get('Artist', {}).get('value', '')),
                        'license': lic,
                        'source': ii.get('descriptionurl', ''),
                    })
                    f.flush()
                    time.sleep(0.2)
                kept += 1
            summary[food_id] = (kept, rejected)
            print(f'  {food_id}: kept {kept}, rejected {rejected} (license)', flush=True)

    print(f'\nSkipped {len(shared)} photos filed under more than one dish.')
    print('Photos per dish:')
    for food_id, (kept, _) in sorted(summary.items(), key=lambda t: t[1][0]):
        print(f'  {kept:4d}  {food_id}')


if __name__ == '__main__':
    main()
