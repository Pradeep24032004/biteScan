# BiteScan food model

> The app uses **only** the fine-tuned LFM2.5-VL model (see below). The EfficientNet scripts (`train.py`, `export_coreml.py`) were an earlier baseline and are no longer shipped.

Fine-tunes a pretrained image model (EfficientNet-B0) on Indian food photos and exports it to Core ML, so dish recognition runs on the iPhone with no internet and no API key.

## Data

- `data/commons/<food_id>/`: openly licensed photos from Wikimedia Commons, fetched by `fetch_commons.py`. Each photo is licensed by its own photographer (CC0, public domain, CC BY or CC BY-SA), so commercial use is allowed. Credits are in `data/commons/ATTRIBUTION.csv`; the app must show these credits (e.g. on an About screen). Run with `--no-sa` to drop share-alike photos if needed.
- We deliberately avoid datasets scraped from Google Images (Khana, most Kaggle/Hugging Face Indian food sets). Their license labels don't cover the photos themselves.
- `data/bangalore/<food_id>/`: our own photos, taken in Bangalore. These fill gaps where Commons has few photos and match real local plates and lighting. Folder names must match ids in `src/data/foods.ts`.

### Taking photos for `data/bangalore`

- Aim for **50–100+ photos per dish**. Classes with fewer than 20 photos are skipped during training.
- Vary everything: different darshinis and homes, steel plates, banana leaves, paper plates, daylight, tube light, top-down and angled shots, half-eaten plates.
- Keep the dish as the main subject. Drop the photos straight from your iPhone into the folder; HEIC is fine.

## Commands

```bash
.venv/bin/pip install -r requirements.txt            # first time only, with Python 3.12
.venv/bin/python fetch_commons.py                    # download Commons photos (re-run safely; skips existing)

# Quick check that everything works (a few minutes)
.venv/bin/python train.py --data data/commons data/bangalore --limit-per-class 60 --epochs 1 --workers 4 --name smoke

# Full training (roughly 30–60 minutes on an M4 with ~7,000 photos)
.venv/bin/python train.py --data data/commons data/bangalore --epochs 12 --name v1

# Convert to Core ML, confirm it predicts the same as PyTorch, and copy it into the iOS module
.venv/bin/python export_coreml.py runs/v1/best.pt --check data/commons --install
```

`runs/<name>/metrics.json` lists accuracy for every dish, worst first. That shows which dishes need more photos.

## LFM2.5-VL (vision-language model) — current best

LoRA fine-tune of [LiquidAI/LFM2.5-VL-450M](https://huggingface.co/LiquidAI/LFM2.5-VL-450M) (LFM Open License 1.0: free commercial use under US$10M annual revenue). It answers with a dish name; the app maps that to a food in `src/data/foods.ts`.

| Model (same 713 validation photos) | Top-1 |
|---|---|
| LFM2.5-VL-450M, no fine-tune | 5% |
| EfficientNet-B2 (`train.py`, run `v1`) | 59.7% |
| LFM2.5-VL-450M LoRA, 1.5 epochs on M4 (`lfm/train.py`) | 62.3% |
| LFM2.5-VL-450M LoRA, 3 epochs on Kaggle T4 (`kaggle/train_kaggle.py`) | 64.2% |

Later runs (different, larger test sets): 104 dishes → 66.2%; **126 dishes (desserts, drinks, foreign) → 66.5%** (app 1.0.2).

GGUF export kept accuracy (62.5% PyTorch vs 62.5% q8 vs 63.0% Q4_K_M on a 200-photo subset).

```bash
export HF_HUB_OFFLINE=1   # this network stalls on Hugging Face calls once models are cached
# Retrain on Kaggle: builds the dataset, uploads it under a NEW slug (Kaggle pins notebooks to old
# dataset versions), sets the class-count guard and starts training. Use the next suffix each time.
# build_dataset.py also packs the nutrition-label examples (build_label_dataset.py) and, if
# INIT_ADAPTER exists, the previous LoRA as lora_init/: training then continues from it on all labels
# plus REPLAY_DISHES dish photos (so dish accuracy is kept) and reports dish + label accuracy.
./kaggle/release.sh v5
# merge the LoRA into the base model, then convert for llama.cpp / llama.rn
.venv/bin/python tools/llama.cpp/convert_hf_to_gguf.py runs/lfm-kaggle/merged --outtype f16 --outfile f16.gguf
tools/llama.cpp/build/bin/llama-quantize f16.gguf ../modules/food-classifier/ios/models/BiteScanLFM.gguf Q4_K_M
.venv/bin/python tools/llama.cpp/convert_hf_to_gguf.py runs/lfm-kaggle/merged --mmproj --outtype q8_0 \
  --outfile ../modules/food-classifier/ios/models/BiteScanLFM-mmproj.gguf
.venv/bin/python lfm/evaluate_gguf.py <model.gguf> <mmproj.gguf> --limit 200   # check accuracy survived
```
