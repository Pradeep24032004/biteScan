import type { SQLiteDatabase } from 'expo-sqlite';

import { getDailyTotals, getProfile, getWeights, type DayTotal, type WeightEntry } from '@/db/database';
import { calculateTarget, shiftDateKey, toDateKey, type Profile } from '@/lib/nutrition';

export type Insight = { tone: 'good' | 'warning' | 'info'; title: string; body: string };

export type History = {
  target: number;
  /** Last 7 days, oldest first, including days with nothing logged (kcal 0, items 0). */
  week: DayTotal[];
  daysLogged: number;
  daysOnTarget: number;
  overDaysLast5: number;
  underDaysLast5: number;
  /** Consecutive on-target days, ending yesterday (today is still in progress). */
  streak: number;
  /** Full days since anything was logged (0 = logged today or yesterday). */
  daysSinceLog: number;
  weights: WeightEntry[];
  /** kg per week over the last weights, positive = gaining. Null with fewer than 2 weigh-ins. */
  weightTrendKgPerWeek: number | null;
  drifting: boolean;
  insights: Insight[];
};

/** A day counts as on target when it's within the band that fits the goal. */
function onTarget(kcal: number, target: number, p: Profile) {
  if (p.goal === 'lose') return kcal <= target * 1.05 && kcal >= target * 0.75;
  if (p.goal === 'gain') return kcal >= target * 0.95;
  return Math.abs(kcal - target) <= target * 0.1;
}

export async function analyseHistory(db: SQLiteDatabase, profileArg?: Profile): Promise<History> {
  const profile = profileArg ?? (await getProfile(db));
  const target = calculateTarget(profile);
  const today = toDateKey(new Date());
  const from = shiftDateKey(today, -29);
  const [totals, weights] = await Promise.all([
    getDailyTotals(db, from, today),
    getWeights(db, shiftDateKey(today, -60)),
  ]);
  const byDate = new Map(totals.map((t) => [t.date, t]));
  const day = (offset: number): DayTotal => {
    const date = shiftDateKey(today, offset);
    return byDate.get(date) ?? { date, kcal: 0, protein: 0, items: 0 };
  };

  const week = Array.from({ length: 7 }, (_, i) => day(i - 6));
  const completed = Array.from({ length: 5 }, (_, i) => day(-1 - i)).filter((d) => d.items > 0);
  const overDaysLast5 = completed.filter((d) => d.kcal > target * 1.1).length;
  const underDaysLast5 = completed.filter((d) => d.kcal < target * 0.8).length;

  let streak = 0;
  for (let i = 1; i <= 30; i++) {
    const d = day(-i);
    if (d.items === 0 || !onTarget(d.kcal, target, profile)) break;
    streak++;
  }

  const lastLogged = [...totals].reverse().find((t) => t.items > 0);
  const daysSinceLog = lastLogged
    ? Math.max(0, Math.round((Date.parse(today) - Date.parse(lastLogged.date)) / 86_400_000) - 1)
    : 30;

  let weightTrendKgPerWeek: number | null = null;
  const recent = weights.filter((w) => w.date >= shiftDateKey(today, -28));
  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const days = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
    if (days >= 5) weightTrendKgPerWeek = Math.round(((last.kg - first.kg) / days) * 7 * 100) / 100;
  }

  const trend = weightTrendKgPerWeek;
  const weightDrifting =
    trend != null &&
    ((profile.goal === 'lose' && trend > 0.15) ||
      (profile.goal === 'gain' && trend < -0.15) ||
      (profile.goal === 'maintain' && Math.abs(trend) > 0.4));
  const calorieDrifting =
    (profile.goal === 'lose' && overDaysLast5 >= 3) ||
    (profile.goal === 'gain' && underDaysLast5 >= 3) ||
    (profile.goal === 'maintain' && overDaysLast5 + underDaysLast5 >= 4);
  const drifting = weightDrifting || calorieDrifting;

  const insights: Insight[] = [];
  if (daysSinceLog >= 2) {
    insights.push({ tone: 'info', title: 'Pick up where you left off', body: `Nothing logged for ${daysSinceLog} days. A quick log keeps your plan accurate.` });
  }
  if (calorieDrifting) {
    insights.push(
      profile.goal === 'gain'
        ? { tone: 'warning', title: 'Eating under your target', body: `${underDaysLast5} of the last 5 days were well under. Add a protein-rich snack like paneer, eggs or sprouts.` }
        : { tone: 'warning', title: 'Drifting above your target', body: `${overDaysLast5} of the last 5 days were over by more than 10%. Watch fried snacks and second helpings of rice.` }
    );
  }
  if (weightDrifting && trend != null) {
    insights.push({
      tone: 'warning',
      title: trend > 0 ? 'Weight is going up' : 'Weight is going down',
      body: `About ${Math.abs(trend)} kg/week recently, which is away from your goal.`,
    });
  }
  if (streak >= 3) {
    insights.push({ tone: 'good', title: `${streak}-day streak 🎉`, body: 'You have stayed on target every day. Keep it going!' });
  }
  if (!drifting && trend != null && profile.goal !== 'maintain' && Math.sign(trend) === (profile.goal === 'lose' ? -1 : 1)) {
    insights.push({ tone: 'good', title: 'Moving towards your goal', body: `${Math.abs(trend)} kg/week in the right direction.` });
  }

  return {
    target,
    week,
    daysLogged: week.filter((d) => d.items > 0).length,
    daysOnTarget: week.filter((d) => d.items > 0 && onTarget(d.kcal, target, profile)).length,
    overDaysLast5,
    underDaysLast5,
    streak,
    daysSinceLog,
    weights,
    weightTrendKgPerWeek,
    drifting,
    insights,
  };
}
