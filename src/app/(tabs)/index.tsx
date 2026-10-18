import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/CalorieRing';
import { GoalStatusCard } from '@/components/GoalStatusCard';
import { GradientCard } from '@/components/GradientCard';
import { MacroBar } from '@/components/MacroBar';
import { FadeIn, Sparkles } from '@/components/Motion';
import { Banner, Button, Card } from '@/components/ui';
import {
  deleteEntry,
  deleteWorkout,
  getEntriesForDate,
  getProfile,
  getWorkoutsForDate,
  hasProfile,
  type Entry,
  type WorkoutLog,
} from '@/db/database';
import { foodEmoji } from '@/lib/foodEmoji';
import { autoSyncIfDue } from '@/lib/healthSync';
import { analyseHistory, type GoalStatus } from '@/lib/history';
import { afterFoodChanged, refreshReminders } from '@/lib/notifications';
import {
  calculateTarget,
  formatDateKey,
  macroTargets,
  MEALS,
  shiftDateKey,
  toDateKey,
  type Meal,
  type MacroTargets,
  type Profile,
} from '@/lib/nutrition';
import { colors, radius, shadow, space, type } from '@/lib/theme';

const MEAL_STYLE: Record<Meal, { emoji: string; bg: string }> = {
  breakfast: { emoji: '☀️', bg: '#FFF1D6' },
  lunch: { emoji: '🍛', bg: '#FCEBDD' },
  snacks: { emoji: '☕', bg: '#EFE6DA' },
  dinner: { emoji: '🌙', bg: '#E6E9F5' },
};

const LOGO = require('../../../assets/icon.png');

