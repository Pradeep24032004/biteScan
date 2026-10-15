// Body composition: estimates from weight/height/age, and reading pasted InBody results.
// Kept free of app imports so it can be unit-tested with plain Node.

export type SexInput = 'male' | 'female';

export type BodyEstimate = {
  bmi: number;
  bodyFatPct: number;
  fatMassKg: number;
  leanMassKg: number;
  skeletalMuscleKg: number;
};

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * Estimates body composition when no InBody scan is available.
 * - Body fat %: Deurenberg et al. 1991 (BMI, age, sex).
 * - Skeletal muscle: Lee et al. 2000 anthropometric equation, with its Asian adjustment.
 * Both are population averages and can be several percent off for an individual.
 */
export function estimateBody(sex: SexInput, age: number, heightCm: number, weightKg: number): BodyEstimate {
  const male = sex === 'male' ? 1 : 0;
  const b = bmi(weightKg, heightCm);
  const bodyFatPct = clamp(1.2 * b + 0.23 * age - 10.8 * male - 5.4, 3, 60);
  const fatMassKg = (weightKg * bodyFatPct) / 100;
  const asianAdjustment = -1.2;
  const skeletalMuscleKg = clamp(
    0.244 * weightKg + 7.8 * (heightCm / 100) - 0.098 * age + 6.6 * male + asianAdjustment - 3.3,
    5,
    weightKg * 0.6
  );
  return {
    bmi: round1(b),
    bodyFatPct: round1(bodyFatPct),
    fatMassKg: round1(fatMassKg),
    leanMassKg: round1(weightKg - fatMassKg),
    skeletalMuscleKg: round1(skeletalMuscleKg),
  };
}

export type InBodyReading = {
  weightKg?: number;
  skeletalMuscleKg?: number;
  bodyFatKg?: number;
  bodyFatPct?: number;
  bmrKcal?: number;
  fatFreeMassKg?: number;
  visceralFatLevel?: number;
  inbodyScore?: number;
};

// Label variants seen on InBody result sheets and app exports (English).
const FIELDS: { key: keyof InBodyReading; labels: string[]; unit: 'mass' | 'pct' | 'kcal' | 'none' }[] = [
  { key: 'skeletalMuscleKg', labels: ['skeletal muscle mass', 'smm'], unit: 'mass' },
  { key: 'bodyFatPct', labels: ['percent body fat', 'body fat percentage', 'body fat %', 'pbf'], unit: 'pct' },
  { key: 'bodyFatKg', labels: ['body fat mass', 'fat mass', 'bfm'], unit: 'mass' },
  { key: 'fatFreeMassKg', labels: ['fat free mass', 'fat-free mass', 'ffm', 'lean body mass', 'lbm'], unit: 'mass' },
  { key: 'bmrKcal', labels: ['basal metabolic rate', 'bmr'], unit: 'kcal' },
  { key: 'visceralFatLevel', labels: ['visceral fat level', 'visceral fat'], unit: 'none' },
  { key: 'inbodyScore', labels: ['inbody score'], unit: 'none' },
  { key: 'weightKg', labels: ['body weight', 'weight'], unit: 'mass' },
];

/**
 * Pulls numbers out of pasted InBody results, e.g.
 * "Weight 72.4 kg  Skeletal Muscle Mass 31.2 kg  Percent Body Fat 24.5 %  BMR 1580 kcal".
 * Returns only the fields it found. Pounds are converted to kg.
 */
export function parseInBodyText(text: string): InBodyReading {
  const result: InBodyReading = {};
  // Remove matched spans so "body fat mass" isn't later re-read as "weight" etc.
  let remaining = ` ${text
    .toLowerCase()
    .replace(/[ \t]/g, ' ')
    // "1,520 kcal" -> "1520 kcal"; a decimal comma like "72,4 kg" is left alone.
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2')} `;
  for (const field of FIELDS) {
    for (const label of field.labels) {
      const pattern = new RegExp(
        `\\b${label.replace(/[%]/g, '%').replace(/[-]/g, '[- ]?')}\\b[^0-9\\n]{0,20}?(\\d{1,4}(?:[.,]\\d+)?)\\s*(kg|lbs?|%|kcal)?`,
        'i'
      );
      const m = pattern.exec(remaining);
      if (!m) continue;
      let value = Number(m[1].replace(',', '.'));
      if (field.unit === 'mass' && m[2]?.startsWith('lb')) value *= 0.453592;
      if (Number.isFinite(value) && value > 0 && plausible(field.key, value)) {
        result[field.key] = round1(value);
        remaining = remaining.slice(0, m.index) + ' '.repeat(m[0].length) + remaining.slice(m.index + m[0].length);
        break;
      }
    }
  }
  // Fill gaps that follow from the others.
  if (result.bodyFatPct == null && result.bodyFatKg != null && result.weightKg) {
    result.bodyFatPct = round1((result.bodyFatKg / result.weightKg) * 100);
  }
  if (result.fatFreeMassKg == null && result.weightKg && result.bodyFatPct != null) {
    result.fatFreeMassKg = round1(result.weightKg * (1 - result.bodyFatPct / 100));
  }
  return result;
}

function plausible(key: keyof InBodyReading, v: number): boolean {
  switch (key) {
    case 'weightKg':
      return v >= 20 && v <= 300;
    case 'skeletalMuscleKg':
    case 'fatFreeMassKg':
      return v >= 5 && v <= 150;
    case 'bodyFatKg':
      return v >= 1 && v <= 200;
    case 'bodyFatPct':
      return v >= 2 && v <= 70;
    case 'bmrKcal':
      return v >= 700 && v <= 4000;
    case 'visceralFatLevel':
      return v >= 1 && v <= 30;
    case 'inbodyScore':
      return v >= 20 && v <= 120;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
