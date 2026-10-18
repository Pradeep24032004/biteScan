import { estimateBody } from '@/lib/bodyComposition';

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
/** The specific plan the user picked; `Goal` is just its direction (used by workouts and history). */
export type GoalPlan = 'shred' | 'lose' | 'recomp' | 'maintain' | 'gain';
export type Pace = 'gentle' | 'steady' | 'fast';

export type NotificationPrefs = {
  /** Alert as soon as today's food goes over the daily target. */
  overTarget: boolean;
  /** Evening alert when today's food is well under the daily target. */
  underTarget: boolean;
  /** 9 pm summary of the day. */
  eveningSummary: boolean;
  /** Reminders when lunch or dinner hasn't been logged. */
  mealReminders: boolean;
  /** Morning nudge when recent days are drifting away from the goal (history based). */
  goalCheck: boolean;
  /** Sunday evening reminder that the weekly coach report is ready. */
  weeklyReport: boolean;
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
  goalPlan: GoalPlan;
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
  goalPlan: 'maintain',
  customTargetKcal: null,
  targetWeightKg: null,
  targetBodyFatPct: null,
  pace: 'steady',
  goalStartWeightKg: null,
  goalStartedAt: null,
  notifications: { overTarget: true, underTarget: true, eveningSummary: true, mealReminders: true, goalCheck: true, weeklyReport: true },
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

export const GOAL_PLANS: { value: GoalPlan; label: string; emoji: string; direction: Goal; description: string }[] = [
  { value: 'shred', label: 'Six-pack / shred', emoji: '🔥', direction: 'lose', description: 'Reach a lean body-fat %. Bigger deficit, very high protein, strength training to keep muscle.' },
  { value: 'lose', label: 'Lose fat', emoji: '⚖️', direction: 'lose', description: 'Steady fat loss towards a target weight, keeping muscle with protein and strength work.' },
  { value: 'recomp', label: 'Recomp', emoji: '🔄', direction: 'maintain', description: 'Lose fat and build muscle at the same time: small deficit, high protein, lifting 3×/week. Track it with InBody, not the scale.' },
  { value: 'maintain', label: 'Maintain', emoji: '🧘', direction: 'maintain', description: 'Stay where you are and eat well.' },
  { value: 'gain', label: 'Build muscle', emoji: '💪', direction: 'gain', description: 'Lean bulk: small surplus with strength training, to add muscle with little fat.' },
];

export const directionOf = (plan: GoalPlan): Goal => GOAL_PLANS.find((g) => g.value === plan)?.direction ?? 'maintain';

export const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: 'gentle', label: 'Gentle' },
  { value: 'steady', label: 'Steady' },
  { value: 'fast', label: 'Fast' },
];

/** Share of maintenance calories to cut (−) or add (+), per plan and pace. */
const PACE_SHARE: Record<Exclude<GoalPlan, 'shred'>, Record<Pace, number>> = {
  lose: { gentle: -0.1, steady: -0.15, fast: -0.2 },
  recomp: { gentle: -0.05, steady: -0.1, fast: -0.12 },
  maintain: { gentle: 0, steady: 0, fast: 0 },
  gain: { gentle: 0.05, steady: 0.1, fast: 0.15 },
};
/** Shredding pace as % of body weight lost per week (evidence-based range for keeping muscle). */
const SHRED_WEEKLY_PCT: Record<Pace, number> = { gentle: 0.5, steady: 0.75, fast: 1 };

/** Body fat %: measured if available, otherwise estimated from BMI, age and sex. */
export function currentBodyFat(p: Profile): number {
  return p.bodyFatPct ?? estimateBody(p.sex, p.age, p.heightCm, p.weightKg).bodyFatPct;
}

/** Weight at which the target body fat % is reached, assuming lean mass is kept. */
export function weightAtBodyFat(p: Profile, targetPct: number): number {
  const lean = p.weightKg * (1 - currentBodyFat(p) / 100);
  return Math.round((lean / (1 - targetPct / 100)) * 10) / 10;
}

export function maintenanceKcal(p: Profile): number {
  const { bmr } = calculateBmr(p);
  const factor = ACTIVITY_OPTIONS.find((a) => a.value === p.activity)?.factor ?? 1.2;
  return bmr * factor;
}

/** Daily calorie change for the goal, scaled to the person rather than a fixed number. */
export function goalAdjustment(p: Profile): number {
  const maintenance = maintenanceKcal(p);
  if (p.goalPlan === 'shred') {
    // Already-lean people lose muscle on fast cuts, so they're held to the gentle pace.
    const lean = currentBodyFat(p) < (p.sex === 'male' ? 15 : 23);
    const pct = lean ? Math.min(SHRED_WEEKLY_PCT[p.pace], 0.5) : SHRED_WEEKLY_PCT[p.pace];
    const kcal = ((p.weightKg * pct) / 100) * (7700 / 7);
    return -Math.round(Math.min(kcal, maintenance * 0.25));
  }
  return Math.round(maintenance * PACE_SHARE[p.goalPlan][p.pace]);
}

/** Expected weight change in kg per week from the calorie adjustment (~7,700 kcal per kg). */
export function weeklyChangeKg(p: Profile): number {
  return Math.round(((goalAdjustment(p) * 7) / 7700) * 100) / 100;
}

/** The weight being aimed for: from the body-fat goal when shredding, else the target weight. */
export function goalWeight(p: Profile): number | null {
  if (p.goalPlan === 'shred' && p.targetBodyFatPct != null) return weightAtBodyFat(p, p.targetBodyFatPct);
  return p.targetWeightKg;
}

/** Weeks until the goal weight at the chosen pace, or null if there's nothing to reach. */
export function weeksToGoal(p: Profile): number | null {
  const target = goalWeight(p);
  if (target == null || p.goal === 'maintain') return null;
  const diff = target - p.weightKg;
  const perWeek = weeklyChangeKg(p);
  if (perWeek === 0 || Math.sign(diff) !== Math.sign(perWeek)) return null;
  return Math.ceil(diff / perWeek);
}

/**
 * Calories to burn through exercise each day for the goal (on top of normal daily movement).
 * Scaled to body weight, since heavier people burn more for the same exercise.
 */
export function burnTarget(p: Profile): number {
  const base: Record<GoalPlan, number> = { shred: 400, lose: 300, recomp: 300, maintain: 200, gain: 250 };
  return Math.round((base[p.goalPlan] * Math.min(1.4, Math.max(0.7, p.weightKg / 70))) / 10) * 10;
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
  return Math.max(Math.round(maintenanceKcal(p) + goalAdjustment(p)), safetyFloor(p, bmr));
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
  // Protein rises when cutting so muscle is kept. It's based on weight at ~15–25% fat, so people
  // carrying a lot of fat aren't given unrealistic amounts.
  const perKg: Record<GoalPlan, number> = { shred: 2.2, lose: 1.8, recomp: 2.0, maintain: 1.4, gain: 1.8 };
  const leanMass = p.weightKg * (1 - currentBodyFat(p) / 100);
  const reference = Math.min(p.weightKg, leanMass / (p.sex === 'male' ? 0.85 : 0.75));
  const protein = Math.round(reference * perKg[p.goalPlan]);
  const fat = Math.round((targetKcal * (p.goalPlan === 'shred' ? 0.22 : 0.25)) / 9);
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
