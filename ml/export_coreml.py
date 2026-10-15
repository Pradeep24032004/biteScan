"""Converts a trained checkpoint to a Core ML model for the iPhone app.

    .venv/bin/python export_coreml.py runs/v1/best.pt [--check data/commons] [--install]

--install copies the model into modules/food-classifier/ios/models/ so the next app build bundles it.
"""

import argparse
import random
import shutil
from pathlib import Path

import coremltools as ct
import numpy as np
import timm
import torch
from PIL import Image
from timm.data import resolve_data_config
from torch import nn

from dataset import scan_class_folders


class WithNormalization(nn.Module):
    """Takes 0–1 RGB pixels and applies the model's own mean/std, so the app needs no preprocessing."""

    def __init__(self, model, mean, std):
        super().__init__()
        self.model = model
        self.register_buffer('mean', torch.tensor(mean).view(1, 3, 1, 1))
        self.register_buffer('std', torch.tensor(std).view(1, 3, 1, 1))

    def forward(self, x):
        return torch.softmax(self.model((x - self.mean) / self.std), dim=1)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('checkpoint')
    p.add_argument('--check', help='Image folder to compare PyTorch vs Core ML predictions on')
    p.add_argument('--install', action='store_true', help='Copy the model into the iOS app module')
    args = p.parse_args()

    ckpt = torch.load(args.checkpoint, map_location='cpu')
    classes = ckpt['classes']
    model = timm.create_model(ckpt['model'], pretrained=False, num_classes=len(classes))
    model.load_state_dict(ckpt['state_dict'])
    cfg = resolve_data_config({}, model=model)
    size = cfg['input_size'][1]
    wrapped = WithNormalization(model, cfg['mean'], cfg['std']).eval()

    example = torch.rand(1, 3, size, size)
    traced = torch.jit.trace(wrapped, example)
    mlmodel = ct.convert(
        traced,
        inputs=[ct.ImageType(name='image', shape=example.shape, scale=1 / 255.0, color_layout=ct.colorlayout.RGB)],
        classifier_config=ct.ClassifierConfig(classes),
        convert_to='mlprogram',
        minimum_deployment_target=ct.target.iOS16,
    )
    mlmodel.short_description = 'BiteScan Indian food classifier'
    out = Path(args.checkpoint).parent / 'BiteScanFood.mlpackage'
    mlmodel.save(str(out))
    print(f'Saved {out} ({len(classes)} classes)')

    if args.check:
        samples = scan_class_folders(Path(args.check))
        random.Random(0).shuffle(samples)
        agree = 0
        checked = samples[:30]
        for path, _ in checked:
            img = Image.open(path).convert('RGB').resize((size, size))
            x = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255.0).permute(2, 0, 1)[None]
            torch_label = classes[wrapped(x).argmax().item()]
            coreml_label = mlmodel.predict({'image': img})['classLabel']
            agree += torch_label == coreml_label
        print(f'PyTorch and Core ML agree on {agree}/{len(checked)} images')

    if args.install:
        dest = Path(__file__).resolve().parent.parent / 'modules/food-classifier/ios/models/BiteScanFood.mlpackage'
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(out, dest)
        print(f'Installed into {dest}. Rebuild the iOS app to bundle it.')


if __name__ == '__main__':
    main()
