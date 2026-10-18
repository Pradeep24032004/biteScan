#!/bin/zsh
# Builds the dataset, uploads it as a NEW Kaggle dataset (Kaggle pins notebooks to old versions of
# existing ones), points the notebook at it, sets the class-count guard, and starts training.
#   kaggle/release.sh v3
set -e
cd "$(dirname "$0")/.."
SUFFIX=${1:?usage: release.sh <suffix e.g. v3>}
SLUG="maggalapradeep/bitescan-indian-food-$SUFFIX"
KAGGLE=(.venv/bin/python kaggle/kaggle_ipv4.py)

.venv/bin/python kaggle/build_dataset.py
CLASSES=$(python3 -c "import json;print(len(json.load(open('kaggle/dataset/manifest.json'))['classes']))")
echo "classes: $CLASSES"

python3 - "$SLUG" "$SUFFIX" "$CLASSES" <<'EOF'
import json, re, sys
slug, suffix, classes = sys.argv[1], sys.argv[2], int(sys.argv[3])
m = json.load(open('kaggle/dataset/dataset-metadata.json'))
m['id'] = slug; m['title'] = f'BiteScan Indian Food Photos {suffix}'
json.dump(m, open('kaggle/dataset/dataset-metadata.json', 'w'), indent=2)
k = json.load(open('kaggle/notebook/kernel-metadata.json'))
k['dataset_sources'] = [slug]
json.dump(k, open('kaggle/notebook/kernel-metadata.json', 'w'), indent=2)
src = open('kaggle/train_kaggle.py').read()
src = re.sub(r'EXPECTED_CLASSES = \d+', f'EXPECTED_CLASSES = {classes}', src)
open('kaggle/train_kaggle.py', 'w').write(src)
nb = json.load(open('kaggle/notebook/notebook8b84584ba3.ipynb'))
nb['cells'][1]['source'] = src.splitlines(keepends=True)
json.dump(nb, open('kaggle/notebook/notebook8b84584ba3.ipynb', 'w'), indent=1)
EOF

"${KAGGLE[@]}" datasets create -p kaggle/dataset --dir-mode zip 2>&1 | grep -vE '%\|' | tail -2
for i in $(seq 1 90); do
  s=$("${KAGGLE[@]}" datasets status "$SLUG" 2>&1 | tail -1)
  [ "$s" = "ready" ] && break
  sleep 20
done
echo "dataset $SLUG: $s"
"${KAGGLE[@]}" kernels push -p kaggle/notebook --accelerator NvidiaTeslaT4 2>&1 | tail -1
