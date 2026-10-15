import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = { label: string; value: number; target: number; color: string };

export function MacroBar({ label, value, target, color }: Props) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.value}>
        {Math.round(value)}
        <Text style={styles.target}> / {target}g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.cardMuted, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  value: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  target: { fontWeight: '400', color: colors.muted },
});
