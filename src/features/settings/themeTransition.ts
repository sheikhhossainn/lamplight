import { getReadingTheme, setReadingTheme, type ReadingTheme } from './readingTheme';
import {
  cancelAnimation,
  Easing,
  makeMutable,
  ReduceMotion,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// The single canonical theme transition driver for the entire app.
// 0 = day, 1 = lamp/night.
// 220ms snappy cubic bezier for buttery-smooth 60/120fps motion.
export const THEME_TRANSITION_DURATION = 220;
export const THEME_TRANSITION_EASING = Easing.bezier(0.22, 1, 0.36, 1);
export const themeTransitionProgress = makeMutable(getReadingTheme() === 'lamp' ? 1 : 0);

type Runner = (next: ReadingTheme) => void;
let runner: Runner | null = null;

export function registerThemeTransitionRunner(r: Runner | null): void {
  runner = r;
}

export function requestThemeChange(next: ReadingTheme): void {
  const target = next === 'lamp' ? 1 : 0;
  if (next === getReadingTheme() && Math.abs(themeTransitionProgress.value - target) < 0.001) return;

  // Immediately update reading theme so React synchronizes tokens cleanly
  setReadingTheme(next);

  cancelAnimation(themeTransitionProgress);
  themeTransitionProgress.value = withTiming(
    target,
    {
      duration: THEME_TRANSITION_DURATION,
      easing: THEME_TRANSITION_EASING,
      reduceMotion: ReduceMotion.System,
    },
  );
}
