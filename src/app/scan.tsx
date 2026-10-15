import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Pill } from '@/components/ui';
import { isRecognizerAvailable, recognizeDish, warmUpRecognizer, type Suggestion } from '@/lib/dishRecognizer';
import type { Meal } from '@/lib/nutrition';
import { colors, radius, space, type } from '@/lib/theme';

const LOW_CONFIDENCE = 0.35;

const modelReady = isRecognizerAvailable();

export default function ScanScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  // The ≤512px copy the model saw; passed on so the logged dish can be saved as a training photo.
  const [modelPhoto, setModelPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (modelReady) warmUpRecognizer();
  }, []);

  const pick = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Allow camera access in Settings to scan your food.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;

    const { uri, width, height } = result.assets[0];
    setPhotoUri(uri);
    setSuggestions(null);
    setBusy(true);
    try {
      const result = await recognizeDish(uri, width, height);
      setSuggestions(result.suggestions);
      setModelPhoto(result.photoUri);
    } catch (e) {
      Alert.alert('Could not recognise the photo', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const choose = (foodId?: string) =>
    router.replace({
      pathname: '/add',
      params: { ...params, ...(foodId ? { foodId } : {}), ...(modelPhoto ? { photoUri: modelPhoto } : {}) },
    });

  if (!modelReady) {
    return (
      <View style={styles.center}>
        <View style={styles.bigIcon}>
          <Ionicons name="sparkles-outline" size={36} color={colors.primary} />
        </View>
        <Text style={[type.title, { textAlign: 'center' }]}>Scanning needs the full app</Text>
        <Text style={[type.label, { textAlign: 'center' }]}>
          {'The food-recognition model runs on your phone, so it only works in the installed BiteScan app, ' +
            'not in Expo Go. You can still search for any dish.'}
        </Text>
        <Button label="Search food instead" icon="search" onPress={() => choose()} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  // The LFM answer has no score; fall back to EfficientNet's confidence when it's the only signal.
  const top = suggestions?.[0];
  const unsure =
    suggestions != null && (top == null || (top.source === 'efficientnet' && (top.confidence ?? 0) < LOW_CONFIDENCE));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} />
      ) : (
        <Pressable style={[styles.photo, styles.placeholder]} onPress={() => pick('camera')}>
          <Ionicons name="camera-outline" size={48} color={colors.primary} />
          <Text style={type.heading}>Take a photo of your plate</Text>
          <Text style={[type.label, { textAlign: 'center' }]}>One dish filling most of the frame works best.</Text>
        </Pressable>
      )}

      <View style={styles.row}>
        <Button label={photoUri ? 'Retake' : 'Camera'} icon="camera" onPress={() => pick('camera')} style={{ flex: 1 }} />
        <Button label="Gallery" icon="images-outline" variant="secondary" onPress={() => pick('library')} style={{ flex: 1 }} />
      </View>

      {busy && (
        <Card style={styles.busy}>
          <ActivityIndicator color={colors.primary} />
          <Text style={type.label}>Recognising your food…</Text>
        </Card>
      )}

      {suggestions && (
        <Card style={{ gap: 0 }}>
          <Text style={[type.heading, { marginBottom: space.sm }]}>
            {unsure ? 'Not sure — is it one of these?' : 'Is this your food?'}
          </Text>
          {suggestions.map(({ food, confidence, source }, i) => (
            <Pressable key={food.id} style={[styles.suggestion, i === 0 && styles.firstSuggestion]} onPress={() => choose(food.id)}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.body, i === 0 && { fontWeight: '700' }]}>{food.name}</Text>
                <Text style={type.caption}>
                  {food.serving} · {food.kcal} kcal
                </Text>
              </View>
              {source === 'lfm' ? (
                <Pill label="Best match" />
              ) : (
                <Text style={[type.label, type.number]}>{Math.round((confidence ?? 0) * 100)}%</Text>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
          <Pressable style={styles.suggestion} onPress={() => choose()}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <Text style={[type.body, { color: colors.primary, fontWeight: '600', flex: 1 }]}>None of these — search</Text>
          </Pressable>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md, backgroundColor: colors.background },
  bigIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.card },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', gap: space.sm },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  firstSuggestion: { borderTopWidth: 0 },
});
