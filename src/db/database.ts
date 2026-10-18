import type { SQLiteDatabase } from 'expo-sqlite';

import type { Food } from '@/data/foods';
import { DEFAULT_PROFILE, directionOf, type Meal, type Profile } from '@/lib/nutrition';

export const DATABASE_NAME = 'bitescan.db';
const DATABASE_VERSION = 6;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal TEXT NOT NULL,
        food_id TEXT,
        name TEXT NOT NULL,
        serving TEXT NOT NULL,
        quantity REAL NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX entries_date ON entries (date);
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }
  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE weights (
        date TEXT PRIMARY KEY NOT NULL,
        kg REAL NOT NULL
      );
    `);
  }
  if (currentVersion < 3) {
    await db.execAsync(`
      CREATE TABLE custom_foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        serving TEXT NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }
  if (currentVersion < 4) {
    // Extra label nutrients for packaged foods (per serving), all optional.
    await db.execAsync(`
      ALTER TABLE custom_foods ADD COLUMN sugar REAL;
      ALTER TABLE custom_foods ADD COLUMN sat_fat REAL;
      ALTER TABLE custom_foods ADD COLUMN fibre REAL;
      ALTER TABLE custom_foods ADD COLUMN sodium REAL;
    `);
  }
  if (currentVersion < 5) {
    // Finished guided workouts, for weekly progress.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        seconds INTEGER NOT NULL,
        kcal REAL NOT NULL,
        moves INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS workouts_date ON workouts (date);
    `);
  }
  if (currentVersion < 6) {
    // Every InBody scan, manual body entry and weigh-in, so progress can be tracked over time.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS body_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        body_fat_pct REAL,
        muscle_kg REAL,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS body_logs_date ON body_logs (date);
      -- Workouts logged by hand: which exercise, and sets × reps × weight for strength work.
      ALTER TABLE workouts ADD COLUMN exercise_id TEXT;
      ALTER TABLE workouts ADD COLUMN sets INTEGER;
      ALTER TABLE workouts ADD COLUMN reps INTEGER;
      ALTER TABLE workouts ADD COLUMN weight_kg REAL;
    `);
    // Start the history with the body numbers already saved, if any.
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'profile'");
    const saved = row ? JSON.parse(row.value) : null;
    if (saved?.bodySource && saved.weightKg) {
      await db.runAsync(
        'INSERT INTO body_logs (date, weight_kg, body_fat_pct, muscle_kg, source, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (saved.bodyMeasuredAt ?? new Date().toISOString()).slice(0, 10),
        saved.weightKg,
        saved.bodyFatPct ?? null,
        saved.skeletalMuscleKg ?? null,
        saved.bodySource,
        Date.now()
      );
    }
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/** A logged item. Nutrition is stored as totals for the quantity eaten, so history
 * stays correct even if the food database values change later. */
export type Entry = {
  id: number;
  date: string;
  meal: Meal;
  food_id: string | null;
  name: string;
  serving: string;
  quantity: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: number;
};

export type NewEntry = Omit<Entry, 'id' | 'created_at'>;

export function getEntriesForDate(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<Entry>(
    'SELECT * FROM entries WHERE date = ? ORDER BY created_at',
    date
  );
}

export async function addEntry(db: SQLiteDatabase, e: NewEntry) {
  await db.runAsync(
    `INSERT INTO entries (date, meal, food_id, name, serving, quantity, kcal, protein, carbs, fat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.date, e.meal, e.food_id, e.name, e.serving, e.quantity,
    e.kcal, e.protein, e.carbs, e.fat, Date.now()
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'profile'"
  );
  if (!row) return DEFAULT_PROFILE;
  const saved = JSON.parse(row.value);
  const profile: Profile = {
    ...DEFAULT_PROFILE,
    ...saved,
    // Merge notification settings too, so switches added in later versions get their defaults.
    notifications: { ...DEFAULT_PROFILE.notifications, ...saved.notifications },
  };
  // Profiles from before goal plans (or a plan that no longer matches the direction) follow the goal.
  if (!saved.goalPlan || directionOf(saved.goalPlan) !== profile.goal) profile.goalPlan = profile.goal;
  return profile;
}

export async function hasProfile(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync("SELECT 1 FROM settings WHERE key = 'profile'");
  return row != null;
}

export async function saveProfile(db: SQLiteDatabase, profile: Profile) {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('profile', ?)",
    JSON.stringify(profile)
  );
}

// ---- History ----

export type DayTotal = { date: string; kcal: number; protein: number; items: number };

/** Calories eaten per day between two dates (inclusive). Days with nothing logged are omitted. */
export function getDailyTotals(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<DayTotal>(
    `SELECT date, SUM(kcal) AS kcal, SUM(protein) AS protein, COUNT(*) AS items
     FROM entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    from,
    to
  );
}

/** Foods that added the most calories between two dates. */
export function getTopFoods(db: SQLiteDatabase, from: string, to: string, limit = 3) {
  return db.getAllAsync<{ name: string; times: number; kcal: number }>(
    `SELECT name, COUNT(*) AS times, SUM(kcal) AS kcal FROM entries
     WHERE date BETWEEN ? AND ? GROUP BY name ORDER BY kcal DESC LIMIT ?`,
    from,
    to,
    limit
  );
}

