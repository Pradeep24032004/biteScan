import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScanFrame } from '@/components/Motion';
import { Banner, Button, Card, ChipRow } from '@/components/ui';
import { addCustomFood, addEntry } from '@/db/database';
import { isRecognizerAvailable } from '@/lib/dishRecognizer';
import { success } from '@/lib/haptics';
import { readNutritionLabel, readProductName } from '@/lib/labelReader';
import { afterFoodChanged } from '@/lib/notifications';
import { MEALS, mealForNow, toDateKey, type Meal } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

type Per100 = Record<'kcal' | 'protein' | 'carbs' | 'sugar' | 'fat' | 'satFat' | 'fibre' | 'sodium', string>;
const EMPTY: Per100 = { kcal: '', protein: '', carbs: '', sugar: '', fat: '', satFat: '', fibre: '', sodium: '' };

const NUTRIENTS: { key: keyof Per100; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Energy', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'sugar', label: 'Sugars', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'satFat', label: 'Sat. fat', unit: 'g' },
  { key: 'fibre', label: 'Fibre', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
];

async function takePhoto(source: 'camera' | 'library') {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings.');
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0];
}

export default function LabelScanScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const date = params.date ?? toDateKey(new Date());
  const modelReady = isRecognizerAvailable();

  const [labelPhoto, setLabelPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [values, setValues] = useState<Per100>(EMPTY);
  const [readCount, setReadCount] = useState<number | null>(null);
  const [packG, setPackG] = useState('');

  const [name, setName] = useState('');
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [readingName, setReadingName] = useState(false);

  const [eatenG, setEatenG] = useState('');
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForNow());
  const [saving, setSaving] = useState(false);

  const scanLabel = async (source: 'camera' | 'library') => {
    const photo = await takePhoto(source);
    if (!photo) return;
    setLabelPhoto(photo.uri);
    if (!modelReady) return;
    setReading(true);
    try {
      const { values: v, netWeightG } = await readNutritionLabel(photo.uri, photo.width, photo.height);
      const filled = Object.fromEntries(NUTRIENTS.map(({ key }) => [key, v[key] != null ? String(v[key]) : ''])) as Per100;
      setValues(filled);
      setReadCount(Object.values(v).filter((x) => x != null).length);
      if (netWeightG) {
        setPackG(String(netWeightG));
        setEatenG((g) => g || String(netWeightG));
      }
    } catch {
      setReadCount(0);
    } finally {
      setReading(false);
    }
  };

  const scanName = async (source: 'camera' | 'library') => {
    const photo = await takePhoto(source);
    if (!photo) return;
    setReadingName(true);
    try {
      const guess = await readProductName(photo.uri, photo.width, photo.height);
      setSuggestedName(guess || null);
      if (guess) setName(guess);
      setNameConfirmed(false);
    } finally {
      setReadingName(false);
    }
  };

  const kcal100 = Number(values.kcal);
  const grams = Number(eatenG);
  const pack = Number(packG);
  const scale = grams > 0 ? grams / 100 : 0;
  const valid = name.trim().length > 0 && kcal100 > 0 && kcal100 <= 900 && grams > 0;

  const save = async () => {
    setSaving(true);
    const per100 = { protein: Number(values.protein) || 0, carbs: Number(values.carbs) || 0, fat: Number(values.fat) || 0 };
    const extra = (k: 'sugar' | 'satFat' | 'fibre' | 'sodium', factor: number) =>
      values[k].trim() ? Math.round(Number(values[k]) * factor * 10) / 10 : null;
    // Saved to My foods per pack when the pack size is known, otherwise per 100 g.
    const servingG = pack > 0 ? pack : 100;
    const factor = servingG / 100;
    await addCustomFood(db, {
      name: name.trim(),
      serving: pack > 0 ? `1 pack (${pack} g)` : '100 g',
      kcal: Math.round(kcal100 * factor),
      protein: Math.round(per100.protein * factor * 10) / 10,
      carbs: Math.round(per100.carbs * factor * 10) / 10,
      fat: Math.round(per100.fat * factor * 10) / 10,
    }, { sugar: extra('sugar', factor), satFat: extra('satFat', factor), fibre: extra('fibre', factor), sodium: extra('sodium', factor) });
    await addEntry(db, {
      date,
      meal,
      food_id: null,
      name: name.trim(),
      serving: `${grams} g`,
      quantity: 1,
      kcal: Math.round(kcal100 * scale),
      protein: per100.protein * scale,
      carbs: per100.carbs * scale,
      fat: per100.fat * scale,
    });
    success();
    void afterFoodChanged(db);
    router.back();
  };

  const amountOptions = [
    ...(pack > 0 ? [{ value: String(pack), label: `Whole pack · ${pack} g` }, { value: String(Math.round(pack / 2)), label: `Half · ${Math.round(pack / 2)} g` }] : []),
    { value: '30', label: '30 g' },
    { value: '50', label: '50 g' },
    { value: '100', label: '100 g' },
  ];

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Step n={1} title="Nutrition table" done={readCount != null && readCount > 0} />
          <Text style={type.caption}>Photograph the “Nutritional Information” table on the back of the packet.</Text>
          {labelPhoto && (
            <View style={styles.photoWrap}>
              <Image source={{ uri: labelPhoto }} style={styles.photo} />
              <ScanFrame scanning={reading} />
            </View>
          )}
          <View style={styles.row}>
            <Button label={labelPhoto ? 'Retake' : 'Camera'} icon="camera" onPress={() => scanLabel('camera')} style={{ flex: 1 }} />
            <Button label="Gallery" icon="images-outline" variant="secondary" onPress={() => scanLabel('library')} style={{ flex: 1 }} />
          </View>
          {reading && (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.primary} />
              <Text style={type.label}>AI is reading the label…</Text>
            </View>
          )}
          {!modelReady && <Banner tone="warning" text="Label reading needs the installed app. You can still type the values below." />}
          {readCount != null &&
            (readCount > 0 ? (
              <Banner text="Check these match the packet and fix any that are wrong." icon="checkmark-circle" />
            ) : (
              <Banner tone="warning" text="Couldn't read the label — try a sharper, straight-on photo, or type the values." />
            ))}
          <Text style={type.label}>Per 100 g</Text>
          <View style={styles.valuesGrid}>
            {NUTRIENTS.map(({ key, label, unit }) => (
              <ValueField key={key} label={label} unit={unit} value={values[key]} onChange={(v) => setValues({ ...values, [key]: v })} />
            ))}
          </View>
          <ValueField label="Pack size" unit="g" value={packG} onChange={setPackG} wide />
        </Card>

        <Card>
          <Step n={2} title="Product name" done={nameConfirmed} />
          {suggestedName && !nameConfirmed && (
            <View style={styles.suggestion}>
              <Text style={[type.body, { flex: 1 }]}>
                Is this the name? <Text style={{ fontWeight: '700' }}>{suggestedName}</Text>
              </Text>
              <Pressable onPress={() => setNameConfirmed(true)} style={styles.tick} accessibilityLabel="Yes, that's the name">
                <Ionicons name="checkmark" size={22} color={colors.white} />
              </Pressable>
            </View>
          )}
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameConfirmed(t.trim().length > 0);
            }}
            placeholder="e.g. Haldiram's Aloo Bhujia"
            placeholderTextColor={colors.faint}
          />
          <Button
            label={readingName ? 'Reading…' : 'Read name from front of packet'}
            icon="scan"
            variant="secondary"
            loading={readingName}
            disabled={!modelReady}
            onPress={() => scanName('camera')}
          />
        </Card>

        <Card>
          <Step n={3} title="How much did you eat?" done={grams > 0} />
          <ChipRow options={amountOptions} value={eatenG} onChange={setEatenG} />
          <ValueField label="Or type grams" unit="g" value={eatenG} onChange={setEatenG} wide />
          {kcal100 > 0 && grams > 0 && (
            <View style={styles.total}>
              <Text style={styles.totalValue}>{Math.round(kcal100 * scale)} kcal</Text>
              <Text style={type.caption}>
                P {Math.round((Number(values.protein) || 0) * scale)}g · C {Math.round((Number(values.carbs) || 0) * scale)}g · F{' '}
                {Math.round((Number(values.fat) || 0) * scale)}g
              </Text>
            </View>
          )}
          <Text style={type.label}>Meal</Text>
          <ChipRow options={MEALS} value={meal} onChange={setMeal} />
        </Card>

        <Button label="Log it & save to My foods" icon="checkmark" onPress={save} disabled={!valid} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Step({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, done && { backgroundColor: colors.primary }]}>
        {done ? <Ionicons name="checkmark" size={16} color={colors.white} /> : <Text style={styles.stepNumText}>{n}</Text>}
      </View>
      <Text style={type.heading}>{title}</Text>
    </View>
  );
}

function ValueField({ label, unit, value, onChange, wide }: { label: string; unit: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <View style={[styles.valueField, wide && { width: '100%' }]}>
      <Text style={[type.caption, { flex: 1 }]}>{label}</Text>
      <TextInput
        style={styles.valueInput}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.faint}
      />
      <Text style={[type.caption, { width: 30 }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: space.sm },
  photoWrap: { borderRadius: radius.md, overflow: 'hidden' },
  photo: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: colors.cardMuted },
  busy: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  valueField: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
  valueInput: { width: 70, textAlign: 'right', fontSize: 17, fontWeight: '700', color: colors.text, paddingVertical: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontWeight: '800', color: colors.muted },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.primarySoft, padding: space.md, borderRadius: radius.md },
  tick: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: colors.cardMuted, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: colors.text },
  total: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md, gap: 2 },
  totalValue: { fontSize: 26, fontWeight: '800', color: colors.text },
});
