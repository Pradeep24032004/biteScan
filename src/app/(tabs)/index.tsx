import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ComponentProps } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/CalorieRing';
import { MacroBar } from '@/components/MacroBar';
import { Banner, Button, Card, IconBadge } from '@/components/ui';
import { deleteEntry, getEntriesForDate, getProfile, hasProfile, type Entry } from '@/db/database';
import { autoSyncIfDue } from '@/lib/healthSync';
import { analyseHistory, type Insight } from '@/lib/history';
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
} from '@/lib/nutrition';
import { colors, radius, shadow, space, type } from '@/lib/theme';

const MEAL_ICONS: Record<Meal, ComponentProps<typeof Ionicons>['name']> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  snacks: 'cafe-outline',
  dinner: 'moon-outline',
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
  const [macros, setMacros] = useState<MacroTargets>({ protein: 80, carbs: 250, fat: 55 });
  const [profileSet, setProfileSet] = useState(true);
  const [insight, setInsight] = useState<Insight | null>(null);

  const load = useCallback(async () => {
    const [rows, profile, exists] = await Promise.all([getEntriesForDate(db, date), getProfile(db), hasProfile(db)]);
    const t = calculateTarget(profile);
    setEntries(rows);
    setTarget(t);
    setMacros(macroTargets(profile, t));
    setProfileSet(exists);
    const history = await analyseHistory(db, profile);
    // Warnings first, then celebrations, then gentle info.
    const order = { warning: 0, good: 1, info: 2 } as const;
    setInsight([...history.insights].sort((a, b) => order[a.tone] - order[b.tone])[0] ?? null);
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
    }, [db, load])
  );

  const totals = entries.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const isToday = date === toDateKey(new Date());

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

        <Card style={styles.ringCard}>
          <CalorieRing eaten={totals.kcal} target={target} />
          <View style={styles.ringStats}>
            <RingStat label="Eaten" value={totals.kcal} />
            <View style={styles.divider} />
            <RingStat label="Target" value={target} />
          </View>
          <View style={styles.macros}>
            <MacroBar label="Protein" value={totals.protein} target={macros.protein} color={colors.protein} />
            <MacroBar label="Carbs" value={totals.carbs} target={macros.carbs} color={colors.carbs} />
            <MacroBar label="Fat" value={totals.fat} target={macros.fat} color={colors.fat} />
          </View>
        </Card>

        <StatusBanner eaten={totals.kcal} target={target} isToday={isToday} />

        {isToday && insight && (
          <Pressable onPress={() => router.navigate('/goals')}>
            <Card style={styles.insight}>
              <Text style={{ fontSize: 26 }}>{insight.tone === 'good' ? '🏆' : insight.tone === 'warning' ? '📈' : '💡'}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.heading}>{insight.title}</Text>
                <Text style={type.caption}>{insight.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Card>
          </Pressable>
        )}

        {MEALS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal.value);
          const mealKcal = items.reduce((s, e) => s + e.kcal, 0);
          return (
            <Card key={meal.value} style={{ gap: space.sm }}>
              <View style={styles.mealHeader}>
                <IconBadge name={MEAL_ICONS[meal.value]} color={colors.accent} bg={colors.accentSoft} />
                <Text style={[type.heading, { flex: 1 }]}>{meal.label}</Text>
                <Text style={[type.label, type.number]}>{Math.round(mealKcal)} kcal</Text>
              </View>
              {items.map((e) => (
                <Pressable key={e.id} style={styles.entryRow} onLongPress={() => confirmDelete(e)}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{e.name}</Text>
                    <Text style={type.caption}>
                      {formatQuantity(e.quantity)} × {e.serving}
                    </Text>
                  </View>
                  <Text style={[styles.entryKcal, type.number]}>{Math.round(e.kcal)}</Text>
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
          );
        })}
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
      <Text style={type.caption}>{label}</Text>
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
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.xs },
  dateNav: { flexDirection: 'row', gap: space.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 44, height: 44, borderRadius: 12 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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
  ringStats: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center' },
  ringStatValue: { fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },
  macros: { flexDirection: 'row', gap: space.lg, alignSelf: 'stretch' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingLeft: 46,
  },
  entryKcal: { fontSize: 15, fontWeight: '600', color: colors.text },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 46, paddingVertical: 4 },
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
