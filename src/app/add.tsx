import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ChipRow, Pill } from '@/components/ui';
import { addCustomFood, addEntry, deleteCustomFood, getCustomFoods, getProfile } from '@/db/database';
import { success } from '@/lib/haptics';
import { saveTrainingPhoto } from '@/lib/trainingPhotos';
import { afterFoodChanged } from '@/lib/notifications';
import { findFood, searchFoods, type Food } from '@/data/foods';
import { MEALS, mealForNow, toDateKey, type Meal } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

const QUICK_QUANTITIES = [0.5, 1, 1.5, 2, 3].map((q) => ({ value: q, label: `${q}×` }));

export default function AddFoodScreen() {
  // foodId is set when coming from the camera scan with a dish already recognised.
  // photoUri is the scanned photo, saved as a labelled training photo once the user logs a dish.
  const params = useLocalSearchParams<{ date?: string; meal?: Meal; foodId?: string; photoUri?: string; count?: string }>();
  const date = params.date ?? toDateKey(new Date());
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForNow());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(
    () => (params.foodId ? findFood(params.foodId) : undefined) ?? null
  );
  const [quickAdd, setQuickAdd] = useState(false);
  const db = useSQLiteContext();
  const [myFoods, setMyFoods] = useState<Food[]>([]);

  const loadMyFoods = useCallback(() => {
    getCustomFoods(db).then(setMyFoods);
  }, [db]);
  useEffect(loadMyFoods, [loadMyFoods]);

  // The user's own dishes come first, then the built-in list.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mine = q ? myFoods.filter((f) => f.name.toLowerCase().includes(q)) : myFoods;
    return [...mine, ...searchFoods(query)];
  }, [query, myFoods]);

  const confirmDelete = (food: Food) =>
    Alert.alert('Delete from My foods?', food.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomFood(db, food.id);
          loadMyFoods();
        },
      },
    ]);

  if (selected) {
    return (
      <PortionPicker
        food={selected}
        date={date}
        meal={meal}
        photoUri={params.photoUri}
        counted={params.count && params.foodId === selected.id ? Number(params.count) : undefined}
        onMealChange={setMeal}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (quickAdd) {
    return (
      <CreateFood
        initialName={query}
        onBack={() => setQuickAdd(false)}
        onCreated={(food) => {
          loadMyFoods();
          setQuickAdd(false);
          setSelected(food);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Dosa, biryani, uppittu…"
          placeholderTextColor={colors.faint}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <Pressable
        style={styles.packetRow}
        onPress={() => router.replace({ pathname: '/label', params: { date, meal } })}>
        <Ionicons name="barcode-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { fontWeight: '600' }]}>Scan a food packet</Text>
          <Text style={type.caption}>Chips, biscuits, namkeen — read the nutrition label</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressable>
      <FlatList
        data={results}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.foodRow, pressed && { opacity: 0.6 }]}
            onPress={() => setSelected(item)}
            onLongPress={item.category === 'My Foods' ? () => confirmDelete(item) : undefined}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.body}>{item.name}</Text>
              <Text style={type.caption}>
                {item.serving}
                {item.approximate ? ' · approx.' : ''}
                {item.category === 'My Foods' ? ' · My food' : ''}
              </Text>
            </View>
            <Text style={styles.foodKcal}>{item.kcal}</Text>
            <Text style={type.caption}>kcal</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No dish called “{query}” yet.</Text>}
        ListFooterComponent={
          <Pressable style={styles.quickAddRow} onPress={() => setQuickAdd(true)}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.quickAddText}>{query ? `Create “${query}” as a new food` : 'Create a new food'}</Text>
          </Pressable>
        }
      />
    </View>
  );
}

type PickerProps = {
  food: Food;
  photoUri?: string;
  /** Pieces the model counted in the photo, if any. */
  counted?: number;
  date: string;
  meal: Meal;
  onMealChange: (m: Meal) => void;
  onBack: () => void;
};

