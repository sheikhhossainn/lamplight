import React from 'react';
import { Tabs } from 'expo-router';

import {
  DocumentTextIcon,
  JapaneseThemeIcon,
  ReloadIcon,
} from '@/components/icons';
import {
  getSharedTabScreenOptions,
  ThemeAwareTabIcon,
  ThemeAwareTabLabel,
} from '@/app/(tabs)/_layout';
import { useTheme } from '@/theme/ThemeProvider';

export default function LearnTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs screenOptions={getSharedTabScreenOptions(theme)}>
      <Tabs.Screen
        name="path"
        options={{
          title: 'Path',
          tabBarIcon: ({ focused }) => (
            <ThemeAwareTabIcon focused={focused} Icon={JapaneseThemeIcon} />
          ),
          tabBarLabel: ({ focused }) => (
            <ThemeAwareTabLabel focused={focused} label="Path" />
          ),
        }}
      />
      <Tabs.Screen
        name="grammar"
        options={{
          title: 'Grammar',
          tabBarIcon: ({ focused }) => (
            <ThemeAwareTabIcon focused={focused} Icon={DocumentTextIcon} />
          ),
          tabBarLabel: ({ focused }) => (
            <ThemeAwareTabLabel focused={focused} label="Grammar" />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ focused }) => (
            <ThemeAwareTabIcon focused={focused} Icon={ReloadIcon} />
          ),
          tabBarLabel: ({ focused }) => (
            <ThemeAwareTabLabel focused={focused} label="Practice" />
          ),
        }}
      />
    </Tabs>
  );
}
