import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import type { DayTotal, WeightEntry } from '@/db/database';
import { colors, type } from '@/lib/theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Last 7 days of calories as bars, with the daily target as a dashed line. */
export function WeekBars({ week, target, width }: { week: DayTotal[]; target: number; width: number }) {
  const height = 120;
  const max = Math.max(target * 1.3, ...week.map((d) => d.kcal));
  const slot = width / week.length;
  const barW = Math.min(26, slot * 0.55);
  const y = (kcal: number) => height - (kcal / max) * height;

  return (
    <View>
      <Svg width={width} height={height}>
        {week.map((d, i) => {
          const h = (d.kcal / max) * height;
          const over = d.kcal > target * 1.1;
          return (
            <Rect
              key={d.date}
              x={i * slot + (slot - barW) / 2}
              y={height - Math.max(h, d.items ? 3 : 0)}
              width={barW}
              height={Math.max(h, d.items ? 3 : 0)}
              rx={6}
              fill={d.items === 0 ? colors.cardMuted : over ? colors.danger : colors.primary}
            />
          );
        })}
        <Line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="5 5" />
      </Svg>
      <View style={styles.labels}>
        {week.map((d) => {
          const [yy, mm, dd] = d.date.split('-').map(Number);
          return (
            <Text key={d.date} style={[type.caption, { width: slot, textAlign: 'center' }]}>
              {DAY_LETTERS[new Date(yy, mm - 1, dd).getDay()]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/** Weight over time as a line, with the target weight as a dashed line. */
export function WeightChart({ weights, target, width }: { weights: WeightEntry[]; target: number | null; width: number }) {
  const height = 110;
  const pad = 8;
  if (weights.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={type.caption}>Log your weight on a few days to see your trend here.</Text>
      </View>
    );
  }
  const values = weights.map((w) => w.kg);
  const lo = Math.min(...values, target ?? Infinity) - 1;
  const hi = Math.max(...values, target ?? -Infinity) + 1;
  const t0 = Date.parse(weights[0].date);
  const span = Math.max(1, Date.parse(weights[weights.length - 1].date) - t0);
  const px = (date: string) => pad + ((Date.parse(date) - t0) / span) * (width - pad * 2);
  const py = (kg: number) => pad + (1 - (kg - lo) / (hi - lo)) * (height - pad * 2);
  const points = weights.map((w) => `${px(w.date)},${py(w.kg)}`).join(' ');
  const last = weights[weights.length - 1];

  return (
    <Svg width={width} height={height}>
      {target != null && (
        <Line x1={0} x2={width} y1={py(target)} y2={py(target)} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="5 5" />
      )}
      <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={px(last.date)} cy={py(last.kg)} r={5} fill={colors.primary} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: 6 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardMuted, borderRadius: 12, padding: 16 },
});
