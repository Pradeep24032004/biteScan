"""Shared helpers for fine-tuning LiquidAI LFM2.5-VL as the BiteScan dish recogniser.

The model answers in words, so training targets are the dish names from src/data/foods.ts and
predictions are mapped back to food ids. The train/val split is identical to train.py's, so the
results compare directly with the EfficientNet runs.
"""

import difflib
import re
import socket
import sys
from collections import Counter
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
ROOT = ML_DIR.parent
sys.path.insert(0, str(ML_DIR))

from dataset import scan_class_folders, split_samples  # noqa: E402

MODEL_ID = 'LiquidAI/LFM2.5-VL-450M'
PROMPT = 'What Indian dish is in this photo? Reply with only the dish name.'
DATA_DIRS = [ML_DIR / 'data/commons', ML_DIR / 'data/openverse', ML_DIR / 'data/bangalore']
MIN_IMAGES = 20


def force_ipv4():
    """This network advertises IPv6 but can't route it; Hugging Face downloads stall without this."""
    original = socket.getaddrinfo
    socket.getaddrinfo = lambda host, port, family=0, *a, **k: original(host, port, socket.AF_INET, *a, **k)


def load_foods() -> dict[str, dict]:
    """food id -> {'name', 'aliases'} parsed from src/data/foods.ts."""
    src = (ROOT / 'src/data/foods.ts').read_text()
    foods = {}
    for m in re.finditer(r"\{ id: '(\w+)', name: '([^']+)'(?:, aliases: \[([^\]]*)\])?", src):
        aliases = re.findall(r"'([^']+)'", m.group(3) or '')
        foods[m.group(1)] = {'name': m.group(2), 'aliases': aliases}
    return foods


def load_split():
    """Same samples, class filter and split as train.py (seeded)."""
    samples = [s for root in DATA_DIRS for s in scan_class_folders(root)]
    counts = Counter(label for _, label in samples)
    samples = [s for s in samples if counts[s[1]] >= MIN_IMAGES]
    classes = sorted({label for _, label in samples})
    train, val = split_samples(samples)
    return train, val, classes


def normalise(s: str) -> str:
    s = re.sub(r'\(.*?\)', ' ', s.lower())
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


class AnswerMatcher:
    """Maps the model's free-text answer to one of the trained food ids."""

    def __init__(self, classes: list[str], foods: dict[str, dict]):
        self.lookup: dict[str, str] = {}
        for food_id in classes:
            food = foods[food_id]
            for name in [food['name'], *food['aliases'], food_id.replace('_', ' ')]:
                self.lookup.setdefault(normalise(name), food_id)
        self.keys = list(self.lookup)

    def match(self, answer: str) -> str | None:
        a = normalise(answer.splitlines()[0] if answer.strip() else '')
        if not a:
            return None
        if a in self.lookup:
            return self.lookup[a]
        close = difflib.get_close_matches(a, self.keys, n=1, cutoff=0.75)
        if close:
            return self.lookup[close[0]]
        # e.g. "a plate of masala dosa with chutney" -> longest known name contained in the answer
        contained = [k for k in self.keys if re.search(rf'\b{re.escape(k)}\b', a)]
        return self.lookup[max(contained, key=len)] if contained else None
