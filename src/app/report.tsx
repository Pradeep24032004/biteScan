import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientCard } from '@/components/GradientCard';
import { FadeIn, Sparkles } from '@/components/Motion';
import { ProgressRing } from '@/components/ProgressRing';
import { Card, SectionTitle } from '@/components/ui';
import { getProfile } from '@/db/database';
import { foodEmoji } from '@/lib/foodEmoji';
import { colors, radius, space, type } from '@/lib/theme';
import { weeklyReport, type WeeklyReport } from '@/lib/weeklyReport';

const fmtDate = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-IN'));

/** Weekly coach report, with arrows to look back at earlier weeks. */
export default function ReportScreen() {
  const db = useSQLiteContext();
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    getProfile(db).then((p) => weeklyReport(db, p, weeksAgo)).then(setReport);
  }, [db, weeksAgo]);

  if (!report) return null;
  const r = report;
  const scoreColor = r.score >= 60 ? '#BFF0D4' : '#FFD6B8';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Weekly report' }} />

      <View style={styles.weekNav}>
        <Pressable hitSlop={10} style={styles.navButton} onPress={() => setWeeksAgo(weeksAgo + 1)}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={type.heading}>
          {fmtDate(r.from)} – {fmtDate(r.to)}
        </Text>
        <Pressable
          hitSlop={10}
          disabled={weeksAgo === 0}
          style={[styles.navButton, weeksAgo === 0 && { opacity: 0.3 }]}
          onPress={() => setWeeksAgo(weeksAgo - 1)}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <FadeIn>
        <GradientCard from="#2FA36B" to="#11553A" style={styles.hero}>
          {r.score >= 80 && <Sparkles count={5} />}
          <ProgressRing value={r.score} max={100} size={110} stroke={10} color={scoreColor}>
            <Text style={styles.score}>{r.score}</Text>
            <Text style={styles.scoreLabel}>of 100</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.headline}>{r.headline}</Text>
            <Text style={styles.heroNote}>
              {r.daysLogged} of 7 days logged · {r.workouts} workout{r.workouts === 1 ? '' : 's'}
            </Text>
          </View>
        </GradientCard>
      </FadeIn>

      {r.wins.length > 0 && (
        <FadeIn index={1}>
          <Card>
            <SectionTitle title="What went well" />
            {r.wins.map((w) => (
              <View key={w} style={styles.row}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[type.body, { flex: 1 }]}>{w}</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      )}

      <FadeIn index={2}>
        <Card>
          <SectionTitle title="Your coach says" />
          {r.tips.map((t) => (
            <View key={t.text} style={styles.tip}>
              <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
              <Text style={[type.body, { flex: 1 }]}>{t.text}</Text>
            </View>
          ))}
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <Card>
          <SectionTitle title="The numbers" />
          <Stat
            label="Calories a day"
            value={`${fmt(r.avgKcal)} kcal`}
            note={`target ${fmt(r.target)}`}
            ok={r.avgKcal != null && Math.abs(r.avgKcal - r.target) <= r.target * 0.1}
          />
          {r.weekdayAvg != null && r.weekendAvg != null && (
            <Stat label="Weekdays / weekends" value={`${fmt(r.weekdayAvg)} / ${fmt(r.weekendAvg)}`} note="kcal a day" />
          )}
          <Stat
            label="Protein a day"
            value={`${fmt(r.avgProtein)} g`}
            note={`target ${r.proteinTarget} g`}
            ok={r.avgProtein != null && r.avgProtein >= r.proteinTarget * 0.9}
          />
          <Stat
            label="Exercise burned"
            value={`${fmt(r.burned)} kcal`}
            note={`goal ${fmt(r.burnGoal)}`}
            ok={r.burned >= r.burnGoal * 0.7}
          />
          {r.weightChange != null && <Stat label="Weight" value={`${r.weightChange > 0 ? '+' : ''}${r.weightChange} kg`} note="this week" />}
          {r.fatChange != null && <Stat label="Body fat" value={`${r.fatChange > 0 ? '+' : ''}${r.fatChange}%`} note="this week" ok={r.fatChange <= 0} />}
          {r.muscleChange != null && (
            <Stat label="Muscle" value={`${r.muscleChange > 0 ? '+' : ''}${r.muscleChange} kg`} note="this week" ok={r.muscleChange >= 0} />
          )}
        </Card>
      </FadeIn>

      {r.topFoods.length > 0 && (
        <FadeIn index={4}>
          <Card>
            <SectionTitle title="Biggest calorie sources" />
            {r.topFoods.map((f) => (
              <View key={f.name} style={styles.row}>
                <Text style={{ fontSize: 20 }}>{foodEmoji(f.name)}</Text>
                <Text style={[type.body, { flex: 1 }]}>
                  {f.name} <Text style={type.caption}>×{f.times}</Text>
                </Text>
                <Text style={[type.body, type.number, { fontWeight: '700' }]}>{fmt(Math.round(f.kcal))} kcal</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, note, ok }: { label: string; value: string; note?: string; ok?: boolean }) {
  return (
    <View style={styles.stat}>
      {ok != null && <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={ok ? colors.primary : colors.accent} />}
      <Text style={[type.label, { flex: 1 }]}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.body, type.number, { fontWeight: '700' }]}>{value}</Text>
        {note && <Text style={type.caption}>{note}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  score: { fontSize: 34, fontWeight: '800', color: colors.white, fontVariant: ['tabular-nums'] },
  scoreLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  headline: { fontSize: 20, fontWeight: '800', color: colors.white },
  heroNote: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: space.md },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
