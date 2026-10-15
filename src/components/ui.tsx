import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadow, space, type } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={type.heading}>{title}</Text>
      {action}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const fg = variant === 'primary' ? colors.white : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={19} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function StatTile({
  label,
  value,
  unit,
  note,
  color = colors.text,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  color?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={type.label}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      {note ? <Text style={type.caption}>{note}</Text> : null}
    </View>
  );
}

export function IconBadge({ name, color = colors.primary, bg = colors.primarySoft }: { name: IconName; color?: string; bg?: string }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: bg }]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

export function Banner({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'warning' | 'danger'; icon?: IconName }) {
  const palette = {
    info: { bg: colors.primarySoft, fg: colors.primary },
    warning: { bg: colors.accentSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      <Ionicons name={icon ?? (tone === 'info' ? 'information-circle' : 'alert-circle')} size={20} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

export function Pill({ label, color = colors.primary, bg = colors.primarySoft }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md, ...shadow },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.cardMuted,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.text },
  chipTextSelected: { color: colors.white },
  statTile: { flex: 1, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 13, fontWeight: '500', color: colors.muted },
  iconBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '500' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
});
