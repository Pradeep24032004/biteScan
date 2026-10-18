"""Builds nutrition-label training examples for the LFM2.5-VL fine-tune.

Source: Open Food Facts "nutrient-detection-layout" (CC BY-SA 3.0, hand-checked token tags on
real label photos). Each example becomes: <label photo> -> "Energy: 536 kcal\\nProtein: 6.8 g\\n...".

    .venv/bin/python build_label_dataset.py
Writes data/labels/<split>/<barcode>_<image>.jpg and data/labels/labels.json.
"""

import glob
import io
import json
import re
from pathlib import Path

import pyarrow.parquet as pq
from PIL import Image

RAW = Path('data/labels_off/raw/data')
OUT = Path('data/labels')
MAX_SIDE = 1024  # labels are read at higher resolution than dish photos (matches the app)

# Output order and units, matching what the app shows.
FIELDS = [
    ('ENERGY_KCAL_100G', 'Energy', 'kcal'),
    ('PROTEINS_100G', 'Protein', 'g'),
    ('CARBOHYDRATES_100G', 'Carbohydrate', 'g'),
    ('SUGARS_100G', 'Total sugars', 'g'),
    ('FAT_100G', 'Fat', 'g'),
    ('SATURATED_FAT_100G', 'Saturated fat', 'g'),
    ('FIBER_100G', 'Fibre', 'g'),
    ('SODIUM_100G', 'Sodium', 'mg'),
]


def numbers(text: str) -> list[float]:
    return [float(n.replace(',', '.')) for n in re.findall(r'\d+(?:[.,]\d+)?', text)]


def spans(tokens, tags, names):
    """Collects the text of each tagged entity (B- token plus following I- tokens)."""
    out: dict[str, str] = {}
    current = None
    for tok, tag in zip(tokens, tags):
        label = names[tag]
        if label.startswith('B-'):
            current = label[2:]
            out.setdefault(current, '')
            out[current] += tok
        elif label.startswith('I-') and current == label[2:]:
            out[current] += tok
        else:
            current = None
    return out


def values_from(found: dict[str, str]) -> dict[str, float]:
    v: dict[str, float] = {}
    if 'ENERGY_KCAL_100G' in found:
        # Spans like "203 kJ/48 kcal" — the number right before "kcal" wins.
        m = re.search(r'(\d+(?:[.,]\d+)?)\s*kcal', found['ENERGY_KCAL_100G'], re.I)
        nums = numbers(found['ENERGY_KCAL_100G'])
        if m:
            v['ENERGY_KCAL_100G'] = float(m.group(1).replace(',', '.'))
        elif nums:
            v['ENERGY_KCAL_100G'] = nums[-1]
    elif 'ENERGY_KJ_100G' in found and numbers(found['ENERGY_KJ_100G']):
        v['ENERGY_KCAL_100G'] = round(numbers(found['ENERGY_KJ_100G'])[0] / 4.184)
    for key in ('PROTEINS_100G', 'CARBOHYDRATES_100G', 'SUGARS_100G', 'FAT_100G', 'SATURATED_FAT_100G', 'FIBER_100G'):
        if key in found and numbers(found[key]):
            v[key] = numbers(found[key])[0]
    if 'SODIUM_100G' in found and numbers(found['SODIUM_100G']):
        n = numbers(found['SODIUM_100G'])[0]
        v['SODIUM_100G'] = n if 'mg' in found['SODIUM_100G'].lower() else n * 1000
    elif 'SALT_100G' in found and numbers(found['SALT_100G']):
        v['SODIUM_100G'] = round(numbers(found['SALT_100G'])[0] / 2.5 * 1000)
    return v


def plausible(v: dict[str, float]) -> bool:
    kcal = v.get('ENERGY_KCAL_100G')
    macros = [v.get(k) for k in ('PROTEINS_100G', 'CARBOHYDRATES_100G', 'FAT_100G')]
    if kcal is None or not (0 < kcal <= 900) or sum(m is not None for m in macros) < 2:
        return False
    if any(m is not None and not (0 <= m <= 100) for m in macros):
        return False
    if all(m is not None for m in macros):
        p, c, f = macros
        est = 4 * p + 4 * c + 9 * f
        if est > 0 and abs(est - kcal) / max(kcal, 1) > 0.35:
            return False
    return True


def fmt(x: float) -> str:
    return str(int(x)) if float(x).is_integer() else f'{x:.1f}'.rstrip('0').rstrip('.')


def answer_text(v: dict[str, float]) -> str:
    return '\n'.join(f'{label}: {fmt(v[key])} {unit}' for key, label, unit in FIELDS if key in v)


def main():
    examples, skipped = [], 0
    for split in ('train', 'test'):
        (OUT / split).mkdir(parents=True, exist_ok=True)
        for path in sorted(glob.glob(str(RAW / f'{split}-*.parquet'))):
            table = pq.read_table(path)
            label_names = json.loads(table.schema.metadata[b'huggingface'])['info']['features']['ner_tags']['feature']['names']
            for row in table.to_pylist():
                meta = row['meta']
                if meta.get('no_nutrition_table'):
                    skipped += 1
                    continue
                v = values_from(spans(row['tokens'], row['ner_tags'], label_names))
                if not plausible(v):
                    skipped += 1
                    continue
                img = Image.open(io.BytesIO(row['image']['bytes'])).convert('RGB')
                img.thumbnail((MAX_SIDE, MAX_SIDE))
                name = f"{meta['barcode']}_{meta['image_id']}.jpg"
                img.save(OUT / split / name, quality=90)
                examples.append({'file': f'labels/{split}/{name}', 'split': split, 'answer': answer_text(v)})
    (OUT / 'labels.json').write_text(json.dumps(examples, indent=1))
    n_train = sum(e['split'] == 'train' for e in examples)
    print(f'{len(examples)} label examples ({n_train} train / {len(examples) - n_train} test), skipped {skipped}')
    print('example answer:\n' + examples[0]['answer'])


if __name__ == '__main__':
    main()
