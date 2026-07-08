import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { LamplightColor } from '@/theme/tokens';

type PageTurnFlashProps = {
  pageKey: number;
};

// Lightweight stand-in for the fold-motif page-curl transition: a brief
// corner flash rather than a full 3D page-flip simulation — calm, not showy,
// per the "no bounce/overshoot" motion rule.
export function PageTurnFlash({ pageKey }: PageTurnFlashProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.45, { duration: 120 }),
      withTiming(0, { duration: 260 }),
    );
  }, [pageKey, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View pointerEvents="none" style={[styles.curl, style]} />;
}

const styles = StyleSheet.create({
  curl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    backgroundColor: LamplightColor.flameAmber,
    borderTopLeftRadius: 56,
  },
});
