import { Tabs } from 'expo-router';

import { LibraryIcon, SettingsIcon, VocabularyIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors, typography, layout } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Crossfade between tabs instead of an instant cut.
        animation: 'fade',
        // The tab scene container defaults to white — theme it so navigating
        // into the tabs (e.g. from Onboarding) never flashes white before the
        // screen paints.
        sceneStyle: { backgroundColor: colors.libraryBackground },
        // `ink` flips with the theme (charcoal in Day, cream in Lamp) so the
        // active tab stays visible; `primaryDark` used to vanish on the dark bar.
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.straw,
        tabBarStyle: {
          height: layout.tabBarHeight,
          backgroundColor: colors.parchment,
          borderTopColor: colors.hairline,
        },
        tabBarLabelStyle: {
          fontFamily: typography.eyebrowLabel.fontFamily,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <LibraryIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: 'Vocabulary',
          tabBarIcon: ({ color }) => <VocabularyIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
