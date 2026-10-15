"""LoRA fine-tune of LiquidAI LFM2.5-VL-450M to name Indian dishes from photos.

Each training example is: <photo> + PROMPT  ->  "<dish name from foods.ts>".
Only the answer tokens are trained on. LoRA adapters go on the vision tower, the
vision-to-language projector and the language model.

    .venv/bin/python lfm/train.py --name lfm-v1 --epochs 2
"""

import argparse
import json
import math
import random
import time
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from PIL import Image
from torchvision import transforms
from transformers import AutoModelForImageTextToText, AutoProcessor

from common import ML_DIR, MODEL_ID, PROMPT, force_ipv4, load_foods, load_split

MAX_IMAGE_SIDE = 512  # the model's native resolution; matches evaluate.py and on-device use

augment = transforms.Compose([
    transforms.RandomResizedCrop(MAX_IMAGE_SIDE, scale=(0.5, 1.0), ratio=(0.75, 1.33)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.25, contrast=0.2, saturation=0.2, hue=0.02),
])


def encode(processor, image: Image.Image, answer: str, device):
    """Tokenises one example and masks everything except the answer for the loss."""
    prompt = [{'role': 'user', 'content': [{'type': 'image', 'image': image}, {'type': 'text', 'text': PROMPT}]}]
    full = prompt + [{'role': 'assistant', 'content': [{'type': 'text', 'text': answer}]}]
    kwargs = dict(return_tensors='pt', return_dict=True, tokenize=True)
    prompt_len = processor.apply_chat_template(prompt, add_generation_prompt=True, **kwargs)['input_ids'].shape[1]
    batch = processor.apply_chat_template(full, **kwargs)
    labels = batch['input_ids'].clone()
    labels[:, :prompt_len] = -100
    batch['labels'] = labels
    return {k: v.to(device) for k, v in batch.items()}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--name', required=True)
    p.add_argument('--epochs', type=float, default=2)
    p.add_argument('--lr', type=float, default=2e-4)
    p.add_argument('--rank', type=int, default=16)
    p.add_argument('--grad-accum', type=int, default=8)
    p.add_argument('--limit', type=int, default=0, help='Use only this many training images (smoke test)')
    args = p.parse_args()

    force_ipv4()
    torch.manual_seed(0)
    out_dir = ML_DIR / 'runs' / args.name
    out_dir.mkdir(parents=True, exist_ok=True)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'

    foods = load_foods()
    train, _, classes = load_split()
    if args.limit:
        train = random.Random(0).sample(train, args.limit)

    model = AutoModelForImageTextToText.from_pretrained(MODEL_ID, dtype=torch.bfloat16).to(device)
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    lora = LoraConfig(
        r=args.rank,
        lora_alpha=args.rank * 2,
        lora_dropout=0.05,
        target_modules=['q_proj', 'k_proj', 'v_proj', 'out_proj', 'in_proj', 'w1', 'w2', 'w3',
                        'fc1', 'fc2', 'linear_1', 'linear_2'],
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    trainable = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(trainable, lr=args.lr, weight_decay=0.0)
    total_steps = math.ceil(len(train) * args.epochs / args.grad_accum)
    warmup = max(1, total_steps // 20)
    scheduler = torch.optim.lr_scheduler.LambdaLR(
        optimizer,
        lambda s: (s + 1) / warmup if s < warmup else 0.5 * (1 + math.cos(math.pi * (s - warmup) / max(1, total_steps - warmup))),
    )

    rng = random.Random(0)
    order: list = []
    examples = math.ceil(len(train) * args.epochs)
    model.train()
    start, running, step = time.time(), 0.0, 0
    for i in range(examples):
        if not order:
            order = train[:]
            rng.shuffle(order)
        path, label = order.pop()
        try:
            image = augment(Image.open(path).convert('RGB'))
        except Exception:
            continue
        batch = encode(processor, image, foods[label]['name'], device)
        loss = model(**batch).loss / args.grad_accum
        loss.backward()
        running += loss.item()
        if (i + 1) % args.grad_accum == 0:
            torch.nn.utils.clip_grad_norm_(trainable, 1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad(set_to_none=True)
            step += 1
            if step % 25 == 0:
                elapsed = time.time() - start
                eta = elapsed / (i + 1) * (examples - i - 1)
                print(f'step {step}/{total_steps}  loss {running / 25:.3f}  '
                      f'({(i + 1) / elapsed:.1f} img/s, ~{eta / 60:.0f} min left)', flush=True)
                running = 0.0

    model.save_pretrained(out_dir)
    (out_dir / 'train_args.json').write_text(json.dumps({**vars(args), 'classes': classes, 'prompt': PROMPT}, indent=2))
    print(f'Saved LoRA adapter to {out_dir} in {(time.time() - start) / 60:.0f} min')


if __name__ == '__main__':
    main()
