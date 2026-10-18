// Reads packaged-food photos with the same fine-tuned LFM2.5-VL model used for dishes (one model).
import { askModel, resizeForModel } from '@/lib/dishRecognizer';
import { cleanProductName, parseLabelAnswer, parseNetWeight, type LabelValues } from '@/lib/labelParse';

// Same size the model was fine-tuned on for labels (ml/kaggle/build_dataset.py LABEL_SIDE).
const LABEL_SIDE = 512;

// Must match the label prompt used in fine-tuning (ml/kaggle/train_kaggle.py).
export const VALUES_PROMPT = 'Read this nutrition label. List the values per 100 g.';
const WEIGHT_PROMPT = 'What is the net weight in grams printed on this packet?';
const NAME_PROMPT = 'What is the product name printed on this food packet? Reply with only the name.';

export async function readNutritionLabel(
  uri: string,
  width: number,
  height: number
): Promise<{ values: LabelValues; netWeightG: number | null }> {
  const photo = await resizeForModel(uri, width, height, LABEL_SIDE);
  const valuesAnswer = (await askModel(photo, VALUES_PROMPT, 160)) ?? '';
  const weightAnswer = (await askModel(photo, WEIGHT_PROMPT, 30)) ?? '';
  return { values: parseLabelAnswer(valuesAnswer), netWeightG: parseNetWeight(weightAnswer) };
}

export async function readProductName(uri: string, width: number, height: number): Promise<string> {
  const photo = await resizeForModel(uri, width, height, LABEL_SIDE);
  return cleanProductName((await askModel(photo, NAME_PROMPT, 24)) ?? '');
}
