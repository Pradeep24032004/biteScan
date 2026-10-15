export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Pace = 'gentle' | 'steady' | 'fast';

export type NotificationPrefs = {
  /** Alert as soon as today's food goes over the daily target. */
  overTarget: boolean;
  /** 9 pm summary of the day. */
  eveningSummary: boolean;
  /** Reminders when lunch or dinner hasn't been logged. */
  mealReminders: boolean;
  /** Morning nudge when recent days are drifting away from the goal (history based). */
  goalCheck: boolean;
};

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  /** From an InBody scan, if available. Enables the more accurate Katch-McArdle formula. */
  bodyFatPct: number | null;
  /** Skeletal muscle mass from InBody (or entered manually). */
  skeletalMuscleKg: number | null;
  /** BMR measured by InBody; used directly when present. */
  bmrKcal: number | null;
  /** Where the body numbers came from. Null means only height/weight/age were entered. */
  bodySource: BodySource | null;
  bodyMeasuredAt: string | null;
  activity: Activity;
  goal: Goal;
  /** If set, overrides the calculated target. */
  customTargetKcal: number | null;
  /** What the user wants to become. */
  targetWeightKg: number | null;
  targetBodyFatPct: number | null;
  pace: Pace;
  /** Weight and date when the current goal was set, for progress tracking. */
  goalStartWeightKg: number | null;
  goalStartedAt: string | null;
  notifications: NotificationPrefs;
  /** Save photos of scanned + logged dishes on the phone to improve the model later. */
  collectPhotos: boolean;
  /** Update weight/body fat from Apple Health (InBody) whenever the app opens. */
  autoSyncHealth: boolean;
  lastHealthSync: HealthSyncInfo | null;
};

export type BodySource = 'inbody' | 'apple-health' | 'manual';

export type HealthSyncInfo = {
  syncedAt: string;
  /** When InBody (or another app) measured it. */
  measuredAt: string | null;
  source: string | null;
  leanMassKg: number | null;
};

export const DEFAULT_PROFILE: Profile = {
  sex: 'male',
  age: 30,
  heightCm: 170,
  weightKg: 70,
  bodyFatPct: null,
  skeletalMuscleKg: null,
  bmrKcal: null,
  bodySource: null,
  bodyMeasuredAt: null,
  activity: 'light',
  goal: 'maintain',
  customTargetKcal: null,
  targetWeightKg: null,
  targetBodyFatPct: null,
  pace: 'steady',
  goalStartWeightKg: null,
  goalStartedAt: null,
  notifications: { overTarget: true, eveningSummary: true, mealReminders: true, goalCheck: true },
  collectPhotos: true,
  autoSyncHealth: false,
  lastHealthSync: null,
};

export const ACTIVITY_OPTIONS: { value: Activity; label: string; factor: number }[] = [
  { value: 'sedentary', label: 'Desk job, little exercise', factor: 1.2 },
  { value: 'light', label: 'Light exercise 1–3 days/week', factor: 1.375 },
  { value: 'moderate', label: 'Exercise 3–5 days/week', factor: 1.55 },
  { value: 'active', label: 'Hard exercise 6–7 days/week', factor: 1.725 },
  { value: 'very_active', label: 'Physical job + training', factor: 1.9 },
];

export const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose fat', description: 'Eat a little less, keep muscle with protein + strength work' },
  { value: 'maintain', label: 'Maintain', description: 'Stay where you are and eat well' },
  { value: 'gain', label: 'Build muscle', description: 'Small surplus with strength training' },
];

/** Daily calorie change per pace. ~7,700 kcal ≈ 1 kg of body fat. */
const PACE_KCAL: Record<Goal, Record<Pace, number>> = {
  lose: { gentle: -250, steady: -500, fast: -750 },
  maintain: { gentle: 0, steady: 0, fast: 0 },
  gain: { gentle: 150, steady: 300, fast: 450 },
};

export const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: 'gentle', label: 'Gentle' },
  { value: 'steady', label: 'Steady' },
  { value: 'fast', label: 'Fast' },
];

