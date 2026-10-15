import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#F6F4EF',
  card: '#FFFFFF',
  cardMuted: '#F0EDE6',
  text: '#1B1D1A',
  muted: '#6E7268',
  faint: '#A3A69E',
  border: '#E6E2D9',
  primary: '#1F6F4A',
  primarySoft: '#E2EFE7',
  accent: '#E8833A',
  accentSoft: '#FCEBDD',
  warning: '#B7791F',
  danger: '#C2410C',
  dangerSoft: '#FDE8DE',
  protein: '#3E6FB0',
  carbs: '#D9962B',
  fat: '#A3487A',
  white: '#FFFFFF',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const type = {
  hero: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, color: colors.text },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
  heading: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  label: { fontSize: 13, fontWeight: '500', color: colors.muted },
  caption: { fontSize: 12, color: colors.muted },
  number: { fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const shadow: ViewStyle = {
  shadowColor: '#2B2A24',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  // Android ignores the shadow* props and uses elevation instead.
  elevation: 2,
};
