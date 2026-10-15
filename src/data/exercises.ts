import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import type { Goal } from '@/lib/nutrition';

export type ExerciseKind = 'cardio' | 'strength' | 'mobility';

export type Exercise = {
  id: string;
  name: string;
  /** SF Symbol figure shown as the picture on iOS. */
  symbol: SFSymbol;
  /** Material Symbol shown on Android. */
  androidSymbol: AndroidSymbol;
  kind: ExerciseKind;
  /** Metabolic equivalent: kcal burned ≈ MET × kg × hours. */
  met: number;
  /** high-impact moves are left out for older users. */
  impact: 'low' | 'medium' | 'high';
  steps: string[];
};

export const EXERCISES: Exercise[] = [
  {
    id: 'brisk_walk',
    name: 'Brisk walking',
    symbol: 'figure.walk',
    androidSymbol: 'directions_walk',
    kind: 'cardio',
    met: 4.3,
    impact: 'low',
    steps: ['Walk fast enough that talking is a little hard', 'Swing your arms, stand tall', 'Cubbon Park laps or after-dinner walks count'],
  },
  {
    id: 'jogging',
    name: 'Jogging',
    symbol: 'figure.run',
    androidSymbol: 'directions_run',
    kind: 'cardio',
    met: 7,
    impact: 'high',
    steps: ['Start with 5 min walking to warm up', 'Jog at a pace you can keep for the whole time', 'Walk 5 min to cool down'],
  },
  {
    id: 'cycling',
    name: 'Cycling',
    symbol: 'figure.outdoor.cycle',
    androidSymbol: 'directions_bike',
    kind: 'cardio',
    met: 6.8,
    impact: 'low',
    steps: ['Outdoor or stationary bike', 'Keep a steady, moderate effort', 'Easy on the knees'],
  },
  {
    id: 'swimming',
    name: 'Swimming',
    symbol: 'figure.pool.swim',
    androidSymbol: 'pool',
    kind: 'cardio',
    met: 6,
    impact: 'low',
    steps: ['Any stroke at an easy, continuous pace', 'Rest at the wall when needed', 'Great for joints and the whole body'],
  },
  {
    id: 'skipping',
    name: 'Skipping rope',
    symbol: 'figure.jumprope',
    androidSymbol: 'sprint',
    kind: 'cardio',
    met: 11,
    impact: 'high',
    steps: ['Do 1 min skipping, 1 min rest', 'Land softly on the balls of your feet', 'Build up rounds over the weeks'],
  },
  {
    id: 'hiit',
    name: 'HIIT circuit',
    symbol: 'figure.highintensity.intervaltraining',
    androidSymbol: 'exercise',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    steps: ['30 s hard (jumping jacks, burpees, mountain climbers)', '30 s rest, repeat 8–10 rounds', 'Not on back-to-back days'],
  },
  {
    id: 'badminton',
    name: 'Badminton',
    symbol: 'figure.badminton',
    androidSymbol: 'sports_tennis',
    kind: 'cardio',
    met: 5.5,
    impact: 'medium',
    steps: ['A fun way to burn calories with friends', 'Warm up shoulders and ankles first', 'Doubles is gentler than singles'],
  },
  {
    id: 'cricket',
    name: 'Cricket / sport',
    symbol: 'figure.cricket',
    androidSymbol: 'sports_cricket',
    kind: 'cardio',
    met: 4.8,
    impact: 'medium',
    steps: ['Weekend matches count as activity', 'Stay hydrated', 'Add a short warm-up'],
  },
  {
    id: 'dance',
    name: 'Dance / Zumba',
    symbol: 'figure.dance',
    androidSymbol: 'nightlife',
    kind: 'cardio',
    met: 6.5,
    impact: 'medium',
    steps: ['Follow a class or video', 'Keep moving the whole time', 'Bollywood workouts are great fun'],
  },
  {
    id: 'squats',
    name: 'Bodyweight squats & lunges',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'sports_gymnastics',
    kind: 'strength',
    met: 5,
    impact: 'medium',
    steps: ['3 sets of 12 squats + 10 lunges per leg', 'Knees in line with toes, chest up', 'Rest 60 s between sets'],
  },
  {
    id: 'weights',
    name: 'Weight training',
    symbol: 'figure.strengthtraining.traditional',
    androidSymbol: 'fitness_center',
    kind: 'strength',
    met: 6,
    impact: 'medium',
    steps: ['Dumbbells or gym: push, pull, legs', '3 sets of 8–12 reps, last reps should feel hard', 'Add weight slowly each week'],
  },
  {
    id: 'core',
    name: 'Plank & core',
    symbol: 'figure.core.training',
    androidSymbol: 'exercise',
    kind: 'strength',
    met: 4,
    impact: 'low',
    steps: ['Plank 3 × 30–45 s', 'Side plank 2 × 20 s per side', 'Keep your back straight, breathe'],
  },
  {
    id: 'surya_namaskar',
    name: 'Surya Namaskar',
    symbol: 'figure.yoga',
    androidSymbol: 'self_improvement',
    kind: 'mobility',
    met: 4,
    impact: 'low',
    steps: ['Start with 6 rounds, build to 12', 'Move with your breath', 'Strength and flexibility together'],
  },
  {
    id: 'stretching',
    name: 'Stretching',
    symbol: 'figure.flexibility',
    androidSymbol: 'accessibility_new',
    kind: 'mobility',
    met: 2.5,
    impact: 'low',
    steps: ['Hold each stretch 20–30 s, no bouncing', 'Hamstrings, hips, shoulders, back', 'Good after every workout'],
  },
  {
    id: 'pranayama',
    name: 'Pranayama & gentle yoga',
    symbol: 'figure.mind.and.body',
    androidSymbol: 'self_improvement',
    kind: 'mobility',
    met: 2.5,
    impact: 'low',
    steps: ['Anulom vilom and deep breathing, 10 min', 'Gentle poses you can hold comfortably', 'Helps sleep and stress'],
  },
  {
    id: 'stairs',
    name: 'Stair climbing',
    symbol: 'figure.stairs',
    androidSymbol: 'stairs',
    kind: 'cardio',
    met: 8,
    impact: 'medium',
    steps: ['Use your building stairs or a stepper', 'Climb steadily, hold the rail if needed', 'Walk down slowly to rest'],
  },
  {
    id: 'elliptical',
    name: 'Elliptical trainer',
    symbol: 'figure.elliptical',
    androidSymbol: 'nordic_walking',
    kind: 'cardio',
    met: 5,
    impact: 'low',
    steps: ['Gym cross-trainer at a steady pace', 'Push and pull with the arms too', 'Gentle on knees and hips'],
  },
  {
    id: 'step_aerobics',
    name: 'Step aerobics',
    symbol: 'figure.step.training',
    androidSymbol: 'step',
    kind: 'cardio',
    met: 7,
    impact: 'medium',
    steps: ['Step up and down on a low step to music', 'Alternate the leading leg', 'Follow a beginner video'],
  },
  {
    id: 'pilates',
    name: 'Pilates',
    symbol: 'figure.pilates',
    androidSymbol: 'sports_gymnastics',
    kind: 'mobility',
    met: 3.5,
    impact: 'low',
    steps: ['Slow, controlled moves on a mat', 'Focus on core and posture', 'Great for back pain prevention'],
  },
  {
    id: 'tai_chi',
    name: 'Tai Chi',
    symbol: 'figure.taichi',
    androidSymbol: 'sports_martial_arts',
    kind: 'mobility',
    met: 3,
    impact: 'low',
    steps: ['Slow flowing movements with deep breathing', 'Improves balance and calm', 'Follow a beginner class or video'],
  },
  {
    id: 'balance',
    name: 'Balance training',
    symbol: 'figure.stand',
    androidSymbol: 'accessibility_new',
    kind: 'mobility',
    met: 2.5,
    impact: 'low',
    steps: ['Stand on one leg for 20–30 s, near a wall or chair', 'Heel-to-toe walking for 10 steps', 'Helps prevent falls'],
  },
  {
    id: 'sit_to_stand',
    name: 'Sit-to-stand',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'airline_seat_recline_normal',
    kind: 'strength',
    met: 3.5,
    impact: 'low',
    steps: ['Sit on a sturdy chair, arms crossed', 'Stand up fully, sit down slowly', '2–3 sets of 10'],
  },
  {
    id: 'wall_pushups',
    name: 'Wall push-ups',
    symbol: 'figure.arms.open',
    androidSymbol: 'sports_handball',
    kind: 'strength',
    met: 3,
    impact: 'low',
    steps: ['Hands on a wall at shoulder height', 'Lower your chest towards the wall, push back', '2–3 sets of 10–12'],
  },
  {
    id: 'light_weights',
    name: 'Light weights / bands',
    symbol: 'figure.strengthtraining.traditional',
    androidSymbol: 'fitness_center',
    kind: 'strength',
    met: 3.5,
    impact: 'low',
    steps: ['1–3 kg dumbbells or a resistance band', 'Bicep curls, rows, shoulder presses', '2 sets of 12, slow and controlled'],
  },
];