function PortionPicker({ food, date, meal, photoUri, counted, onMealChange, onBack }: PickerProps) {
  const db = useSQLiteContext();
  const [quantity, setQuantity] = useState(counted ?? 1);
  const [saving, setSaving] = useState(false);
  const scaled = {
    kcal: food.kcal * quantity,
    protein: food.protein * quantity,
    carbs: food.carbs * quantity,
    fat: food.fat * quantity,
  };

  const save = async () => {
    setSaving(true);
    await addEntry(db, { date, meal, food_id: food.id, name: food.name, serving: food.serving, quantity, ...scaled });
    if (photoUri && (await getProfile(db)).collectPhotos) saveTrainingPhoto(photoUri, food);
    success();
    void afterFoodChanged(db);
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.pickerContent}>
      <Stack.Screen options={{ title: food.name }} />
      <Pressable style={styles.backLink} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>All foods</Text>
      </Pressable>

      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Text style={styles.bigKcal}>{Math.round(scaled.kcal)}</Text>
        <Text style={type.label}>kcal</Text>
        <View style={styles.macroChips}>
          <Pill label={`P ${Math.round(scaled.protein)}g`} color={colors.protein} bg={colors.cardMuted} />
          <Pill label={`C ${Math.round(scaled.carbs)}g`} color={colors.carbs} bg={colors.cardMuted} />
          <Pill label={`F ${Math.round(scaled.fat)}g`} color={colors.fat} bg={colors.cardMuted} />
        </View>
        <Text style={type.caption}>
          1 serving = {food.serving}
          {food.grams ? ` (~${food.grams} g)` : ''}
          {food.approximate ? ' · approximate values (INDB)' : ''}
        </Text>
      </Card>

      <Card>
        <Text style={type.heading}>How much?</Text>
        {counted != null && (
          <View style={styles.countedRow}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={[type.label, { color: colors.primary, flex: 1 }]}>
              AI counted {counted} in your photo — change it if needed.
            </Text>
          </View>
        )}
        <View style={styles.stepper}>
          <Pressable style={styles.stepButton} onPress={() => setQuantity((q) => Math.max(0.5, q - 0.5))}>
            <Ionicons name="remove" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.stepValue}>{quantity}</Text>
            <Text style={type.caption}>× {food.serving}</Text>
          </View>
          <Pressable style={styles.stepButton} onPress={() => setQuantity((q) => q + 0.5)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </Pressable>
        </View>
        <ChipRow options={QUICK_QUANTITIES} value={quantity} onChange={setQuantity} />
      </Card>

      <Card>
        <Text style={type.heading}>Meal</Text>
        <ChipRow options={MEALS} value={meal} onChange={onMealChange} />
      </Card>

      <Button label="Add to today" icon="checkmark" onPress={save} loading={saving} />
    </ScrollView>
  );
}

type CreateFoodProps = {
  initialName: string;
  onBack: () => void;
  onCreated: (food: Food) => void;
};

/** Saves a dish that isn't in the list to "My foods", then opens it to log a portion. */
function CreateFood({ initialName, onBack, onCreated }: CreateFoodProps) {
  const db = useSQLiteContext();
  const [name, setName] = useState(initialName);
  const [serving, setServing] = useState('1 plate');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const kcalNum = Number(kcal);
  const valid = name.trim().length > 0 && serving.trim().length > 0 && kcalNum > 0 && kcalNum < 5000;

  const save = async () => {
    setSaving(true);
    const food = await addCustomFood(db, {
      name: name.trim(),
      serving: serving.trim(),
      kcal: kcalNum,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    onCreated(food);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.pickerContent} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: 'New food' }} />
        <Pressable style={styles.backLink} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>All foods</Text>
        </Pressable>
        <Card>
          <Text style={type.heading}>{"Add a dish that isn't listed"}</Text>
          <Text style={type.caption}>It is saved to My foods on your phone, so next time just search for it.</Text>
          <Text style={type.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Amma's ghee roast dosa" placeholderTextColor={colors.faint} />
          <Text style={type.label}>One serving is</Text>
          <TextInput style={styles.input} value={serving} onChangeText={setServing} placeholder="e.g. 1 plate, 1 piece, 1 bowl" placeholderTextColor={colors.faint} />
          <Text style={type.label}>Calories per serving (kcal)</Text>
          <TextInput style={styles.input} value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="e.g. 400" placeholderTextColor={colors.faint} />
          <Text style={type.label}>Protein / carbs / fat per serving, grams (optional)</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <TextInput style={[styles.input, { flex: 1 }]} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="Protein" placeholderTextColor={colors.faint} />
            <TextInput style={[styles.input, { flex: 1 }]} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="Carbs" placeholderTextColor={colors.faint} />
            <TextInput style={[styles.input, { flex: 1 }]} value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="Fat" placeholderTextColor={colors.faint} />
          </View>
        </Card>
        <Button label="Save and log it" icon="checkmark" onPress={save} disabled={!valid} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  countedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 10, padding: 10 },
  screen: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    margin: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 17, color: colors.text },
  packetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    padding: space.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  list: { marginHorizontal: space.lg, paddingBottom: 48 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
  foodKcal: { fontSize: 16, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  empty: { color: colors.muted, textAlign: 'center', marginTop: space.xl },
  quickAddRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.lg },
  quickAddText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  pickerContent: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  bigKcal: { fontSize: 52, fontWeight: '800', color: colors.text, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  macroChips: { flexDirection: 'row', gap: space.sm, marginVertical: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontSize: 30, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  input: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
