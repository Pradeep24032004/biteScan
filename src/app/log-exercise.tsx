import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExerciseAnimation } from '@/components/ExerciseAnimation';
import { ExercisePicture, KIND_STYLE } from '@/components/ExerciseTile';
import { GradientCard } from '@/components/GradientCard';
import { Button, Card, Chip, ChipRow } from '@/components/ui';
import { addWorkout, getProfile, getSetting, setSetting } from '@/db/database';
import { EXERCISES, GYM_GROUPS, kcalFor, type Exercise, type GymGroup } from '@/data/exercises';
import { moveFor } from '@/data/exerciseMoves';
import { success } from '@/lib/haptics';
import { toDateKey } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

type Effort = 'easy' | 'moderate' | 'hard';
const EFFORTS: { value: Effort; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];
// How hard it felt scales the exercise's typical MET value.
const EFFORT_FACTOR: Record<Effort, number> = { easy: 0.8, moderate: 1, hard: 1.25 };
const MINUTE_CHIPS = [10, 20, 30, 45, 60].map((m) => ({ value: m, label: `${m} min` }));

/** An exercise the user added themselves (not in the list), remembered on the phone. */
type MyExercise = { name: string; kind: Exercise['kind']; met: number };
const MY_KEY = 'myExercises';
const CUSTOM_TYPES: { value: Exercise['kind']; label: string }[] = [
  { value: 'strength', label: 'Weights / strength' },
  { value: 'cardio', label: 'Cardio / sport' },
  { value: 'mobility', label: 'Stretch / yoga' },
];
const CUSTOM_INTENSITY = [
  { value: 3.5, label: 'Light' },
  { value: 5, label: 'Moderate' },
  { value: 8, label: 'Hard' },
];
const CUSTOM_LOOK = {
  strength: { symbol: 'figure.strengthtraining.traditional', androidSymbol: 'fitness_center' },
  cardio: { symbol: 'figure.mixed.cardio', androidSymbol: 'directions_run' },
  mobility: { symbol: 'figure.flexibility', androidSymbol: 'self_improvement' },
} as const;

function customExercise(m: MyExercise): Exercise {
  return {
    id: `custom:${m.name.toLowerCase()}`,
    name: m.name,
    kind: m.kind,
    met: m.met,
    impact: 'medium',
    steps: [],
    ...CUSTOM_LOOK[m.kind],
  };
}

/** Time a strength session takes: each rep ~3 s, plus ~75 s rest after each set. */
function strengthMinutes(sets: number, reps: number) {
  return (sets * (reps * 3 + 75)) / 60;
}

