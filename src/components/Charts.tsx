import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';

import type { DayTotal } from '@/db/database';
import { colors, type } from '@/lib/theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Last 7 days of calories as bars that grow in, with the daily target as a dashed line. */
export function WeekBars({ week, target, width }: { week: DayTotal[]; target: number; width: number }) {
  const [grow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [grow, week]);
  const height = 120;
  const max = Math.max(target * 1.3, ...week.map((d) => d.kcal));
  const slot = width / week.length;
  const barW = Math.min(26, slot * 0.55);
  const y = (kcal: number) => height - (kcal / max) * height;

  return (
    <View>
      <View style={{ width, height }}>
        <Animated.View style={{ transformOrigin: 'bottom', transform: [{ scaleY: grow }] }}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="ok" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#3FA36C" />
                <Stop offset="1" stopColor={colors.primary} />
              </LinearGradient>
              <LinearGradient id="over" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} />
                <Stop offset="1" stopColor={colors.danger} />
              </LinearGradient>
            </Defs>
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
                  fill={d.items === 0 ? colors.cardMuted : over ? 'url(#over)' : 'url(#ok)'}
                />
              );
            })}
          </Svg>
        </Animated.View>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="5 5" />
        </Svg>
      </View>
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

/** A measurement over time as a line, with an optional target as a dashed line. */
export function TrendChart({
  points,
  target,
  width,
  color = colors.primary,
  emptyText = 'Log your weight on a few days to see your trend here.',
}: {
  points: { date: string; value: number }[];
  target: number | null;
  width: number;
  color?: string;
  emptyText?: string;
}) {
  const height = 120;
  const pad = 10;
  if (points.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={[type.caption, { textAlign: 'center' }]}>{emptyText}</Text>
      </View>
    );
  }
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, target ?? Infinity) - 1;
  const hi = Math.max(...values, target ?? -Infinity) + 1;
  const t0 = Date.parse(points[0].date);
  const span = Math.max(1, Date.parse(points[points.length - 1].date) - t0);
  const px = (date: string) => pad + ((Date.parse(date) - t0) / span) * (width - pad * 2);
  const py = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2);
  const line = points.map((p) => `${px(p.date)},${py(p.value)}`).join(' ');
  const area = `M${px(points[0].date)},${height} L${points.map((p) => `${px(p.date)},${py(p.value)}`).join(' L')} L${px(points[points.length - 1].date)},${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#area)" />
      {target != null && (
        <Line x1={0} x2={width} y1={py(target)} y2={py(target)} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="5 5" />
      )}
      <Polyline points={line} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <Circle key={p.date} cx={px(p.date)} cy={py(p.value)} r={3} fill={colors.white} stroke={color} strokeWidth={2} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: 6 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardMuted, borderRadius: 12, padding: 16 },
});
