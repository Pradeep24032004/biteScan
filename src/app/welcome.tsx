import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pulse, Sparkles } from '@/components/Motion';
import { Button, ChipRow } from '@/components/ui';
import { addBodyLog, saveProfile } from '@/db/database';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  ACTIVITY_OPTIONS,
  burnTarget,
  calculateTarget,
  DEFAULT_PROFILE,
  directionOf,
  GOAL_PLANS,
  macroTargets,
  toDateKey,
  type Activity,
  type GoalPlan,
  type Profile,
  type Sex,
} from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

const LOGO = require('../../assets/icon.png');

const ACTIVITY_SHORT: Record<Activity, string> = {
  sedentary: 'Mostly sitting',
  light: 'Light exercise',
  moderate: 'Exercise 3–5×/wk',
  active: 'Very active',
  very_active: 'Athlete / physical job',
};

export default function WelcomeScreen() {
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [plan, setPlan] = useState<GoalPlan>('lose');
  const [hasInBody, setHasInBody] = useState(false);
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [bmr, setBmr] = useState('');
  const [activity, setActivity] = useState<Activity>('light');

  const a = Number(age);
  const h = Number(height);
  const w = Number(weight);
  const bodyValid = a >= 13 && a <= 100 && h >= 100 && h <= 230 && w >= 25 && w <= 300;
  const opt = (v: string) => (hasInBody && Number(v) > 0 ? Number(v) : null);
  const fatPct = opt(fat);
  const fatValid = fatPct == null || (fatPct >= 3 && fatPct <= 65);
  const draft: Profile = {
    ...DEFAULT_PROFILE,
    sex,
    age: a,
    heightCm: h,
    weightKg: w,
    goal: directionOf(plan),
    goalPlan: plan,
    activity,
    bodyFatPct: fatPct,
    skeletalMuscleKg: opt(muscle),
    bmrKcal: opt(bmr),
    bodySource: fatPct != null ? 'inbody' : null,
    bodyMeasuredAt: fatPct != null ? new Date().toISOString() : null,
    // Six-pack goals need a body-fat target; start from a sensible lean level.
    targetBodyFatPct: plan === 'shred' ? (sex === 'male' ? 12 : 20) : null,
  };
  const kcal = bodyValid ? calculateTarget(draft) : 0;

  const finish = async () => {
    await saveProfile(db, { ...draft, goalStartWeightKg: w, goalStartedAt: new Date().toISOString() });
    if (fatPct != null) {
      await addBodyLog(db, {
        date: toDateKey(new Date()),
        weightKg: w,
        bodyFatPct: fatPct,
        muscleKg: draft.skeletalMuscleKg,
        source: 'inbody',
      });
    }
    await requestNotificationPermission().catch(() => false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          {step === 0 && (
            <View style={styles.hero}>
              <View style={styles.logoWrap}>
                <Pulse color={colors.primary} size={150} />
                <Image source={LOGO} style={styles.logo} />
                <Sparkles color={colors.accent} />
              </View>
              <Text style={styles.brand}>BiteScan</Text>
              <Text style={styles.tagline}>Snap your Indian meals.{'\n'}Know your calories.</Text>
              <View style={styles.points}>
                <Point emoji="📸" text="Scan idli, dosa, biryani & 120+ dishes" />
                <Point emoji="🎯" text="A daily target made for your body" />
                <Point emoji="🔒" text="Everything stays on your phone" />
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={{ gap: space.md }}>
              <Text style={type.title}>About you</Text>
              <Text style={type.label}>Used only to work out your calories.</Text>
              <ChipRow
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
                value={sex}
                onChange={setSex}
              />
              <BigField label="Age" unit="years" value={age} onChange={setAge} />
              <BigField label="Height" unit="cm" value={height} onChange={setHeight} />
              <BigField label="Weight" unit="kg" value={weight} onChange={setWeight} decimal />
              <Pressable
                style={[styles.option, hasInBody && styles.optionOn, styles.inbodyToggle]}
                onPress={() => setHasInBody(!hasInBody)}>
                <Text style={{ fontSize: 22 }}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, hasInBody && { color: colors.primary }]}>I have InBody results</Text>
                  <Text style={type.caption}>Body fat and muscle make your plan more accurate. Optional.</Text>
                </View>
                <Ionicons name={hasInBody ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={colors.primary} />
              </Pressable>
              {hasInBody && (
                <>
                  <BigField label="Body fat" unit="%" value={fat} onChange={setFat} decimal />
                  <BigField label="Skeletal muscle" unit="kg" value={muscle} onChange={setMuscle} decimal />
                  <BigField label="BMR (optional)" unit="kcal" value={bmr} onChange={setBmr} />
                  {!fatValid && <Text style={[type.caption, { color: colors.danger }]}>Body fat should be between 3 and 65%.</Text>}
                </>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: space.md }}>
              <Text style={type.title}>What&apos;s your goal?</Text>
              {GOAL_PLANS.map((g) => (
                <Pressable
                  key={g.value}
                  onPress={() => setPlan(g.value)}
                  style={[styles.option, styles.goalOption, plan === g.value && styles.optionOn]}>
                  <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.heading, plan === g.value && { color: colors.primary }]}>{g.label}</Text>
                    <Text style={type.caption}>{g.description}</Text>
                  </View>
                </Pressable>
              ))}
              <Text style={type.label}>How active are you?</Text>
              <ChipRow
                options={ACTIVITY_OPTIONS.map((o) => ({ value: o.value, label: ACTIVITY_SHORT[o.value] }))}
                value={activity}
                onChange={setActivity}
              />
              <View style={styles.preview}>
                <Text style={type.label}>Your daily plan</Text>
                <View style={styles.previewRow}>
                  <PreviewStat value={kcal.toLocaleString('en-IN')} label="kcal to eat" />
                  <PreviewStat value={`${macroTargets(draft, kcal).protein} g`} label="protein" />
                  <PreviewStat value={`${burnTarget(draft)}`} label="kcal to burn" />
                </View>
                {plan === 'shred' && (
                  <Text style={type.caption}>
                    Aiming for {draft.targetBodyFatPct}% body fat (you can change this in Goals). Six-pack abs usually show around 10–12%
                    for men and 18–20% for women.
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && <Button label="Back" variant="ghost" onPress={() => setStep(step - 1)} style={{ flex: 0.6 }} />}
          {step < 2 ? (
            <Button
              label={step === 0 ? 'Get started' : 'Next'}
              onPress={() => setStep(step + 1)}
              disabled={step === 1 && (!bodyValid || !fatValid)}
              style={{ flex: 1 }}
            />
          ) : (
            <Button label="Start tracking" icon="checkmark" onPress={finish} style={{ flex: 1 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Point({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.point}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={[type.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

function BigField({
  label,
  unit,
  value,
  onChange,
  decimal,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
}) {
  return (
    <View style={styles.bigField}>
      <Text style={[type.heading, { flex: 1 }]}>{label}</Text>
      <TextInput
        style={styles.bigInput}
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        placeholder="—"
        placeholderTextColor={colors.faint}
      />
      <Text style={[type.label, { width: 44 }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.xl, gap: space.lg, flexGrow: 1 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
  hero: { alignItems: 'center', gap: space.md, marginTop: space.xxl },
  logoWrap: { width: 220, height: 180, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, borderRadius: 28 },
  brand: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  tagline: { fontSize: 20, fontWeight: '500', color: colors.muted, textAlign: 'center', lineHeight: 28 },
  points: { gap: space.md, marginTop: space.lg, alignSelf: 'stretch' },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    padding: space.lg,
    borderRadius: radius.md,
  },
  bigField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  bigInput: { width: 90, textAlign: 'right', fontSize: 24, fontWeight: '700', color: colors.text, paddingVertical: 8 },
  option: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: 4, borderWidth: 2, borderColor: 'transparent' },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  preview: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  previewRow: { flexDirection: 'row', gap: space.sm },
  previewValue: { fontSize: 22, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  goalOption: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  inbodyToggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { flexDirection: 'row', gap: space.sm, padding: space.lg },
});

function PreviewStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.previewValue}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}
