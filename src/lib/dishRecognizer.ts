import * as ImageManipulator from 'expo-image-manipulator';
import type * as LlamaRN from 'llama.rn';

import FoodClassifier from '../../modules/food-classifier';
import { FOODS, searchFoods, type Food } from '@/data/foods';

/** Must match the prompt the model was fine-tuned with (ml/lfm/common.py). */
const PROMPT = 'What Indian dish is in this photo? Reply with only the dish name.';
/** Training photos were at most 512px; larger images would be split into tiles the model never saw. */
const MAX_SIDE = 512;
const MAX_SUGGESTIONS = 3;

export type Suggestion = {
  food: Food;
  /** 'lfm' is the model's answer; 'similar' are look-alike dishes from the food list. */
  source: 'lfm' | 'similar';
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
        // 4096 leaves room for large label photos, which are split into several image tiles.
        const context = await initLlama({ model: paths.model, n_ctx: 4096, n_gpu_layers: 99, ctx_shift: false });
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
  return FoodClassifier?.isLfmAvailable() ?? false;
}

/** Optional: start loading the model before the user takes a photo. */
export function warmUpRecognizer() {
  void getLlama();
}

export async function resizeForModel(uri: string, width: number, height: number, maxSide = MAX_SIDE): Promise<string> {
  if (Math.max(width, height) <= maxSide) return uri;
  const size = width >= height ? { width: maxSide, height: null } : { width: null, height: maxSide };
  const image = await ImageManipulator.ImageManipulator.manipulate(uri).resize(size).renderAsync();
  const saved = await image.saveAsync({ compress: 0.95, format: ImageManipulator.SaveFormat.JPEG });
  return saved.uri;
}

/** Asks the fine-tuned LFM2.5-VL model a question about a photo. Null if the model isn't available. */
export async function askModel(uri: string, prompt = PROMPT, maxTokens = 16): Promise<string | null> {
  const context = await getLlama();
  if (!context) return null;
  const result = await context.completion({
    messages: [
      {
        role: 'user',
        // Image first, then the question — the order used in fine-tuning.
        content: [
          { type: 'image_url', image_url: { url: uri } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    n_predict: maxTokens,
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

// Words that don't say what kind of dish it is.
const GENERIC = new Set(['masala', 'curry', 'with', 'plain', 'sweet', 'fresh', 'veg', 'fried', 'butter', 'style', 'special']);
const words = (name: string) => normalise(name).split(' ').filter((w) => w.length >= 3 && !GENERIC.has(w));

/** Look-alike dishes from the food list (e.g. "Masala Dosa" → Plain Dosa, Set Dosa) as quick alternatives. */
function similarDishes(food: Food, count: number): Food[] {
  const mine = new Set([...words(food.name), ...(food.aliases ?? []).flatMap(words)]);
  return FOODS.filter((f) => f.id !== food.id)
    .map((f) => {
      const shared = [...new Set([...words(f.name), ...(f.aliases ?? []).flatMap(words)])].filter((w) => mine.has(w)).length;
      return { f, score: shared * 2 + (f.category === food.category ? 1 : 0) };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.f);
}

/**
 * Suggests dishes for a photo using the fine-tuned LFM2.5-VL model (the only model in the app),
 * plus a couple of look-alike dishes from the food list as one-tap alternatives.
 */
export async function recognizeDish(
  uri: string,
  width: number,
  height: number
): Promise<{ suggestions: Suggestion[]; photoUri: string }> {
  const small = await resizeForModel(uri, width, height);
  const answer = await askModel(small).catch(() => null);
  const food = answer ? matchDishName(answer) : null;
  if (!food) return { suggestions: [], photoUri: small };
  const suggestions: Suggestion[] = [
    { food, source: 'lfm' },
    ...similarDishes(food, MAX_SUGGESTIONS - 1).map((f) => ({ food: f, source: 'similar' as const })),
  ];
  return { suggestions, photoUri: small };
}

// Servings measured in containers can't be counted from a photo; everything else is "1 <piece>".
const NOT_COUNTABLE = /plate|bowl|cup|glass|katori|serving|tbsp|tsp|scoop|set|can|bottle|packet|pack|ml\b|g\b|handful|portion|thali/i;

/** Whether a food's serving is a single countable piece (1 idli, 1 dosa, 1 piece…). */
export function isCountable(food: Food): boolean {
  return /^1\s+\S/.test(food.serving) && !NOT_COUNTABLE.test(food.serving);
}

/**
 * Asks the same model how many pieces of a dish are in the photo (e.g. 3 idlis).
 * Returns null when it doesn't give a sensible number, so the user just picks the amount.
 */
export async function countPieces(uri: string, food: Food): Promise<number | null> {
  // "Count the idlis." worked best in testing (it ignores chutney and other items on the plate).
  const name = food.name.toLowerCase();
  const plural = name.endsWith('s') ? name : `${name}s`;
  const answer = await askModel(uri, `Count the ${plural}. Answer with a number.`, 6);
  const n = Number((answer ?? '').match(/\d+/)?.[0]);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}
