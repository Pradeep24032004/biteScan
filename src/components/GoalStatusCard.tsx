import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GoalStatus } from '@/lib/history';
import { GOAL_PLANS, type GoalPlan } from '@/lib/nutrition';
import { colors, radius, shadow, space, type } from '@/lib/theme';

const VERDICT = {
  towards: { emoji: '✅', title: 'Moving towards your goal', bg: colors.primarySoft, fg: colors.primary },
  away: { emoji: '⚠️', title: 'Drifting away from your goal', bg: colors.accentSoft, fg: colors.warning },
  starting: { emoji: '🚀', title: 'Getting started', bg: '#E8EEF8', fg: colors.protein },
} as const;

/** "Towards / away from your goal" verdict for the last 7 days, with the checks behind it. */
export function GoalStatusCard({ status, plan, link }: { status: GoalStatus; plan: GoalPlan; link?: boolean }) {
  const v = VERDICT[status.verdict];
  const goal = GOAL_PLANS.find((g) => g.value === plan);
  return (
    <Pressable
      disabled={!link}
      onPress={() => router.navigate('/goals')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={[styles.head, { backgroundColor: v.bg }]}>
        <Text style={{ fontSize: 26 }}>{v.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: v.fg }]}>{v.title}</Text>
          <Text style={type.caption}>
            {goal?.emoji} {goal?.label} · last 7 days
          </Text>
        </View>
        {link && <Ionicons name="chevron-forward" size={18} color={v.fg} />}
      </View>
      <View style={styles.checks}>
        {status.checks.map((c) => (
          <View key={c.label} style={styles.check}>
            <Ionicons name={c.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={c.ok ? colors.primary : colors.accent} />
            <Text style={[type.body, { fontWeight: '600', width: 72 }]}>{c.label}</Text>
            <Text style={[type.label, { flex: 1 }]}>{c.detail}</Text>
          </View>
        ))}
        {status.verdict === 'starting' && (
          <Text style={type.caption}>Log your food and exercise for a few days and weigh in weekly — your progress will show here.</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  title: { fontSize: 16, fontWeight: '800' },
  checks: { padding: space.md, gap: space.sm },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
