import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { setReadingTheme } from '@/features/settings/readingTheme';
import { registerThemeTransitionRunner } from '@/features/settings/themeTransition';

// The whole-app day<->night crossfade. Rather than a visible dip-to-color (which
// reads as two flashes: cover in, cover out), it covers the screen *instantly*
// with the color being left behind — identical to what's already on screen, so
// nothing visibly changes — swaps the theme hidden underneath on the next
// frame, then dissolves that cover once to reveal the newly-themed app. One
// continuous fade.
const LIGHT_BG = '#F5EDE1';
const DARK_BG = '#1C1B1E';

export function ThemeTransitionOverlay() {
  const opacity = useSharedValue(0);
  const coverColor = useSharedValue(LIGHT_BG);
  const [active, setActive] = useState(false);

  useEffect(() => {
    registerThemeTransitionRunner((next) => {
      // The color we're leaving (switching TO lamp means leaving day = light).
      // Both shared values update on the UI thread instantly and in the same
      // frame, so there's no stale-color flash.
      coverColor.value = next === 'lamp' ? LIGHT_BG : DARK_BG;
      opacity.value = 1;
      setActive(true);
      // Swap on the next frame, once the cover is guaranteed painted.
      requestAnimationFrame(() => {
        setReadingTheme(next);
        opacity.value = withTiming(0, { duration: 520, easing: Easing.inOut(Easing.ease) }, (done) => {
          if (done) runOnJS(setActive)(false);
        });
      });
    });
    return () => registerThemeTransitionRunner(null);
  }, [opacity, coverColor]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: coverColor.value,
  }));

  return <Animated.View pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, style]} />;
}
