import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WeekBars, WeightChart } from '@/components/Charts';
import { ExercisePicture } from '@/components/ExerciseTile';
import { Banner, Button, Card, ChipRow, SectionTitle, StatTile } from '@/components/ui';
import { getProfile, logWeight, saveProfile } from '@/db/database';
import { ageBand, recommendExercises } from '@/data/exercises';
import { analyseHistory, type History } from '@/lib/history';
import {
  calculateTarget,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  toDateKey,
  weeklyChangeKg,
  weeksToGoal,
  type Goal,
  type NotificationPrefs,
  type Pace,
  type Profile,
} from '@/lib/nutrition';
import { notificationsAllowed, refreshReminders, requestNotificationPermission } from '@/lib/notifications';
import { colors, radius, space, type } from '@/lib/theme';

export default function GoalsScreen() {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const chartWidth = width - space.lg * 4;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [allowed, setAllowed] = useState(false);

  const load = useCallback(async () => {
    const p = await getProfile(db);
    setProfile(p);
    setHistory(await analyseHistory(db, p));
    setAllowed(await notificationsAllowed().catch(() => false));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile || !history) return null;

  const save = async (next: Profile) => {
    await saveProfile(db, next);
    await load();
    void refreshReminders(db);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 2, marginBottom: space.xs }}>
            <Text style={type.title}>Your goal</Text>
            <Text style={type.label}>What do you want to become?</Text>
          </View>

          <GoalCard key={JSON.stringify([profile.goal, profile.pace, profile.targetWeightKg, profile.targetBodyFatPct])} profile={profile} onSave={save} />

          <ProgressCard profile={profile} history={history} chartWidth={chartWidth} onLogWeight={async (kg) => {
            await logWeight(db, toDateKey(new Date()), kg);
            await save({ ...profile, weightKg: kg });
          }} />

          <Card>
            <SectionTitle title="Last 7 days" />
            <WeekBars week={history.week} target={history.target} width={chartWidth} />
            <View style={styles.statsRow}>
              <StatTile label="Logged" value={`${history.daysLogged}/7`} note="days" />
              <StatTile label="On target" value={`${history.daysOnTarget}`} note="days" color={colors.primary} />
              <StatTile label="Streak" value={`${history.streak}`} note={history.streak === 1 ? 'day' : 'days'} color={colors.accent} />
            </View>
            {history.insights.map((i) => (
              <Banner
                key={i.title}
                tone={i.tone === 'warning' ? 'warning' : 'info'}
                icon={i.tone === 'good' ? 'trophy' : i.tone === 'warning' ? 'trending-up' : 'information-circle'}
                text={`${i.title}. ${i.body}`}
              />
            ))}
            {history.insights.length === 0 && (
              <Text style={type.caption}>Keep logging — tips about your progress will show up here.</Text>
            )}
          </Card>

          <NotificationsCard
            prefs={profile.notifications}
            allowed={allowed}
            onEnable={async () => {
              const ok = await requestNotificationPermission();
              setAllowed(ok);
              if (ok) void refreshReminders(db);
              else Alert.alert('Notifications are off', 'Turn them on in Settings → BiteScan → Notifications.');
            }}
            onChange={(notifications) => save({ ...profile, notifications })}
          />

          <WorkoutTeaser profile={profile} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GoalCard({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => Promise<void> }) {
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [pace, setPace] = useState<Pace>(profile.pace);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeightKg != null ? String(profile.targetWeightKg) : '');
  const [targetFat, setTargetFat] = useState(profile.targetBodyFatPct != null ? String(profile.targetBodyFatPct) : '');
  const [now] = useState(() => Date.now());

  const draft: Profile = {
    ...profile,
    goal,
    pace,
    targetWeightKg: Number(targetWeight) > 0 ? Number(targetWeight) : null,
    targetBodyFatPct: Number(targetFat) > 0 ? Number(targetFat) : null,
  };
  const kcal = calculateTarget(draft);
  const perWeek = weeklyChangeKg(draft);
  const weeks = weeksToGoal(draft);
  const eta = weeks != null ? new Date(now + weeks * 7 * 86_400_000) : null;
  const wrongWay =
    draft.targetWeightKg != null &&
    ((goal === 'lose' && draft.targetWeightKg >= profile.weightKg) || (goal === 'gain' && draft.targetWeightKg <= profile.weightKg));
  const dirty =
    goal !== profile.goal ||
    pace !== profile.pace ||
    draft.targetWeightKg !== profile.targetWeightKg ||
    draft.targetBodyFatPct !== profile.targetBodyFatPct;

  const save = () => {
    const restart = goal !== profile.goal || draft.targetWeightKg !== profile.targetWeightKg;
    onSave({
      ...draft,
      goalStartWeightKg: restart || profile.goalStartWeightKg == null ? profile.weightKg : profile.goalStartWeightKg,
      goalStartedAt: restart || profile.goalStartedAt == null ? new Date().toISOString() : profile.goalStartedAt,
    });
  };

  return (
    <Card>
      <ChipRow options={GOAL_OPTIONS} value={goal} onChange={setGoal} />
      <Text style={type.caption}>{GOAL_OPTIONS.find((g) => g.value === goal)?.description}</Text>

      {goal !== 'maintain' && (
        <>
          <View style={styles.fieldRow}>
            <Field label="Target weight (kg)" value={targetWeight} onChange={setTargetWeight} placeholder={String(Math.round(profile.weightKg + (goal === 'lose' ? -5 : 3)))} />
            <Field label="Body fat % goal" value={targetFat} onChange={setTargetFat} placeholder="optional" />
          </View>
          <Text style={type.label}>Pace</Text>
          <ChipRow
            options={PACE_OPTIONS.map((o) => ({
              value: o.value,
              label: `${o.label} · ${Math.abs(weeklyChangeKg({ goal, pace: o.value }))} kg/wk`,
            }))}
            value={pace}
            onChange={setPace}
          />
        </>
      )}

      <View style={styles.summary}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryValue}>{kcal.toLocaleString('en-IN')}</Text>
          <Text style={type.caption}>kcal a day</Text>
        </View>
        {goal !== 'maintain' && (
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryValue}>
              {perWeek > 0 ? '+' : ''}
              {perWeek}
            </Text>
            <Text style={type.caption}>kg a week</Text>
          </View>
        )}
        {eta && (
          <View style={{ flex: 1.2 }}>
            <Text style={styles.summaryValue}>{eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
            <Text style={type.caption}>reach target (~{weeks} wk)</Text>
          </View>
        )}
      </View>
      {wrongWay && <Banner tone="warning" text={`That target is the wrong way for "${GOAL_OPTIONS.find((g) => g.value === goal)?.label}".`} />}
      <Button label="Save goal" icon="flag" onPress={save} disabled={!dirty || wrongWay} />
    </Card>
  );
}

