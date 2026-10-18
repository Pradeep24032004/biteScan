import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalStatusCard } from '@/components/GoalStatusCard';
import { GradientCard } from '@/components/GradientCard';
import { TrendChart, WeekBars } from '@/components/Charts';
import { ExercisePicture } from '@/components/ExerciseTile';
import { Banner, Button, Card, Chip, ChipRow, SectionTitle, StatTile } from '@/components/ui';
import { addBodyLog, getBodyLogs, getProfile, saveProfile, type BodyLog } from '@/db/database';
import { ageBand, recommendExercises } from '@/data/exercises';
import { select, success } from '@/lib/haptics';
import { analyseHistory, type History } from '@/lib/history';
import {
  burnTarget,
  calculateTarget,
  currentBodyFat,
  directionOf,
  GOAL_OPTIONS,
  GOAL_PLANS,
  goalWeight,
  macroTargets,
  maintenanceKcal,
  PACE_OPTIONS,
  toDateKey,
  weeklyChangeKg,
  weeksToGoal,
  weightAtBodyFat,
  type GoalPlan,
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
  const [logs, setLogs] = useState<BodyLog[]>([]);

  const load = useCallback(async () => {
    const p = await getProfile(db);
    setProfile(p);
    setHistory(await analyseHistory(db, p));
    setLogs(await getBodyLogs(db));
    setAllowed(await notificationsAllowed().catch(() => false));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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

          <GoalStatusCard status={history.status} plan={profile.goalPlan} />
          <Button label="Weekly coach report" icon="stats-chart" variant="secondary" onPress={() => router.push('/report')} />

          <GoalCard
            key={JSON.stringify([profile.goalPlan, profile.pace, profile.targetWeightKg, profile.targetBodyFatPct, profile.bodyFatPct])}
            profile={profile}
            onSave={save}
          />

          <ProgressCard
            profile={profile}
            history={history}
            logs={logs}
            chartWidth={chartWidth}
            onLogWeight={async (kg) => {
              await addBodyLog(db, { date: toDateKey(new Date()), weightKg: kg, bodyFatPct: null, muscleKg: null, source: 'weight' });
              await save({ ...profile, weightKg: kg });
            }}
          />

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
            {history.insights.length === 0 && <Text style={type.caption}>Keep logging — tips about your progress will show up here.</Text>}
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
  const [plan, setPlan] = useState<GoalPlan>(profile.goalPlan);
  const [pace, setPace] = useState<Pace>(profile.pace);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeightKg != null ? String(profile.targetWeightKg) : '');
  const [targetFat, setTargetFat] = useState(profile.targetBodyFatPct != null ? String(profile.targetBodyFatPct) : '');
  const [now] = useState(() => Date.now());

  const goal = directionOf(plan);
  const draft: Profile = {
    ...profile,
    goal,
    goalPlan: plan,
    pace,
    targetWeightKg: plan !== 'shred' && Number(targetWeight) > 0 ? Number(targetWeight) : null,
    targetBodyFatPct: Number(targetFat) > 0 ? Number(targetFat) : null,
  };
  const kcal = calculateTarget(draft);
  const protein = macroTargets(draft, kcal).protein;
  const maintenance = Math.round(maintenanceKcal(draft));
  const perWeek = weeklyChangeKg(draft);
  const weeks = weeksToGoal(draft);
  const eta = weeks != null ? new Date(now + weeks * 7 * 86_400_000) : null;
  const fatNow = currentBodyFat(profile);
  const measured = profile.bodyFatPct != null;
  const shredWeight = plan === 'shred' && draft.targetBodyFatPct != null ? weightAtBodyFat(profile, draft.targetBodyFatPct) : null;
  const target = goalWeight(draft);
  const wrongWay =
    (target != null && ((goal === 'lose' && target >= profile.weightKg) || (goal === 'gain' && target <= profile.weightKg))) ||
    (plan === 'shred' && draft.targetBodyFatPct != null && draft.targetBodyFatPct >= fatNow);
  const lowFat = draft.targetBodyFatPct != null && draft.targetBodyFatPct < (profile.sex === 'male' ? 8 : 15);
  const dirty =
    plan !== profile.goalPlan ||
    pace !== profile.pace ||
    draft.targetWeightKg !== profile.targetWeightKg ||
    draft.targetBodyFatPct !== profile.targetBodyFatPct;
  const fatChoices = profile.sex === 'male' ? [10, 12, 15, 18] : [18, 20, 23, 26];

  const save = () => {
    success();
    const restart =
      plan !== profile.goalPlan || draft.targetWeightKg !== profile.targetWeightKg || draft.targetBodyFatPct !== profile.targetBodyFatPct;
    onSave({
      ...draft,
      goalStartWeightKg: restart || profile.goalStartWeightKg == null ? profile.weightKg : profile.goalStartWeightKg,
      goalStartedAt: restart || profile.goalStartedAt == null ? new Date().toISOString() : profile.goalStartedAt,
    });
  };

  return (
    <Card>
      <View style={styles.planGrid}>
        {GOAL_PLANS.map((g) => {
          const on = g.value === plan;
          return (
            <Pressable
              key={g.value}
              onPress={() => {
                select();
                setPlan(g.value);
              }}
              style={[styles.planTile, on && styles.planTileOn]}>
              <Text style={styles.planEmoji}>{g.emoji}</Text>
              <Text style={[styles.planLabel, on && { color: colors.primary }]}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={type.caption}>{GOAL_PLANS.find((g) => g.value === plan)?.description}</Text>

      {(plan === 'shred' || plan === 'recomp') && (
        <View style={{ gap: space.sm }}>
          <Text style={type.label}>
            Target body fat % · you&apos;re at {fatNow}% {measured ? '(measured)' : '(estimated — an InBody scan is more accurate)'}
          </Text>
          <View style={styles.fieldRow}>
            {fatChoices.map((f) => (
              <Chip key={f} label={`${f}%`} selected={Number(targetFat) === f} onPress={() => setTargetFat(String(f))} />
            ))}
          </View>
          <Field label="Or type your own" value={targetFat} onChange={setTargetFat} placeholder="e.g. 12" />
          {shredWeight != null && !wrongWay && (
            <Text style={[type.body, { fontWeight: '600' }]}>
              ≈ {shredWeight} kg at {draft.targetBodyFatPct}% — about {Math.round((profile.weightKg - shredWeight) * 10) / 10} kg of fat to
              lose, keeping your muscle.
            </Text>
          )}
          {lowFat && (
            <Banner tone="warning" text="That's very lean — hard to hold and not healthy long-term. Consider a slightly higher target." />
          )}
        </View>
      )}

      {(plan === 'lose' || plan === 'gain') && (
        <View style={styles.fieldRow}>
          <Field
            label="Target weight (kg)"
            value={targetWeight}
            onChange={setTargetWeight}
            placeholder={String(Math.round(profile.weightKg + (goal === 'lose' ? -5 : 3)))}
          />
          <Field label="Body fat % goal" value={targetFat} onChange={setTargetFat} placeholder="optional" />
        </View>
      )}

      {plan !== 'maintain' && (
        <>
          <Text style={type.label}>Pace</Text>
          <ChipRow
            options={PACE_OPTIONS.map((o) => {
              const kg = Math.abs(weeklyChangeKg({ ...draft, pace: o.value }));
              return { value: o.value, label: plan === 'recomp' ? o.label : `${o.label} · ${kg} kg/wk` };
            })}
            value={pace}
            onChange={setPace}
          />
        </>
      )}

      <GradientCard from="#2FA36B" to="#11553A" style={styles.summary}>
        <View style={styles.summaryRow}>
          <SummaryValue value={kcal.toLocaleString('en-IN')} label="kcal a day" />
          <SummaryValue value={`${protein} g`} label="protein a day" />
          <SummaryValue value={`${burnTarget(draft)}`} label="kcal to burn" />
        </View>
        <Text style={styles.summaryNote}>
          {plan !== 'maintain' && plan !== 'recomp' ? `${perWeek > 0 ? '+' : ''}${perWeek} kg a week · ` : ''}
          Maintenance {maintenance.toLocaleString('en-IN')} kcal
          {kcal !== maintenance
            ? ` · ${kcal < maintenance ? '−' : '+'}${Math.abs(maintenance - kcal).toLocaleString('en-IN')} kcal for this goal`
            : ''}
          {eta ? ` · reach it around ${eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (~${weeks} wk)` : ''}
        </Text>
      </GradientCard>
      {wrongWay && <Banner tone="warning" text={`That target doesn't match "${GOAL_PLANS.find((g) => g.value === plan)?.label}".`} />}
      <Button label="Save goal" icon="flag" onPress={save} disabled={!dirty || wrongWay} />
    </Card>
  );
}

function SummaryValue({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

type Metric = 'weight' | 'fat' | 'muscle';
const METRICS: { value: Metric; label: string }[] = [
  { value: 'weight', label: 'Weight' },
  { value: 'fat', label: 'Body fat' },
  { value: 'muscle', label: 'Muscle' },
];
const SOURCE_LABEL: Record<BodyLog['source'], string> = {
  inbody: 'InBody',
  'apple-health': 'Health',
  manual: 'Manual',
  weight: 'Weigh-in',
};

function ProgressCard({
  profile,
  history,
  logs,
  chartWidth,
  onLogWeight,
}: {
  profile: Profile;
  history: History;
  logs: BodyLog[];
  chartWidth: number;
  onLogWeight: (kg: number) => Promise<void>;
}) {
  const [weight, setWeight] = useState('');
  const [metric, setMetric] = useState<Metric>('weight');

  const fatLogs = logs.filter((l) => l.bodyFatPct != null);
  const muscleLogs = logs.filter((l) => l.muscleKg != null);
  const series: Record<Metric, { date: string; value: number }[]> = {
    weight: history.weights.map((w) => ({ date: w.date, value: w.kg })),
    fat: fatLogs.map((l) => ({ date: l.date, value: l.bodyFatPct! })),
    muscle: muscleLogs.map((l) => ({ date: l.date, value: l.muscleKg! })),
  };
  const unit = metric === 'fat' ? '%' : 'kg';
  const points = series[metric];
  const first = points[0]?.value;
  const latest = points[points.length - 1]?.value;
  const start = metric === 'weight' ? (profile.goalStartWeightKg ?? profile.weightKg) : first;
  const now = metric === 'weight' ? profile.weightKg : latest;
  const target = metric === 'weight' ? goalWeight(profile) : metric === 'fat' ? profile.targetBodyFatPct : null;
  const progress =
    start != null && now != null && target != null && start !== target ? Math.max(0, Math.min(1, (start - now) / (start - target))) : null;
  const delta = (arr: { value: number }[]) => (arr.length >= 2 ? Math.round((arr[arr.length - 1].value - arr[0].value) * 10) / 10 : null);
  const changes = [
    { label: 'Weight', d: delta(series.weight), unit: 'kg', good: profile.goal === 'gain' ? 1 : -1 },
    { label: 'Body fat', d: delta(series.fat), unit: '%', good: -1 },
    { label: 'Muscle', d: delta(series.muscle), unit: 'kg', good: 1 },
  ].filter((c) => c.d != null && c.d !== 0);

  return (
    <Card>
      <SectionTitle title="Progress" />
      <ChipRow options={METRICS} value={metric} onChange={setMetric} />
      <View style={styles.statsRow}>
        <StatTile label="Start" value={start != null ? `${start}` : '—'} unit={start != null ? unit : undefined} />
        <StatTile label="Now" value={now != null ? `${now}` : '—'} unit={now != null ? unit : undefined} color={colors.primary} />
        <StatTile
          label="Target"
          value={target != null ? `${target}` : '—'}
          unit={target != null ? unit : undefined}
          color={colors.accent}
        />
      </View>
      {progress != null && (
        <View style={{ gap: 6 }}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={type.caption}>{Math.round(progress * 100)}% of the way there</Text>
        </View>
      )}
      <TrendChart
        points={points}
        target={target ?? null}
        width={chartWidth}
        color={metric === 'fat' ? colors.fat : metric === 'muscle' ? colors.protein : colors.primary}
        emptyText={
          metric === 'weight'
            ? 'Log your weight on a few days to see your trend here.'
            : 'Add two or more InBody results (or body numbers) to see this change over time.'
        }
      />
      {metric === 'weight' && history.weightTrendKgPerWeek != null && (
        <Text style={type.caption}>
          Trend: {history.weightTrendKgPerWeek > 0 ? '+' : ''}
          {history.weightTrendKgPerWeek} kg / week
        </Text>
      )}
      {changes.length > 0 && (
        <View style={styles.changeRow}>
          {changes.map((c) => {
            const good = Math.sign(c.d!) === c.good;
            return (
              <View key={c.label} style={[styles.changePill, { backgroundColor: good ? colors.primarySoft : colors.accentSoft }]}>
                <Text style={[styles.changeText, { color: good ? colors.primary : colors.warning }]}>
                  {c.label} {c.d! > 0 ? '+' : ''}
                  {c.d} {c.unit}
                </Text>
              </View>
            );
          })}
        </View>
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
      <View style={styles.logRow}>
        <Button
          label="Add InBody result"
          icon="clipboard-outline"
          variant="secondary"
          onPress={() => router.push('/body-input?mode=paste')}
          style={{ flex: 1 }}
        />
        <Button
          label="Type numbers"
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push('/body-input')}
          style={{ flex: 1 }}
        />
      </View>
      {logs.length > 0 && (
        <View style={{ gap: 2 }}>
          <Text style={type.label}>Recent measurements</Text>
          {[...logs]
            .reverse()
            .slice(0, 6)
            .map((l) => (
              <View key={l.id} style={styles.logItem}>
                <Text style={[type.body, { width: 64 }]}>{formatShortDate(l.date)}</Text>
                <Text style={[type.body, type.number, { flex: 1 }]}>
                  {l.weightKg} kg{l.bodyFatPct != null ? ` · ${l.bodyFatPct}% fat` : ''}
                  {l.muscleKg != null ? ` · ${l.muscleKg} kg muscle` : ''}
                </Text>
                <Text style={type.caption}>{SOURCE_LABEL[l.source]}</Text>
              </View>
            ))}
        </View>
      )}
    </Card>
  );
}

function formatShortDate(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string; detail: string }[] = [
  { key: 'overTarget', label: 'Over my daily target', detail: 'Right away, once a day' },
  { key: 'underTarget', label: 'Eating too little', detail: '8:30 pm, only if under half your target' },
  { key: 'eveningSummary', label: 'Evening summary', detail: '9 pm — how the day went' },
  { key: 'mealReminders', label: 'Meal reminders', detail: "If lunch or dinner isn't logged" },
  { key: 'goalCheck', label: 'Goal check-ins', detail: 'When recent days drift from your goal, or you hit a streak' },
  { key: 'weeklyReport', label: 'Weekly coach report', detail: 'Sunday 7 pm — your week and tips for the next' },
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
        {plan.length} exercises for {GOAL_OPTIONS.find((g) => g.value === profile.goal)?.label.toLowerCase()} at {band}, about {minutes} min
        a week.
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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
  summary: { gap: space.sm, padding: space.lg },
  summaryRow: { flexDirection: 'row', gap: space.sm },
  summaryNote: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  planTile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planTileOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  planEmoji: { fontSize: 24 },
  planLabel: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  changeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  changePill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  changeText: { fontSize: 13, fontWeight: '700' },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: colors.white, fontVariant: ['tabular-nums'] },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
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
