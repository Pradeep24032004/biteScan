// Weekly coach report: a summary of one week of food, exercise and body changes, with tips.
// Worked out on the phone from what the user logged — nothing is sent anywhere.
import type { SQLiteDatabase } from 'expo-sqlite';

import { getBodyLogs, getDailyTotals, getTopFoods, getWeights, getWorkoutsSince, type DayTotal } from '@/db/database';
import { burnTarget, calculateTarget, macroTargets, shiftDateKey, toDateKey, type Profile } from '@/lib/nutrition';

export type Tip = { emoji: string; text: string };

export type WeeklyReport = {
  from: string;
  to: string;
  /** 0–100, how well the week matched the plan. */
  score: number;
  headline: string;
  daysLogged: number;
  avgKcal: number | null;
  target: number;
  weekdayAvg: number | null;
  weekendAvg: number | null;
  avgProtein: number | null;
  proteinTarget: number;
  burned: number;
  burnGoal: number;
  workouts: number;
  /** Change over the week (last minus first measurement), when there are two. */
  weightChange: number | null;
  fatChange: number | null;
  muscleChange: number | null;
  topFoods: { name: string; times: number; kcal: number }[];
  wins: string[];
  tips: Tip[];
};

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const round1 = (x: number) => Math.round(x * 10) / 10;
const isWeekend = (key: string) => {
  const d = new Date(`${key}T00:00:00`).getDay();
  return d === 0 || d === 6;
};

