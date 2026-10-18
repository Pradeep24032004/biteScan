import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Pulse } from '@/components/Motion';
import { colors } from '@/lib/theme';

/** `light` draws white on a coloured background (the Today hero card). */
type Props = { eaten: number; target: number; size?: number; stroke?: number; light?: boolean };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Ring that sweeps to the calories eaten; turns orange-red once over target. */
export function CalorieRing({ eaten, target, size = 196, stroke = 16, light }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target;
  const left = Math.round(target - eaten);

  const sweep = useState(() => new Animated.Value(0))[0];
  const [shown, setShown] = useState(left);
  useEffect(() => {
    const id = sweep.addListener(({ value }) => setShown(Math.round(target - value * eaten)));
    sweep.setValue(0);
    Animated.timing(sweep, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => sweep.removeListener(id);
  }, [sweep, eaten, target]);

  const [from, to] = light
    ? over
      ? ['#FFD6B8', '#FF9A6B']
      : ['#FFFFFF', '#BFF0D4']
    : over
      ? [colors.accent, colors.danger]
      : ['#3FA36C', colors.primary];
  const ink = light ? colors.white : over ? colors.danger : colors.text;
  return (
    <View style={{ width: size, height: size }}>
      <Pulse color={light ? colors.white : over ? colors.danger : colors.primary} size={size - stroke} rings={2} duration={4200} strength={0.35} />
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={light ? 'rgba(255,255,255,0.18)' : colors.cardMuted} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={sweep.interpolate({ inputRange: [0, 1], outputRange: [circumference, circumference * (1 - ratio)] })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.big, { color: ink }]}>{Math.abs(shown).toLocaleString('en-IN')}</Text>
        <Text style={[styles.small, light && { color: 'rgba(255,255,255,0.8)' }]}>{shown < 0 ? 'kcal over' : 'kcal left'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 40, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  small: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
