import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { kcalFor, suitability, type Exercise } from '@/data/exercises';
import { colors, radius, shadow, space, type } from '@/lib/theme';

export const KIND_STYLE = {
  cardio: { fg: colors.accent, bg: colors.accentSoft, label: 'Cardio' },
  strength: { fg: colors.protein, bg: '#E3ECF7', label: 'Strength' },
  mobility: { fg: colors.primary, bg: colors.primarySoft, label: 'Mobility' },
} as const;

export function ExercisePicture({ exercise, size = 64 }: { exercise: Exercise; size?: number }) {
  const kind = KIND_STYLE[exercise.kind];
  return (
    <View style={[styles.picture, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: kind.bg }]}>
      <SymbolView
        name={{ ios: exercise.symbol, android: exercise.androidSymbol }}
        tintColor={kind.fg}
        size={size * 0.56}
        type="hierarchical"
        fallback={<Ionicons name="fitness" size={size * 0.5} color={kind.fg} />}
      />
    </View>
  );
}

/** Grid tile: picture, name, calories per 30 min, and which ages it suits. */
export function ExerciseTile({ exercise, weightKg, dimmed }: { exercise: Exercise; weightKg: number; dimmed?: boolean }) {
  const kind = KIND_STYLE[exercise.kind];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      style={({ pressed }) => [styles.tile, dimmed && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <ExercisePicture exercise={exercise} size={56} />
      <Text style={styles.name} numberOfLines={2}>
        {exercise.name}
      </Text>
      <Text style={type.caption}>~{kcalFor(exercise, weightKg, 30)} kcal / 30 min</Text>
      <View style={styles.tags}>
        <Text style={[styles.tag, { color: kind.fg, backgroundColor: kind.bg }]}>{kind.label}</Text>
        <Text style={[styles.tag, { color: colors.muted, backgroundColor: colors.cardMuted }]}>{suitability(exercise).label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picture: { alignItems: 'center', justifyContent: 'center' },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 6,
    ...shadow,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, minHeight: 38 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
