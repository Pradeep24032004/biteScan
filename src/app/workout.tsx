import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ExerciseAnimation } from '@/components/ExerciseAnimation';
import { KIND_STYLE } from '@/components/ExerciseTile';
import { Confetti, Pulse, Sparkles } from '@/components/Motion';
import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, ChipRow } from '@/components/ui';
import { addWorkout, getProfile, getSetting, setSetting } from '@/db/database';
import { EXERCISES, kcalFor, workoutCircuit, type AgeBand, type Circuit, type Exercise } from '@/data/exercises';
import { bump, success, tap } from '@/lib/haptics';
import { toDateKey, type Goal } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';
import { beep, prepareCoach, releaseCoach, say } from '@/lib/workoutCoach';

type Step = { exercise: Exercise; rest: boolean; seconds: number; round: number };

const GET_READY = 10;
const KEEP_AWAKE_TAG = 'workout';
const LENGTHS = [
  { value: 1, label: 'Quick' },
  { value: 2, label: 'Standard' },
  { value: 3, label: 'Long' },
];

/** What to aim for during a move, by type. */
const AIM = {
  strength: 'Aim for 10–15 slow, controlled reps',
  cardio: 'Keep moving at a steady, brisk pace',
  mobility: 'Move slowly and breathe deeply',
} as const;

/**
 * Follow-along circuit: each move plays as an animation with a work/rest countdown,
 * voice and beep cues, and the screen kept awake. Finished workouts are saved.
 */