export type WeightEntry = { date: string; kg: number };

/** One weight per day; logging again the same day replaces it. */
export async function logWeight(db: SQLiteDatabase, date: string, kg: number) {
  await db.runAsync('INSERT OR REPLACE INTO weights (date, kg) VALUES (?, ?)', date, kg);
}

export function getWeights(db: SQLiteDatabase, from: string) {
  return db.getAllAsync<WeightEntry>('SELECT date, kg FROM weights WHERE date >= ? ORDER BY date', from);
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

// ---- My foods: dishes the user added themselves ----

type CustomFoodRow = { id: number; name: string; serving: string; kcal: number; protein: number; carbs: number; fat: number };

/** User-created dishes as Food objects (ids "custom_<n>"), newest first. */
export async function getCustomFoods(db: SQLiteDatabase): Promise<Food[]> {
  const rows = await db.getAllAsync<CustomFoodRow>('SELECT * FROM custom_foods ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: `custom_${r.id}`,
    name: r.name,
    category: 'My Foods',
    serving: r.serving,
    kcal: r.kcal,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
  }));
}

export type LabelExtras = { sugar?: number | null; satFat?: number | null; fibre?: number | null; sodium?: number | null };

export async function addCustomFood(
  db: SQLiteDatabase,
  f: Pick<Food, 'name' | 'serving' | 'kcal' | 'protein' | 'carbs' | 'fat'>,
  extras: LabelExtras = {}
): Promise<Food> {
  const result = await db.runAsync(
    `INSERT INTO custom_foods (name, serving, kcal, protein, carbs, fat, sugar, sat_fat, fibre, sodium, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    f.name, f.serving, f.kcal, f.protein, f.carbs, f.fat,
    extras.sugar ?? null, extras.satFat ?? null, extras.fibre ?? null, extras.sodium ?? null, Date.now()
  );
  return { ...f, id: `custom_${result.lastInsertRowId}`, category: 'My Foods' };
}

export async function deleteCustomFood(db: SQLiteDatabase, foodId: string) {
  await db.runAsync('DELETE FROM custom_foods WHERE id = ?', Number(foodId.replace('custom_', '')));
}

// ---- Workouts: finished guided sessions ----

export type WorkoutLog = {
  id: number;
  date: string;
  title: string;
  seconds: number;
  kcal: number;
  moves: number;
  /** Set for exercises logged by hand. */
  exerciseId?: string | null;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
};

export async function addWorkout(db: SQLiteDatabase, w: Omit<WorkoutLog, 'id'>) {
  await db.runAsync(
    `INSERT INTO workouts (date, title, seconds, kcal, moves, exercise_id, sets, reps, weight_kg, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    w.date, w.title, w.seconds, w.kcal, w.moves, w.exerciseId ?? null, w.sets ?? null, w.reps ?? null, w.weightKg ?? null, Date.now()
  );
}

const WORKOUT_COLUMNS =
  'id, date, title, seconds, kcal, moves, exercise_id AS exerciseId, sets, reps, weight_kg AS weightKg';

/** Workouts on or after a date (YYYY-MM-DD), newest first. */
export async function getWorkoutsSince(db: SQLiteDatabase, fromDate: string): Promise<WorkoutLog[]> {
  return db.getAllAsync<WorkoutLog>(`SELECT ${WORKOUT_COLUMNS} FROM workouts WHERE date >= ? ORDER BY created_at DESC`, fromDate);
}

export async function getWorkoutsForDate(db: SQLiteDatabase, date: string): Promise<WorkoutLog[]> {
  return db.getAllAsync<WorkoutLog>(`SELECT ${WORKOUT_COLUMNS} FROM workouts WHERE date = ? ORDER BY created_at`, date);
}

export async function deleteWorkout(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}

// ---- Body log: InBody scans, manual entries and weigh-ins over time ----

export type BodyLog = {
  id: number;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  muscleKg: number | null;
  source: 'inbody' | 'apple-health' | 'manual' | 'weight';
};

/** Adds a body measurement (one per source per day; a later one that day replaces it). */
export async function addBodyLog(db: SQLiteDatabase, log: Omit<BodyLog, 'id'>) {
  await db.runAsync('DELETE FROM body_logs WHERE date = ? AND source = ?', log.date, log.source);
  await db.runAsync(
    'INSERT INTO body_logs (date, weight_kg, body_fat_pct, muscle_kg, source, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    log.date, log.weightKg, log.bodyFatPct, log.muscleKg, log.source, Date.now()
  );
  await logWeight(db, log.date, log.weightKg);
}

/** All body measurements, oldest first. */
export function getBodyLogs(db: SQLiteDatabase): Promise<BodyLog[]> {
  return db.getAllAsync<BodyLog>(
    `SELECT id, date, weight_kg AS weightKg, body_fat_pct AS bodyFatPct, muscle_kg AS muscleKg, source
     FROM body_logs ORDER BY date, created_at`
  );
}
