"""Builds one labelled image list from Wikimedia Commons photos plus our own Bangalore photos.

Class names are the folder names, which must be food ids from src/data/foods.ts,
so a model prediction can be looked up directly in the app.
"""

import random
import re
from collections import Counter
from pathlib import Path

from PIL import Image
from pillow_heif import register_heif_opener
from torch.utils.data import Dataset

register_heif_opener()  # iPhone photos are usually HEIC

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}


def slugify(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def class_id(folder_name: str) -> str:
    return slugify(folder_name)


def scan_class_folders(root: Path) -> list[tuple[Path, str]]:
    """Finds <root>/**/<class>/<image> files. The class is the image's parent folder."""
    samples = []
    for path in root.rglob('*'):
        if path.suffix.lower() in IMAGE_EXTS and not path.name.startswith('.'):
            samples.append((path, class_id(path.parent.name)))
    return samples


def split_samples(samples, val_fraction=0.1, seed=0):
    """Stratified split so every class, even small Bangalore ones, has validation images."""
    by_class: dict[str, list] = {}
    for s in samples:
        by_class.setdefault(s[1], []).append(s)
    rng = random.Random(seed)
    train, val = [], []
    for items in by_class.values():
        rng.shuffle(items)
        n_val = max(1, round(len(items) * val_fraction)) if len(items) >= 5 else 0
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    return train, val


def limit_per_class(samples, limit: int, seed=0):
    rng = random.Random(seed)
    shuffled = samples[:]
    rng.shuffle(shuffled)
    counts: Counter = Counter()
    kept = []
    for s in shuffled:
        if counts[s[1]] < limit:
            kept.append(s)
            counts[s[1]] += 1
    return kept


class FoodDataset(Dataset):
    def __init__(self, samples, classes, transform):
        self.samples = samples
        self.class_to_idx = {c: i for i, c in enumerate(classes)}
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, i):
        # Web-scraped datasets contain some broken files; skip forward to the next one.
        for offset in range(len(self.samples)):
            path, label = self.samples[(i + offset) % len(self.samples)]
            try:
                img = Image.open(path).convert('RGB')
                return self.transform(img), self.class_to_idx[label]
            except Exception:
                continue
        raise RuntimeError('No readable images in dataset')