export type PlanItem = { exercise: Exercise; minutes: number; perWeek: number; kcal: number };

export type AgeBand = '18-29' | '30-44' | '45-59' | '60+';

export const AGE_BANDS: { value: AgeBand; label: string; why: string }[] = [
  {
    value: '18-29',
    label: '18–29',
    why: 'Your body recovers fast, so you can mix hard intervals with heavier strength training to build a strong base.',
  },
  {
    value: '30-44',
    label: '30–44',
    why: 'Muscle starts to drop slowly from your 30s. Strength training 3× a week keeps your metabolism up; intervals stay short.',
  },
  {
    value: '45-59',
    label: '45–59',
    why: 'Low-impact cardio protects your knees and back, while strength and yoga keep muscle, bones and posture healthy.',
  },
  {
    value: '60+',
    label: '60+',
    why: 'Balance, gentle strength and walking keep you steady on your feet, prevent falls and keep you independent.',
  },
];

export function ageBand(age: number): AgeBand {
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  return '60+';
}

// [exercise id, minutes per session, sessions per week]
type Slot = [string, number, number];

const PLANS: Record<AgeBand, Record<Goal, Slot[]>> = {
  '18-29': {
    lose: [['hiit', 25, 3], ['jogging', 30, 2], ['weights', 45, 3], ['skipping', 15, 2], ['core', 10, 3], ['stretching', 10, 3]],
    maintain: [['badminton', 45, 2], ['jogging', 30, 2], ['weights', 40, 2], ['surya_namaskar', 15, 3], ['stretching', 10, 3]],
    gain: [['weights', 50, 4], ['squats', 20, 2], ['core', 15, 3], ['cycling', 20, 2], ['stretching', 10, 4]],
  },
  '30-44': {
    lose: [['brisk_walk', 40, 3], ['hiit', 20, 2], ['weights', 40, 3], ['cycling', 30, 2], ['core', 10, 3], ['surya_namaskar', 15, 3]],
    maintain: [['cycling', 30, 2], ['badminton', 40, 2], ['weights', 35, 2], ['surya_namaskar', 15, 3], ['stretching', 10, 3]],
    gain: [['weights', 45, 4], ['squats', 20, 2], ['core', 12, 3], ['brisk_walk', 30, 2], ['stretching', 10, 4]],
  },
  '45-59': {
    lose: [['brisk_walk', 45, 4], ['cycling', 30, 2], ['swimming', 30, 1], ['light_weights', 30, 2], ['sit_to_stand', 15, 2], ['pilates', 20, 2]],
    maintain: [['brisk_walk', 40, 3], ['swimming', 30, 2], ['light_weights', 30, 2], ['surya_namaskar', 15, 3], ['stretching', 10, 3]],
    gain: [['weights', 40, 3], ['squats', 20, 2], ['core', 10, 3], ['brisk_walk', 30, 2], ['stretching', 10, 4]],
  },
  '60+': {
    lose: [['brisk_walk', 30, 5], ['elliptical', 20, 2], ['sit_to_stand', 15, 2], ['wall_pushups', 10, 2], ['tai_chi', 20, 2], ['balance', 10, 3]],
    maintain: [['brisk_walk', 30, 5], ['tai_chi', 20, 2], ['sit_to_stand', 15, 2], ['balance', 10, 3], ['pranayama', 10, 5]],
    gain: [['light_weights', 25, 3], ['sit_to_stand', 15, 3], ['wall_pushups', 10, 3], ['brisk_walk', 20, 3], ['balance', 10, 3]],
  },
};

