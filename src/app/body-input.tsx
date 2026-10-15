import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Banner, Button, Card } from '@/components/ui';
import { getProfile, saveProfile } from '@/db/database';
import { parseInBodyText, type InBodyReading } from '@/lib/bodyComposition';
import { calculateTarget, type Profile } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

type FieldKey = 'weightKg' | 'bodyFatPct' | 'skeletalMuscleKg' | 'bmrKcal';

const FIELDS: { key: FieldKey; label: string; unit: string; optional?: boolean }[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%' },
  { key: 'skeletalMuscleKg', label: 'Skeletal muscle mass', unit: 'kg', optional: true },
  { key: 'bmrKcal', label: 'Basal metabolic rate (BMR)', unit: 'kcal', optional: true },
];

const EXAMPLE = 'Weight 72.4 kg\nSkeletal Muscle Mass 31.2 kg\nPercent Body Fat 24.5 %\nBMR 1580 kcal';

export default function BodyInputScreen() {
  const db = useSQLiteContext();
  const { mode } = useLocalSearchParams<{ mode?: 'paste' | 'manual' }>();
  const paste = mode !== 'manual';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [text, setText] = useState('');
  const [values, setValues] = useState<Record<FieldKey, string>>({
    weightKg: '',
    bodyFatPct: '',
    skeletalMuscleKg: '',
    bmrKcal: '',
  });
  const [readCount, setReadCount] = useState<number | null>(null);

  useEffect(() => {
    getProfile(db).then((p) => {
      setProfile(p);
      setValues({
        weightKg: String(p.weightKg),
        bodyFatPct: p.bodyFatPct != null ? String(p.bodyFatPct) : '',
        skeletalMuscleKg: p.skeletalMuscleKg != null ? String(p.skeletalMuscleKg) : '',
        bmrKcal: p.bmrKcal != null ? String(p.bmrKcal) : '',
      });
    });
  }, [db]);

  const applyReading = (reading: InBodyReading) => {
    const found = FIELDS.filter((f) => reading[f.key] != null);
    setValues((v) => {
      const next = { ...v };
      for (const f of found) next[f.key] = String(reading[f.key]);
      return next;
    });
    setReadCount(found.length);
  };

  const pasteFromClipboard = async () => {
    const clip = await Clipboard.getStringAsync();
    setText(clip);
    applyReading(parseInBodyText(clip));
  };

  const save = async () => {
    if (!profile) return;
    const num = (k: FieldKey) => (values[k].trim() ? Number(values[k]) : null);
    const weight = num('weightKg');
    const fat = num('bodyFatPct');
    if (!weight || weight < 20 || weight > 300) {
      Alert.alert('Check weight', 'Please enter your weight in kg.');
      return;
    }
    if (fat != null && (fat < 2 || fat > 70)) {
      Alert.alert('Check body fat', 'Body fat % should be between 2 and 70.');
      return;
    }
    const updated: Profile = {
      ...profile,
      weightKg: weight,
      bodyFatPct: fat,
      skeletalMuscleKg: num('skeletalMuscleKg'),
      bmrKcal: num('bmrKcal'),
      bodySource: paste ? 'inbody' : 'manual',
      bodyMeasuredAt: new Date().toISOString(),
    };
    await saveProfile(db, updated);
    Alert.alert('Saved', `Your daily target is now ${calculateTarget(updated).toLocaleString('en-IN')} kcal.`);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <Stack.Screen options={{ title: paste ? 'Paste InBody results' : 'Enter body numbers' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {paste && (
          <Card>
            <Text style={type.heading}>1. Copy your results</Text>
            <Text style={type.label}>
              In the InBody app, open your latest result and copy it (or type the numbers from your result sheet).
            </Text>
            <Button label="Paste from clipboard" icon="clipboard" onPress={pasteFromClipboard} />
            <TextInput
              style={styles.textArea}
              multiline
              value={text}
              onChangeText={(t) => {
                setText(t);
                applyReading(parseInBodyText(t));
              }}
              placeholder={`…or paste/type here, e.g.\n${EXAMPLE}`}
              placeholderTextColor={colors.faint}
              textAlignVertical="top"
            />
            {readCount != null &&
              (readCount > 0 ? (
                <Banner text={`Found ${readCount} value${readCount === 1 ? '' : 's'} — check them below.`} icon="checkmark-circle" />
              ) : (
                <Banner tone="warning" text="Couldn't find InBody numbers in that text. You can type them below." />
              ))}
          </Card>
        )}

        <Card>
          <Text style={type.heading}>{paste ? '2. Check the numbers' : 'Your numbers'}</Text>
          {FIELDS.map((f) => (
            <View key={f.key} style={styles.fieldRow}>
              <Text style={[type.body, { flex: 1 }]}>
                {f.label}
                {f.optional ? <Text style={type.caption}> (optional)</Text> : null}
              </Text>
              <TextInput
                style={styles.input}
                value={values[f.key]}
                onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.faint}
              />
              <Text style={styles.unit}>{f.unit}</Text>
            </View>
          ))}
          <Text style={type.caption}>
            With body fat % your target uses lean mass (more accurate). A BMR from InBody is used directly.
          </Text>
        </Card>

        <Button label="Save" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  textArea: {
    minHeight: 120,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 15,
    color: colors.text,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    width: 90,
    textAlign: 'right',
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  unit: { width: 34, color: colors.muted, fontSize: 14 },
});
