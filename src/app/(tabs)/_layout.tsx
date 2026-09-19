import { type ComponentType, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Tabs } from 'expo-router';

import { HomeIcon, LibraryIcon, SettingsIcon, VocabularyIcon } from '@/components/icons';
import {
  THEME_TRANSITION_DURATION,
  THEME_TRANSITION_EASING,
  themeTransitionProgress,
} from '@/features/settings/themeTransition';
import { useTheme } from '@/theme/ThemeProvider';
import { getCultureThemeColors } from '@/theme/tokens';

type TabIcon = ComponentType<{ color: string; size?: number }>;

type ThemeAwareTabVisualProps = {
  focused: boolean;
  Icon: TabIcon;
};

function ThemeAwareTabIcon({ focused, Icon }: ThemeAwareTabVisualProps) {
  const { cultureTheme } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
  const dayStyle = useAnimatedStyle(() => ({ opacity: 1 - themeTransitionProgress.value }));
  const lampStyle = useAnimatedStyle(() => ({ opacity: themeTransitionProgress.value }));

  return (
    <View style={styles.tabIcon}>
      <Animated.View pointerEvents="none" style={[styles.tabIconLayer, dayStyle]}>
        <Icon color={focused ? dayColors.ink : dayColors.straw} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.tabIconLayer, lampStyle]}>
        <Icon color={focused ? lampColors.ink : lampColors.straw} />
      </Animated.View>
    </View>
  );
}

type ThemeAwareTabLabelProps = {
  focused: boolean;
  label: string;
};

function ThemeAwareTabLabel({ focused, label }: ThemeAwareTabLabelProps) {
  const { cultureTheme, typography } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
  const dayStyle = useAnimatedStyle(() => ({ opacity: 1 - themeTransitionProgress.value }));
  const lampStyle = useAnimatedStyle(() => ({ opacity: themeTransitionProgress.value }));
  const textStyle = {
    fontFamily: typography.eyebrowLabel.fontFamily,
    fontSize: 11,
  };

  return (
    <View style={styles.tabLabel}>
      <Animated.Text numberOfLines={1} style={[styles.tabLabelText, textStyle, { color: focused ? dayColors.ink : dayColors.straw }, dayStyle]}>
        {label}
      </Animated.Text>
      <Animated.Text numberOfLines={1} style={[styles.tabLabelText, textStyle, { color: focused ? lampColors.ink : lampColors.straw }, lampStyle]}>
        {label}
      </Animated.Text>
    </View>
  );
}

function ThemeAwareTabBarBackground() {
  const { cultureTheme, scheme } = useTheme();
  const dayColors = getCultureThemeColors(cultureTheme, 'day');
  const lampColors = getCultureThemeColors(cultureTheme, 'lamp');
  useEffect(() => {
    const target = scheme === 'lamp' ? 1 : 0;
    if (Math.abs(themeTransitionProgress.value - target) > 0.001) {
      themeTransitionProgress.value = withTiming(target, {
        duration: THEME_TRANSITION_DURATION,
        easing: THEME_TRANSITION_EASING,
      });
    }
  }, [scheme]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      themeTransitionProgress.value,
      [0, 1],
      [dayColors.parchment, lampColors.parchment],
    ),
    borderTopColor: interpolateColor(
      themeTransitionProgress.value,
      [0, 1],
      [dayColors.hairline, lampColors.hairline],
    ),
  }));

  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tabBarBackground, animatedStyle]} />;
}

export default function TabsLayout() {
  const { colors, typography, layout } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Tabs are peers: a theme change must not animate focus between them.
        animation: 'none',
        // The tab scene container defaults to white — theme it so navigating
        // into the tabs (e.g. from Onboarding) never flashes white before the
        // screen paints.
        sceneStyle: { backgroundColor: colors.libraryBackground },
        // Custom icon/label layers below own the tint animation. Keeping these
        // stable prevents the navigator from starting a second focus-tint animation.
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
      }}
    >
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
          tabBarIcon: ({ focused }) => <ThemeAwareTabIcon focused={focused} Icon={SettingsIcon} />,
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
