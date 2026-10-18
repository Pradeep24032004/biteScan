import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { radius, shadow } from '@/lib/theme';

/** Card with a diagonal colour gradient and soft see-through bubbles in the corners. */
export function GradientCard({
  from,
  to,
  children,
  style,
}: {
  from: string;
  to: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, { shadowColor: to }, style]}>
      <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
          <Circle cx="92%" cy="6%" r="90" fill="#FFFFFF" fillOpacity={0.08} />
          <Circle cx="4%" cy="96%" r="70" fill="#FFFFFF" fillOpacity={0.07} />
          <Circle cx="80%" cy="88%" r="26" fill="#FFFFFF" fillOpacity={0.06} />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg + 4, padding: 20, ...shadow, shadowOpacity: 0.3, shadowRadius: 18 },
  clip: { borderRadius: radius.lg + 4, overflow: 'hidden' },
});
