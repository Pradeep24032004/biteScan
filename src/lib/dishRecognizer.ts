import * as ImageManipulator from 'expo-image-manipulator';
import type * as LlamaRN from 'llama.rn';

import FoodClassifier from '../../modules/food-classifier';
import { FOODS, findFood, searchFoods, type Food } from '@/data/foods';

/** Must match the prompt the model was fine-tuned with (ml/lfm/common.py). */
const PROMPT = 'What Indian dish is in this photo? Reply with only the dish name.';
/** Training photos were at most 512px; larger images would be split into tiles the model never saw. */
const MAX_SIDE = 512;
const MAX_SUGGESTIONS = 3;

export type Suggestion = {
  food: Food;
  /** 0–1 from EfficientNet; null for the LFM2.5-VL answer, which has no calibrated score. */
  confidence: number | null;
  source: 'lfm' | 'efficientnet';
};

type LlamaContext = Awaited<ReturnType<typeof LlamaRN.initLlama>>;
let llama: Promise<LlamaContext | null> | null = null;

/** Loads the bundled LFM2.5-VL once. Returns null in Expo Go or when the model isn't bundled. */
function getLlama(): Promise<LlamaContext | null> {
  if (!llama) {
    llama = (async () => {
      if (!FoodClassifier?.isLfmAvailable()) return null;
      try {
        const paths = await FoodClassifier.prepareLfmModelAsync();
        if (!paths) return null;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { initLlama } = require('llama.rn') as typeof LlamaRN;
        const context = await initLlama({ model: paths.model, n_ctx: 1024, n_gpu_layers: 99, ctx_shift: false });
        await context.initMultimodal({ path: paths.mmproj, use_gpu: true });
        return context;
      } catch {
        return null;
      }
    })();
  }
  return llama;
}

export function isRecognizerAvailable(): boolean {
  return FoodClassifier != null && (FoodClassifier.isLfmAvailable() || FoodClassifier.isModelAvailable());
}

/** Optional: start loading the model before the user takes a photo. */
export function warmUpRecognizer() {
  void getLlama();
}

async function resizeForModel(uri: string, width: number, height: number): Promise<string> {
  if (Math.max(width, height) <= MAX_SIDE) return uri;
  const size = width >= height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE };
  const image = await ImageManipulator.ImageManipulator.manipulate(uri).resize(size).renderAsync();
  const saved = await image.saveAsync({ compress: 0.95, format: ImageManipulator.SaveFormat.JPEG });
  return saved.uri;
}

async function askLfm(uri: string): Promise<string | null> {
  const context = await getLlama();
  if (!context) return null;
  const result = await context.completion({
    messages: [
      {
        role: 'user',
        // Image first, then the question — the order used in fine-tuning.
        content: [
          { type: 'image_url', image_url: { url: uri } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
    n_predict: 16,
    temperature: 0,
  });
  return result.text.trim();
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Maps the model's free-text answer to a dish, preferring our hand-checked list. */
export function matchDishName(answer: string): Food | null {
  const a = normalise(answer.split('\n')[0] ?? '');
  if (!a) return null;
  const exact = FOODS.find(
    (f) => normalise(f.name) === a || f.aliases?.some((alias) => normalise(alias) === a)
  );
  if (exact) return exact;
  // Longest known dish name contained in the answer, e.g. "a plate of masala dosa".
  let best: Food | null = null;
  let bestLength = 0;
  for (const f of FOODS) {
    for (const name of [f.name, ...(f.aliases ?? [])]) {
      const n = normalise(name);
      if (n.length > bestLength && new RegExp(`\\b${n}\\b`).test(a)) {
        best = f;
        bestLength = n.length;
      }
    }
  }
  return best ?? searchFoods(a)[0] ?? null;
}

/**
 * Suggests dishes for a photo. The fine-tuned LFM2.5-VL answer comes first (best accuracy in our
 * tests); EfficientNet's top predictions fill the remaining slots as alternatives.
 */
export async function recognizeDish(
  uri: string,
  width: number,
  height: number
): Promise<{ suggestions: Suggestion[]; photoUri: string }> {
  const small = await resizeForModel(uri, width, height);
  const [answer, predictions] = await Promise.all([
    askLfm(small).catch(() => null),
    FoodClassifier?.isModelAvailable()
      ? FoodClassifier.classifyAsync(small, MAX_SUGGESTIONS).catch(() => [])
      : Promise.resolve([]),
  ]);

  const suggestions: Suggestion[] = [];
  const lfmFood = answer ? matchDishName(answer) : null;
  if (lfmFood) suggestions.push({ food: lfmFood, confidence: null, source: 'lfm' });
  for (const p of predictions) {
    const food = findFood(p.label);
    if (food && !suggestions.some((s) => s.food.id === food.id)) {
      suggestions.push({ food, confidence: p.confidence, source: 'efficientnet' });
    }
  }
  return { suggestions: suggestions.slice(0, MAX_SUGGESTIONS), photoUri: small };
}
