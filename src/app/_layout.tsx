import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/database';
import { configureNotifications } from '@/lib/notifications';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  useEffect(() => {
    configureNotifications();
  }, []);

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Add food' }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan food' }} />
        <Stack.Screen name="body-input" options={{ presentation: 'modal', title: 'Body numbers' }} />
        <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise', headerBackTitle: 'Back' }} />
      </Stack>
    </SQLiteProvider>
  );
}
