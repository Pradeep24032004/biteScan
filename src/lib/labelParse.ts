// Turns the model's free-text reading of a nutrition label into numbers.
// Kept free of app imports so it can be unit-tested with plain Node.

export type LabelValues = {
  /** Per 100 g (or 100 ml). */
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fat: number | null;
  satFat: number | null;
  fibre: number | null;
  /** mg per 100 g */
  sodium: number | null;
};

const num = (s: string) => Number(s.replace(',', '.'));

function find(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const m = new RegExp(`${label}[^0-9\\n]{0,25}?(\\d{1,4}(?:[.,]\\d+)?)`, 'i').exec(text);
    if (m) return num(m[1]);
  }
  return null;
}

export function parseLabelAnswer(answer: string): LabelValues {
  const text = answer.replace(/\*\*/g, '');
  let kcal: number | null = null;
  const kcalMatch = /energy[^0-9\n]{0,25}?(\d{1,4}(?:[.,]\d+)?)\s*(kcal|cal|kj)?/i.exec(text);
  if (kcalMatch) {
    const value = num(kcalMatch[1]);
    // A value in kJ is converted; an unlabelled value above 900 per 100 g can only be kJ.
    kcal = kcalMatch[2]?.toLowerCase() === 'kj' || value > 900 ? Math.round(value / 4.184) : value;
  } else {
    const k = /(\d{2,4}(?:[.,]\d+)?)\s*kcal/i.exec(text);
    if (k) kcal = num(k[1]);
  }
  const sodiumMatch = /sodium[^0-9\n]{0,25}?(\d{1,5}(?:[.,]\d+)?)\s*(mg|g)?/i.exec(text);
  let sodium = sodiumMatch ? num(sodiumMatch[1]) : null;
  if (sodium != null && sodiumMatch?.[2]?.toLowerCase() === 'g') sodium = Math.round(sodium * 1000);
  const values: LabelValues = {
    kcal,
    protein: find(text, ['protein']),
    carbs: find(text, ['total carbohydrates?', 'carbohydrates?', 'carbs']),
    sugar: find(text, ['total sugars?', 'sugars?']),
    // "Fat" alone must not pick up "Saturated fat", so match it at a line start or after "total".
    fat: find(text, ['total fat', '(?:^|\\n)\\s*-?\\s*fat']),
    satFat: find(text, ['saturated fat', 'saturates']),
    fibre: find(text, ['fibre', 'fiber', 'dietary fib(?:re|er)']),
    sodium,
  };
  // Reject numbers that can't be per-100 g values.
  if (values.kcal != null && (values.kcal < 1 || values.kcal > 900)) values.kcal = null;
  for (const k of ['protein', 'carbs', 'sugar', 'fat', 'satFat', 'fibre'] as const) {
    const v = values[k];
    if (v != null && (v < 0 || v > 100)) values[k] = null;
  }
  return values;
}

/** "The net weight is 52 grams" -> 52 */
export function parseNetWeight(answer: string): number | null {
  const m = /net\s*(?:wt|weight)[^0-9\n]{0,20}?(\d{1,4}(?:[.,]\d+)?)\s*(g|gm|gram|grams|ml)\b/i.exec(answer)
    ?? /(\d{1,4}(?:[.,]\d+)?)\s*(g|gm|grams|ml)\b/i.exec(answer);
  if (!m) return null;
  const v = num(m[1]);
  return v >= 5 && v <= 5000 ? v : null;
}

/** Cleans the model's answer to "what is the product name" into a title. */
export function cleanProductName(answer: string): string {
  const first = (answer.split('\n').find((l) => l.trim()) ?? '').trim();
  return first
    .replace(/^(the\s+)?(product\s+)?name\s*(is|:)\s*/i, '')
    .replace(/^["'“”]+|["'“”.]+$/g, '')
    .trim()
    .slice(0, 60);
}