/** Log any exercise done outside the guided workouts, with an estimate of calories burned. */
export default function LogExerciseScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const db = useSQLiteContext();
  const [weightKg, setWeightKg] = useState(70);
  const [exercise, setExercise] = useState<Exercise | null>(() => EXERCISES.find((e) => e.id === params.id) ?? null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GymGroup | 'all' | 'home'>('all');
  const [minutes, setMinutes] = useState('30');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');
  const [load, setLoad] = useState('');
  const [effort, setEffort] = useState<Effort>('moderate');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [mine, setMine] = useState<MyExercise[]>([]);
  const [adding, setAdding] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customKind, setCustomKind] = useState<Exercise['kind']>('strength');
  const [customMet, setCustomMet] = useState(5);
  useEffect(() => {
    getProfile(db).then((p) => setWeightKg(p.weightKg));
    getSetting(db, MY_KEY).then((v) => setMine(v ? JSON.parse(v) : []));
  }, [db]);

  if (!exercise) {
    const q = query.trim().toLowerCase();
    const list = EXERCISES.filter(
      (e) => (!q || e.name.toLowerCase().includes(q)) && (group === 'all' || (group === 'home' ? !e.group : e.group === group)),
    );
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: 'Log exercise' }} />
        {savedCount > 0 ? (
          <Text style={[type.label, { color: colors.primary }]}>
            ✓ {savedCount} exercise{savedCount > 1 ? 's' : ''} saved. Pick the next one, or close when you&apos;re done.
          </Text>
        ) : (
          <Text style={type.label}>Pick what you did — gym lifts, machines, classes, sports or walks.</Text>
        )}
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search: walk, cricket, push-ups…"
          placeholderTextColor={colors.faint}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {[
            { value: 'all' as const, label: 'All' },
            ...GYM_GROUPS.map((g) => ({ value: g, label: g })),
            { value: 'home' as const, label: 'Home & sport' },
          ].map((o) => (
            <Chip key={o.value} label={o.label} selected={group === o.value} onPress={() => setGroup(o.value)} />
          ))}
        </ScrollView>
        {adding ? (
          <Card>
            <Text style={type.heading}>Add your own exercise</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Cable glute pull-through"
              placeholderTextColor={colors.faint}
              autoFocus
            />
            <Text style={type.label}>Type</Text>
            <ChipRow options={CUSTOM_TYPES} value={customKind} onChange={setCustomKind} />
            <Text style={type.label}>How intense is it usually?</Text>
            <ChipRow options={CUSTOM_INTENSITY} value={customMet} onChange={setCustomMet} />
            <Button
              label="Continue"
              icon="arrow-forward"
              disabled={customName.trim().length < 2}
              onPress={() => {
                setExercise(customExercise({ name: customName.trim(), kind: customKind, met: customMet }));
                setAdding(false);
                setCustomName('');
              }}
            />
          </Card>
        ) : (
          <Pressable style={[styles.pickRow, styles.addOwn]} onPress={() => setAdding(true)}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: colors.primary, fontWeight: '700' }]}>Can&apos;t find it? Add your own</Text>
              <Text style={type.caption}>Any exercise, machine or sport — saved for next time</Text>
            </View>
          </Pressable>
        )}
        {mine
          .filter((m) => !q || m.name.toLowerCase().includes(q))
          .map((m) => {
            const e = customExercise(m);
            return (
              <Pressable key={e.id} style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.7 }]} onPress={() => setExercise(e)}>
                <ExercisePicture exercise={e} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{m.name}</Text>
                  <Text style={type.caption}>My exercise · ~{kcalFor(e, weightKg, 30)} kcal / 30 min</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            );
          })}
        {list.map((e) => (
          <Pressable key={e.id} style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.7 }]} onPress={() => setExercise(e)}>
            <ExercisePicture exercise={e} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{e.name}</Text>
              <Text style={type.caption}>
                {e.group ?? KIND_STYLE[e.kind].label} · ~{kcalFor(e, weightKg, 30)} kcal / 30 min
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  const kind = KIND_STYLE[exercise.kind];
  const strength = exercise.kind === 'strength';
  const nSets = Math.max(0, Math.round(Number(sets) || 0));
  const nReps = Math.max(0, Math.round(Number(reps) || 0));
  const kgLifted = Number(load) > 0 ? Number(load) : null;
  const mins = strength ? strengthMinutes(nSets, nReps) : Math.max(0, Number(minutes) || 0);
  const kcal = Math.round(kcalFor(exercise, weightKg, mins) * EFFORT_FACTOR[effort]);
  const volume = strength && kgLifted ? Math.round(nSets * nReps * kgLifted) : null;
  const valid = mins >= 1 && (!strength || (nSets > 0 && nReps > 0));

  const save = async (another = false) => {
    setSaving(true);
    // Remember exercises the user added, so they show up next time.
    if (exercise.id.startsWith('custom:') && !mine.some((m) => m.name.toLowerCase() === exercise.name.toLowerCase())) {
      const next = [{ name: exercise.name, kind: exercise.kind, met: exercise.met }, ...mine].slice(0, 30);
      setMine(next);
      await setSetting(db, MY_KEY, JSON.stringify(next));
    }
    await addWorkout(db, {
      date: params.date ?? toDateKey(new Date()),
      title: exercise.name,
      seconds: Math.round(mins * 60),
      kcal,
      moves: 1,
      exerciseId: exercise.id.startsWith('custom:') ? null : exercise.id,
      sets: strength ? nSets : null,
      reps: strength ? nReps : null,
      weightKg: strength ? kgLifted : null,
    });
    success();
    if (another) {
      // Gym sessions: straight back to the list for the next exercise.
      setSaving(false);
      setSavedCount((n) => n + 1);
      setExercise(null);
      setQuery('');
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: exercise.name }} />
        <View style={[styles.hero, { backgroundColor: kind.bg }]}>
          {moveFor(exercise.id) ? (
            <ExerciseAnimation exerciseId={exercise.id} size={150} color={kind.fg} propColor={`${kind.fg}66`} />
          ) : (
            <ExercisePicture exercise={exercise} size={110} />
          )}
          {!params.id && (
            <Pressable onPress={() => setExercise(null)} hitSlop={8}>
              <Text style={[type.label, { color: kind.fg }]}>Change exercise</Text>
            </Pressable>
          )}
        </View>

        <Card>
          {strength ? (
            <>
              <Text style={type.heading}>What did you do?</Text>
              <View style={styles.fieldRow}>
                <NumberField label="Sets" value={sets} onChange={setSets} />
                <NumberField label="Reps per set" value={reps} onChange={setReps} />
                <NumberField label="Weight (kg)" value={load} onChange={setLoad} placeholder="body" />
              </View>
              <Text style={type.caption}>
                About {Math.round(mins)} min including rest{volume ? ` · ${volume.toLocaleString('en-IN')} kg lifted in total` : ''}.
              </Text>
            </>
          ) : (
            <>
              <Text style={type.heading}>How long?</Text>
              <ChipRow options={MINUTE_CHIPS} value={Number(minutes)} onChange={(m) => setMinutes(String(m))} />
              <NumberField label="Minutes" value={minutes} onChange={setMinutes} />
            </>
          )}
          <Text style={type.label}>How hard did it feel?</Text>
          <ChipRow options={EFFORTS} value={effort} onChange={setEffort} />
        </Card>

        <GradientCard from="#F29A57" to="#C9561A" style={styles.result}>
          <Text style={styles.resultLabel}>CALORIES BURNED</Text>
          <Text style={styles.resultValue}>
            {kcal.toLocaleString('en-IN')}
            <Text style={styles.resultUnit}> kcal</Text>
          </Text>
          <Text style={styles.resultNote}>
            Estimated for {weightKg} kg from the exercise&apos;s typical intensity ({exercise.met} MET). Real burn varies.
          </Text>
        </GradientCard>

        <Button label="Save exercise" icon="checkmark" onPress={() => save()} disabled={!valid} loading={saving} />
        {!params.id && (
          <Button label="Save & add another" icon="add" variant="secondary" onPress={() => save(true)} disabled={!valid || saving} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  search: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.sm,
  },
  addOwn: { borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.primarySoft },
  hero: { alignItems: 'center', borderRadius: radius.lg, paddingVertical: space.md, gap: space.xs },
  fieldRow: { flexDirection: 'row', gap: space.sm },
  input: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  result: { padding: space.lg, gap: 2 },
  resultLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  resultValue: { color: colors.white, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  resultUnit: { fontSize: 18, fontWeight: '600' },
  resultNote: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
});
