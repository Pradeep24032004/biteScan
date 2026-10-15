# BiteScan: LoRA fine-tune of LiquidAI LFM2.5-VL-450M to name Indian dishes from photos (Kaggle GPU).
# Generated from ml/kaggle/train_kaggle.py in the BiteScan repo — edit there and re-push.
# Same train/val split as the local runs (manifest.json), so accuracy compares directly.

import subprocess, sys
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'transformers==5.19.0', 'peft==0.21.2'], check=True)
# Kaggle's preinstalled torchao (0.10) is too old for peft, and we don't use it.
subprocess.run([sys.executable, '-m', 'pip', 'uninstall', '-y', '-q', 'torchao'], check=False)

import difflib, json, math, random, re, time
from collections import Counter
from pathlib import Path

import torch
if not torch.cuda.is_available():
    subprocess.run(['nvidia-smi'])
    raise SystemExit('No GPU attached. In the notebook settings choose Accelerator: GPU (needs a phone-verified Kaggle account).')
from peft import LoraConfig, get_peft_model
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from transformers import AutoModelForImageTextToText, AutoProcessor

MODEL_ID = 'LiquidAI/LFM2.5-VL-450M'
PROMPT = 'What Indian dish is in this photo? Reply with only the dish name.'
EPOCHS, BATCH, GRAD_ACCUM, LR, RANK = 3, 4, 4, 2e-4, 16  # 4 x 4 = 16 photos per update; fits a 15 GB T4
MAX_SIDE = 512
OUT = Path('/kaggle/working')

# ---------- data ----------
manifest_path = next(Path('/kaggle/input').rglob('manifest.json'))
manifest = json.loads(manifest_path.read_text())
# Fail fast if Kaggle attached an older dataset version (it pins versions per notebook).
EXPECTED_CLASSES = 104
assert len(manifest['classes']) == EXPECTED_CLASSES, f"Dataset has {len(manifest['classes'])} classes, expected {EXPECTED_CLASSES}: wrong dataset version attached"
print('classes:', len(manifest['classes']), '| train', len(manifest['train']), '| val', len(manifest['val']))
first = manifest['train'][0][0]
image_root = next(p for p in Path('/kaggle/input').rglob(Path(first).name) if str(p).endswith(first)).parents[len(Path(first).parts) - 1]
print('images under', image_root, '| GPU:', torch.cuda.get_device_name(0))
names = manifest['names']

augment = transforms.Compose([
    transforms.RandomResizedCrop(MAX_SIDE, scale=(0.5, 1.0), ratio=(0.75, 1.33)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.25, contrast=0.2, saturation=0.2, hue=0.02),
])
processor = AutoProcessor.from_pretrained(MODEL_ID)
PAD_ID = processor.tokenizer.pad_token_id or 0


def encode(image, answer):
    prompt = [{'role': 'user', 'content': [{'type': 'image', 'image': image}, {'type': 'text', 'text': PROMPT}]}]
    full = prompt + [{'role': 'assistant', 'content': [{'type': 'text', 'text': answer}]}]
    kw = dict(return_tensors='pt', return_dict=True, tokenize=True)
    prompt_len = processor.apply_chat_template(prompt, add_generation_prompt=True, **kw)['input_ids'].shape[1]
    enc = processor.apply_chat_template(full, **kw)
    labels = enc['input_ids'].clone()
    labels[:, :prompt_len] = -100
    enc['labels'] = labels
    return enc


class TrainSet(Dataset):
    def __init__(self, rows):
        self.rows = rows

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        rel, label = self.rows[i]
        image = augment(Image.open(image_root / rel).convert('RGB'))
        return encode(image, names[label])


def collate(items):
    """Right-pads text; images are already padded to a fixed patch count by the processor."""
    longest = max(it['input_ids'].shape[1] for it in items)
    batch = {}
    for key, pad in (('input_ids', PAD_ID), ('attention_mask', 0), ('labels', -100)):
        batch[key] = torch.cat([
            torch.nn.functional.pad(it[key], (0, longest - it[key].shape[1]), value=pad) for it in items
        ])
    for key in ('pixel_values', 'pixel_attention_mask', 'spatial_shapes'):
        batch[key] = torch.cat([it[key] for it in items])
    return batch


# ---------- model ----------
bf16 = torch.cuda.is_bf16_supported()
model = AutoModelForImageTextToText.from_pretrained(MODEL_ID, dtype=torch.bfloat16 if bf16 else torch.float32).cuda()
# Recompute activations in the backward pass instead of storing them: much less GPU memory.
model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
model.enable_input_require_grads()
model = get_peft_model(model, LoraConfig(
    r=RANK, lora_alpha=RANK * 2, lora_dropout=0.05,
    target_modules=['q_proj', 'k_proj', 'v_proj', 'out_proj', 'in_proj', 'w1', 'w2', 'w3',
                    'fc1', 'fc2', 'linear_1', 'linear_2'],
))
model.print_trainable_parameters()

