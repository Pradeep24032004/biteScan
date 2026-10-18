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
  /** Gym exercises, grouped by muscle for the exercise log. */
  group?: GymGroup;
};

export type GymGroup =
  'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Olympic & power' | 'Cardio machines' | 'Classes & more' | 'Sports';
export const GYM_GROUPS: GymGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Olympic & power',
  'Cardio machines',
  'Classes & more',
  'Sports',
];

const GENERAL: Exercise[] = [
  {
    id: 'brisk_walk',
    name: 'Brisk walking',
    symbol: 'figure.walk',
    androidSymbol: 'directions_walk',
    kind: 'cardio',
    met: 4.3,
    impact: 'low',
    steps: [
      'Walk fast enough that talking is a little hard',
      'Swing your arms, stand tall',
      'Cubbon Park laps or after-dinner walks count',
    ],
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
  {
    id: 'jumping_jacks',
    name: 'Jumping jacks',
    symbol: 'figure.mixed.cardio',
    androidSymbol: 'sports_gymnastics',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    steps: ['Jump feet apart while raising arms overhead', 'Jump back together, arms down', 'Keep a steady rhythm, land softly'],
  },
  {
    id: 'burpees',
    name: 'Burpees',
    symbol: 'figure.highintensity.intervaltraining',
    androidSymbol: 'exercise',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    steps: ['Squat down, hands on the floor', 'Jump feet back to a plank', 'Jump feet in, then jump up with arms overhead'],
  },
  {
    id: 'mountain_climbers',
    name: 'Mountain climbers',
    symbol: 'figure.core.training',
    androidSymbol: 'sprint',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    steps: [
      'Start in a high plank, hands under shoulders',
      'Drive one knee to your chest, then switch fast',
      'Keep hips low and core tight',
    ],
  },
  {
    id: 'high_knees',
    name: 'High knees',
    symbol: 'figure.run',
    androidSymbol: 'directions_run',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    steps: ['Run in place lifting knees to hip height', 'Pump your arms', 'Stay on the balls of your feet'],
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'fitness_center',
    kind: 'strength',
    met: 3.8,
    impact: 'medium',
    steps: [
      'Hands under shoulders, body in a straight line',
      'Lower your chest close to the floor',
      'Push back up; drop to knees if needed',
    ],
  },
  {
    id: 'lunges',
    name: 'Lunges',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'sports_gymnastics',
    kind: 'strength',
    met: 4,
    impact: 'medium',
    steps: ['Step forward and lower until both knees are at 90°', 'Front knee stays over the ankle', 'Push back up and switch legs'],
  },
  {
    id: 'glute_bridge',
    name: 'Glute bridge',
    symbol: 'figure.core.training',
    androidSymbol: 'accessibility_new',
    kind: 'strength',
    met: 3,
    impact: 'low',
    steps: ['Lie on your back, knees bent, feet flat', 'Lift your hips until body is in a line', 'Squeeze glutes, lower slowly'],
  },
  {
    id: 'crunches',
    name: 'Crunches',
    symbol: 'figure.core.training',
    androidSymbol: 'exercise',
    kind: 'strength',
    met: 3.8,
    impact: 'low',
    steps: [
      'Lie on your back, knees bent, hands by your ears',
      'Curl your shoulders off the floor',
      "Lower slowly; don't pull on your neck",
    ],
  },
  {
    id: 'bicycle_crunch',
    name: 'Bicycle crunches',
    symbol: 'figure.core.training',
    androidSymbol: 'directions_bike',
    kind: 'strength',
    met: 4,
    impact: 'low',
    steps: [
      'Lie on your back, shoulders lifted',
      'Bring one knee in while the other leg extends',
      'Twist elbow towards the bent knee, switch',
    ],
  },
  {
    id: 'wall_sit',
    name: 'Wall sit',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'airline_seat_recline_normal',
    kind: 'strength',
    met: 3.5,
    impact: 'low',
    steps: ['Back flat against a wall', 'Slide down until knees are at 90°', 'Hold and breathe'],
  },
  {
    id: 'calf_raises',
    name: 'Calf raises',
    symbol: 'figure.step.training',
    androidSymbol: 'step',
    kind: 'strength',
    met: 2.8,
    impact: 'low',
    steps: ['Stand tall, hold a wall for balance', 'Rise onto your toes', 'Lower slowly, repeat 15–20 times'],
  },
  {
    id: 'superman',
    name: 'Superman',
    symbol: 'figure.flexibility',
    androidSymbol: 'self_improvement',
    kind: 'strength',
    met: 3,
    impact: 'low',
    steps: ['Lie face down, arms stretched forward', 'Lift arms, chest and legs off the floor', 'Hold 2 seconds, lower slowly'],
  },
  {
    id: 'bird_dog',
    name: 'Bird dog',
    symbol: 'figure.cooldown',
    androidSymbol: 'accessibility_new',
    kind: 'mobility',
    met: 2.8,
    impact: 'low',
    steps: ['On hands and knees, back flat', 'Reach one arm forward and the opposite leg back', 'Hold 2 seconds, switch sides'],
  },
  {
    id: 'side_plank',
    name: 'Side plank',
    symbol: 'figure.core.training',
    androidSymbol: 'exercise',
    kind: 'strength',
    met: 3.5,
    impact: 'low',
    steps: ['Lie on your side, elbow under shoulder', 'Lift hips so your body is straight', 'Hold, then switch sides'],
  },
  {
    id: 'tree_pose',
    name: 'Tree pose (Vrikshasana)',
    symbol: 'figure.mind.and.body',
    androidSymbol: 'self_improvement',
    kind: 'mobility',
    met: 2.5,
    impact: 'low',
    steps: [
      'Stand on one leg, foot of the other on your inner thigh or calf',
      'Hands together above your head',
      'Hold 20–30 seconds, switch legs',
    ],
  },
  {
    id: 'cobra',
    name: 'Cobra pose (Bhujangasana)',
    symbol: 'figure.yoga',
    androidSymbol: 'self_improvement',
    kind: 'mobility',
    met: 2.5,
    impact: 'low',
    steps: ['Lie face down, hands under shoulders', 'Gently lift your chest, elbows slightly bent', 'Hold 15–20 seconds, breathe'],
  },
  {
    id: 'shoulder_press',
    name: 'Shoulder press',
    symbol: 'figure.strengthtraining.traditional',
    androidSymbol: 'fitness_center',
    kind: 'strength',
    met: 4,
    impact: 'low',
    steps: ['Dumbbells or water bottles at shoulder height', 'Press straight up overhead', 'Lower slowly, 3 sets of 10–12'],
  },
];

// ---------- Gym exercises (for logging) ----------
// MET values from the Compendium of Physical Activities (2024): heavy compound lifts ~6,
// machine and isolation work ~3.5–5, cardio machines by typical speed/effort.
type GymSpec = [id: string, name: string, met: number, steps: [string, string, string], impact?: Exercise['impact']];

const LIFT = { symbol: 'figure.strengthtraining.traditional', androidSymbol: 'fitness_center', kind: 'strength' } as const;
const lifts = (group: GymGroup, specs: GymSpec[]): Exercise[] =>
  specs.map(([id, name, met, steps, impact]) => ({ id, name, met, steps, impact: impact ?? 'medium', group, ...LIFT }));

const GYM: Exercise[] = [
  ...lifts('Chest', [
    [
      'bench_press',
      'Bench press (barbell)',
      6,
      ['Feet flat, shoulder blades squeezed back', 'Lower the bar to mid-chest', 'Press up without bouncing; use a spotter for heavy sets'],
    ],
    ['incline_bench', 'Incline bench press', 6, ['Bench at 30–45°', 'Lower to upper chest', 'Press up and slightly back']],
    ['decline_bench', 'Decline bench press', 5.5, ['Hook your feet securely', 'Lower to lower chest', 'Press straight up']],
    [
      'db_press',
      'Dumbbell chest press',
      5.5,
      ['Dumbbells at chest, palms forward', 'Press up until arms are straight', 'Lower slowly, elbows at 45°'],
    ],
    ['chest_fly', 'Dumbbell fly', 4, ['Slight bend in elbows', 'Open arms wide in an arc', 'Squeeze chest to bring them back up']],
    [
      'pec_deck',
      'Pec deck / machine fly',
      3.5,
      ['Adjust seat so handles are at chest height', 'Bring arms together in front', 'Return slowly'],
    ],
    ['cable_crossover', 'Cable crossover', 4, ['Step forward, slight lean', 'Pull handles down and together', 'Control the way back']],
    [
      'chest_press_machine',
      'Chest press machine',
      4,
      ['Handles level with mid-chest', 'Push forward without locking elbows', 'Return slowly'],
    ],
    ['dips', 'Dips', 6, ['Lean forward slightly for chest', 'Lower until upper arms are level', 'Push back up'], 'high'],
  ]),
  ...lifts('Back', [
    [
      'deadlift',
      'Deadlift',
      6,
      ['Bar over mid-foot, flat back', 'Push the floor away, hips and shoulders rise together', 'Stand tall, then lower with control'],
      'high',
    ],
    ['lat_pulldown', 'Lat pulldown', 4.5, ['Grip slightly wider than shoulders', 'Pull the bar to upper chest', 'Let it rise slowly']],
    [
      'pull_ups',
      'Pull-ups / chin-ups',
      8,
      ['Hang with arms straight', 'Pull until chin is over the bar', 'Lower all the way down'],
      'high',
    ],
    [
      'seated_row',
      'Seated cable row',
      4.5,
      ['Sit tall, knees slightly bent', 'Pull handle to your stomach', 'Squeeze shoulder blades, then release'],
    ],
    ['barbell_row', 'Barbell row', 6, ['Hinge forward, flat back', 'Pull the bar to your lower ribs', 'Lower with control']],
    ['db_row', 'One-arm dumbbell row', 5, ['Hand and knee on bench', 'Row the dumbbell to your hip', 'Lower slowly']],
    ['tbar_row', 'T-bar row', 5.5, ['Chest up, hinge at hips', 'Pull handles to chest', 'Control the way down']],
    ['back_extension', 'Back extension', 3.5, ['Hips on the pad', 'Lower with a straight back', 'Rise until body is in line']],
  ]),
  ...lifts('Shoulders', [
    [
      'overhead_press',
      'Overhead press (barbell)',
      6,
      ['Bar at collarbone, core tight', 'Press straight overhead', 'Lower back to collarbone'],
    ],
    ['lateral_raise', 'Lateral raise', 3.5, ['Light dumbbells at your sides', 'Raise out to shoulder height', 'Lower slowly']],
    ['front_raise', 'Front raise', 3.5, ['Dumbbells in front of thighs', 'Raise to shoulder height', 'Lower with control']],
    ['rear_delt_fly', 'Rear delt fly', 3.5, ['Hinge forward', 'Raise arms out to the sides', 'Squeeze the back of the shoulders']],
    ['shrugs', 'Shrugs', 3.5, ['Hold weights at your sides', 'Lift shoulders towards ears', 'Pause, then lower']],
    ['upright_row', 'Upright row', 4, ['Hands shoulder-width', 'Pull bar up to chest height', 'Elbows lead, lower slowly']],
    ['shoulder_press_machine', 'Shoulder press machine', 4, ['Handles at shoulder height', 'Press up', 'Return slowly']],
  ]),
  ...lifts('Arms', [
    ['barbell_curl', 'Barbell curl', 3.5, ['Elbows fixed at your sides', 'Curl the bar to your shoulders', 'Lower all the way down']],
    ['db_curl', 'Dumbbell curl', 3.5, ['Palms forward', 'Curl up, squeeze the biceps', 'Lower slowly']],
    ['hammer_curl', 'Hammer curl', 3.5, ['Palms facing each other', 'Curl up', 'Lower with control']],
    ['preacher_curl', 'Preacher curl', 3.5, ['Arms on the pad', 'Curl up', 'Lower until arms are nearly straight']],
    [
      'tricep_pushdown',
      'Triceps pushdown',
      3.5,
      ['Elbows at your sides', 'Push the bar down until arms are straight', 'Let it rise slowly'],
    ],
    ['skull_crusher', 'Skull crusher', 3.5, ['Lie on bench, bar above chest', 'Bend elbows to lower bar to forehead', 'Extend back up']],
    [
      'overhead_extension',
      'Overhead triceps extension',
      3.5,
      ['Dumbbell overhead with both hands', 'Lower behind your head', 'Extend back up'],
    ],
  ]),
  ...lifts('Legs', [
    [
      'back_squat',
      'Barbell squat',
      6,
      ['Bar on upper back, feet shoulder-width', 'Sit back and down until thighs are level', 'Drive up through your heels'],
      'high',
    ],
    ['front_squat', 'Front squat', 6, ['Bar on front of shoulders', 'Keep elbows high and chest up', 'Squat down and drive up'], 'high'],
    ['leg_press', 'Leg press', 5, ['Feet shoulder-width on the plate', 'Lower until knees are at 90°', 'Press without locking knees']],
    ['leg_extension', 'Leg extension', 3.5, ['Pad just above ankles', 'Straighten legs', 'Lower slowly']],
    ['leg_curl', 'Leg curl', 3.5, ['Pad just above heels', 'Curl heels towards you', 'Return slowly']],
    [
      'romanian_deadlift',
      'Romanian deadlift',
      5.5,
      ['Slight knee bend, flat back', 'Push hips back, bar slides down thighs', 'Stand up by squeezing glutes'],
    ],
    ['hip_thrust', 'Hip thrust', 4.5, ['Upper back on bench, bar on hips', 'Drive hips up', 'Squeeze glutes at the top']],
    ['walking_lunges', 'Walking lunges', 5.5, ['Long step forward', 'Lower back knee near the floor', 'Step through to the next lunge']],
    [
      'bulgarian_split_squat',
      'Bulgarian split squat',
      5.5,
      ['Back foot on a bench', 'Lower until front thigh is level', 'Drive up through the front heel'],
    ],
    ['hack_squat', 'Hack squat', 5, ['Back against the pad', 'Lower until thighs are level', 'Press up']],
    [
      'calf_raise_machine',
      'Calf raise machine',
      3,
      ['Balls of feet on the edge', 'Rise as high as you can', 'Lower below the edge for a stretch'],
    ],
  ]),
  ...lifts('Core', [
    ['cable_crunch', 'Cable crunch', 3.8, ['Kneel holding the rope by your head', 'Crunch down, ribs to hips', 'Return slowly']],
    ['hanging_leg_raise', 'Hanging leg raise', 4, ['Hang from a bar', 'Raise legs to hip height', 'Lower without swinging']],
    ['ab_wheel', 'Ab wheel rollout', 4, ['Kneel holding the wheel', 'Roll forward with a straight back', 'Pull back with your abs']],
    ['russian_twist', 'Russian twist', 3.8, ['Sit leaning back, feet up', 'Twist side to side', 'Hold a weight to make it harder']],
    ['plank_weighted', 'Weighted plank', 3.8, ['Plate on upper back', 'Body in a straight line', 'Breathe steadily']],
  ]),
  {
    id: 'treadmill_run',
    name: 'Treadmill run',
    symbol: 'figure.run',
    androidSymbol: 'directions_run',
    kind: 'cardio',
    met: 9.8,
    impact: 'high',
    group: 'Cardio machines',
    steps: ['Warm up 5 min walking', 'Run at a steady pace (~10 km/h)', 'Cool down 5 min'],
  },
  {
    id: 'treadmill_incline_walk',
    name: 'Treadmill incline walk',
    symbol: 'figure.walk',
    androidSymbol: 'directions_walk',
    kind: 'cardio',
    met: 6,
    impact: 'low',
    group: 'Cardio machines',
    steps: ['Incline 8–12%, speed ~5 km/h', "Don't hold the rails", 'Great fat burner, easy on knees'],
  },
  {
    id: 'stationary_bike',
    name: 'Stationary bike',
    symbol: 'figure.outdoor.cycle',
    androidSymbol: 'directions_bike',
    kind: 'cardio',
    met: 7,
    impact: 'low',
    group: 'Cardio machines',
    steps: ['Seat at hip height', 'Moderate resistance', 'Keep a steady cadence'],
  },
  {
    id: 'spin_class',
    name: 'Spin class',
    symbol: 'figure.outdoor.cycle',
    androidSymbol: 'directions_bike',
    kind: 'cardio',
    met: 8.5,
    impact: 'low',
    group: 'Cardio machines',
    steps: ['Follow the instructor', 'Adjust resistance to your level', 'Hydrate well'],
  },
  {
    id: 'rowing_machine',
    name: 'Rowing machine',
    symbol: 'figure.mixed.cardio',
    androidSymbol: 'rowing',
    kind: 'cardio',
    met: 7,
    impact: 'low',
    group: 'Cardio machines',
    steps: ['Push with legs first, then pull with arms', 'Handle to lower ribs', 'Return arms, then body, then legs'],
  },
  {
    id: 'stair_climber',
    name: 'Stair climber',
    symbol: 'figure.stairs',
    androidSymbol: 'stairs',
    kind: 'cardio',
    met: 9,
    impact: 'medium',
    group: 'Cardio machines',
    steps: ['Stand tall', 'Light grip on rails only', 'Steady pace you can keep'],
  },
  {
    id: 'cross_trainer',
    name: 'Cross trainer',
    symbol: 'figure.elliptical',
    androidSymbol: 'directions_run',
    kind: 'cardio',
    met: 5,
    impact: 'low',
    group: 'Cardio machines',
    steps: ['Push and pull the handles', 'Moderate resistance', 'Low impact on joints'],
  },
  {
    id: 'kettlebell_swing',
    name: 'Kettlebell swings',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'fitness_center',
    kind: 'strength',
    met: 9.8,
    impact: 'medium',
    group: 'Classes & more',
    steps: ['Hinge at hips, flat back', 'Snap hips forward to swing the bell to chest height', 'Let it swing back between your legs'],
  },
  {
    id: 'battle_ropes',
    name: 'Battle ropes',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'fitness_center',
    kind: 'cardio',
    met: 10,
    impact: 'medium',
    group: 'Classes & more',
    steps: ['Knees bent, core tight', 'Make fast alternating waves', '20–30 s on, 30 s rest'],
  },
  {
    id: 'box_jumps',
    name: 'Box jumps',
    symbol: 'figure.highintensity.intervaltraining',
    androidSymbol: 'exercise',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    group: 'Classes & more',
    steps: ['Start with a low box', 'Swing arms and jump, land softly', 'Step down, don’t jump down'],
  },
  {
    id: 'farmers_walk',
    name: "Farmer's walk",
    symbol: 'figure.walk',
    androidSymbol: 'directions_walk',
    kind: 'strength',
    met: 6,
    impact: 'low',
    group: 'Classes & more',
    steps: ['Heavy dumbbells at your sides', 'Walk tall with short steps', '30–40 m, rest, repeat'],
  },
  {
    id: 'sled_push',
    name: 'Sled push',
    symbol: 'figure.strengthtraining.functional',
    androidSymbol: 'fitness_center',
    kind: 'cardio',
    met: 8,
    impact: 'medium',
    group: 'Classes & more',
    steps: ['Arms straight, body leaning in', 'Drive with short powerful steps', 'Rest, then push back'],
  },
  {
    id: 'crossfit',
    name: 'CrossFit / functional WOD',
    symbol: 'figure.highintensity.intervaltraining',
    androidSymbol: 'exercise',
    kind: 'cardio',
    met: 8,
    impact: 'high',
    group: 'Classes & more',
    steps: ['Scale weights to your level', 'Form before speed', 'Rest when needed'],
  },
  {
    id: 'zumba_class',
    name: 'Zumba / aerobics class',
    symbol: 'figure.dance',
    androidSymbol: 'nightlife',
    kind: 'cardio',
    met: 6.5,
    impact: 'medium',
    group: 'Classes & more',
    steps: ['Follow along at your pace', 'Wear supportive shoes', 'Fun way to burn calories'],
  },
  {
    id: 'power_yoga',
    name: 'Power yoga',
    symbol: 'figure.yoga',
    androidSymbol: 'self_improvement',
    kind: 'mobility',
    met: 4,
    impact: 'low',
    group: 'Classes & more',
    steps: ['Flow through poses with breath', 'Hold each pose steadily', 'Modify when needed'],
  },
  {
    id: 'boxing_bag',
    name: 'Boxing / heavy bag',
    symbol: 'figure.highintensity.intervaltraining',
    androidSymbol: 'sports_martial_arts',
    kind: 'cardio',
    met: 7.8,
    impact: 'medium',
    group: 'Classes & more',
    steps: ['Guard up, light on your feet', 'Mix jabs, crosses and hooks', '3 min rounds, 1 min rest'],
  },
  {
    id: 'swimming_laps',
    name: 'Swimming laps (fast)',
    symbol: 'figure.pool.swim',
    androidSymbol: 'pool',
    kind: 'cardio',
    met: 9.8,
    impact: 'low',
    group: 'Classes & more',
    steps: ['Warm up 2 easy laps', 'Steady fast freestyle', 'Rest at the wall as needed'],
  },
];

type ActivitySpec = [id: string, name: string, met: number, steps: [string, string, string], impact?: Exercise['impact']];
const activities = (group: GymGroup, look: Pick<Exercise, 'symbol' | 'androidSymbol' | 'kind'>, specs: ActivitySpec[]): Exercise[] =>
  specs.map(([id, name, met, steps, impact]) => ({ id, name, met, steps, impact: impact ?? 'medium', group, ...look }));

const MORE_GYM: Exercise[] = [
  ...lifts('Chest', [
    [
      'incline_db_press',
      'Incline dumbbell press',
      5.5,
      ['Bench at 30–45°', 'Press dumbbells up over upper chest', 'Lower slowly to chest level'],
    ],
    ['smith_bench', 'Smith machine bench press', 5, ['Bar over mid-chest', 'Unrack by twisting the bar', 'Lower and press with control']],
    ['incline_fly', 'Incline dumbbell fly', 4, ['Bench at 30°', 'Open arms in a wide arc', 'Squeeze back up']],
    ['low_cable_fly', 'Low-to-high cable fly', 4, ['Handles from the low pulleys', 'Sweep up to chest height', 'Control the way down']],
    ['landmine_press', 'Landmine press', 5, ['Bar end at shoulder', 'Press up and forward', 'Lower with control']],
    ['svend_press', 'Plate squeeze press', 3.5, ['Squeeze a plate between palms', 'Press straight out', 'Bring back to chest']],
  ]),
  ...lifts('Back', [
    ['rack_pull', 'Rack pull', 6, ['Bar on pins just below knees', 'Flat back, pull to standing', 'Lower to the pins'], 'high'],
    ['assisted_pullup', 'Assisted pull-up machine', 5, ['Knees on the pad', 'Pull chin over the bar', 'Lower all the way']],
    ['close_grip_pulldown', 'Close-grip pulldown', 4.5, ['V-handle, lean back slightly', 'Pull to upper chest', 'Let it rise slowly']],
    ['straight_arm_pulldown', 'Straight-arm pulldown', 3.5, ['Arms straight, slight hinge', 'Sweep bar down to thighs', 'Return slowly']],
    ['chest_supported_row', 'Chest-supported row', 4.5, ['Chest on the incline pad', 'Row dumbbells to your hips', 'Lower slowly']],
    ['machine_row', 'Machine row', 4, ['Chest against the pad', 'Pull handles back', 'Squeeze shoulder blades']],
    ['inverted_row', 'Inverted row', 5, ['Hang under a bar, body straight', 'Pull chest to the bar', 'Lower with control']],
    ['good_morning', 'Good morning', 5, ['Bar on upper back, soft knees', 'Hinge forward with flat back', 'Stand back up']],
    ['pendlay_row', 'Pendlay row', 6, ['Bar on the floor, flat back', 'Explode the bar to your chest', 'Set it down each rep']],
  ]),
  ...lifts('Shoulders', [
    ['arnold_press', 'Arnold press', 4.5, ['Start palms facing you', 'Rotate and press overhead', 'Reverse on the way down']],
    ['db_shoulder_press', 'Dumbbell shoulder press', 4.5, ['Dumbbells at shoulder height', 'Press overhead', 'Lower to ears']],
    ['face_pull', 'Face pull', 3.5, ['Rope at face height', 'Pull towards your forehead, elbows high', 'Return slowly']],
    ['cable_lateral_raise', 'Cable lateral raise', 3.5, ['Handle from the low pulley', 'Raise out to shoulder height', 'Lower slowly']],
    ['reverse_pec_deck', 'Reverse pec deck', 3.5, ['Face the machine', 'Open arms back', 'Squeeze rear shoulders']],
    ['push_press', 'Push press', 6.5, ['Bar at collarbone', 'Dip knees and drive the bar up', 'Lower to shoulders']],
  ]),
  ...lifts('Arms', [
    ['concentration_curl', 'Concentration curl', 3.5, ['Elbow on inner thigh', 'Curl up slowly', 'Lower all the way']],
    ['cable_curl', 'Cable curl', 3.5, ['Bar from the low pulley', 'Curl to shoulders', 'Lower with control']],
    ['ez_curl', 'EZ-bar curl', 3.5, ['Grip the angled parts', 'Curl up', 'Lower slowly']],
    ['reverse_curl', 'Reverse curl', 3.5, ['Palms down', 'Curl to shoulders', 'Lower slowly']],
    ['wrist_curl', 'Wrist curl', 2.8, ['Forearms on thighs', 'Curl the wrists up', 'Lower fully']],
    ['close_grip_bench', 'Close-grip bench press', 5.5, ['Hands shoulder-width', 'Elbows close to body', 'Press up']],
    ['tricep_kickback', 'Triceps kickback', 3.5, ['Hinge forward, elbow at side', 'Straighten arm back', 'Return slowly']],
    ['rope_pushdown', 'Rope pushdown', 3.5, ['Elbows at sides', 'Push down and split the rope', 'Return slowly']],
    ['bench_dips', 'Bench dips', 4, ['Hands on bench behind you', 'Lower until elbows are at 90°', 'Push back up']],
  ]),
  ...lifts('Legs', [
    ['goblet_squat', 'Goblet squat', 5, ['Hold a dumbbell at your chest', 'Squat down between your knees', 'Drive up']],
    ['smith_squat', 'Smith machine squat', 5, ['Bar on upper back', 'Feet slightly forward', 'Squat and press up']],
    ['sumo_deadlift', 'Sumo deadlift', 6, ['Wide stance, toes out', 'Grip inside knees, chest up', 'Push the floor away'], 'high'],
    [
      'trap_bar_deadlift',
      'Trap-bar deadlift',
      6,
      ['Stand inside the bar', 'Flat back, push through legs', 'Stand tall, lower with control'],
    ],
    ['step_ups', 'Weighted step-ups', 5.5, ['Foot fully on a bench', 'Drive up through the heel', 'Step down slowly']],
    ['glute_kickback', 'Glute kickback machine', 3.5, ['Brace on the pad', 'Push one leg back', 'Return slowly']],
    ['hip_abduction', 'Hip abduction machine', 3, ['Pads outside your knees', 'Push legs apart', 'Return slowly']],
    ['hip_adduction', 'Hip adduction machine', 3, ['Pads inside your knees', 'Squeeze legs together', 'Return slowly']],
    ['seated_calf_raise', 'Seated calf raise', 3, ['Pad on thighs', 'Raise heels high', 'Lower for a stretch']],
    ['reverse_lunge', 'Reverse lunge', 5, ['Step back into a lunge', 'Back knee near the floor', 'Push back to standing']],
    ['box_squat', 'Box squat', 5.5, ['Sit back onto a box', 'Pause briefly', 'Drive up']],
    ['nordic_curl', 'Nordic curl', 4, ['Ankles held, kneeling', 'Lower forward slowly', 'Use hands to push back up']],
  ]),
  ...lifts('Core', [
    ['decline_situp', 'Decline sit-up', 4, ['Feet hooked on the bench', 'Curl up to sitting', 'Lower slowly']],
    ['captains_chair', "Captain's chair leg raise", 4, ['Forearms on the pads', 'Raise knees to chest', 'Lower slowly']],
    ['woodchopper', 'Cable woodchopper', 4, ['Cable high, feet wide', 'Rotate and pull diagonally down', 'Return with control']],
    ['pallof_press', 'Pallof press', 3.5, ['Cable at chest, stand side-on', 'Press straight out, resist the twist', 'Bring back to chest']],
    ['v_ups', 'V-ups', 4.5, ['Lie flat, arms overhead', 'Lift legs and torso to meet', 'Lower slowly']],
    ['hollow_hold', 'Hollow body hold', 3.5, ['Lower back pressed down', 'Arms and legs just off the floor', 'Hold and breathe']],
    ['dead_bug', 'Dead bug', 3, ['On your back, arms and knees up', 'Lower opposite arm and leg', 'Return and switch']],
    ['lying_leg_raise', 'Lying leg raise', 3.8, ['Lie flat, hands under hips', 'Raise straight legs to 90°', 'Lower slowly']],
  ]),
  ...activities('Olympic & power', { symbol: 'figure.strengthtraining.functional', androidSymbol: 'fitness_center', kind: 'strength' }, [
    [
      'power_clean',
      'Power clean',
      8,
      ['Bar over mid-foot, flat back', 'Explode up and catch at shoulders', 'Learn with a coach first'],
      'high',
    ],
    ['clean_and_jerk', 'Clean and jerk', 8, ['Clean the bar to shoulders', 'Dip and drive it overhead', 'Lower safely'], 'high'],
    ['snatch', 'Snatch', 8, ['Wide grip, flat back', 'Pull the bar overhead in one move', 'Learn with a coach first'], 'high'],
    ['thrusters', 'Thrusters', 8, ['Front squat with dumbbells or bar', 'Drive up and press overhead', 'Flow into the next rep'], 'high'],
    ['wall_balls', 'Wall balls', 7.5, ['Squat holding a medicine ball', 'Drive up and throw to the target', 'Catch and squat again']],
    ['med_ball_slam', 'Medicine ball slams', 8, ['Ball overhead', 'Slam it to the floor hard', 'Pick up and repeat']],
    ['turkish_getup', 'Turkish get-up', 5, ['Kettlebell overhead, eyes on it', 'Stand up step by step', 'Reverse slowly']],
    ['tire_flip', 'Tyre flip', 8, ['Squat, hands under the tyre', 'Drive forward and flip', 'Reset and repeat'], 'high'],
    ['rope_climb', 'Rope climb', 8, ['Grip high, wrap the rope with feet', 'Stand and reach up', 'Climb down with control'], 'high'],
  ]),
  ...activities('Cardio machines', { symbol: 'figure.mixed.cardio', androidSymbol: 'directions_bike', kind: 'cardio' }, [
    ['air_bike', 'Air bike / assault bike', 10, ['Push and pull the arms as you pedal', 'Short hard intervals', 'Recover between rounds']],
    ['ski_erg', 'Ski erg', 8, ['Pull the handles down with your whole body', 'Hinge at the hips', 'Steady rhythm']],
    [
      'treadmill_intervals',
      'Treadmill sprint intervals',
      10,
      ['30 s fast, 60 s walk', 'Repeat 8–10 times', 'Hold the rails only to step off'],
      'high',
    ],
    ['upright_bike_easy', 'Easy bike (warm-up)', 4, ['Light resistance', 'Easy pace for 5–10 min', 'Good warm-up before lifting']],
    ['jacobs_ladder', "Jacob's ladder", 9, ['Climb steadily', 'Use arms and legs together', 'Short bouts']],
  ]),
  ...activities('Classes & more', { symbol: 'figure.highintensity.intervaltraining', androidSymbol: 'exercise', kind: 'cardio' }, [
    ['hiit_class', 'HIIT class', 8, ['Follow the coach', 'Scale moves to your level', 'Hydrate between rounds'], 'high'],
    ['bootcamp', 'Bootcamp', 7, ['Mixed strength and cardio', 'Go at your pace', 'Stretch afterwards']],
    ['body_pump', 'Body pump / weights class', 5.5, ['Light barbell, many reps', 'Follow the beat', 'Pick weights you can control']],
    ['kickboxing_class', 'Kickboxing class', 7.5, ['Guard up', 'Mix punches and kicks', 'Breathe out on each strike']],
    ['reformer_pilates', 'Reformer pilates', 3.5, ['Slow, controlled moves', 'Engage your core', 'Follow the instructor']],
    ['aqua_aerobics', 'Aqua aerobics', 5.3, ['Waist-deep water', 'Follow the class moves', 'Easy on the joints'], 'low'],
    ['stretching_session', 'Stretching / cool-down', 2.3, ['Hold each stretch 30 s', 'No bouncing', 'Breathe slowly'], 'low'],
    ['martial_arts', 'Martial arts / MMA', 10, ['Warm up well', 'Learn technique first', 'Spar only with supervision'], 'high'],
  ]),
  ...activities('Sports', { symbol: 'figure.run', androidSymbol: 'sprint', kind: 'cardio' }, [
    ['football', 'Football', 7, ['Warm up 10 min', 'Stay hydrated', 'Cool down and stretch'], 'high'],
    ['basketball', 'Basketball', 6.5, ['Warm up ankles and knees', 'Play in bursts', 'Hydrate often'], 'high'],
    ['tennis', 'Tennis', 7.3, ['Warm up shoulders', 'Stay light on your feet', 'Doubles is easier']],
    ['table_tennis', 'Table tennis', 4, ['Quick feet, relaxed grip', 'Great for reflexes', 'Fun with friends'], 'low'],
    ['squash', 'Squash', 7.3, ['Very intense — build up slowly', 'Wear eye protection', 'Hydrate well'], 'high'],
    ['volleyball', 'Volleyball', 4, ['Warm up shoulders', 'Land softly from jumps', 'Beach volleyball burns more']],
    ['kabaddi', 'Kabaddi', 8, ['Warm up thoroughly', 'Strong grip and quick feet', 'Play on a safe surface'], 'high'],
    ['trekking', 'Trekking / hiking', 6, ['Good shoes and water', 'Steady pace uphill', 'Nandi Hills counts!']],
    [
      'climbing',
      'Rock climbing / bouldering',
      7.5,
      ['Warm up fingers and shoulders', 'Use legs more than arms', 'Fall safely on the mats'],
      'high',
    ],
    ['running_outdoor', 'Outdoor running', 9, ['Warm up with a walk', 'Comfortable pace', 'Cool down and stretch'], 'high'],
  ]),
];

/** Everything: home and outdoor exercises, then gym exercises. */
export const EXERCISES: Exercise[] = [...GENERAL, ...GYM, ...MORE_GYM];

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
    lose: [
      ['hiit', 25, 3],
      ['jogging', 30, 2],
      ['weights', 45, 3],
      ['skipping', 15, 2],
      ['burpees', 10, 2],
      ['core', 10, 3],
      ['stretching', 10, 3],
    ],
    maintain: [
      ['badminton', 45, 2],
      ['jogging', 30, 2],
      ['weights', 40, 2],
      ['surya_namaskar', 15, 3],
      ['stretching', 10, 3],
    ],
    gain: [
      ['weights', 50, 4],
      ['squats', 20, 2],
      ['pushups', 10, 4],
      ['lunges', 10, 2],
      ['core', 15, 3],
      ['cycling', 20, 2],
      ['stretching', 10, 4],
    ],
  },
  '30-44': {
    lose: [
      ['brisk_walk', 40, 3],
      ['hiit', 20, 2],
      ['weights', 40, 3],
      ['cycling', 30, 2],
      ['mountain_climbers', 10, 2],
      ['core', 10, 3],
      ['surya_namaskar', 15, 3],
    ],
    maintain: [
      ['cycling', 30, 2],
      ['badminton', 40, 2],
      ['weights', 35, 2],
      ['surya_namaskar', 15, 3],
      ['stretching', 10, 3],
    ],
    gain: [
      ['weights', 45, 4],
      ['squats', 20, 2],
      ['lunges', 10, 3],
      ['shoulder_press', 10, 2],
      ['core', 12, 3],
      ['brisk_walk', 30, 2],
      ['stretching', 10, 4],
    ],
  },
  '45-59': {
    lose: [
      ['brisk_walk', 45, 4],
      ['cycling', 30, 2],
      ['swimming', 30, 1],
      ['light_weights', 30, 2],
      ['sit_to_stand', 15, 2],
      ['pilates', 20, 2],
    ],
    maintain: [
      ['brisk_walk', 40, 3],
      ['swimming', 30, 2],
      ['light_weights', 30, 2],
      ['glute_bridge', 10, 3],
      ['surya_namaskar', 15, 3],
      ['stretching', 10, 3],
    ],
    gain: [
      ['weights', 40, 3],
      ['squats', 20, 2],
      ['bird_dog', 10, 3],
      ['core', 10, 3],
      ['brisk_walk', 30, 2],
      ['stretching', 10, 4],
    ],
  },
  '60+': {
    lose: [
      ['brisk_walk', 30, 5],
      ['elliptical', 20, 2],
      ['sit_to_stand', 15, 2],
      ['wall_pushups', 10, 2],
      ['tai_chi', 20, 2],
      ['balance', 10, 3],
    ],
    maintain: [
      ['brisk_walk', 30, 5],
      ['tai_chi', 20, 2],
      ['sit_to_stand', 15, 2],
      ['calf_raises', 10, 3],
      ['balance', 10, 3],
      ['pranayama', 10, 5],
    ],
    gain: [
      ['light_weights', 25, 3],
      ['sit_to_stand', 15, 3],
      ['wall_pushups', 10, 3],
      ['glute_bridge', 10, 3],
      ['brisk_walk', 20, 3],
      ['balance', 10, 3],
    ],
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

// ---------- guided home workout ----------
// Short follow-along circuits (no equipment) for the goal; moves too hard for the age group are swapped
// for gentle ones.
const CIRCUITS: Record<Goal, string[]> = {
  lose: ['jumping_jacks', 'squats', 'high_knees', 'pushups', 'mountain_climbers', 'lunges', 'burpees', 'bicycle_crunch'],
  maintain: ['jumping_jacks', 'squats', 'pushups', 'lunges', 'glute_bridge', 'bird_dog', 'core', 'side_plank'],
  gain: ['squats', 'pushups', 'lunges', 'glute_bridge', 'calf_raises', 'superman', 'core', 'side_plank'],
};
const GENTLE = ['sit_to_stand', 'wall_pushups', 'calf_raises', 'glute_bridge', 'bird_dog', 'balance', 'tree_pose', 'cobra'];

export type Circuit = { exercises: Exercise[]; workSeconds: number; restSeconds: number; rounds: number };

export function workoutCircuit(goal: Goal, band: AgeBand): Circuit {
  const byId = (id: string) => EXERCISES.find((e) => e.id === id)!;
  const picked = CIRCUITS[goal].map(byId).filter((e) => suitsAgeBand(e, band));
  for (const id of GENTLE) {
    if (picked.length >= 8) break;
    if (!picked.some((e) => e.id === id)) picked.push(byId(id));
  }
  const older = band === '45-59' || band === '60+';
  return { exercises: picked, workSeconds: older ? 30 : 40, restSeconds: older ? 30 : 20, rounds: band === '60+' ? 1 : 2 };
}
