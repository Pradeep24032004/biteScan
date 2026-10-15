"""Measures LFM2.5-VL dish-recognition accuracy on the shared validation split.

    .venv/bin/python lfm/evaluate.py                         # base model, zero-shot
    .venv/bin/python lfm/evaluate.py --adapter runs/lfm-v1   # with our LoRA fine-tune
"""

import argparse
import json
import random
import time
from collections import Counter
from pathlib import Path

import torch
from PIL import Image

from common import MODEL_ID, PROMPT, AnswerMatcher, force_ipv4, load_foods, load_split


def load_model(adapter: str | None):
    from transformers import AutoModelForImageTextToText, AutoProcessor

    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    model = AutoModelForImageTextToText.from_pretrained(MODEL_ID, dtype=torch.bfloat16).to(device)
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    if adapter:
        from peft import PeftModel

        model = PeftModel.from_pretrained(model, adapter).merge_and_unload()
    model.eval()
    return model, processor


def ask(model, processor, image: Image.Image) -> str:
    conversation = [{'role': 'user', 'content': [{'type': 'image', 'image': image}, {'type': 'text', 'text': PROMPT}]}]
    inputs = processor.apply_chat_template(
        conversation, add_generation_prompt=True, return_tensors='pt', return_dict=True, tokenize=True
    ).to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=16, do_sample=False)
    return processor.batch_decode(out[:, inputs['input_ids'].shape[1]:], skip_special_tokens=True)[0].strip()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--adapter', help='LoRA adapter folder from lfm/train.py')
    p.add_argument('--limit', type=int, default=0, help='Evaluate on a random subset (quick check)')
    p.add_argument('--out', help='Where to write metrics JSON')
    args = p.parse_args()

    force_ipv4()
    _, val, classes = load_split()
    if args.limit:
        val = random.Random(0).sample(val, min(args.limit, len(val)))
    matcher = AnswerMatcher(classes, load_foods())
    model, processor = load_model(args.adapter)

    correct, total, start = 0, 0, time.time()
    per_class_total, per_class_correct = Counter(), Counter()
    unmatched, errors = 0, []
    for i, (path, label) in enumerate(val):
        image = Image.open(path).convert('RGB')
        image.thumbnail((512, 512))
        answer = ask(model, processor, image)
        predicted = matcher.match(answer)
        unmatched += predicted is None
        hit = predicted == label
        correct += hit
        total += 1
        per_class_total[label] += 1
        per_class_correct[label] += hit
        if not hit and len(errors) < 40:
            errors.append({'file': str(path), 'label': label, 'answer': answer, 'matched': predicted})
        if (i + 1) % 50 == 0:
            print(f'  {i + 1}/{len(val)}  acc {correct / total:.1%}  ({(time.time() - start) / total:.2f}s/image)', flush=True)

    per_class = {c: round(per_class_correct[c] / per_class_total[c], 3) for c in per_class_total}
    result = {
        'model': MODEL_ID,
        'adapter': args.adapter,
        'images': total,
        'top1': correct / total,
        'unmatched_answers': unmatched,
        'seconds_per_image': (time.time() - start) / total,
        'per_class_top1': dict(sorted(per_class.items(), key=lambda t: t[1])),
        'sample_errors': errors,
    }
    print(f"top-1 {result['top1']:.1%} on {total} images; {unmatched} answers matched no dish; "
          f"{result['seconds_per_image']:.2f}s/image")
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
