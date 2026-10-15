import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/lib/theme';

type Props = { eaten: number; target: number; size?: number; stroke?: number };

/** Ring that fills as calories are eaten; turns orange-red once over target. */
export function CalorieRing({ eaten, target, size = 196, stroke = 16 }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target;
  const left = Math.round(target - eaten);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.cardMuted} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? colors.danger : colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.big, over && { color: colors.danger }]}>{Math.abs(left).toLocaleString('en-IN')}</Text>
        <Text style={styles.small}>{over ? 'kcal over' : 'kcal left'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 38, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  small: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