/** Report for the 7 days ending `weeksAgo` weeks before today (0 = the last 7 days). */
export async function weeklyReport(db: SQLiteDatabase, profile: Profile, weeksAgo = 0): Promise<WeeklyReport> {
  const to = shiftDateKey(toDateKey(new Date()), -7 * weeksAgo);
  const from = shiftDateKey(to, -6);
  const [totals, workouts, weights, bodyLogs, topFoods] = await Promise.all([
    getDailyTotals(db, from, to),
    getWorkoutsSince(db, from),
    getWeights(db, shiftDateKey(from, -7)),
    getBodyLogs(db),
    getTopFoods(db, from, to),
  ]);
  const target = calculateTarget(profile);
  const proteinTarget = macroTargets(profile, target).protein;
  const burnGoal = burnTarget(profile) * 7;

  const logged: DayTotal[] = totals.filter((d) => d.items > 0);
  const avgKcal = avg(logged.map((d) => d.kcal));
  const weekdayAvg = avg(logged.filter((d) => !isWeekend(d.date)).map((d) => d.kcal));
  const weekendAvg = avg(logged.filter((d) => isWeekend(d.date)).map((d) => d.kcal));
  const avgProtein = avg(logged.map((d) => d.protein));
  const week = workouts.filter((w) => w.date <= to);
  const burned = Math.round(week.reduce((s, w) => s + w.kcal, 0));

  // Body change across the week: compare the latest reading up to `to` with the one a week before.
  const change = (series: { date: string; value: number }[]) => {
    const inRange = series.filter((p) => p.date <= to);
    const end = inRange[inRange.length - 1];
    const start = [...inRange].reverse().find((p) => p.date <= from) ?? inRange[0];
    return end && start && end !== start ? round1(end.value - start.value) : null;
  };
  const weightChange = change(weights.map((w) => ({ date: w.date, value: w.kg })));
  const fatChange = change(bodyLogs.filter((l) => l.bodyFatPct != null).map((l) => ({ date: l.date, value: l.bodyFatPct! })));
  const muscleChange = change(bodyLogs.filter((l) => l.muscleKg != null).map((l) => ({ date: l.date, value: l.muscleKg! })));

  // ---- Score: eating 40, protein 20, exercise 25, logging 15 ----
  const cutting = profile.goal === 'lose';
  const eatScore =
    avgKcal == null ? 0 : Math.max(0, 40 - Math.abs(avgKcal - target) / target * (cutting && avgKcal < target ? 60 : 160));
  const proteinScore = avgProtein == null ? 0 : Math.min(20, (avgProtein / proteinTarget) * 20);
  const burnScore = Math.min(25, (burned / burnGoal) * 25);
  const logScore = (logged.length / 7) * 15;
  const score = Math.round(eatScore + proteinScore + burnScore + logScore);
  const headline =
    logged.length < 2 ? 'Not enough logged this week' : score >= 80 ? 'Excellent week! 🏆' : score >= 60 ? 'Good week 👍' : score >= 40 ? 'Room to improve 💪' : 'Tough week — let’s reset 🔄';

  // ---- What went well ----
  const wins: string[] = [];
  if (avgKcal != null && Math.abs(avgKcal - target) <= target * 0.08) wins.push('Calories right on target');
  if (avgProtein != null && avgProtein >= proteinTarget * 0.9) wins.push('Hit your protein');
  if (burned >= burnGoal) wins.push(`Exercise goal smashed (${week.length} sessions)`);
  if (logged.length === 7) wins.push('Logged every day');
  if (fatChange != null && fatChange < 0) wins.push(`Body fat down ${Math.abs(fatChange)}%`);
  if (muscleChange != null && muscleChange > 0) wins.push(`Muscle up ${muscleChange} kg`);
  if (weightChange != null && weightChange !== 0 && Math.sign(weightChange) === (cutting ? -1 : profile.goal === 'gain' ? 1 : 0))
    wins.push(`Weight ${weightChange > 0 ? 'up' : 'down'} ${Math.abs(weightChange)} kg`);

  // ---- Tips for next week, most useful first ----
  const tips: Tip[] = [];
  if (logged.length < 5) tips.push({ emoji: '📝', text: `You logged ${logged.length} of 7 days. Log every meal, even roughly — the plan only works with the full picture.` });
  if (weekendAvg != null && weekdayAvg != null && weekendAvg > weekdayAvg * 1.12 && weekendAvg > target) {
    const pct = Math.round((weekendAvg / weekdayAvg - 1) * 100);
    tips.push({ emoji: '🎉', text: `Weekends were ${pct}% higher than weekdays. Plan one lighter weekend meal — e.g. skip the second helping of rice or share the dessert.` });
  }
  if (avgKcal != null && cutting && avgKcal > target * 1.08) {
    const big = topFoods[0];
    tips.push({
      emoji: '🍛',
      text: big
        ? `You averaged ${avgKcal.toLocaleString('en-IN')} kcal (target ${target.toLocaleString('en-IN')}). ${big.name} added ${Math.round(big.kcal).toLocaleString('en-IN')} kcal this week — try a smaller portion with extra salad or raita.`
        : `You averaged ${avgKcal.toLocaleString('en-IN')} kcal, above your ${target.toLocaleString('en-IN')} target. Watch fried snacks and sweets.`,
    });
  }
  if (avgKcal != null && avgKcal < target * 0.75) {
    tips.push({ emoji: '⚠️', text: `You averaged only ${avgKcal.toLocaleString('en-IN')} kcal. Eating too little costs muscle and slows your metabolism — add a proper breakfast.` });
  }
  if (avgProtein != null && avgProtein < proteinTarget * 0.8) {
    tips.push({
      emoji: '🥚',
      text: `Protein averaged ${avgProtein} g of ${proteinTarget} g. Add one of: 100 g paneer (18 g), 2 eggs (12 g), a bowl of dal or sprouts (9 g), or chicken (25 g).`,
    });
  }
  if (burned < burnGoal * 0.7) {
    const walk = Math.round(profile.weightKg * 4.3 * 0.5);
    tips.push({ emoji: '🚶', text: `Burned ${burned.toLocaleString('en-IN')} of ${burnGoal.toLocaleString('en-IN')} kcal. Each 30-minute brisk walk burns about ${walk} kcal — add 3 this week, or a home workout.` });
  }
  if ((profile.goalPlan === 'shred' || profile.goalPlan === 'recomp' || profile.goalPlan === 'gain') && !week.some((w) => w.sets || w.title === 'Home workout')) {
    tips.push({ emoji: '🏋️', text: 'No strength training logged. Lift or do the home workout 3 times a week so the weight you lose is fat, not muscle.' });
  }
  if (tips.length === 0) tips.push({ emoji: '🌟', text: 'Keep doing exactly what you did this week. Consistency is what changes your body.' });

  return {
    from,
    to,
    score,
    headline,
    daysLogged: logged.length,
    avgKcal,
    target,
    weekdayAvg,
    weekendAvg,
    avgProtein,
    proteinTarget,
    burned,
    burnGoal,
    workouts: week.length,
    weightChange,
    fatChange,
    muscleChange,
    topFoods,
    wins,
    tips: tips.slice(0, 4),
  };
}
