import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExercisePicture, KIND_STYLE } from '@/components/ExerciseTile';
import type { PlanItem } from '@/data/exercises';
import { colors, radius, shadow, space, type } from '@/lib/theme';

/** One row of a weekly plan: picture, name, how long and how often. Tap for details. */
export function ExerciseCard({ item }: { item: PlanItem }) {
  const { exercise, minutes, perWeek, kcal } = item;
  const kind = KIND_STYLE[exercise.kind];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <ExercisePicture exercise={exercise} size={60} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.kind} numberOfLines={1}>
          <Text style={{ color: kind.fg }}>{kind.label.toUpperCase()}</Text>
        </Text>
        <Text style={[type.body, { fontWeight: '700' }]}>{exercise.name}</Text>
        <Text style={type.caption}>
          {minutes} min · {perWeek}× a week · ~{kcal} kcal each
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow,
  },
  kind: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