function ProgressCard({
  profile,
  history,
  chartWidth,
  onLogWeight,
}: {
  profile: Profile;
  history: History;
  chartWidth: number;
  onLogWeight: (kg: number) => Promise<void>;
}) {
  const [weight, setWeight] = useState('');
  const start = profile.goalStartWeightKg ?? profile.weightKg;
  const target = profile.targetWeightKg;
  const progress = useMemo(() => {
    if (target == null || start === target) return null;
    return Math.max(0, Math.min(1, (start - profile.weightKg) / (start - target)));
  }, [start, target, profile.weightKg]);

  return (
    <Card>
      <SectionTitle title="Progress" />
      <View style={styles.statsRow}>
        <StatTile label="Start" value={`${start}`} unit="kg" />
        <StatTile label="Now" value={`${profile.weightKg}`} unit="kg" color={colors.primary} />
        <StatTile label="Target" value={target != null ? `${target}` : '—'} unit={target != null ? 'kg' : undefined} color={colors.accent} />
      </View>
      {progress != null && (
        <View style={{ gap: 6 }}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={type.caption}>{Math.round(progress * 100)}% of the way there</Text>
        </View>
      )}
      <WeightChart weights={history.weights} target={target} width={chartWidth} />
      {history.weightTrendKgPerWeek != null && (
        <Text style={type.caption}>
          Trend: {history.weightTrendKgPerWeek > 0 ? '+' : ''}
          {history.weightTrendKgPerWeek} kg / week
        </Text>
      )}
      <View style={styles.logRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="Today's weight (kg)"
          placeholderTextColor={colors.faint}
        />
        <Button
          label="Log"
          icon="add"
          onPress={async () => {
            const kg = Number(weight);
            if (!(kg >= 20 && kg <= 300)) {
              Alert.alert('Check weight', 'Enter your weight in kg.');
              return;
            }
            await onLogWeight(Math.round(kg * 10) / 10);
            setWeight('');
          }}
        />
      </View>
    </Card>
  );
}

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string; detail: string }[] = [
  { key: 'overTarget', label: 'Over my daily target', detail: 'Right away, once a day' },
  { key: 'eveningSummary', label: 'Evening summary', detail: '9 pm — how the day went' },
  { key: 'mealReminders', label: 'Meal reminders', detail: "If lunch or dinner isn't logged" },
  { key: 'goalCheck', label: 'Goal check-ins', detail: 'When recent days drift from your goal, or you hit a streak' },
];

function NotificationsCard({
  prefs,
  allowed,
  onEnable,
  onChange,
}: {
  prefs: NotificationPrefs;
  allowed: boolean;
  onEnable: () => void;
  onChange: (p: NotificationPrefs) => void;
}) {
  return (
    <Card>
      <SectionTitle title="Notifications" />
      {!allowed ? (
        <>
          <Text style={type.label}>
            Get a nudge when you go over your calories or drift from your goal. Everything stays on your phone.
          </Text>
          <Button label="Turn on notifications" icon="notifications" onPress={onEnable} />
        </>
      ) : (
        NOTIFICATION_ROWS.map((r) => (
          <View key={r.key} style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{r.label}</Text>
              <Text style={type.caption}>{r.detail}</Text>
            </View>
            <Switch value={prefs[r.key]} onValueChange={(v) => onChange({ ...prefs, [r.key]: v })} trackColor={{ true: colors.primary }} />
          </View>
        ))
      )}
    </Card>
  );
}

function WorkoutTeaser({ profile }: { profile: Profile }) {
  const band = ageBand(profile.age);
  const plan = recommendExercises(profile.goal, band, profile.weightKg);
  const minutes = plan.reduce((s, p) => s + p.minutes * p.perWeek, 0);
  return (
    <Card>
      <SectionTitle title="Your workout plan" />
      <Text style={type.label}>
        {plan.length} exercises for {GOAL_OPTIONS.find((g) => g.value === profile.goal)?.label.toLowerCase()} at {band},
        about {minutes} min a week.
      </Text>
      <View style={styles.teaserRow}>
        {plan.slice(0, 5).map((p) => (
          <ExercisePicture key={p.exercise.id} exercise={p.exercise} size={52} />
        ))}
      </View>
      <Button label="See workouts" icon="barbell" variant="secondary" onPress={() => router.navigate('/workouts')} />
    </Card>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: 48, gap: space.md },
  fieldRow: { flexDirection: 'row', gap: space.sm },
  summary: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', gap: space.md },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.cardMuted, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  logRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  teaserRow: { flexDirection: 'row', gap: space.sm },
  input: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
