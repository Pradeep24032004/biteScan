import type { SQLiteDatabase } from 'expo-sqlite';

import { getBodyLogs, getDailyTotals, getProfile, getWeights, getWorkoutsSince, type DayTotal, type WeightEntry } from '@/db/database';
import { burnTarget, calculateTarget, shiftDateKey, toDateKey, type Profile } from '@/lib/nutrition';

export type Insight = { tone: 'good' | 'warning' | 'info'; title: string; body: string };

/** One thing that decides whether the user is moving towards their goal. */
export type GoalCheck = { label: string; detail: string; ok: boolean };

/** Overall verdict for the last 7 days. */
export type GoalStatus = { verdict: 'towards' | 'away' | 'starting'; checks: GoalCheck[] };

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
  /** Exercise calories burned per day over the last 7 days, and the daily goal. */
  burnedWeek: number;
  burnTarget: number;
  status: GoalStatus;
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
  const [totals, weights, workouts, bodyLogs] = await Promise.all([
    getDailyTotals(db, from, today),
    getWeights(db, shiftDateKey(today, -60)),
    getWorkoutsSince(db, shiftDateKey(today, -6)),
    getBodyLogs(db),
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

  // ---- Towards or away from the goal: eating, exercise, body change and logging ----
  const logged = week.filter((d) => d.items > 0);
  const onTargetDays = logged.filter((d) => onTarget(d.kcal, target, profile)).length;
  const burnGoal = burnTarget(profile);
  const burnedWeek = Math.round(workouts.reduce((s, w) => s + w.kcal, 0));
  const checks: GoalCheck[] = [];
  if (logged.length >= 2) {
    checks.push({
      label: 'Eating',
      detail: `${onTargetDays} of ${logged.length} logged days on target`,
      ok: onTargetDays >= Math.ceil(logged.length / 2) && !calorieDrifting,
    });
  }
  checks.push({
    label: 'Exercise',
    detail: `${burnedWeek.toLocaleString('en-IN')} of ${(burnGoal * 7).toLocaleString('en-IN')} kcal burned this week`,
    ok: burnedWeek >= burnGoal * 7 * 0.7,
  });
  // Body change: body fat from InBody for shred/recomp when there are two scans, else the weight trend.
  const fatScans = bodyLogs.filter((l) => l.bodyFatPct != null && l.date >= shiftDateKey(today, -60));
  if ((profile.goalPlan === 'shred' || profile.goalPlan === 'recomp') && fatScans.length >= 2) {
    const change = Math.round((fatScans[fatScans.length - 1].bodyFatPct! - fatScans[0].bodyFatPct!) * 10) / 10;
    checks.push({ label: 'Body fat', detail: `${change > 0 ? '+' : ''}${change}% since ${new Date(`${fatScans[0].date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, ok: change < 0 });
  } else if (trend != null) {
    const right = profile.goal === 'maintain' ? Math.abs(trend) <= 0.3 : Math.sign(trend) === (profile.goal === 'lose' ? -1 : 1);
    checks.push({ label: 'Weight', detail: `${trend > 0 ? '+' : ''}${trend} kg a week`, ok: right && !weightDrifting });
  }
  checks.push({ label: 'Logging', detail: `${logged.length} of 7 days`, ok: logged.length >= 4 });
  const okCount = checks.filter((c) => c.ok).length;
  const verdict: GoalStatus['verdict'] =
    logged.length < 2 && trend == null ? 'starting' : drifting || okCount < checks.length / 2 ? 'away' : 'towards';

  return {
    burnedWeek,
    burnTarget: burnGoal,
    status: { verdict, checks },
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
