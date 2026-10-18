import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Fades and slides its children in when first shown; `index` staggers lists. */
export function FadeIn({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 60,
      useNativeDriver: true,
    }).start();
  }, [progress, index]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that gently shrinks while held. With `ripple`, a drop-like ripple spreads from the finger
 * (pass the same corner radius as the style so it stays inside the shape).
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  ripple,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  ripple?: { color: string; radius: number };
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const [wave] = useState(() => new Animated.Value(0));
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const pressIn = (e: GestureResponderEvent) => {
    to(scaleTo);
    if (ripple) {
      setOrigin({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
      wave.setValue(0);
      Animated.timing(wave, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    to(1);
    onPressOut?.(e);
  };
  return (
    <AnimatedPressable {...rest} onPressIn={pressIn} onPressOut={pressOut} style={[style, { transform: [{ scale }] }]}>
      {children}
      {ripple && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: ripple.radius, overflow: 'hidden' }]}>
          <Animated.View
            style={{
              position: 'absolute',
              left: origin.x - RIPPLE,
              top: origin.y - RIPPLE,
              width: RIPPLE * 2,
              height: RIPPLE * 2,
              borderRadius: RIPPLE,
              backgroundColor: ripple.color,
              opacity: wave.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] }),
              transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }],
            }}
          />
        </View>
      )}
    </AnimatedPressable>
  );
}

const RIPPLE = 220;

/** Soft rings that keep spreading out from the centre and fading, like a signal or a drop in water. */
export function Pulse({
  color,
  size,
  rings = 3,
  duration = 2400,
  strength = 1,
}: {
  color: string;
  size: number;
  rings?: number;
  duration?: number;
  /** 0–1: how visible the rings are. */
  strength?: number;
}) {
  const [waves] = useState(() => Array.from({ length: rings }, () => new Animated.Value(0)));
  useEffect(() => {
    // Each ring snaps back to the start itself; offsetting the first run staggers the rings.
    const loops = waves.map((wave, i) =>
      Animated.sequence([
        Animated.delay((duration / rings) * i),
        Animated.loop(
          Animated.sequence([
            Animated.timing(wave, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(wave, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        ),
      ])
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [waves, duration, rings]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {waves.map((wave, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: color,
            backgroundColor: `${color}40`,
            opacity: wave.interpolate({ inputRange: [0, 0.08, 0.6, 1], outputRange: [0, 0.5 * strength, 0.22 * strength, 0] }),
            transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.75] }) }],
          }}
        />
      ))}
    </View>
  );
}

const SPARKS = [
  { x: 0.06, y: 0.18, s: 20 },
  { x: 0.84, y: 0.08, s: 14 },
  { x: 0.9, y: 0.66, s: 22 },
  { x: 0.04, y: 0.92, s: 13 },
  { x: 0.52, y: 0.02, s: 11 },
  { x: 0.68, y: 0.86, s: 16 },
];

/** Little stars that twinkle in and out over a card or picture. */
export function Sparkles({ color = '#FFFFFF', count = 6 }: { color?: string; count?: number }) {
  const [twinkles] = useState(() => SPARKS.slice(0, count).map(() => new Animated.Value(0)));
  useEffect(() => {
    const loops = twinkles.map((t, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 380),
          Animated.timing(t, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(1200),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [twinkles]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {twinkles.map((t, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: `${SPARKS[i].x * 100}%`,
            top: `${SPARKS[i].y * 100}%`,
            fontSize: SPARKS[i].s,
            color,
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: '15deg' }],
          }}>
          ✦
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

const CONFETTI_COLORS = ['#E8833A', '#1F6F4A', '#3E6FB0', '#D9962B', '#A3487A', '#3FA36C'];

/** One burst of falling confetti across its parent (use absolutely over a screen). */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      fall: new Animated.Value(0),
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 80,
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
      size: 6 + Math.random() * 6,
      delay: Math.random() * 500,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 3 === 0,
    }))
  );
  useEffect(() => {
    Animated.parallel(
      bits.map((b) =>
        Animated.timing(b.fall, { toValue: 1, duration: 2400, delay: b.delay, easing: Easing.in(Easing.quad), useNativeDriver: true })
      )
    ).start();
  }, [bits]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${b.left}%`,
            width: b.size,
            height: b.round ? b.size : b.size * 1.8,
            borderRadius: b.round ? b.size / 2 : 2,
            backgroundColor: b.color,
            opacity: b.fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: b.fall.interpolate({ inputRange: [0, 1], outputRange: [0, 900] }) },
              { translateX: b.fall.interpolate({ inputRange: [0, 1], outputRange: [0, b.drift] }) },
              { rotate: b.fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** Camera-style corner brackets, with a glowing line sweeping up and down while `scanning`. */
export function ScanFrame({ scanning, color = '#E8833A' }: { scanning: boolean; color?: string }) {
  const [sweep] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!scanning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, sweep]);
  const corner = { position: 'absolute', width: 34, height: 34, borderColor: color } as const;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {scanning && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,85,58,0.18)' }]} />}
      <View style={[corner, { top: 14, left: 14, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 }]} />
      <View style={[corner, { top: 14, right: 14, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 }]} />
      <View style={[corner, { bottom: 14, left: 14, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 }]} />
      <View style={[corner, { bottom: 14, right: 14, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 }]} />
      {scanning && height > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: 0,
            height: 3,
            borderRadius: 2,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.9,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [24, height - 24] }) }],
          }}
        />
      )}
    </View>
  );
}
