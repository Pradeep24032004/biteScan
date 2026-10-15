// Local notifications only: everything is scheduled on the phone, no push server.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getEntriesForDate, getProfile, getSetting, setSetting } from '@/db/database';
import { analyseHistory } from '@/lib/history';
import { calculateTarget, toDateKey } from '@/lib/nutrition';

let configured = false;

/** Show banners even while BiteScan is open. Call once at startup. */
export function configureNotifications() {
  if (configured) return;
  configured = true;
  if (Platform.OS === 'android') {
    // Android 8+ shows nothing without a channel.
    void Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders and alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

function at(hour: number, minute: number, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function scheduleAt(date: Date, title: string, body: string) {
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

/**
 * Re-plans every upcoming reminder from today's log and recent history.
 * Cheap and idempotent: call on app open and after any food or weight change.
 */
export async function refreshReminders(db: SQLiteDatabase) {
  try {
    if (!(await notificationsAllowed())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const profile = await getProfile(db);
    const prefs = profile.notifications;
    const today = toDateKey(new Date());
    const entries = await getEntriesForDate(db, today);
    const eaten = Math.round(entries.reduce((s, e) => s + e.kcal, 0));
    const target = calculateTarget(profile);
    const has = (meal: string) => entries.some((e) => e.meal === meal);

    if (prefs.eveningSummary) {
      const left = target - eaten;
      const body =
        entries.length === 0
          ? "You haven't logged anything today. Take a minute to add your meals."
          : left >= 0
            ? `${eaten.toLocaleString('en-IN')} kcal eaten, ${left.toLocaleString('en-IN')} left. Nice work today!`
            : `${eaten.toLocaleString('en-IN')} kcal eaten, ${Math.abs(left).toLocaleString('en-IN')} over your target.`;
      await scheduleAt(at(21, 0), 'Your day so far', body);
      await scheduleAt(at(21, 0, 1), 'How did today go?', 'Open BiteScan to check your calories for the day.');
    }

    if (prefs.mealReminders) {
      if (!has('lunch')) await scheduleAt(at(14, 30), 'Lunch time?', 'Snap your lunch to log it in seconds.');
      if (!has('dinner')) await scheduleAt(at(21, 30), "Don't forget dinner", 'Log dinner so your day is complete.');
    }

    const history = await analyseHistory(db, profile);
    if (prefs.goalCheck) {
      if (history.drifting) {
        const insight = history.insights.find((i) => i.tone === 'warning');
        await scheduleAt(at(9, 0, 1), 'Getting back on track', insight?.body ?? 'Recent days are moving away from your goal.');
      } else if (history.streak >= 3) {
        await scheduleAt(at(9, 0, 1), `${history.streak}-day streak 🎉`, 'You have hit your target every day. Keep it up!');
      }
      if (history.daysSinceLog >= 1) {
        await scheduleAt(at(12, 0, 1), 'We miss you', 'Log a meal today to keep your goal on track.');
      }
    }
  } catch {
    // Notifications are a convenience; never break the app over them.
  }
}

/** Call after logging or deleting food: alerts once a day when today goes over target. */
export async function afterFoodChanged(db: SQLiteDatabase) {
  try {
    const profile = await getProfile(db);
    const today = toDateKey(new Date());
    if (profile.notifications.overTarget && (await notificationsAllowed())) {
      const entries = await getEntriesForDate(db, today);
      const eaten = Math.round(entries.reduce((s, e) => s + e.kcal, 0));
      const target = calculateTarget(profile);
      if (eaten > target && (await getSetting(db, 'overAlertDate')) !== today) {
        await setSetting(db, 'overAlertDate', today);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Over your daily target',
            body: `${eaten.toLocaleString('en-IN')} of ${target.toLocaleString('en-IN')} kcal. A light dinner or a walk will balance it out.`,
          },
          trigger: null,
        });
      }
    }
  } catch {
    // ignore
  }
  await refreshReminders(db);
}
