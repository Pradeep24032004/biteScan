"""Checks the GGUF (llama.cpp) export of the fine-tuned model on the shared validation split.

This is the same runtime the iPhone uses, so it catches accuracy lost in conversion/quantisation.

    .venv/bin/python lfm/evaluate_gguf.py runs/lfm-kaggle/gguf/model.gguf runs/lfm-kaggle/gguf/mmproj.gguf --limit 200
"""

import argparse
import json
import random
import subprocess
import tempfile
import time
from pathlib import Path

from PIL import Image

from common import ML_DIR, PROMPT, AnswerMatcher, load_foods, load_split

CLI = ML_DIR / 'tools/llama.cpp/build/bin/llama-mtmd-cli'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('model')
    p.add_argument('mmproj')
    p.add_argument('--limit', type=int, default=200)
    p.add_argument('--out')
    args = p.parse_args()

    _, val, classes = load_split()
    val = random.Random(0).sample(val, min(args.limit, len(val)))
    matcher = AnswerMatcher(classes, load_foods())

    correct, start = 0, time.time()
    with tempfile.TemporaryDirectory() as tmp:
        for i, (path, label) in enumerate(val):
            # Same 512px cap as training/evaluation in PyTorch.
            image = Image.open(path).convert('RGB')
            image.thumbnail((512, 512))
            img_path = Path(tmp) / 'img.jpg'
            image.save(img_path, quality=95)
            out = subprocess.run(
                [str(CLI), '-m', args.model, '--mmproj', args.mmproj, '--image', str(img_path),
                 '-p', PROMPT, '-n', '16', '--temp', '0', '--no-warmup'],
                capture_output=True, text=True, stdin=subprocess.DEVNULL,
            )
            answer = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else ''
            correct += matcher.match(answer) == label
            if (i + 1) % 25 == 0:
                print(f'  {i + 1}/{len(val)}  acc {correct / (i + 1):.1%}  last answer: {answer!r}', flush=True)

    result = {'model': args.model, 'images': len(val), 'top1': correct / len(val),
              'seconds_per_image_incl_load': (time.time() - start) / len(val)}
    print(f"GGUF top-1 {result['top1']:.1%} on {len(val)} images")
    if args.out:
        Path(args.out).write_text(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
