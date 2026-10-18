import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseAnimation } from '@/components/ExerciseAnimation';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ExerciseTile } from '@/components/ExerciseTile';
import { FadeIn, PressableScale, Pulse, Sparkles } from '@/components/Motion';
import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, ChipRow, SectionTitle } from '@/components/ui';
import { getProfile, getWorkoutsSince, type WorkoutLog } from '@/db/database';
import {
  AGE_BANDS,
  ageBand,
  EXERCISES,
  recommendExercises,
  suitsAgeBand,
  workoutCircuit,
  type AgeBand,
  type ExerciseKind,
} from '@/data/exercises';
import { GOAL_OPTIONS, shiftDateKey, toDateKey, type Goal, type Profile } from '@/lib/nutrition';
import { colors, radius, shadow, space, type } from '@/lib/theme';

const WHO_WEEKLY_MINUTES = 150;
const KIND_FILTERS: { value: ExerciseKind | 'all' | 'gym'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'strength', label: 'Strength' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'gym', label: 'Gym' },
];

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [band, setBand] = useState<AgeBand | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [kind, setKind] = useState<ExerciseKind | 'all' | 'gym'>('all');
  const [recent, setRecent] = useState<WorkoutLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      getProfile(db).then(setProfile);
      getWorkoutsSince(db, shiftDateKey(toDateKey(new Date()), -6)).then(setRecent);
    }, [db])
  );

  if (!profile) return null;
  // Defaults follow the user's own age and goal until they pick something else.
  const activeBand = band ?? ageBand(profile.age);
  const activeGoal = goal ?? profile.goal;
  const plan = recommendExercises(activeGoal, activeBand, profile.weightKg);
  const weeklyMinutes = plan.reduce((s, p) => s + p.minutes * p.perWeek, 0);
  const weeklyKcal = plan.reduce((s, p) => s + p.kcal * p.perWeek, 0);
  const sessions = plan.reduce((s, p) => s + p.perWeek, 0);
  const isYou = activeBand === ageBand(profile.age) && activeGoal === profile.goal;
  const circuit = workoutCircuit(activeGoal, activeBand);
  const circuitMinutes = Math.round(
    (circuit.exercises.length * (circuit.workSeconds + circuit.restSeconds) * circuit.rounds) / 60
  );
  const library = EXERCISES.filter((e) => (kind === 'gym' ? !!e.group : !e.group && (kind === 'all' || e.kind === kind))).sort(
    (a, b) => Number(suitsAgeBand(b, activeBand)) - Number(suitsAgeBand(a, activeBand))
  );
  const rows: (typeof library)[] = [];
  for (let i = 0; i < library.length; i += 2) rows.push(library.slice(i, i + 2));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 2, marginBottom: space.xs }}>
          <Text style={type.title}>Workouts</Text>
          <Text style={type.label}>Plans by age and goal — pick any to explore</Text>
        </View>

        <FadeIn>
          <PressableScale
            style={styles.startCard}
            ripple={{ color: colors.white, radius: radius.lg }}
            onPress={() => router.push({ pathname: '/workout', params: { goal: activeGoal, band: activeBand } })}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.startEyebrow}>FOLLOW ALONG</Text>
              <Text style={styles.startTitle}>Home workout</Text>
              <Text style={styles.startSub}>
                {circuit.exercises.length} moves · ~{circuitMinutes} min · no equipment
              </Text>
              <View style={styles.startButton}>
                <Ionicons name="play" size={16} color={colors.accent} />
                <Text style={styles.startButtonText}>Start</Text>
              </View>
            </View>
            <Sparkles />
            <View style={styles.startFigure}>
              <Pulse color={colors.white} size={110} />
              <ExerciseAnimation exerciseId={circuit.exercises[0].id} size={120} color={colors.white} propColor="rgba(255,255,255,0.6)" />
            </View>
          </PressableScale>
        </FadeIn>

        <Button label="Log an exercise you did" icon="add-circle-outline" variant="secondary" onPress={() => router.push('/log-exercise')} />

        <Card>
          <View style={styles.weekHead}>
            <Text style={type.heading}>Your last 7 days</Text>
            <Text style={type.caption}>{recent.length ? 'Keep it up!' : 'Start one today'}</Text>
          </View>
          <View style={styles.weekStats}>
            <WeekStat value={recent.length} label="workouts" />
            <WeekStat value={Math.round(recent.reduce((s, w) => s + w.seconds, 0) / 60)} label="minutes" />
            <WeekStat value={Math.round(recent.reduce((s, w) => s + w.kcal, 0))} label="kcal burned" />
          </View>
          <View style={styles.weekDots}>
            {Array.from({ length: 7 }, (_, i) => {
              const day = shiftDateKey(toDateKey(new Date()), i - 6);
              const did = recent.some((w) => w.date === day);
              return (
                <View key={day} style={[styles.weekDot, did && styles.weekDotOn]}>
                  {did && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={type.label}>Age group</Text>
          <ChipRow options={AGE_BANDS} value={activeBand} onChange={setBand} />
          <Text style={type.label}>Goal</Text>
          <ChipRow options={GOAL_OPTIONS} value={activeGoal} onChange={setGoal} />
        </Card>

        <Card style={styles.hero}>
          <ProgressRing value={weeklyMinutes} max={WHO_WEEKLY_MINUTES} size={112} stroke={11} color={colors.accent}>
            <Text style={styles.ringValue}>{weeklyMinutes}</Text>
            <Text style={type.caption}>min / week</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={type.heading}>{isYou ? 'Your weekly plan' : `Plan for ${activeBand}`}</Text>
            <Text style={type.caption}>
              {sessions} sessions · ~{weeklyKcal.toLocaleString('en-IN')} kcal burned a week
            </Text>
            <Text style={[type.caption, { color: colors.text }]}>{AGE_BANDS.find((b) => b.value === activeBand)?.why}</Text>
          </View>
        </Card>


        <View style={{ gap: space.sm }}>
          {plan.map((item, i) => (
            <FadeIn key={item.exercise.id} index={i}>
              <ExerciseCard item={item} />
            </FadeIn>
          ))}
        </View>
        <Text style={type.caption}>
          Following WHO guidance: 150–300 min of moderate activity and strength work on 2+ days a week. Calories are
          estimates for {profile.weightKg} kg.
          {activeBand === '60+' || activeBand === '45-59' ? ' Check with your doctor before starting something new.' : ''}
        </Text>

        <SectionTitle title="All exercises" />
        <ChipRow options={KIND_FILTERS} value={kind} onChange={setKind} />
        {rows.map((row, i) => (
          <View key={i} style={styles.gridRow}>
            {row.map((e) => (
              <ExerciseTile key={e.id} exercise={e} weightKg={profile.weightKg} dimmed={!suitsAgeBand(e, activeBand)} />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
        <Text style={type.caption}>Faded exercises are less suited to the {activeBand} age group.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: 48, gap: space.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderRadius: radius.lg },
  ringValue: { fontSize: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  gridRow: { flexDirection: 'row', gap: space.md },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  weekStats: { flexDirection: 'row', gap: space.sm },
  weekValue: { fontSize: 24, fontWeight: '800', color: colors.accent, fontVariant: ['tabular-nums'] },
  weekDots: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
  weekDotOn: { backgroundColor: colors.accent },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: space.lg,
    overflow: 'hidden',
    ...shadow,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
  },
  startEyebrow: { color: '#FFE3CC', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  startTitle: { color: colors.white, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  startSub: { color: '#FFF3EA', fontSize: 13, fontWeight: '500' },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: space.sm,
  },
  startButtonText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  startFigure: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' },
});

function WeekStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.weekValue}>{value.toLocaleString('en-IN')}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}