loader = DataLoader(TrainSet(manifest['train']), batch_size=BATCH, shuffle=True, num_workers=4,
                    collate_fn=collate, drop_last=True, persistent_workers=True)
trainable = [p for p in model.parameters() if p.requires_grad]
optimizer = torch.optim.AdamW(trainable, lr=LR)
total_steps = EPOCHS * len(loader) // GRAD_ACCUM
warmup = max(1, total_steps // 20)
scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lambda s: (s + 1) / warmup if s < warmup else
                                              0.5 * (1 + math.cos(math.pi * (s - warmup) / max(1, total_steps - warmup))))
scaler = torch.amp.GradScaler(enabled=not bf16)

start, step = time.time(), 0
model.train()
for epoch in range(EPOCHS):
    running = 0.0
    for i, batch in enumerate(loader):
        batch = {k: v.cuda(non_blocking=True) for k, v in batch.items()}
        with torch.autocast('cuda', dtype=torch.bfloat16 if bf16 else torch.float16):
            loss = model(**batch).loss / GRAD_ACCUM
        scaler.scale(loss).backward()
        running += loss.item()
        if (i + 1) % GRAD_ACCUM == 0:
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(trainable, 1.0)
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            optimizer.zero_grad(set_to_none=True)
            step += 1
            if step % 50 == 0:
                print(f'epoch {epoch + 1} step {step}/{total_steps} loss {running / 50:.3f} '
                      f'({(time.time() - start) / 60:.1f} min)', flush=True)
                running = 0.0

model.save_pretrained(OUT / 'lora_adapter')
print(f'training done in {(time.time() - start) / 60:.1f} min')


# ---------- evaluate on the shared validation split ----------
def normalise(s):
    s = re.sub(r'\(.*?\)', ' ', s.lower())
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


lookup = {}
for food_id in manifest['classes']:
    for n in [names[food_id], *manifest['aliases'][food_id], food_id.replace('_', ' ')]:
        lookup.setdefault(normalise(n), food_id)


def match(answer):
    a = normalise(answer.splitlines()[0] if answer.strip() else '')
    if not a:
        return None
    if a in lookup:
        return lookup[a]
    close = difflib.get_close_matches(a, list(lookup), n=1, cutoff=0.75)
    if close:
        return lookup[close[0]]
    contained = [k for k in lookup if re.search(rf'\b{re.escape(k)}\b', a)]
    return lookup[max(contained, key=len)] if contained else None


model = model.merge_and_unload()
model.eval()
correct, per_total, per_correct, errors, t0 = 0, Counter(), Counter(), [], time.time()
for rel, label in manifest['val']:
    image = Image.open(image_root / rel).convert('RGB')
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    conv = [{'role': 'user', 'content': [{'type': 'image', 'image': image}, {'type': 'text', 'text': PROMPT}]}]
    inputs = processor.apply_chat_template(conv, add_generation_prompt=True, return_tensors='pt',
                                           return_dict=True, tokenize=True).to('cuda')
    with torch.no_grad(), torch.autocast('cuda', dtype=torch.bfloat16 if bf16 else torch.float16):
        out = model.generate(**inputs, max_new_tokens=16, do_sample=False)
    answer = processor.batch_decode(out[:, inputs['input_ids'].shape[1]:], skip_special_tokens=True)[0].strip()
    hit = match(answer) == label
    correct += hit
    per_total[label] += 1
    per_correct[label] += hit
    if not hit and len(errors) < 60:
        errors.append({'file': rel, 'label': label, 'answer': answer})

n = len(manifest['val'])
metrics = {
    'model': MODEL_ID, 'epochs': EPOCHS, 'gpu': torch.cuda.get_device_name(0),
    'val_images': n, 'top1': correct / n,
    'seconds_per_image_gpu': (time.time() - t0) / n,
    'per_class_top1': dict(sorted(((c, round(per_correct[c] / per_total[c], 3)) for c in per_total), key=lambda t: t[1])),
    'sample_errors': errors,
}
(OUT / 'metrics.json').write_text(json.dumps(metrics, indent=2))
print(f"VAL TOP-1: {metrics['top1']:.1%} on {n} images")

# Full merged model (bf16) for conversion to GGUF / on-device use.
model.to(torch.bfloat16).save_pretrained(OUT / 'merged_model', safe_serialization=True)
processor.save_pretrained(OUT / 'merged_model')
print('saved merged model')
