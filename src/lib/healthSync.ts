import type { SQLiteDatabase } from 'expo-sqlite';

import { getProfile, saveProfile } from '@/db/database';
import { readLatestBody } from '@/lib/health';
import type { Profile } from '@/lib/nutrition';

const AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000;

/** Copies the latest Apple Health body measurements into the saved profile. */
export async function syncProfileFromHealth(db: SQLiteDatabase): Promise<Profile> {
  const [profile, body] = await Promise.all([getProfile(db), readLatestBody()]);
  const measuredAt = body.measuredAt?.toISOString() ?? null;
  // A newer Apple Health reading supersedes BMR/muscle numbers pasted from an older InBody sheet.
  const newer = measuredAt != null && (profile.bodyMeasuredAt == null || measuredAt > profile.bodyMeasuredAt);
  const updated: Profile = {
    ...profile,
    weightKg: body.weightKg ?? profile.weightKg,
    heightCm: body.heightCm ?? profile.heightCm,
    bodyFatPct: body.bodyFatPct ?? profile.bodyFatPct,
    ...(newer ? { bmrKcal: null, skeletalMuscleKg: null, bodySource: 'apple-health' as const, bodyMeasuredAt: measuredAt } : {}),
    lastHealthSync: {
      syncedAt: new Date().toISOString(),
      measuredAt: body.measuredAt?.toISOString() ?? null,
      source: body.source,
      leanMassKg: body.leanMassKg,
    },
  };
  await saveProfile(db, updated);
  return updated;
}

/** Runs the sync at most once an hour, and only if the user turned auto-sync on. */
export async function autoSyncIfDue(db: SQLiteDatabase): Promise<boolean> {
  const profile = await getProfile(db);
  if (!profile.autoSyncHealth) return false;
  const last = profile.lastHealthSync ? Date.parse(profile.lastHealthSync.syncedAt) : 0;
  if (Date.now() - last < AUTO_SYNC_INTERVAL_MS) return false;
  try {
    await syncProfileFromHealth(db);
    return true;
  } catch {
    return false;
  }
}