export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ goal: Goal; band: AgeBand; only?: string }>();
  const db = useSQLiteContext();
  const [weight, setWeight] = useState(70);
  const [voice, setVoice] = useState(true);
  useEffect(() => {
    getProfile(db).then((p) => setWeight(p.weightKg));
    getSetting(db, 'coachVoice').then((v) => setVoice(v !== 'off'));
  }, [db]);

  const base = useMemo<Circuit>(() => {
    // "Try it now" from an exercise page: just that move.
    const single = EXERCISES.find((e) => e.id === params.only);
    if (single) return { exercises: [single], workSeconds: 30, restSeconds: 20, rounds: 3 };
    return workoutCircuit(params.goal ?? 'maintain', params.band ?? '30-44');
  }, [params.goal, params.band, params.only]);
  const [rounds, setRounds] = useState(base.rounds);

  const steps = useMemo(() => {
    const out: Step[] = [{ exercise: base.exercises[0], rest: true, seconds: GET_READY, round: 1 }];
    for (let round = 1; round <= rounds; round++) {
      base.exercises.forEach((exercise, i) => {
        out.push({ exercise, rest: false, seconds: base.workSeconds, round });
        const next = base.exercises[i + 1] ?? (round < rounds ? base.exercises[0] : null);
        if (next) out.push({ exercise: next, rest: true, seconds: base.restSeconds, round });
      });
    }
    return out;
  }, [base, rounds]);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  // The clock runs on timestamps so it stays right even if the phone stutters.
  const [endsAt, setEndsAt] = useState(0);
  const [pausedLeftMs, setPausedLeftMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const workedSeconds = useRef<Record<string, number>>({});
  const saved = useRef(false);
  const [result, setResult] = useState({ seconds: 0, kcal: 0 });
  const done = started && index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  const leftMs = pausedLeftMs ?? Math.max(0, endsAt - now);
  const left = Math.ceil(leftMs / 1000);

  const cue = (text: string) => {
    if (voice) say(text);
  };

  // Each tick: redraw the clock, play countdown beeps and mid-move cues, and move on at zero.
  const lastSecond = useRef(-1);
  const onTick = useEffectEvent(() => {
    const t = Date.now();
    setNow(t);
    const secondsLeft = Math.ceil(Math.max(0, endsAt - t) / 1000);
    if (secondsLeft === lastSecond.current) return;
    lastSecond.current = secondsLeft;
    if (secondsLeft >= 1 && secondsLeft <= 3) beep('tick');
    if (!step.rest && step.seconds >= 30) {
      if (secondsLeft === Math.floor(step.seconds / 2)) cue('Halfway. Keep going!');
      else if (secondsLeft === 10) cue('Ten seconds left');
    }
    if (secondsLeft <= 0) goTo(index + 1, true);
  });
  useEffect(() => {
    if (!started || done || pausedLeftMs != null) return;
    const timer = setInterval(() => onTick(), 200);
    return () => clearInterval(timer);
  }, [started, done, pausedLeftMs]);

  // Keep the screen on during the session; release sounds when leaving.
  useEffect(() => {
    if (!started || done) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [started, done]);
  useEffect(() => releaseCoach, []);

  function announce(i: number) {
    const s = steps[i];
    if (!s) return;
    if (i === 0) cue(`Get ready. First up, ${s.exercise.name}.`);
    else if (s.rest) cue(`Rest. Next up, ${s.exercise.name}.`);
    else {
      beep('go');
      cue(`Go! ${s.exercise.name}.`);
    }
  }

  function goTo(i: number, automatic = false) {
    // Count the time actually spent on the move being left.
    const current = steps[index];
    if (current && !current.rest) {
      const spent = current.seconds - Math.ceil((pausedLeftMs ?? Math.max(0, endsAt - Date.now())) / 1000);
      workedSeconds.current[current.exercise.id] = (workedSeconds.current[current.exercise.id] ?? 0) + Math.max(0, spent);
    }
    const target = Math.max(0, i);
    setIndex(target);
    setPausedLeftMs(null);
    lastSecond.current = -1;
    if (target >= steps.length) {
      finish();
      return;
    }
    if (!automatic) tap();
    else bump();
    setEndsAt(Date.now() + steps[target].seconds * 1000);
    setNow(Date.now());
    announce(target);
  }

  function finish() {
    beep('done');
    success();
    cue('Workout complete. Great job!');
    const seconds = Object.values(workedSeconds.current).reduce((s, n) => s + n, 0);
    const kcal = base.exercises.reduce((s, e) => s + kcalFor(e, weight, (workedSeconds.current[e.id] ?? 0) / 60), 0);
    setResult({ seconds, kcal });
    if (!saved.current && seconds >= 60) {
      saved.current = true;
      const title = params.only ? base.exercises[0].name : 'Home workout';
      void addWorkout(db, { date: toDateKey(new Date()), title, seconds, kcal: Math.round(kcal), moves: base.exercises.length });
    }
  }

  async function start() {
    await prepareCoach();
    setStarted(true);
    setIndex(0);
    setEndsAt(Date.now() + steps[0].seconds * 1000);
    setNow(Date.now());
    announce(0);
  }

  function togglePause() {
    tap();
    if (pausedLeftMs != null) {
      setEndsAt(Date.now() + pausedLeftMs);
      setNow(Date.now());
      setPausedLeftMs(null);
      cue('Resume');
    } else {
      setPausedLeftMs(Math.max(0, endsAt - Date.now()));
      cue('Paused');
    }
  }

  if (!started) {
    const total = steps.reduce((s, st) => s + st.seconds, 0);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: params.only ? base.exercises[0].name : 'Home workout' }} />
        <Card>
          <Text style={type.title}>{Math.round(total / 60)} min · {base.exercises.length} moves</Text>
          <Text style={type.caption}>
            {rounds} round{rounds > 1 ? 's' : ''} · {base.workSeconds}s work, {base.restSeconds}s rest · no equipment
          </Text>
          <Text style={type.label}>Length</Text>
          <ChipRow options={LENGTHS} value={rounds} onChange={setRounds} />
          <View style={styles.voiceRow}>
            <Ionicons name="volume-high" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={type.body}>Voice coach</Text>
              <Text style={type.caption}>Says each move, halfway and 10 seconds left. Beeps play either way.</Text>
            </View>
            <Switch
              value={voice}
              onValueChange={(on) => {
                setVoice(on);
                void setSetting(db, 'coachVoice', on ? 'on' : 'off');
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>
        {base.exercises.map((e) => (
          <View key={e.id} style={styles.previewRow}>
            <View style={[styles.previewPic, { backgroundColor: KIND_STYLE[e.kind].bg }]}>
              <ExerciseAnimation exerciseId={e.id} size={64} color={KIND_STYLE[e.kind].fg} fps={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>{e.name}</Text>
              <Text style={type.caption} numberOfLines={2}>
                {AIM[e.kind]}
              </Text>
            </View>
          </View>
        ))}
        <Button label="Start workout" icon="play" onPress={start} />
        <Text style={type.caption}>Turn your volume up. Stop if you feel pain or dizziness, and breathe steadily throughout.</Text>
      </ScrollView>
    );
  }

  if (done) {
    const { seconds, kcal } = result;
    return (
      <View style={[styles.screen, styles.center]}>
        <Stack.Screen options={{ title: 'Done' }} />
        <View style={styles.trophy}>
          <Pulse color={colors.accent} size={130} />
          <Ionicons name="trophy" size={72} color={colors.accent} />
          <Sparkles color={colors.accent} />
        </View>
        <Confetti />
        <Text style={type.title}>Workout complete 🎉</Text>
        <View style={styles.doneStats}>
          <DoneStat value={`${Math.max(1, Math.round(seconds / 60))}`} label="minutes" />
          <DoneStat value={`${Math.round(kcal)}`} label="kcal burned" />
          <DoneStat value={`${base.exercises.length}`} label="moves" />
        </View>
        <Text style={[type.caption, { textAlign: 'center' }]}>
          {seconds >= 60 ? 'Saved to your workout history.' : 'Less than a minute, so it wasn’t saved.'}
        </Text>
        <Button label="Finish" icon="checkmark" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const kind = KIND_STYLE[step.exercise.kind];
  const workSteps = steps.filter((s) => !s.rest);
  const workDone = steps.slice(0, index).filter((s) => !s.rest).length;
  const nextWork = steps.slice(index + 1).find((s) => !s.rest);
  const paused = pausedLeftMs != null;
  const accent = step.rest ? colors.muted : kind.fg;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `Round ${step.round} of ${rounds}` }} />
      <View style={styles.dots}>
        {workSteps.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < workDone ? colors.accent : colors.border }]} />
        ))}
      </View>

      <View style={[styles.stage, { backgroundColor: step.rest ? colors.cardMuted : kind.bg }]}>
        <Text style={[styles.badge, { color: accent }]}>
          {paused ? 'PAUSED' : step.rest ? (index === 0 ? 'GET READY' : 'REST · NEXT UP') : 'GO!'}
        </Text>
        <View>
          {!step.rest && !paused && <Pulse color={kind.fg} size={170} rings={2} duration={3000} />}
          <ExerciseAnimation
            key={`${index}`}
            exerciseId={step.exercise.id}
            size={200}
            color={step.rest ? colors.faint : kind.fg}
            playing={!paused}
            showReps={!step.rest}
          />
        </View>
        <Text style={[type.title, { textAlign: 'center' }]}>{step.exercise.name}</Text>
        <Text style={[type.caption, { textAlign: 'center', color: step.rest ? colors.muted : colors.text }]}>
          {step.rest ? step.exercise.steps[0] : AIM[step.exercise.kind]}
        </Text>
      </View>

      <View style={styles.timerRow}>
        <ProgressRing value={step.seconds * 1000 - leftMs} max={step.seconds * 1000} size={128} stroke={10} color={accent}>
          <Text style={[styles.timer, { color: step.rest ? colors.text : kind.fg }]}>{left}</Text>
          <Text style={type.caption}>seconds</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.label}>{step.rest ? 'Breathe and get ready' : `Move ${workDone + 1} of ${workSteps.length}`}</Text>
          {nextWork && !step.rest && (
            <Text style={type.body} numberOfLines={2}>
              Next: <Text style={{ fontWeight: '700' }}>{nextWork.exercise.name}</Text>
            </Text>
          )}
          {!nextWork && !step.rest && <Text style={[type.body, { fontWeight: '700' }]}>Last move — finish strong!</Text>}
        </View>
      </View>

      <View style={styles.controls}>
        <RoundButton icon="play-skip-back" onPress={() => goTo(Math.max(0, index - 1))} />
        <RoundButton icon={paused ? 'play' : 'pause'} big onPress={togglePause} />
        <RoundButton icon="play-skip-forward" onPress={() => goTo(index + 1)} />
      </View>
    </View>
  );
}

function DoneStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.doneStat}>
      <Text style={styles.doneValue}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

function RoundButton({
  icon,
  onPress,
  big,
}: {
  icon: 'play' | 'pause' | 'play-skip-back' | 'play-skip-forward';
  onPress: () => void;
  big?: boolean;
}) {
  const size = big ? 76 : 56;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={icon.replace(/-/g, ' ')}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: big ? colors.primary : colors.card },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={big ? 34 : 24} color={big ? colors.white : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  trophy: { width: 200, height: 170, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    padding: space.sm,
    borderRadius: radius.md,
  },
  previewPic: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden' },
  dots: { flexDirection: 'row', gap: 4, paddingHorizontal: space.lg, paddingTop: space.md },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  stage: { marginHorizontal: space.lg, marginTop: space.md, borderRadius: radius.lg, alignItems: 'center', padding: space.md, gap: 6 },
  badge: { fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, marginTop: space.lg },
  timer: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 48 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xxl, marginTop: 'auto', paddingBottom: 48 },
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  doneStats: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
  doneStat: { flex: 1, alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: space.md },
  doneValue: { fontSize: 26, fontWeight: '800', color: colors.accent, fontVariant: ['tabular-nums'] },
});
