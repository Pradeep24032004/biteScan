import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCard } from '@/components/ExerciseCard';
import { ExerciseTile } from '@/components/ExerciseTile';
import { ProgressRing } from '@/components/ProgressRing';
import { Card, ChipRow, SectionTitle } from '@/components/ui';
import { getProfile } from '@/db/database';
import {
  AGE_BANDS,
  ageBand,
  EXERCISES,
  recommendExercises,
  suitsAgeBand,
  type AgeBand,
  type ExerciseKind,
} from '@/data/exercises';
import { GOAL_OPTIONS, type Goal, type Profile } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

const WHO_WEEKLY_MINUTES = 150;
const KIND_FILTERS: { value: ExerciseKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'strength', label: 'Strength' },
  { value: 'mobility', label: 'Mobility' },
];

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [band, setBand] = useState<AgeBand | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [kind, setKind] = useState<ExerciseKind | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      getProfile(db).then(setProfile);
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
  const library = EXERCISES.filter((e) => kind === 'all' || e.kind === kind).sort(
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
          {plan.map((item) => (
            <ExerciseCard key={item.exercise.id} item={item} />
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
});
