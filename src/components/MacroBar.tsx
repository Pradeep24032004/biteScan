import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = { label: string; value: number; target: number; color: string; light?: boolean; unit?: string };

export function MacroBar({ label, value, target, color, light, unit = 'g' }: Props) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const fill = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(fill, { toValue: ratio, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fill, ratio]);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, light && { color: colors.white }]}>{label}</Text>
      </View>
      <View style={[styles.track, light && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: color, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
      <Text style={[styles.value, light && { color: colors.white }]}>
        {Math.round(value)}
        <Text style={[styles.target, light && { color: 'rgba(255,255,255,0.75)' }]}> / {target}{unit === 'g' ? 'g' : ` ${unit}`}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.cardMuted, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  value: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  target: { fontWeight: '400', color: colors.muted },
});