// Show the welcome setup once per app launch until a profile exists.
let welcomeShown = false;

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const db = useSQLiteContext();
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [target, setTarget] = useState(2000);
  const [macros, setMacros] = useState<MacroTargets>({
    protein: 80,
    carbs: 250,
    fat: 55,
  });
  const [profileSet, setProfileSet] = useState(true);
  const [streak, setStreak] = useState(0);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [status, setStatus] = useState<GoalStatus | null>(null);
  const [plan, setPlan] = useState<Profile['goalPlan']>('maintain');
  const [burnGoal, setBurnGoal] = useState(250);

  const load = useCallback(async () => {
    const [rows, profile, exists, done] = await Promise.all([
      getEntriesForDate(db, date),
      getProfile(db),
      hasProfile(db),
      getWorkoutsForDate(db, date),
    ]);
    setWorkouts(done);
    const t = calculateTarget(profile);
    setEntries(rows);
    setTarget(t);
    setMacros(macroTargets(profile, t));
    setProfileSet(exists);
    const history = await analyseHistory(db, profile);
    setStreak(history.streak);
    setStatus(history.status);
    setPlan(profile.goalPlan);
    setBurnGoal(history.burnTarget);
    if (!exists && !welcomeShown) {
      welcomeShown = true;
      router.push('/welcome');
    }
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      load();
      void refreshReminders(db);
      // Picks up a new InBody scan from Apple Health, then refreshes the target.
      autoSyncIfDue(db).then((changed) => {
        if (changed) load();
      });
    }, [db, load]),
  );

  const totals = entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const isToday = date === toDateKey(new Date());
  const over = totals.kcal > target;
  const burned = workouts.reduce((s, w) => s + w.kcal, 0);

  const confirmDelete = (entry: Entry) => {
    Alert.alert('Remove item?', `${entry.name} · ${Math.round(entry.kcal)} kcal`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, entry.id);
          load();
          void afterFoodChanged(db);
        },
      },
    ]);
  };

  const openAdd = (meal?: Meal) => router.push({ pathname: '/add', params: meal ? { date, meal } : { date } });
  const openScan = () => router.push({ pathname: '/scan', params: { date } });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} />
            <View>
              <Text style={type.label}>{isToday ? greeting() : 'Looking back'}</Text>
              <Text style={type.title}>{formatDateKey(date)}</Text>
            </View>
          </View>
          <View style={styles.dateNav}>
            <Pressable hitSlop={10} style={styles.navButton} onPress={() => setDate((d) => shiftDateKey(d, -1))}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              hitSlop={10}
              style={[styles.navButton, isToday && { opacity: 0.3 }]}
              disabled={isToday}
              onPress={() => setDate((d) => shiftDateKey(d, 1))}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {!profileSet && (
          <Pressable onPress={() => router.navigate('/body')}>
            <Banner text="Add your body details for a personal calorie target →" />
          </Pressable>
        )}

        <FadeIn>
          <GradientCard from={over ? '#F08A4B' : '#2FA36B'} to={over ? '#C2410C' : '#11553A'} style={styles.ringCard}>
            <Sparkles color="rgba(255,255,255,0.9)" count={4} />
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>{over ? 'Over target' : 'Calories'}</Text>
              {streak >= 2 && (
                <View style={styles.streak}>
                  <Text style={styles.streakText}>🔥 {streak}-day streak</Text>
                </View>
              )}
            </View>
            <CalorieRing eaten={totals.kcal} target={target} light />
            <View style={styles.ringStats}>
              <RingStat label="Eaten" value={totals.kcal} />
              <View style={styles.divider} />
              <RingStat label="Target" value={target} />
              <View style={styles.divider} />
              <RingStat label="🔥 Burned" value={burned} />
            </View>
            <View style={styles.macros}>
              <MacroBar label="Protein" value={totals.protein} target={macros.protein} color="#A9CCFF" light />
              <MacroBar label="Carbs" value={totals.carbs} target={macros.carbs} color="#FFD27A" light />
              <MacroBar label="Fat" value={totals.fat} target={macros.fat} color="#F7B2D6" light />
            </View>
            <View style={styles.burnRow}>
              <MacroBar label="Exercise burn" value={burned} target={burnGoal} color="#FFC08A" light unit="kcal" />
            </View>
          </GradientCard>
        </FadeIn>

        <StatusBanner eaten={totals.kcal} target={target} isToday={isToday} />

        {isToday && status && (
          <FadeIn index={1}>
            <GoalStatusCard status={status} plan={plan} link />
            <Pressable style={styles.reportLink} onPress={() => router.push('/report')}>
              <Ionicons name="stats-chart" size={18} color={colors.primary} />
              <Text style={[styles.addText, { flex: 1 }]}>See your weekly coach report</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          </FadeIn>
        )}

        {MEALS.map((meal, mealIndex) => {
          const items = entries.filter((e) => e.meal === meal.value);
          const mealKcal = items.reduce((s, e) => s + e.kcal, 0);
          return (
            <FadeIn key={meal.value} index={mealIndex + 1}>
              <Card style={{ gap: space.sm }}>
                <View style={styles.mealHeader}>
                  <View style={[styles.mealEmoji, { backgroundColor: MEAL_STYLE[meal.value].bg }]}>
                    <Text style={{ fontSize: 20 }}>{MEAL_STYLE[meal.value].emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.heading}>{meal.label}</Text>
                    <Text style={type.caption}>{items.length ? `${items.length} item${items.length > 1 ? 's' : ''}` : 'Nothing yet'}</Text>
                  </View>
                  {mealKcal > 0 && (
                    <View style={styles.kcalPill}>
                      <Text style={[styles.kcalPillText, type.number]}>{Math.round(mealKcal)} kcal</Text>
                    </View>
                  )}
                </View>
                {items.map((e) => (
                  <Pressable key={e.id} style={styles.entryRow} onLongPress={() => confirmDelete(e)}>
                    <View style={styles.foodEmoji}>
                      <Text style={{ fontSize: 17 }}>{foodEmoji(e.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={type.body}>{e.name}</Text>
                      <Text style={type.caption}>
                        {formatQuantity(e.quantity)} × {e.serving}
                      </Text>
                    </View>
                    <Text style={[styles.entryKcal, type.number]}>
                      {Math.round(e.kcal)}
                      <Text style={styles.entryUnit}> kcal</Text>
                    </Text>
                    <Pressable hitSlop={10} onPress={() => confirmDelete(e)}>
                      <Ionicons name="close" size={18} color={colors.faint} />
                    </Pressable>
                  </Pressable>
                ))}
                <Pressable style={styles.addRow} onPress={() => openAdd(meal.value)}>
                  <Ionicons name="add-circle" size={20} color={colors.primary} />
                  <Text style={styles.addText}>Add food</Text>
                </Pressable>
              </Card>
            </FadeIn>
          );
        })}

        <FadeIn index={MEALS.length + 1}>
          <Card style={{ gap: space.sm }}>
            <View style={styles.mealHeader}>
              <View style={[styles.mealEmoji, { backgroundColor: colors.accentSoft }]}>
                <Text style={{ fontSize: 20 }}>🏃</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.heading}>Exercise</Text>
                <Text style={type.caption}>{workouts.length ? `${workouts.length} logged` : 'Nothing yet'}</Text>
              </View>
              {burned > 0 && (
                <View style={[styles.kcalPill, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.kcalPillText, type.number, { color: colors.accent }]}>−{Math.round(burned)} kcal</Text>
                </View>
              )}
            </View>
            {workouts.map((w) => (
              <View key={w.id} style={styles.entryRow}>
                <View style={[styles.foodEmoji, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="flame" size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{w.title}</Text>
                  <Text style={type.caption}>
                    {w.sets && w.reps
                      ? `${w.sets} × ${w.reps}${w.weightKg ? ` @ ${w.weightKg} kg` : ''}`
                      : `${Math.max(1, Math.round(w.seconds / 60))} min`}
                  </Text>
                </View>
                <Text style={[styles.entryKcal, type.number]}>
                  {Math.round(w.kcal)}
                  <Text style={styles.entryUnit}> kcal</Text>
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Remove exercise?', `${w.title} · ${Math.round(w.kcal)} kcal`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          await deleteWorkout(db, w.id);
                          load();
                        },
                      },
                    ])
                  }>
                  <Ionicons name="close" size={18} color={colors.faint} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addRow} onPress={() => router.push({ pathname: '/log-exercise', params: { date } })}>
              <Ionicons name="add-circle" size={20} color={colors.accent} />
              <Text style={[styles.addText, { color: colors.accent }]}>Log exercise</Text>
            </Pressable>
          </Card>
        </FadeIn>
      </ScrollView>

      <View style={styles.actionBar}>
        <Button label="Scan food" icon="camera" onPress={openScan} style={{ flex: 1.3 }} />
        <Button label="Search" icon="search" variant="secondary" onPress={() => openAdd()} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

function RingStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.ringStatValue}>{Math.round(value).toLocaleString('en-IN')}</Text>
      <Text style={styles.ringStatLabel}>{label}</Text>
    </View>
  );
}

function StatusBanner({ eaten, target, isToday }: { eaten: number; target: number; isToday: boolean }) {
  if (eaten > target * 1.1) {
    return <Banner tone="danger" text={`${Math.round(eaten - target)} kcal over your target today.`} />;
  }
  if (eaten > target) return <Banner tone="warning" text="You've reached your target for today." />;
  if (isToday && new Date().getHours() >= 20 && eaten < target * 0.6) {
    return (
      <Banner
        tone="warning"
        text={`Only ${Math.round((eaten / target) * 100)}% of your target so far — eating too little slows progress too.`}
      />
    );
  }
  return null;
}

function formatQuantity(q: number) {
  return Number.isInteger(q) ? String(q) : q.toFixed(1).replace(/\.0$/, '');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: 120, gap: space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  dateNav: { flexDirection: 'row', gap: space.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 44, height: 44, borderRadius: 12 },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  ringCard: { alignItems: 'center', paddingVertical: space.xl, gap: space.lg },
  heroTop: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between', marginBottom: -space.sm },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  streak: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  ringStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  foodEmoji: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
  entryUnit: { fontSize: 12, fontWeight: '500', color: colors.muted },
  ringStats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ringStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  burnRow: { flexDirection: 'row', alignSelf: 'stretch' },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.xs },
  macros: { flexDirection: 'row', gap: space.lg, alignSelf: 'stretch' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mealEmoji: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcalPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kcalPillText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingLeft: 8,
  },
  entryKcal: { fontSize: 15, fontWeight: '600', color: colors.text },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  addText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  actionBar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...shadow,
    shadowOpacity: 0.12,
  },
});