/**
 * A weekly plan for the user's age group and goal, following WHO guidance
 * (150–300 min of moderate activity and strength work on 2+ days a week).
 */
export function recommendExercises(goal: Goal, band: AgeBand, weightKg: number): PlanItem[] {
  return PLANS[band][goal].map(([id, minutes, perWeek]) => {
    const exercise = EXERCISES.find((e) => e.id === id)!;
    return { exercise, minutes, perWeek, kcal: Math.round((exercise.met * weightKg * minutes) / 60) };
  });
}

/** Calories burned for a body weight and duration. */
export function kcalFor(e: Exercise, weightKg: number, minutes: number): number {
  return Math.round((e.met * weightKg * minutes) / 60);
}

/** Which ages an exercise suits, by impact. */
export function suitability(e: Exercise): { label: string; maxAge: number } {
  if (e.impact === 'high') return { label: 'Best under 45', maxAge: 44 };
  if (e.impact === 'medium') return { label: 'Best under 65', maxAge: 64 };
  return { label: 'All ages', maxAge: 200 };
}

export function suitsAgeBand(e: Exercise, band: AgeBand): boolean {
  const minAge = { '18-29': 18, '30-44': 30, '45-59': 45, '60+': 60 }[band];
  return minAge <= suitability(e).maxAge;
}
