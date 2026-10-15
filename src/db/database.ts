import type { SQLiteDatabase } from 'expo-sqlite';

import type { Food } from '@/data/foods';
import { DEFAULT_PROFILE, type Meal, type Profile } from '@/lib/nutrition';

export const DATABASE_NAME = 'bitescan.db';
const DATABASE_VERSION = 3;

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
  return { ...DEFAULT_PROFILE, ...JSON.parse(row.value) };
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

export async function addCustomFood(
  db: SQLiteDatabase,
  f: Pick<Food, 'name' | 'serving' | 'kcal' | 'protein' | 'carbs' | 'fat'>
): Promise<Food> {
  const result = await db.runAsync(
    'INSERT INTO custom_foods (name, serving, kcal, protein, carbs, fat, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    f.name, f.serving, f.kcal, f.protein, f.carbs, f.fat, Date.now()
  );
  return { ...f, id: `custom_${result.lastInsertRowId}`, category: 'My Foods' };
}

export async function deleteCustomFood(db: SQLiteDatabase, foodId: string) {
  await db.runAsync('DELETE FROM custom_foods WHERE id = ?', Number(foodId.replace('custom_', '')));
}
