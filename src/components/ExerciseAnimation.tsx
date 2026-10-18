import { useEffect, useState } from 'react';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { moveFor, shapesAt, type Shape } from '@/data/exerciseMoves';
import { colors } from '@/lib/theme';

/**
 * Looping figure demo of how an exercise is done. When not playing it shows the move's key pose.
 * Renders nothing if the exercise has no animation. Small copies can use a lower `fps` to save battery.
 * `showReps` counts each completed loop, so people can follow along rep by rep.
 */
export function ExerciseAnimation({
  exerciseId,
  size,
  color,
  playing = true,
  fps = 30,
  propColor = colors.muted,
  showReps = false,
}: {
  exerciseId: string;
  size: number;
  color: string;
  playing?: boolean;
  fps?: number;
  /** Colour of the floor and equipment. */
  propColor?: string;
  showReps?: boolean;
}) {
  const move = moveFor(exerciseId);
  // Loops completed so far (the fraction is the position in the current loop).
  const [cycles, setCycles] = useState(() => (move ? 1 / move.frames.length : 0));

  useEffect(() => {
    if (!move || !playing) return;
    const start = Date.now() - cycles * move.seconds * 1000;
    const timer = setInterval(() => setCycles((Date.now() - start) / 1000 / move.seconds), 1000 / fps);
    return () => clearInterval(timer);
    // Restarting only when the move or play state changes; progress is read once to resume smoothly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move, playing, fps]);

  if (!move) return null;
  const tint = { figure: 'url(#body)', far: color, trail: color, prop: propColor, soft: '#CFE3F7', eye: colors.white } as const;
  const reps = Math.floor(cycles);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Exercise demonstration">
      <Defs>
        {/* Head-to-toe shading so the figure looks rounded rather than flat. */}
        <LinearGradient id="body" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="92">
          <Stop offset="0" stopColor={color} stopOpacity={0.82} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      {shapesAt(move, cycles % 1).map((s: Shape, i) => {
        if (s.t === 'line') {
          return (
            <Line
              key={i}
              x1={s.a[0]}
              y1={s.a[1]}
              x2={s.b[0]}
              y2={s.b[1]}
              stroke={tint[s.role]}
              strokeOpacity={s.role === 'far' ? 0.42 : s.role === 'trail' ? 0.12 : 1}
              strokeWidth={s.w}
              strokeLinecap="round"
            />
          );
        }
        if (s.t === 'ellipse') {
          return <Ellipse key={i} cx={s.c[0]} cy={s.c[1]} rx={s.rx} ry={s.ry} fill={color} fillOpacity={0.16} />;
        }
        if (s.t === 'circle') {
          return s.fill ? (
            <Circle
              key={i}
              cx={s.c[0]}
              cy={s.c[1]}
              r={s.r}
              fill={tint[s.role]}
              fillOpacity={s.role === 'soft' ? 0.6 : s.role === 'far' ? 0.42 : 1}
            />
          ) : (
            <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.r} fill="none" stroke={tint[s.role]} strokeWidth={2} />
          );
        }
        return s.fill ? (
          <Path key={i} d={s.d} fill={tint[s.role]} fillOpacity={0.6} />
        ) : (
          <Path key={i} d={s.d} fill="none" stroke={tint[s.role]} strokeWidth={s.w} />
        );
      })}
      {showReps && playing && reps > 0 && (
        <SvgText x={96} y={12} fontSize={9} fontWeight="800" fill={color} textAnchor="end">
          {`×${reps}`}
        </SvgText>
      )}
    </Svg>
  );
}
