import { useEffect, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';

import { HomeIcon, LibraryIcon, SettingsIcon, VocabularyIcon } from '@/components/icons';
import { UserAvatar } from '@/components/UserAvatar';
import { refreshUserAvatar, useUserAvatar } from '@/features/account/userAvatar';
import { useTheme } from '@/theme/ThemeProvider';

type TabIcon = ComponentType<{ color: string; size?: number }>;

type ThemeAwareTabVisualProps = {
  focused: boolean;
  Icon: TabIcon;
};

export function ThemeAwareTabIcon({ focused, Icon }: ThemeAwareTabVisualProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.tabIcon}>
      <Icon color={focused ? colors.ink : colors.straw} />
    </View>
  );
}

function SettingsTabVisual({ focused }: { focused: boolean }) {
  const { isAuthenticated, avatar } = useUserAvatar();

  useEffect(() => {
    void refreshUserAvatar();
  }, []);

  if (!isAuthenticated) {
    return <ThemeAwareTabIcon focused={focused} Icon={SettingsIcon} />;
  }

  return (
    <View style={styles.tabIcon}>
      <UserAvatar
        avatar={avatar}
        size={22}
        focused={focused}
        border
      />
    </View>
  );
}

export type ThemeAwareTabLabelProps = {
  focused: boolean;
  label: string;
};

export function ThemeAwareTabLabel({ focused, label }: ThemeAwareTabLabelProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.tabLabel}>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabelText,
          {
            fontFamily: typography.eyebrowLabel.fontFamily,
            fontSize: 11,
            color: focused ? colors.ink : colors.straw,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ThemeAwareTabBarBackground() {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.tabBarBackground,
        {
          backgroundColor: colors.parchment,
          borderTopColor: colors.hairline,
        },
      ]}
    />
  );
}

export function getSharedTabScreenOptions(theme: ReturnType<typeof useTheme>) {
  const { colors, typography, layout } = theme;
  return {
    headerShown: false,
    animation: 'none' as const,
    freezeOnBlur: true,
    sceneStyle: { backgroundColor: colors.libraryBackground },
    tabBarActiveTintColor: colors.ink,
    tabBarInactiveTintColor: colors.straw,
    tabBarBackground: ThemeAwareTabBarBackground,
    tabBarStyle: {
      height: layout.tabBarHeight,
      backgroundColor: 'transparent',
      borderTopColor: 'transparent',
      borderTopWidth: 0,
    },
    tabBarLabelStyle: {
      fontFamily: typography.eyebrowLabel.fontFamily,
      fontSize: 11,
    },
  };
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs screenOptions={getSharedTabScreenOptions(theme)}>
      <Tabs.Screen
        name="homescreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <ThemeAwareTabIcon focused={focused} Icon={HomeIcon} />,
          tabBarLabel: ({ focused }) => <ThemeAwareTabLabel focused={focused} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => <ThemeAwareTabIcon focused={focused} Icon={LibraryIcon} />,
          tabBarLabel: ({ focused }) => <ThemeAwareTabLabel focused={focused} label="Library" />,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: 'Notebook',
          tabBarIcon: ({ focused }) => <ThemeAwareTabIcon focused={focused} Icon={VocabularyIcon} />,
          tabBarLabel: ({ focused }) => <ThemeAwareTabLabel focused={focused} label="Notebook" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <SettingsTabVisual focused={focused} />,
          tabBarLabel: ({ focused }) => <ThemeAwareTabLabel focused={focused} label="Settings" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabIcon: {
    height: 22,
    width: 22,
  },
  tabIconLayer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tabLabel: {
    height: 15,
  },
  tabLabelText: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    top: 0,
  },
});
