import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { LibraryIcon, SparkleIcon } from '@/components/icons';
import { useLearnSpaceAvailable } from '@/features/learn/availability';
import { switchToLearn, switchToRead } from '@/features/learn/appMode';
import { useMotherTongue } from '@/features/settings/motherTongue';
import { useTheme } from '@/theme/ThemeProvider';

export type ModeSwitchProps = {
  active: 'read' | 'learn';
  style?: any;
};

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 260,
  mass: 0.7,
};

export function ModeSwitch({ active, style }: ModeSwitchProps) {
  const isAvailable = useLearnSpaceAvailable();
  const motherTongue = useMotherTongue();
  const { colors, typography, scheme } = useTheme();
  const isLamp = scheme === 'lamp';
  const reducedMotion = useReducedMotion();
  const isRTL = motherTongue === 'ar';

  const [segmentWidth, setSegmentWidth] = useState(88);
  const activeIndex = active === 'read' ? 0 : 1;
  const translateX = useSharedValue(activeIndex * segmentWidth);

  useEffect(() => {
    const targetX = activeIndex * segmentWidth;
    if (reducedMotion) {
      translateX.value = targetX;
    } else {
      translateX.value = withSpring(targetX, SPRING_CONFIG);
    }
  }, [activeIndex, segmentWidth, reducedMotion, translateX]);

  if (!isAvailable) {
    return null;
  }

  const handleSelect = (mode: 'read' | 'learn') => {
    if (mode === active) return;
    void Haptics.selectionAsync().catch(() => {});
    if (mode === 'learn') {
      switchToLearn();
    } else {
      switchToRead();
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onEnd((e) => {
      if (e.translationX > 24) {
        // Swiped right -> switch to learn if currently in read
        runOnJS(handleSelect)('learn');
      } else if (e.translationX < -24) {
        // Swiped left -> switch to read if currently in learn
        runOnJS(handleSelect)('read');
      }
    });

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  const indicatorColor = colors.flameAmber;
  const activeTextColor = colors.primaryDark;
  const inactiveTextColor = isLamp ? colors.umber : '#736B60';

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLamp ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            borderColor: isLamp ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            alignSelf: isRTL ? 'flex-end' : 'flex-start',
            marginBottom: active === 'read' ? 12 : 0,
          },
          style,
        ]}
        accessibilityRole="tablist"
      >
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: indicatorColor },
            indicatorStyle,
          ]}
        />

        {/* Read Segment */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Reading space"
          accessibilityState={{ selected: active === 'read' }}
          hitSlop={6}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setSegmentWidth(w);
          }}
          onPress={() => handleSelect('read')}
          style={styles.segment}
        >
          <LibraryIcon
            color={active === 'read' ? activeTextColor : inactiveTextColor}
            size={15}
          />
          <Text
            style={[
              typography.uiRowTitle,
              styles.label,
              {
                color: active === 'read' ? activeTextColor : inactiveTextColor,
                fontWeight: active === 'read' ? '700' : '500',
              },
            ]}
          >
            Read
          </Text>
        </Pressable>

        {/* Learn Segment */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Learning space"
          accessibilityState={{ selected: active === 'learn' }}
          hitSlop={6}
          onPress={() => handleSelect('learn')}
          style={styles.segment}
        >
          <SparkleIcon
            color={active === 'learn' ? activeTextColor : inactiveTextColor}
            size={14}
          />
          <Text
            style={[
              typography.uiRowTitle,
              styles.label,
              {
                color: active === 'learn' ? activeTextColor : inactiveTextColor,
                fontWeight: active === 'learn' ? '700' : '500',
              },
            ]}
          >
            Learn
          </Text>
        </Pressable>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 16,
    zIndex: 0,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 36,
    zIndex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
});
