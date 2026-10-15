"""Fine-tunes a pretrained image model on Indian food photos.

Example (quick test run):
    .venv/bin/python train.py --data data/commons data/bangalore --limit-per-class 100 --epochs 1 --name smoke
Full run:
    .venv/bin/python train.py --data data/commons data/bangalore --epochs 12 --name v1
"""

import argparse
import json
import math
import time
from collections import Counter
from pathlib import Path

import timm
import torch
from timm.data import create_transform, resolve_data_config
from torch import nn
from torch.utils.data import DataLoader, WeightedRandomSampler

from dataset import FoodDataset, limit_per_class, scan_class_folders, split_samples


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--data', nargs='+', required=True, help='Folders containing <class>/<image> files')
    p.add_argument('--name', required=True, help='Run name; output goes to runs/<name>/')
    p.add_argument('--model', default='efficientnet_b0.ra_in1k')
    p.add_argument('--epochs', type=int, default=12)
    p.add_argument('--batch-size', type=int, default=64)
    p.add_argument('--lr', type=float, default=1e-3)
    p.add_argument('--limit-per-class', type=int, default=0, help='Cap images per class (for quick tests)')
    p.add_argument('--min-images', type=int, default=20, help='Skip classes with fewer images than this')
    p.add_argument('--workers', type=int, default=8)
    return p.parse_args()


def evaluate(model, loader, device, num_classes):
    model.eval()
    correct = top5 = total = 0
    per_class_correct = torch.zeros(num_classes)
    per_class_total = torch.zeros(num_classes)
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            pred5 = logits.topk(5, dim=1).indices
            hit1 = pred5[:, 0] == y
            correct += hit1.sum().item()
            top5 += (pred5 == y[:, None]).any(dim=1).sum().item()
            total += y.numel()
            per_class_total.index_add_(0, y.cpu(), torch.ones(y.numel()))
            per_class_correct.index_add_(0, y.cpu(), hit1.float().cpu())
    per_class = (per_class_correct / per_class_total.clamp(min=1)).tolist()
    return correct / max(total, 1), top5 / max(total, 1), per_class


def main():
    args = parse_args()
    out_dir = Path('runs') / args.name
    out_dir.mkdir(parents=True, exist_ok=True)
    device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

    samples = [s for root in args.data for s in scan_class_folders(Path(root))]
    if args.limit_per_class:
        samples = limit_per_class(samples, args.limit_per_class)
    counts = Counter(label for _, label in samples)
    skipped = sorted(c for c, n in counts.items() if n < args.min_images)
    if skipped:
        print(f'Skipping {len(skipped)} classes with < {args.min_images} images: {", ".join(skipped)}')
    samples = [s for s in samples if s[1] not in skipped]
    classes = sorted({label for _, label in samples})
    train_samples, val_samples = split_samples(samples)
    print(f'{len(classes)} classes, {len(train_samples)} train / {len(val_samples)} val images, device={device}')

    model = timm.create_model(args.model, pretrained=True, num_classes=len(classes))
    data_cfg = resolve_data_config({}, model=model)
    train_tf = create_transform(**data_cfg, is_training=True, auto_augment='rand-m7-mstd0.5', scale=(0.4, 1.0))
    val_tf = create_transform(**data_cfg, is_training=False)

    # Oversample small classes (e.g. our own Bangalore photos) so they aren't drowned out.
    train_counts = Counter(label for _, label in train_samples)
    weights = [1 / math.sqrt(train_counts[label]) for _, label in train_samples]
    sampler = WeightedRandomSampler(weights, num_samples=len(train_samples), replacement=True)

    loader_kwargs = dict(batch_size=args.batch_size, num_workers=args.workers, persistent_workers=args.workers > 0)
    train_loader = DataLoader(FoodDataset(train_samples, classes, train_tf), sampler=sampler, drop_last=True, **loader_kwargs)
    val_loader = DataLoader(FoodDataset(val_samples, classes, val_tf), shuffle=False, **loader_kwargs)

    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.05)
    steps = args.epochs * len(train_loader)
    warmup = min(500, steps // 10)
    scheduler = torch.optim.lr_scheduler.LambdaLR(
        optimizer,
        lambda s: (s + 1) / warmup if s < warmup else 0.5 * (1 + math.cos(math.pi * (s - warmup) / max(1, steps - warmup))),
    )
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    best_acc = -1.0
    for epoch in range(args.epochs):
        model.train()
        start, running, seen = time.time(), 0.0, 0
        for step, (x, y) in enumerate(train_loader):
            x, y = x.to(device), y.to(device)
            loss = criterion(model(x), y)
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
            scheduler.step()
            running += loss.item() * y.numel()
            seen += y.numel()
            if step % 100 == 0:
                print(f'  epoch {epoch + 1} step {step}/{len(train_loader)} loss {running / seen:.3f}', flush=True)

        acc, acc5, per_class = evaluate(model, val_loader, device, len(classes))
        print(f'epoch {epoch + 1}/{args.epochs}: train loss {running / seen:.3f}, '
              f'val top-1 {acc:.1%}, top-5 {acc5:.1%} ({time.time() - start:.0f}s)', flush=True)
        if acc > best_acc:
            best_acc = acc
            torch.save({'model': args.model, 'classes': classes, 'state_dict': model.state_dict()}, out_dir / 'best.pt')
            report = {c: round(a, 3) for c, a in sorted(zip(classes, per_class), key=lambda t: t[1])}
            (out_dir / 'metrics.json').write_text(json.dumps(
                {'epoch': epoch + 1, 'val_top1': acc, 'val_top5': acc5, 'per_class_top1': report}, indent=2))

    print(f'Best val top-1 {best_acc:.1%}. Saved {out_dir / "best.pt"} and {out_dir / "metrics.json"}')


if __name__ == '__main__':
    main()
