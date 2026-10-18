import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';

import { colors } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 8,
          shadowColor: '#2B2A24',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 4 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'restaurant' : 'restaurant-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'flag' : 'flag-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'barbell' : 'barbell-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Body',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'body' : 'body-outline'} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

/** Tab icon that sits in a soft green pill when selected. */
function TabIcon({ name, color, focused }: { name: ComponentProps<typeof Ionicons>['name']; color: ColorValue; focused: boolean }) {
  return (
    <View
      style={{
        width: 56,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primarySoft : 'transparent',
      }}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}
