// Stick-figure keyframes that show how each exercise is done (drawn by ExerciseAnimation).
// Kept free of app imports so the poses can be rendered and checked with plain Node.
//
// Canvas is 100 × 100, floor at y = 90. Angles are in degrees, measured from straight down:
// 0 = down, 90 = right (the way a side-view figure faces), 180 = up, -90 = left.

export type Pt = [number, number];
/** Absolute angles of the upper and lower segment (upper arm/forearm or thigh/shin). */
export type Limb = [number, number];

export type Pose = {
  hip: Pt;
  /** Direction from hip to shoulders. */
  torso: number;
  /** Direction from shoulders to head. */
  head: number;
  /** "l" limbs are drawn behind (far side), "r" limbs in front. */
  la: Limb;
  ra: Limb;
  ll: Limb;
  rl: Limb;
};

export type Prop = 'bike' | 'dumbbells' | 'chair' | 'wall' | 'wallBehind' | 'step' | 'water' | 'rope' | 'racket' | 'bat' | 'breath';

export type Move = {
  view: 'side' | 'front';
  /** Seconds for one full loop through the frames. */
  seconds: number;
  frames: Pose[];
  prop?: Prop;
};

export const FLOOR = 90;
export const LENGTH = { torso: 26, neck: 9, upperArm: 13, forearm: 12, thigh: 16, shin: 16, headRadius: 6 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const dir = (a: number): Pt => [Math.sin(rad(a)), Math.cos(rad(a))];
export const along = (p: Pt, a: number, len: number): Pt => [p[0] + dir(a)[0] * len, p[1] + dir(a)[1] * len];

/** Two-segment inverse kinematics: angles that put the limb's end on `to`. bend 1 = joint bends forward. */
function reach(from: Pt, to: Pt, l1: number, l2: number, bend: 1 | -1): Limb {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const a0 = deg(Math.atan2(dx, dy));
  const offset = deg(Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const upper = a0 + bend * offset;
  const joint = along(from, upper, l1);
  return [upper, deg(Math.atan2(to[0] - joint[0], to[1] - joint[1]))];
}

/** A limb given as angles, or as a point for its hand/foot to reach (bend 1 = forward). */
type LimbSpec = Limb | { to: Pt; bend?: 1 | -1 };

function pose(hip: Pt, torso: number, la: LimbSpec, ra: LimbSpec, ll: LimbSpec, rl: LimbSpec, head = torso): Pose {
  const shoulder = along(hip, torso, LENGTH.torso);
  const arm = (s: LimbSpec): Limb =>
    Array.isArray(s) ? s : reach(shoulder, s.to, LENGTH.upperArm, LENGTH.forearm, s.bend ?? -1);
  const leg = (s: LimbSpec): Limb => (Array.isArray(s) ? s : reach(hip, s.to, LENGTH.thigh, LENGTH.shin, s.bend ?? 1));
  return { hip, torso, head, la: arm(la), ra: arm(ra), ll: leg(ll), rl: leg(rl) };
}

/** Swaps far and near limbs, for the second half of alternating moves. */
const swap = (p: Pose, hip: Pt = p.hip): Pose => ({ ...p, hip, la: p.ra, ra: p.la, ll: p.rl, rl: p.ll });

export type Joints = Record<
  'head' | 'shoulder' | 'hip' | 'lElbow' | 'lHand' | 'rElbow' | 'rHand' | 'lKnee' | 'lFoot' | 'rKnee' | 'rFoot',
  Pt
>;

export function joints(p: Pose): Joints {
  const shoulder = along(p.hip, p.torso, LENGTH.torso);
  const lElbow = along(shoulder, p.la[0], LENGTH.upperArm);
  const rElbow = along(shoulder, p.ra[0], LENGTH.upperArm);
  const lKnee = along(p.hip, p.ll[0], LENGTH.thigh);
  const rKnee = along(p.hip, p.rl[0], LENGTH.thigh);
  return {
    head: along(shoulder, p.head, LENGTH.neck),
    shoulder,
    hip: p.hip,
    lElbow,
    lHand: along(lElbow, p.la[1], LENGTH.forearm),
    rElbow,
    rHand: along(rElbow, p.ra[1], LENGTH.forearm),
    lKnee,
    lFoot: along(lKnee, p.ll[1], LENGTH.shin),
    rKnee,
    rFoot: along(rKnee, p.rl[1], LENGTH.shin),
  };
}

const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shortest signed turn from angle a to angle b. */
const turn = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/** Catmull-Rom spline through four values: a smooth curve from p1 to p2. */
function spline(p0: number, p1: number, p2: number, p3: number, t: number) {
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}

/** Same, for angles: unwrapped around p1 so a limb never spins the long way round. */
function splineAngle(p0: number, p1: number, p2: number, p3: number, t: number) {
  const b = p1 + turn(p1, p2);
  return spline(p1 + turn(p1, p0), p1, b, b + turn(p2, p3), t);
}

/**
 * The pose at `phase` (0–1) of the loop. Joints follow a smooth curve through the keyframes
 * (no jerky stop-start), slowing slightly at each key pose so the move still reads clearly.
 */
export function poseAt(move: Move, phase: number): Pose {
  const frames = move.frames;
  const n = frames.length;
  const x = (((phase % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  const f0 = frames[(i - 1 + n) % n];
  const f1 = frames[i];
  const f2 = frames[(i + 1) % n];
  const f3 = frames[(i + 2) % n];
  const t = mix(x - i, ease(x - i), 0.6);
  const ang = (get: (p: Pose) => number) => splineAngle(get(f0), get(f1), get(f2), get(f3), t);
  const limb = (k: 'la' | 'ra' | 'll' | 'rl'): Limb => [ang((p) => p[k][0]), ang((p) => p[k][1])];
  return {
    hip: [spline(f0.hip[0], f1.hip[0], f2.hip[0], f3.hip[0], t), spline(f0.hip[1], f1.hip[1], f2.hip[1], f3.hip[1], t)],
    torso: ang((p) => p.torso),
    head: ang((p) => p.head),
    la: limb('la'),
    ra: limb('ra'),
    ll: limb('ll'),
    rl: limb('rl'),
  };
}

// ---------- shared poses ----------
const STAND = pose([50, 58], 180, [-4, 4], [4, 8], [-1, 0], [1, 0]);

// High plank (on hands), facing right.
const PLANK_HIGH = pose([47, 76], 107, { to: [69, 90] }, { to: [72, 90] }, { to: [14, 89] }, { to: [17, 89] });
const PLANK_LOW = pose([47, 82], 100, { to: [67, 90] }, { to: [70, 90] }, { to: [14, 89] }, { to: [17, 89] });
const SQUAT_HANDS_DOWN = pose([42, 74], 140, { to: [60, 90] }, { to: [63, 90] }, { to: [50, 90] }, { to: [53, 90] });

// Lying on the back, head to the left, knees bent.
const BACK_KNEES_BENT = pose([50, 86], -90, [82, 86], [84, 88], { to: [68, 89] }, { to: [70, 89] }, -90);

function gait(o: { stride: number; kick: number; arm: number; elbow: number; lean: number; hipY: number; bob: number }): Pose[] {
  const front: Limb = [o.stride, o.stride * 0.2];
  const back: Limb = [-o.stride * 0.8, -o.stride * 0.8 - o.kick];
  const passing: Limb = [o.stride * 0.3, -o.kick - 25];
  const armF: Limb = [o.arm, o.arm + o.elbow];
  const armB: Limb = [-o.arm, -o.arm + o.elbow * 0.4];
  const hipLow: Pt = [50, o.hipY];
  const hipHigh: Pt = [50, o.hipY - o.bob];
  const a: Pose = { hip: hipLow, torso: o.lean, head: o.lean, la: armF, ra: armB, ll: back, rl: front };
  const b: Pose = { hip: hipHigh, torso: o.lean, head: o.lean, la: [0, o.elbow * 0.6], ra: [0, o.elbow * 0.6], ll: passing, rl: [0, 0] };
  return [a, b, swap(a), swap(b)];
}

const WALK = gait({ stride: 22, kick: 10, arm: 24, elbow: 14, lean: 178, hipY: 58, bob: 1.5 });
const RUN = gait({ stride: 40, kick: 70, arm: 40, elbow: 85, lean: 168, hipY: 58, bob: 3 });

function cycling(): Pose[] {
  const crank: Pt = [52, 73];
  const frames: Pose[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    const near: Pt = [crank[0] + 7 * Math.cos(a), crank[1] + 7 * Math.sin(a)];
    const far: Pt = [crank[0] - 7 * Math.cos(a), crank[1] - 7 * Math.sin(a)];
    frames.push(pose([40, 52], 145, { to: [70, 50] }, { to: [71, 51] }, { to: far }, { to: near }));
  }
  return frames;
}

function swimming(): Pose[] {
  // Freestyle: each arm goes forward → pull down → push back → over the top.
  const arm = [90, 0, -90, 180];
  return arm.map((a, i) => ({
    hip: [36, 52] as Pt,
    torso: 90,
    head: 95,
    ra: [a, a] as Limb,
    la: [arm[(i + 2) % 4], arm[(i + 2) % 4]] as Limb,
    ll: (i % 2 ? [-84, -80] : [-96, -100]) as Limb,
    rl: (i % 2 ? [-96, -100] : [-84, -80]) as Limb,
  }));
}

function suryaNamaskar(): Pose[] {
  const prayer = pose([50, 58], 180, [35, 160], [35, 160], [-1, 0], [1, 0]);
  const reachUp = pose([48, 58], 195, [190, 195], [192, 197], { to: [47, 90] }, { to: [50, 90] }, 200);
  const fold = pose([42, 58], 35, { to: [60, 90] }, { to: [62, 90] }, { to: [48, 90] }, { to: [50, 90] }, 15);
  const lunge = pose([46, 76], 140, { to: [64, 90] }, { to: [66, 90] }, { to: [58, 90] }, { to: [14, 89] }, 150);
  const cobra = pose([38, 86], 120, { to: [60, 90] }, { to: [62, 90] }, { to: [6, 89] }, { to: [8, 89] }, 160);
  const dog = pose([40, 60], 52, { to: [72, 90] }, { to: [74, 90] }, { to: [24, 89] }, { to: [26, 89] }, 30);
  return [prayer, reachUp, fold, lunge, PLANK_HIGH, cobra, dog, lunge, fold, reachUp];
}

function strokes(prop: 'racket' | 'bat'): Pose[] {
  if (prop === 'racket') {
    // Overhead smash: racket back, hit high, follow through.
    const legs: [LimbSpec, LimbSpec] = [{ to: [38, 90] }, { to: [62, 90] }];
    return [
      pose([50, 59], 186, [150, 165], [205, 250], ...legs, 175),
      pose([51, 59], 178, [120, 90], [165, 160], ...legs, 170),
      pose([52, 60], 165, [20, 40], [60, 30], ...legs),
    ];
  }
  // Cricket drive: stance, backlift, swing through.
  const legs: [LimbSpec, LimbSpec] = [{ to: [38, 90] }, { to: [60, 90] }];
  return [
    pose([48, 60], 165, { to: [54, 66] }, { to: [55, 64] }, ...legs, 120),
    pose([47, 60], 172, { to: [42, 42] }, { to: [43, 40] }, ...legs, 110),
    pose([50, 60], 160, { to: [66, 66] }, { to: [67, 64] }, ...legs, 120),
    pose([52, 60], 175, { to: [66, 38] }, { to: [67, 36] }, ...legs, 130),
  ];
}

// ---------- the moves ----------
const hiitJump = pose([50, 52], 180, [-160, -172], [160, 172], { to: [46, 84] }, { to: [54, 84] });
const hiitSquat = pose([50, 70], 180, [-40, 90], [40, -90], { to: [38, 90], bend: -1 }, { to: [62, 90] });

export const MOVES: Record<string, Move> = {
  brisk_walk: { view: 'side', seconds: 1.2, frames: WALK },
  jogging: { view: 'side', seconds: 0.8, frames: RUN },
  elliptical: { view: 'side', seconds: 1.4, frames: gait({ stride: 18, kick: 8, arm: 40, elbow: 60, lean: 175, hipY: 58, bob: 0.5 }) },
  cycling: { view: 'side', seconds: 1.2, frames: cycling(), prop: 'bike' },
  swimming: { view: 'side', seconds: 2.4, frames: swimming(), prop: 'water' },
  skipping: {
    view: 'front',
    seconds: 0.7,
    prop: 'rope',
    frames: [
      pose([50, 52], 180, [-25, -70], [25, 70], { to: [47, 84] }, { to: [53, 84] }),
      pose([50, 59], 180, [-25, -70], [25, 70], { to: [47, 90], bend: -1 }, { to: [53, 90] }),
    ],
  },
  hiit: { view: 'front', seconds: 1.4, frames: [hiitSquat, hiitJump] },
  burpees: {
    view: 'side',
    seconds: 3.2,
    frames: [STAND, SQUAT_HANDS_DOWN, PLANK_HIGH, SQUAT_HANDS_DOWN, pose([50, 52], 180, [178, 180], [182, 180], [-2, -6], [2, -6])],
  },
  badminton: { view: 'side', seconds: 1.6, frames: strokes('racket'), prop: 'racket' },
  cricket: { view: 'side', seconds: 2, frames: strokes('bat'), prop: 'bat' },
  dance: {
    view: 'front',
    seconds: 1.2,
    frames: [
      pose([46, 59], 174, [-130, -160], [60, 140], { to: [38, 90] }, { to: [58, 90] }),
      pose([50, 60], 180, [-40, 20], [40, -20], { to: [42, 90], bend: -1 }, { to: [58, 90] }),
      pose([54, 59], 186, [-60, -140], [130, 160], { to: [42, 90], bend: -1 }, { to: [62, 90] }),
      pose([50, 60], 180, [-40, 20], [40, -20], { to: [42, 90], bend: -1 }, { to: [58, 90] }),
    ],
  },
  squats: {
    view: 'side',
    seconds: 2.6,
    frames: [
      pose([50, 58], 180, [80, 90], [84, 92], { to: [50, 90] }, { to: [53, 90] }),
      pose([36, 74], 145, [92, 95], [96, 98], { to: [50, 90] }, { to: [53, 90] }, 160),
    ],
  },
  weights: {
    view: 'side',
    seconds: 2.4,
    prop: 'dumbbells',
    frames: [
      pose([50, 58], 180, [2, 4], [4, 6], { to: [47, 90] }, { to: [53, 90] }),
      pose([50, 58], 180, [6, 165], [8, 170], { to: [47, 90] }, { to: [53, 90] }),
    ],
  },
  light_weights: {
    view: 'front',
    seconds: 3,
    prop: 'dumbbells',
    frames: [
      pose([50, 58], 180, [-12, -8], [12, 8], { to: [45, 90] }, { to: [55, 90] }),
      pose([50, 58], 180, [-88, -92], [88, 92], { to: [45, 90] }, { to: [55, 90] }),
    ],
  },
  shoulder_press: {
    view: 'front',
    seconds: 2.6,
    prop: 'dumbbells',
    frames: [
      pose([50, 58], 180, [-90, 180], [90, 180], { to: [45, 90] }, { to: [55, 90] }),
      pose([50, 58], 180, [-160, -175], [160, 175], { to: [45, 90] }, { to: [55, 90] }),
    ],
  },
  core: {
    view: 'side',
    seconds: 3,
    frames: [
      pose([36, 81], 102, [2, 90], [4, 92], { to: [8, 89] }, { to: [10, 89] }),
      pose([36, 78], 106, [2, 90], [4, 92], { to: [8, 89] }, { to: [10, 89] }),
    ],
  },
  surya_namaskar: { view: 'side', seconds: 14, frames: suryaNamaskar() },
  stretching: {
    view: 'front',
    seconds: 5,
    frames: [
      pose([50, 58], 180, [-170, -178], [170, 178], { to: [42, 90] }, { to: [58, 90] }),
      pose([49, 58], 160, [-195, -205], [150, 140], { to: [42, 90] }, { to: [58, 90] }, 150),
      pose([50, 58], 180, [-170, -178], [170, 178], { to: [42, 90] }, { to: [58, 90] }),
      pose([51, 58], 200, [-150, -140], [195, 205], { to: [42, 90] }, { to: [58, 90] }, 210),
    ],
  },
  pranayama: {
    view: 'front',
    seconds: 8,
    prop: 'breath',
    frames: [
      pose([50, 80], 180, { to: [34, 82], bend: 1 }, { to: [66, 82] }, [-75, 75], [75, -75]),
      pose([50, 79], 180, { to: [34, 82], bend: 1 }, { to: [66, 82] }, [-75, 75], [75, -75], 185),
    ],
  },
  stairs: {
    view: 'side',
    seconds: 1.8,
    prop: 'step',
    frames: [
      pose([42, 58], 175, [20, 40], [-20, -10], { to: [40, 90] }, { to: [44, 90] }),
      pose([47, 55], 168, [-20, -10], [25, 50], { to: [40, 90] }, { to: [62, 80] }),
      pose([60, 48], 175, [0, 10], [0, 10], { to: [58, 80] }, { to: [62, 80] }),
      pose([47, 55], 168, [25, 50], [-20, -10], { to: [62, 80] }, { to: [40, 90] }),
    ],
  },
  step_aerobics: {
    view: 'side',
    seconds: 2.4,
    prop: 'step',
    frames: [
      pose([42, 58], 180, [0, 30], [0, 30], { to: [40, 90] }, { to: [44, 90] }),
      pose([47, 55], 172, [60, 120], [-10, 20], { to: [40, 90] }, { to: [62, 80] }),
      pose([60, 48], 180, [170, 175], [175, 180], { to: [58, 80] }, { to: [62, 80] }),
      pose([47, 55], 172, [-10, 20], [60, 120], { to: [62, 80] }, { to: [40, 90] }),
    ],
  },
  pilates: {
    view: 'side',
    seconds: 1.2,
    frames: [
      pose([58, 86], -112, [80, 84], [82, 86], [130, 130], [132, 132], -120),
      pose([58, 86], -112, [70, 74], [72, 76], [130, 130], [132, 132], -120),
    ],
  },
  tai_chi: {
    view: 'side',
    seconds: 9,
    frames: [
      pose([50, 60], 180, [5, 10], [8, 12], { to: [42, 90] }, { to: [58, 90] }),
      pose([50, 58], 180, [85, 92], [88, 95], { to: [42, 90] }, { to: [58, 90] }),
      pose([49, 59], 182, [30, 140], [32, 145], { to: [42, 90] }, { to: [58, 90] }),
      pose([50, 61], 178, [20, 60], [22, 62], { to: [42, 90] }, { to: [58, 90] }),
    ],
  },
  balance: {
    view: 'front',
    seconds: 5,
    frames: [
      pose([50, 58], 180, [-80, -86], [80, 86], { to: [46, 90] }, { to: [54, 90] }),
      pose([49, 58], 178, [-80, -86], [80, 86], { to: [47, 90] }, [40, 30]),
      pose([50, 58], 180, [-80, -86], [80, 86], { to: [46, 90] }, { to: [54, 90] }),
      pose([51, 58], 182, [-80, -86], [80, 86], [-40, -30], { to: [53, 90] }),
    ],
  },
  tree_pose: {
    view: 'front',
    seconds: 6,
    frames: [
      pose([49, 58], 180, [-40, 120], [40, -120], { to: [48, 90] }, { to: [50, 75] }),
      pose([49, 58], 180, [-168, -178], [168, 178], { to: [48, 90] }, { to: [50, 75] }),
    ],
  },
  sit_to_stand: {
    view: 'side',
    seconds: 4,
    prop: 'chair',
    frames: [
      pose([32, 68], 175, [80, 90], [84, 92], { to: [52, 90] }, { to: [54, 90] }),
      pose([35, 68], 140, [100, 100], [104, 104], { to: [52, 90] }, { to: [54, 90] }, 150),
      pose([50, 58], 180, [88, 92], [90, 94], { to: [52, 90] }, { to: [54, 90] }),
      pose([35, 68], 140, [100, 100], [104, 104], { to: [52, 90] }, { to: [54, 90] }, 150),
    ],
  },
  wall_pushups: {
    view: 'side',
    seconds: 2.4,
    prop: 'wall',
    frames: [
      pose([47, 60], 162, { to: [80, 40] }, { to: [80, 42] }, { to: [36, 90] }, { to: [38, 90] }),
      pose([52, 63], 145, { to: [80, 40] }, { to: [80, 42] }, { to: [36, 90] }, { to: [38, 90] }),
    ],
  },
  jumping_jacks: {
    view: 'front',
    seconds: 1,
    frames: [
      pose([50, 58], 180, [-8, -6], [8, 6], { to: [47, 90] }, { to: [53, 90] }),
      pose([50, 56], 180, [-150, -168], [150, 168], { to: [36, 88], bend: -1 }, { to: [64, 88] }),
    ],
  },
  mountain_climbers: {
    view: 'side',
    seconds: 0.9,
    frames: [
      { ...PLANK_HIGH, rl: [100, -45] },
      { ...PLANK_HIGH, ll: [100, -45] },
    ],
  },
  high_knees: {
    view: 'side',
    seconds: 0.7,
    frames: [
      pose([50, 57], 178, [-30, 60], [40, 130], { to: [49, 90] }, [88, 5]),
      pose([50, 57], 178, [40, 130], [-30, 60], [88, 5], { to: [51, 90] }),
    ],
  },
  pushups: { view: 'side', seconds: 2, frames: [PLANK_HIGH, PLANK_LOW] },
  lunges: {
    view: 'side',
    seconds: 2.8,
    frames: [
      pose([46, 58], 180, { to: [50, 60] }, { to: [51, 60] }, { to: [44, 90] }, { to: [48, 90] }),
      pose([46, 71], 180, { to: [50, 72] }, { to: [51, 72] }, { to: [26, 89] }, { to: [64, 90] }),
    ],
  },
  glute_bridge: {
    view: 'side',
    seconds: 2.6,
    frames: [BACK_KNEES_BENT, pose([50, 72], -60, [76, 82], [78, 84], { to: [68, 89] }, { to: [70, 89] }, -90)],
  },
  crunches: {
    view: 'side',
    seconds: 2.4,
    frames: [BACK_KNEES_BENT, pose([50, 86], -125, [100, 100], [102, 102], { to: [68, 89] }, { to: [70, 89] }, -135)],
  },
  bicycle_crunch: {
    view: 'side',
    seconds: 1.6,
    frames: [
      pose([54, 86], -118, [120, 60], [124, 64], [110, 110], { to: [62, 72] }, -130),
      pose([54, 86], -118, [120, 60], [124, 64], { to: [62, 72] }, [110, 110], -130),
    ],
  },
  wall_sit: {
    view: 'side',
    seconds: 3,
    prop: 'wallBehind',
    frames: [
      pose([30, 74], 180, [90, 90], [92, 92], [90, 0], [92, 0]),
      pose([30, 73], 180, [86, 88], [88, 90], [88, 0], [90, 0]),
    ],
  },
  calf_raises: {
    view: 'side',
    seconds: 1.8,
    frames: [
      pose([50, 58], 180, [0, 4], [2, 6], [-1, 0], [1, 0]),
      pose([50, 52], 180, [0, 4], [2, 6], [-1, 0], [1, 0]),
    ],
  },
  superman: {
    view: 'side',
    seconds: 2.6,
    frames: [
      pose([38, 86], 90, [90, 90], [91, 91], [-90, -90], [-91, -91], 95),
      pose([38, 86], 100, [102, 104], [101, 103], [-100, -102], [-99, -101], 110),
    ],
  },
  bird_dog: {
    view: 'side',
    seconds: 4,
    frames: [
      pose([35, 72], 92, { to: [60, 90] }, { to: [62, 90] }, [0, -90], [2, -90], 100),
      pose([35, 72], 92, { to: [60, 90] }, [92, 92], [-88, -88], [2, -90], 100),
      pose([35, 72], 92, { to: [60, 90] }, { to: [62, 90] }, [0, -90], [2, -90], 100),
      pose([35, 72], 92, [92, 92], { to: [62, 90] }, [0, -90], [-88, -88], 100),
    ],
  },
  side_plank: {
    view: 'front',
    seconds: 3,
    frames: [
      pose([43, 76], 114.5, [0, 0], [180, 180], [-65.5, -65.5], [-64, -64]),
      pose([42, 80], 120, { to: [67, 90] }, [175, 180], { to: [14, 89] }, { to: [15, 89] }),
    ],
  },
  cobra: {
    view: 'side',
    seconds: 3.2,
    frames: [
      pose([38, 86], 90, { to: [60, 88], bend: 1 }, { to: [62, 88], bend: 1 }, [-90, -90], [-91, -91], 95),
      pose([38, 86], 120, { to: [60, 90] }, { to: [62, 90] }, [-90, -90], [-91, -91], 160),
    ],
  },
};

// Gym exercises shown with the closest home move's animation.
const LOOKS_LIKE: Record<string, string> = {
  back_squat: 'squats',
  front_squat: 'squats',
  hack_squat: 'squats',
  leg_press: 'squats',
  walking_lunges: 'lunges',
  bulgarian_split_squat: 'lunges',
  hip_thrust: 'glute_bridge',
  calf_raise_machine: 'calf_raises',
  overhead_press: 'shoulder_press',
  shoulder_press_machine: 'shoulder_press',
  lateral_raise: 'light_weights',
  front_raise: 'light_weights',
  barbell_curl: 'weights',
  db_curl: 'weights',
  hammer_curl: 'weights',
  preacher_curl: 'weights',
  cable_crunch: 'crunches',
  plank_weighted: 'core',
  russian_twist: 'bicycle_crunch',
  back_extension: 'superman',
  treadmill_run: 'jogging',
  treadmill_incline_walk: 'brisk_walk',
  stationary_bike: 'cycling',
  spin_class: 'cycling',
  stair_climber: 'stairs',
  cross_trainer: 'elliptical',
  box_jumps: 'hiit',
  zumba_class: 'dance',
  power_yoga: 'surya_namaskar',
  swimming_laps: 'swimming',
  farmers_walk: 'brisk_walk',
  goblet_squat: 'squats',
  smith_squat: 'squats',
  box_squat: 'squats',
  wall_balls: 'squats',
  reverse_lunge: 'lunges',
  step_ups: 'step_aerobics',
  db_shoulder_press: 'shoulder_press',
  arnold_press: 'shoulder_press',
  push_press: 'shoulder_press',
  cable_lateral_raise: 'light_weights',
  concentration_curl: 'weights',
  cable_curl: 'weights',
  ez_curl: 'weights',
  reverse_curl: 'weights',
  decline_situp: 'crunches',
  v_ups: 'crunches',
  lying_leg_raise: 'pilates',
  dead_bug: 'bicycle_crunch',
  air_bike: 'cycling',
  upright_bike_easy: 'cycling',
  treadmill_intervals: 'jogging',
  running_outdoor: 'jogging',
  football: 'jogging',
  trekking: 'brisk_walk',
  hiit_class: 'hiit',
  bootcamp: 'burpees',
  stretching_session: 'stretching',
};

/** The animation for an exercise (or the closest similar move), if there is one. */
export function moveFor(id: string): Move | undefined {
  return MOVES[id] ?? MOVES[LOOKS_LIKE[id] ?? ''];
}

// ---------- drawing ----------
/** Colour roles: "figure" (near side), "far" (far side, drawn faded), "prop", "soft" (light fills). */
export type Shape =
  | { t: 'line'; a: Pt; b: Pt; w: number; role: 'figure' | 'far' | 'prop' | 'trail' }
  | { t: 'circle'; c: Pt; r: number; role: 'figure' | 'far' | 'prop' | 'soft' | 'eye'; fill: boolean }
  | { t: 'ellipse'; c: Pt; rx: number; ry: number; role: 'shadow' }
  | { t: 'path'; d: string; w: number; role: 'prop' | 'soft'; fill: boolean };

const LIMB_W = 4.5;

/** Everything to draw for one moment of a move, back to front. */
export function shapesAt(move: Move, phase: number): Shape[] {
  const j = joints(poseAt(move, phase));
  const out: Shape[] = [];
  const line = (a: Pt, b: Pt, role: 'figure' | 'far' | 'prop' | 'trail', w = LIMB_W) => out.push({ t: 'line', a, b, w, role });
  const foot = (ankle: Pt, role: 'figure' | 'far') => {
    // Side view: draw a short foot, pivoting on the toes when the heel is up.
    if (move.view === 'side' && Math.abs(ankle[1] - FLOOR) < 6) line(ankle, [ankle[0] + 5, Math.min(FLOOR, ankle[1] + 4)], role, 3.5);
  };
  const forearmDir = (elbow: Pt, hand: Pt): Pt => {
    const len = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1;
    return [(hand[0] - elbow[0]) / len, (hand[1] - elbow[1]) / len];
  };

  // Scenery behind the figure.
  switch (move.prop) {
    case 'water':
      out.push({ t: 'path', d: 'M0 50 Q12.5 46 25 50 T50 50 T75 50 T100 50 V100 H0 Z', w: 0, role: 'soft', fill: true });
      break;
    case 'wall':
      out.push({ t: 'path', d: 'M82 14 H90 V90 H82 Z', w: 0, role: 'soft', fill: true });
      break;
    case 'wallBehind':
      out.push({ t: 'path', d: 'M16 14 H24 V90 H16 Z', w: 0, role: 'soft', fill: true });
      break;
    case 'step':
      out.push({ t: 'path', d: 'M52 80 H92 V90 H52 Z', w: 0, role: 'soft', fill: true });
      break;
    case 'chair':
      line([20, 70], [42, 70], 'prop', 3);
      line([22, 70], [22, 90], 'prop', 3);
      line([40, 70], [40, 90], 'prop', 3);
      line([21, 70], [19, 44], 'prop', 3);
      break;
    case 'bike':
      out.push({ t: 'circle', c: [22, 78], r: 12, role: 'prop', fill: false });
      out.push({ t: 'circle', c: [80, 78], r: 12, role: 'prop', fill: false });
      line([22, 78], [52, 73], 'prop', 2.5);
      line([52, 73], [42, 54], 'prop', 2.5);
      line([42, 54], [22, 78], 'prop', 2.5);
      line([52, 73], [72, 52], 'prop', 2.5);
      line([42, 54], [72, 52], 'prop', 2.5);
      line([72, 52], [80, 78], 'prop', 2.5);
      line([37, 53], [46, 53], 'prop', 3.5);
      line([52, 73], j.lFoot, 'prop', 2);
      break;
    case 'breath': {
      const r = 30 + 8 * Math.sin(2 * Math.PI * phase - Math.PI / 2);
      out.push({ t: 'circle', c: [50, 60], r, role: 'soft', fill: true });
      break;
    }
  }
  if (move.prop !== 'water') line([4, FLOOR + 2.5], [96, FLOOR + 2.5], 'prop', 1.5);

  // Soft shadow on the floor; it shrinks and fades as the body leaves the ground.
  if (move.prop !== 'water') {
    const lowest = Math.max(j.lFoot[1], j.rFoot[1], j.lHand[1], j.rHand[1], j.hip[1] + 4);
    const lift = Math.max(0, FLOOR - lowest);
    const spread = Math.max(Math.abs(j.lFoot[0] - j.rFoot[0]), Math.abs(j.hip[0] - j.shoulder[0]));
    out.push({ t: 'ellipse', c: [(j.lFoot[0] + j.rFoot[0] + j.hip[0]) / 3, FLOOR + 1.5], rx: Math.max(6, 10 + spread / 2 - lift * 0.6), ry: Math.max(1, 2.6 - lift * 0.08), role: 'shadow' });
  }

  // Motion trail behind fast moves: a faint copy of where the body just was.
  if (move.seconds <= 1.6) {
    const g = joints(poseAt(move, phase - 0.08));
    line(g.hip, g.rKnee, 'trail');
    line(g.rKnee, g.rFoot, 'trail');
    line(g.shoulder, g.rElbow, 'trail');
    line(g.rElbow, g.rHand, 'trail');
    line(g.hip, g.shoulder, 'trail', 7.5);
  }

  // Far side limbs.
  line(j.shoulder, j.lElbow, 'far');
  line(j.lElbow, j.lHand, 'far');
  out.push({ t: 'circle', c: j.lHand, r: 2.6, role: 'far', fill: true });
  line(j.hip, j.lKnee, 'far');
  line(j.lKnee, j.lFoot, 'far');
  foot(j.lFoot, 'far');

  // Body, neck and head, with a little face pointing where the person looks.
  line(j.hip, j.shoulder, 'figure', 7.5);
  line(j.shoulder, along(j.shoulder, poseAt(move, phase).head, 4), 'figure', 3.5);
  out.push({ t: 'circle', c: j.head, r: LENGTH.headRadius, role: 'figure', fill: true });
  const face = dir(poseAt(move, phase).head);
  if (move.view === 'side') {
    out.push({ t: 'circle', c: [j.head[0] - face[1] * 2.6 + face[0] * 0.8, j.head[1] + face[0] * 2.6 + face[1] * 0.8], r: 1.1, role: 'eye', fill: true });
  } else {
    out.push({ t: 'circle', c: [j.head[0] - 2, j.head[1] - 0.5], r: 0.9, role: 'eye', fill: true });
    out.push({ t: 'circle', c: [j.head[0] + 2, j.head[1] - 0.5], r: 0.9, role: 'eye', fill: true });
  }

  // Near side limbs.
  line(j.hip, j.rKnee, 'figure');
  line(j.rKnee, j.rFoot, 'figure');
  foot(j.rFoot, 'figure');
  line(j.shoulder, j.rElbow, 'figure');
  line(j.rElbow, j.rHand, 'figure');
  out.push({ t: 'circle', c: j.rHand, r: 2.6, role: 'figure', fill: true });

  // Things held in the hands.
  switch (move.prop) {
    case 'bike':
      line([52, 73], j.rFoot, 'prop', 2);
      break;
    case 'dumbbells':
      for (const [elbow, hand] of [[j.lElbow, j.lHand], [j.rElbow, j.rHand]] as [Pt, Pt][]) {
        const [dx, dy] = forearmDir(elbow, hand);
        line([hand[0] - dy * 5, hand[1] + dx * 5], [hand[0] + dy * 5, hand[1] - dx * 5], 'prop', 3);
        out.push({ t: 'circle', c: [hand[0] - dy * 5, hand[1] + dx * 5], r: 2.4, role: 'prop', fill: true });
        out.push({ t: 'circle', c: [hand[0] + dy * 5, hand[1] - dx * 5], r: 2.4, role: 'prop', fill: true });
      }
      break;
    case 'racket': {
      const [dx, dy] = forearmDir(j.rElbow, j.rHand);
      const head: Pt = [j.rHand[0] + dx * 14, j.rHand[1] + dy * 14];
      line(j.rHand, [j.rHand[0] + dx * 10, j.rHand[1] + dy * 10], 'prop', 2);
      out.push({ t: 'circle', c: head, r: 4.5, role: 'prop', fill: false });
      break;
    }
    case 'bat': {
      const [dx, dy] = forearmDir(j.rElbow, j.rHand);
      line(j.rHand, [j.rHand[0] + dx * 24, j.rHand[1] + dy * 24], 'prop', 4);
      break;
    }
    case 'rope': {
      const c = 28 + 80 * Math.cos(2 * Math.PI * phase);
      out.push({ t: 'path', d: `M${j.lHand[0]} ${j.lHand[1]} C${j.lHand[0] - 4} ${c} ${j.rHand[0] + 4} ${c} ${j.rHand[0]} ${j.rHand[1]}`, w: 1.5, role: 'prop', fill: false });
      break;
    }
  }
  return out;
}
