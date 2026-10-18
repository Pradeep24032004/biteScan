import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExerciseAnimation } from '@/components/ExerciseAnimation';
import { ExercisePicture, KIND_STYLE } from '@/components/ExerciseTile';
import { FadeIn, Pulse } from '@/components/Motion';
import { Button, Card, Pill } from '@/components/ui';
import { getProfile } from '@/db/database';
import { EXERCISES, kcalFor, suitability } from '@/data/exercises';
import { moveFor } from '@/data/exerciseMoves';
import { colors, radius, space, type } from '@/lib/theme';

const IMPACT_TEXT = {
  low: 'Low impact — easy on knees and back',
  medium: 'Medium impact',
  high: 'High impact — needs healthy joints',
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [weight, setWeight] = useState(70);
  useEffect(() => {
    getProfile(db).then((p) => setWeight(p.weightKg));
  }, [db]);

  const exercise = EXERCISES.find((e) => e.id === id);
  if (!exercise) return null;
  const kind = KIND_STYLE[exercise.kind];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.name }} />
      <View style={[styles.hero, { backgroundColor: kind.bg }]}>
        {moveFor(exercise.id) ? (
          <View style={styles.stage}>
            <Pulse color={kind.fg} size={200} rings={2} duration={3600} strength={0.6} />
            <ExerciseAnimation exerciseId={exercise.id} size={240} color={kind.fg} propColor={`${kind.fg}66`} />
          </View>
        ) : (
          <ExercisePicture exercise={exercise} size={140} />
        )}
        <View style={styles.pills}>
          <Pill label={kind.label} color={kind.fg} bg={colors.card} />
          <Pill label={suitability(exercise).label} color={colors.muted} bg={colors.card} />
        </View>
      </View>

      {moveFor(exercise.id) && (
        <Button
          label="Try it now · follow along"
          icon="play"
          onPress={() => router.push({ pathname: '/workout', params: { only: exercise.id } })}
        />
      )}
      <Button
        label="Log this exercise"
        icon="add-circle-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: '/log-exercise', params: { id: exercise.id } })}
      />

      <FadeIn index={1}>
        <Card>
          <Text style={type.heading}>Calories you burn</Text>
          <View style={styles.kcalRow}>
            {[15, 30, 45].map((m) => (
              <View key={m} style={styles.kcalBox}>
                <Text style={[styles.kcalValue, { color: kind.fg }]}>{kcalFor(exercise, weight, m)}</Text>
                <Text style={type.caption}>kcal · {m} min</Text>
              </View>
            ))}
          </View>
          <Text style={type.caption}>
            Estimated for {weight} kg (intensity {exercise.met} MET).
          </Text>
        </Card>
      </FadeIn>

      <FadeIn index={2}>
        <Card>
          <Text style={type.heading}>How to do it</Text>
          {exercise.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: kind.bg }]}>
                <Text style={{ color: kind.fg, fontWeight: '800' }}>{i + 1}</Text>
              </View>
              <Text style={[type.body, { flex: 1 }]}>{s}</Text>
            </View>
          ))}
          <Text style={type.caption}>{IMPACT_TEXT[exercise.impact]}. Stop if you feel pain or dizziness.</Text>
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.md, paddingBottom: space.xl, borderRadius: radius.lg, overflow: 'hidden' },
  stage: { width: 260, height: 240, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', gap: space.sm },
  kcalRow: { flexDirection: 'row', gap: space.sm },
  kcalBox: { flex: 1, alignItems: 'center', paddingVertical: space.md, backgroundColor: colors.cardMuted, borderRadius: radius.md },
  kcalValue: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