export function goalAdjustment(p: Pick<Profile, 'goal' | 'pace'>): number {
  return PACE_KCAL[p.goal][p.pace];
}

/** Expected weight change in kg per week from the calorie adjustment. */
export function weeklyChangeKg(p: Pick<Profile, 'goal' | 'pace'>): number {
  return Math.round(((goalAdjustment(p) * 7) / 7700) * 100) / 100;
}

/** Weeks until the target weight at the chosen pace, or null if there's nothing to reach. */
export function weeksToGoal(p: Profile): number | null {
  if (p.targetWeightKg == null || p.goal === 'maintain') return null;
  const diff = p.targetWeightKg - p.weightKg;
  const perWeek = weeklyChangeKg(p);
  if (perWeek === 0 || Math.sign(diff) !== Math.sign(perWeek)) return null;
  return Math.ceil(diff / perWeek);
}

/** Never plan below BMR or the usual minimum intake for adults. */
function safetyFloor(p: Profile, bmr: number): number {
  return Math.max(Math.round(bmr), p.sex === 'male' ? 1500 : 1200);
}

export function calculateBmr(p: Profile): { bmr: number; formula: string } {
  if (p.bmrKcal != null && p.bmrKcal > 0) {
    return { bmr: p.bmrKcal, formula: 'Measured by InBody' };
  }
  if (p.bodyFatPct != null && p.bodyFatPct > 0 && p.bodyFatPct < 70) {
    const leanMassKg = p.weightKg * (1 - p.bodyFatPct / 100);
    return { bmr: 370 + 21.6 * leanMassKg, formula: 'Katch-McArdle (uses body fat %)' };
  }
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return { bmr: base + (p.sex === 'male' ? 5 : -161), formula: 'Mifflin-St Jeor' };
}

export function calculateTarget(p: Profile): number {
  if (p.customTargetKcal) return p.customTargetKcal;
  const { bmr } = calculateBmr(p);
  const factor = ACTIVITY_OPTIONS.find((a) => a.value === p.activity)?.factor ?? 1.2;
  return Math.max(Math.round(bmr * factor + goalAdjustment(p)), safetyFloor(p, bmr));
}

export function targetBreakdown(p: Profile) {
  const { bmr, formula } = calculateBmr(p);
  const activity = ACTIVITY_OPTIONS.find((a) => a.value === p.activity) ?? ACTIVITY_OPTIONS[0];
  const target = calculateTarget(p);
  const maintenance = Math.round(bmr * activity.factor);
  return {
    bmr: Math.round(bmr),
    formula,
    activityFactor: activity.factor,
    maintenance,
    // Shows what was actually applied, after the safety floor.
    goalAdjust: p.customTargetKcal ? 0 : target - maintenance,
    target,
  };
}

/**
 * Typical daily energy needs of Indian adults, for comparison only.
 * ICMR-NIN Nutrient Requirements for Indians (2020), reference man 65 kg / woman 55 kg.
 */
export function typicalIntake(sex: Sex, activity: Activity): { kcal: number; level: string } {
  const level = activity === 'sedentary' || activity === 'light' ? 'sedentary' : activity === 'moderate' ? 'moderate' : 'heavy';
  const table = {
    male: { sedentary: 2110, moderate: 2710, heavy: 3470 },
    female: { sedentary: 1660, moderate: 2130, heavy: 2720 },
  };
  return { kcal: table[sex][level], level };
}

export type MacroTargets = { protein: number; carbs: number; fat: number };

/** Protein per kg of body weight (higher when cutting or building), fat 25% of calories, carbs the rest. */
export function macroTargets(p: Profile, targetKcal: number): MacroTargets {
  const proteinPerKg = p.goal === 'maintain' ? 1.2 : 1.6;
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round((targetKcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((targetKcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

export type Meal = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export const MEALS: { value: Meal; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'dinner', label: 'Dinner' },
];

export function mealForNow(date = new Date()): Meal {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 19) return 'snacks';
  return 'dinner';
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
}

export function formatDateKey(key: string): string {
  const today = toDateKey(new Date());
  if (key === today) return 'Today';
  if (key === shiftDateKey(today, -1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
