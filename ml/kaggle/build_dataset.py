"""Stages photos + manifest.json in kaggle/dataset/ for upload to the Kaggle dataset.

    .venv/bin/python kaggle/build_dataset.py
    .venv/bin/kaggle datasets version -p kaggle/dataset --dir-mode zip -m "<what changed>"

The manifest holds the exact train/val split (same as lfm/common.load_split), so Kaggle and local
evaluations stay comparable.
"""

import json
import shutil
import sys
from collections import Counter
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_DIR / 'lfm'))
from common import DATA_DIRS, load_foods, load_split  # noqa: E402

OUT = ML_DIR / 'kaggle/dataset'


def main():
    train, val, classes = load_split()
    foods = load_foods()
    data_root = ML_DIR / 'data'

    # Copy only the photos actually used, keeping their data/<source>/<class>/ layout.
    for sub in [d.name for d in DATA_DIRS]:
        shutil.rmtree(OUT / sub, ignore_errors=True)
    for path, _ in train + val:
        dest = OUT / Path(path).relative_to(data_root)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            shutil.copy2(path, dest)
    for sub in ('commons', 'openverse'):
        credits = data_root / sub / 'ATTRIBUTION.csv'
        if credits.exists():
            shutil.copy2(credits, OUT / sub / 'ATTRIBUTION.csv')

    rel = lambda p: str(Path(p).relative_to(data_root))
    manifest = {
        'classes': classes,
        'names': {c: foods[c]['name'] for c in classes},
        'aliases': {c: foods[c]['aliases'] for c in classes},
        'train': [[rel(p), l] for p, l in train],
        'val': [[rel(p), l] for p, l in val],
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest))
    counts = Counter(l for _, l in train + val)
    print(f'{len(classes)} classes, {len(train)} train / {len(val)} val photos')
    print('smallest:', ', '.join(f'{c} {n}' for c, n in sorted(counts.items(), key=lambda t: t[1])[:8]))


if __name__ == '__main__':
    main()
