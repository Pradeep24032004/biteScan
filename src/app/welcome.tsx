import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ChipRow } from '@/components/ui';
import { saveProfile } from '@/db/database';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  ACTIVITY_OPTIONS,
  calculateTarget,
  DEFAULT_PROFILE,
  GOAL_OPTIONS,
  type Activity,
  type Goal,
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
  const [goal, setGoal] = useState<Goal>('lose');
  const [activity, setActivity] = useState<Activity>('light');

  const a = Number(age);
  const h = Number(height);
  const w = Number(weight);
  const bodyValid = a >= 13 && a <= 100 && h >= 100 && h <= 230 && w >= 25 && w <= 300;
  const draft = { ...DEFAULT_PROFILE, sex, age: a, heightCm: h, weightKg: w, goal, activity };

  const finish = async () => {
    await saveProfile(db, { ...draft, goalStartWeightKg: w, goalStartedAt: new Date().toISOString() });
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
              <Image source={LOGO} style={styles.logo} />
              <Text style={styles.brand}>BiteScan</Text>
              <Text style={styles.tagline}>Snap your Indian meals.{'\n'}Know your calories.</Text>
              <View style={styles.points}>
                <Point emoji="📸" text="Scan idli, dosa, biryani & 90+ dishes" />
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
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: space.md }}>
              <Text style={type.title}>Your goal</Text>
              {GOAL_OPTIONS.map((g) => (
                <Pressable key={g.value} onPress={() => setGoal(g.value)} style={[styles.option, goal === g.value && styles.optionOn]}>
                  <Text style={[type.heading, goal === g.value && { color: colors.primary }]}>{g.label}</Text>
                  <Text style={type.caption}>{g.description}</Text>
                </Pressable>
              ))}
              <Text style={type.label}>How active are you?</Text>
              <ChipRow
                options={ACTIVITY_OPTIONS.map((o) => ({ value: o.value, label: ACTIVITY_SHORT[o.value] }))}
                value={activity}
                onChange={setActivity}
              />
              <View style={styles.preview}>
                <Text style={type.label}>Your daily target</Text>
                <Text style={styles.previewValue}>{calculateTarget(draft).toLocaleString('en-IN')} kcal</Text>
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
              disabled={step === 1 && !bodyValid}
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
  preview: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.lg, alignItems: 'center', gap: 2 },
  previewValue: { fontSize: 30, fontWeight: '800', color: colors.primary },
  footer: { flexDirection: 'row', gap: space.sm, padding: space.lg },
});
