import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientCard } from '@/components/GradientCard';
import { Button, Card, ChipRow, Pill, SectionTitle, StatTile } from '@/components/ui';
import { getProfile, saveProfile } from '@/db/database';
import { estimateBody } from '@/lib/bodyComposition';
import { isHealthAvailable } from '@/lib/health';
import { countTrainingPhotos } from '@/lib/trainingPhotos';
import { syncProfileFromHealth } from '@/lib/healthSync';
import {
  ACTIVITY_OPTIONS,
  GOAL_PLANS,
  macroTargets,
  targetBreakdown,
  typicalIntake,
  type Profile,
  type Sex,
} from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

const healthAvailable = isHealthAvailable();

export default function BodyScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [syncing, setSyncing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile(db).then(setProfile);
    }, [db])
  );

  if (!profile) return null;

  const update = async (changes: Partial<Profile>) => {
    const next = { ...profile, ...changes };
    setProfile(next);
    await saveProfile(db, next);
  };

  const syncHealth = async () => {
    setSyncing(true);
    try {
      setProfile(await syncProfileFromHealth(db));
    } catch (e) {
      Alert.alert('Could not read Apple Health', e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const estimate = estimateBody(profile.sex, profile.age, profile.heightCm, profile.weightKg);
  const measuredFat = profile.bodyFatPct != null;
  const bodyFatPct = profile.bodyFatPct ?? estimate.bodyFatPct;
  const muscle = profile.skeletalMuscleKg ?? estimate.skeletalMuscleKg;
  const leanMass = Math.round(profile.weightKg * (1 - bodyFatPct / 100) * 10) / 10;
  const breakdown = targetBreakdown(profile);
  const macros = macroTargets(profile, breakdown.target);
  const typical = typicalIntake(profile.sex, profile.activity);
  const musclePct = Math.min((muscle / profile.weightKg) * 100, 100 - bodyFatPct);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={type.title}>Your body</Text>
            <Text style={type.label}>Used to work out your daily calories</Text>
          </View>

          <Card>
            <View style={styles.row}>
              <Text style={[type.heading, { flex: 1 }]}>Body composition</Text>
              <SourcePill profile={profile} />
            </View>
            <View style={styles.grid}>
              <StatTile label="Weight" value={fmt(profile.weightKg)} unit="kg" note={`BMI ${estimate.bmi}`} />
              <StatTile
                label="Body fat"
                value={fmt(bodyFatPct)}
                unit="%"
                note={measuredFat ? `${fmt((profile.weightKg * bodyFatPct) / 100)} kg` : 'estimated'}
                color={colors.fat}
              />
            </View>
            <View style={styles.grid}>
              <StatTile
                label="Skeletal muscle"
                value={fmt(muscle)}
                unit="kg"
                note={profile.skeletalMuscleKg != null ? undefined : 'estimated'}
                color={colors.protein}
              />
              <StatTile label="Lean mass" value={fmt(leanMass)} unit="kg" note={measuredFat ? undefined : 'estimated'} />
            </View>
            <CompositionBar fatPct={bodyFatPct} musclePct={musclePct} />
            {!measuredFat && (
              <Text style={type.caption}>
                Estimates use your height, weight, age and sex (Deurenberg and Lee formulas) and can be off by a few
                percent. An InBody scan is more accurate.
              </Text>
            )}
            <Button label="Paste InBody results" icon="clipboard-outline" onPress={() => router.push('/body-input?mode=paste')} />
            <View style={styles.buttonRow}>
              {healthAvailable && (
                <Button
                  label="Apple Health"
                  icon="heart"
                  variant="secondary"
                  loading={syncing}
                  onPress={syncHealth}
                  style={{ flex: 1 }}
                />
              )}
              <Button
                label="Enter manually"
                icon="create-outline"
                variant="secondary"
                onPress={() => router.push('/body-input?mode=manual')}
                style={{ flex: 1 }}
              />
            </View>
            {healthAvailable && (
              <View style={styles.row}>
                <Text style={[type.body, { flex: 1 }]}>Update from Apple Health automatically</Text>
                <Switch
                  value={profile.autoSyncHealth}
                  onValueChange={(on) => update({ autoSyncHealth: on })}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            )}
          </Card>

          <Card>
            <GradientCard from="#F29A57" to="#C9561A" style={styles.targetHero}>
              <Text style={styles.targetLabel}>YOUR DAILY TARGET</Text>
              <Text style={styles.target}>
                {breakdown.target.toLocaleString('en-IN')}
                <Text style={styles.targetUnit}> kcal / day</Text>
              </Text>
            </GradientCard>
            {profile.customTargetKcal ? (
              <Text style={type.caption}>Using your custom target.</Text>
            ) : (
              <View style={styles.breakdown}>
                <BreakdownRow
                  label={`You: ${profile.sex === 'male' ? 'male' : 'female'}, ${profile.age} y, ${fmt(profile.heightCm)} cm, ${fmt(profile.weightKg)} kg, ${fmt(bodyFatPct)}% fat${measuredFat ? '' : ' (est.)'}`}
                  value=""
                />
                <BreakdownRow label={`Calories at rest (BMR) · ${breakdown.formula}`} value={`${breakdown.bmr}`} />
                <BreakdownRow label={`With your activity (× ${breakdown.activityFactor})`} value={`${breakdown.maintenance}`} />
                <BreakdownRow
                  label={`Goal: ${GOAL_PLANS.find((g) => g.value === profile.goalPlan)?.label.toLowerCase()}`}
                  value={`${breakdown.goalAdjust >= 0 ? '+' : '−'}${Math.abs(breakdown.goalAdjust)}`}
                />
              </View>
            )}
            <View style={styles.typical}>
              <Text style={[type.caption, { flex: 1 }]}>
                Typical for an Indian {profile.sex === 'male' ? 'man' : 'woman'} with {typical.level} activity (ICMR-NIN
                2020, {profile.sex === 'male' ? '65' : '55'} kg reference)
              </Text>
              <Text style={[type.label, type.number]}>{typical.kcal.toLocaleString('en-IN')} kcal</Text>
            </View>
            <View style={styles.macroRow}>
              <MacroTarget label="Protein" grams={macros.protein} color={colors.protein} />
              <MacroTarget label="Carbs" grams={macros.carbs} color={colors.carbs} />
              <MacroTarget label="Fat" grams={macros.fat} color={colors.fat} />
            </View>
          </Card>

          <Card>
            <SectionTitle title="How active are you?" />
            <View style={{ gap: space.sm }}>
              {ACTIVITY_OPTIONS.map((a) => (
                <ChoiceRow
                  key={a.value}
                  label={a.label}
                  selected={profile.activity === a.value}
                  onPress={() => update({ activity: a.value })}
                />
              ))}
            </View>
          </Card>

          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.heading}>Help BiteScan learn your food</Text>
                <Text style={type.caption}>
                  When you scan and log a dish, keep that photo on this phone so a future update recognises your
                  dishes better. Photos never leave your phone on their own.
                </Text>
              </View>
              <Switch
                value={profile.collectPhotos}
                onValueChange={(on) => update({ collectPhotos: on })}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <PhotoCount />
          </Card>

          {/* Remount when saved values change (e.g. after an InBody paste) so the fields show them. */}
          <AboutYou
            key={[profile.sex, profile.age, profile.heightCm, profile.weightKg, profile.customTargetKcal].join('|')}
            profile={profile}
            onSave={update}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhotoCount() {
  const [{ photos, dishes }] = useState(countTrainingPhotos);
  return (
    <Text style={type.label}>
      {photos === 0 ? 'No photos saved yet.' : `${photos} photo${photos === 1 ? '' : 's'} of ${dishes} dish${dishes === 1 ? '' : 'es'} saved.`}
    </Text>
  );
}

function SourcePill({ profile }: { profile: Profile }) {
  const date = profile.bodyMeasuredAt
    ? new Date(profile.bodyMeasuredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null;
  switch (profile.bodySource) {
    case 'inbody':
      return <Pill label={`InBody${date ? ` · ${date}` : ''}`} />;
    case 'apple-health':
      return <Pill label={`Apple Health${date ? ` · ${date}` : ''}`} />;
    case 'manual':
      return <Pill label={`Entered${date ? ` · ${date}` : ''}`} />;
    default:
      return <Pill label="Estimated" color={colors.warning} bg={colors.accentSoft} />;
  }
}

function CompositionBar({ fatPct, musclePct }: { fatPct: number; musclePct: number }) {
  const otherPct = Math.max(0, 100 - fatPct - musclePct);
  const parts = [
    { label: 'Fat', pct: fatPct, color: colors.fat },
    { label: 'Muscle', pct: musclePct, color: colors.protein },
    { label: 'Bone, water & organs', pct: otherPct, color: colors.border },
  ];
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.compBar}>
        {parts.map((p) => (
          <View key={p.label} style={{ flex: p.pct, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={styles.compLegend}>
        {parts.map((p) => (
          <View key={p.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: p.color }]} />
            <Text style={type.caption}>
              {p.label} {Math.round(p.pct)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[type.label, { flex: 1 }]}>{label}</Text>
      <Text style={[type.body, type.number, { fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

function MacroTarget({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={[styles.macroTarget, { borderColor: color }]}>
      <Text style={[styles.macroGrams, { color }]}>{grams}g</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

function ChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[styles.choice, selected && { backgroundColor: colors.primarySoft, color: colors.primary, fontWeight: '600' }]}>
      {label}
    </Text>
  );
}

function AboutYou({ profile, onSave }: { profile: Profile; onSave: (c: Partial<Profile>) => Promise<void> }) {
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [age, setAge] = useState(String(profile.age));
  const [height, setHeight] = useState(String(profile.heightCm));
  const [weight, setWeight] = useState(String(profile.weightKg));
  const [custom, setCustom] = useState(profile.customTargetKcal ? String(profile.customTargetKcal) : '');

  const dirty =
    sex !== profile.sex ||
    age !== String(profile.age) ||
    height !== String(profile.heightCm) ||
    weight !== String(profile.weightKg) ||
    custom !== (profile.customTargetKcal ? String(profile.customTargetKcal) : '');

  const save = async () => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    if (!(a > 0 && h > 0 && w > 0)) {
      Alert.alert('Check your details', 'Age, height and weight need to be numbers.');
      return;
    }
    const c = Number(custom);
    await onSave({ sex, age: a, heightCm: h, weightKg: w, customTargetKcal: custom.trim() && c > 0 ? c : null });
  };

  return (
    <Card>
      <SectionTitle title="About you" />
      <ChipRow
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        value={sex}
        onChange={setSex}
      />
      <View style={styles.buttonRow}>
        <Field label="Age" value={age} onChange={setAge} />
        <Field label="Height (cm)" value={height} onChange={setHeight} />
        <Field label="Weight (kg)" value={weight} onChange={setWeight} decimal />
      </View>
      <Field label="Custom daily target (optional)" value={custom} onChange={setCustom} placeholder="e.g. 1800" />
      <Button label="Save changes" onPress={save} disabled={!dirty} />
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  decimal,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      />
    </View>
  );
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toString();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: 48, gap: space.md },
  header: { gap: 2, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', gap: space.lg },
  buttonRow: { flexDirection: 'row', gap: space.sm },
  targetHero: { padding: space.lg, gap: 2 },
  targetLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  target: { fontSize: 38, fontWeight: '800', color: colors.white, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  targetUnit: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)', letterSpacing: 0 },
  breakdown: { gap: 6, paddingVertical: space.xs },
  macroRow: { flexDirection: 'row', gap: space.sm },
  typical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  compBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  compLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  macroTarget: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 2,
  },
  macroGrams: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  choice: {
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
