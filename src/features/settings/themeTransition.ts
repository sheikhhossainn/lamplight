import { getReadingTheme, setReadingTheme, type ReadingTheme } from './readingTheme';
import {
  Easing,
  makeMutable,
  ReduceMotion,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// A single mounted overlay (ThemeTransitionOverlay) registers a runner here.
// Callers use requestThemeChange() instead of setReadingTheme() directly so the
// actual token swap happens *hidden behind* a full-screen cover — otherwise the
// screen repaints in the new theme a frame before the cover appears, which
// shows as a wrong-color flash.
type Runner = (next: ReadingTheme) => void;

let runner: Runner | null = null;

export const THEME_TRANSITION_DURATION = 200;
export const THEME_TRANSITION_EASING = Easing.bezier(0.77, 0, 0.175, 1);
export const themeTransitionProgress = makeMutable(getReadingTheme() === 'lamp' ? 1 : 0);

export function registerThemeTransitionRunner(r: Runner | null): void {
  runner = r;
}

export function requestThemeChange(next: ReadingTheme): void {
  const target = next === 'lamp' ? 1 : 0;
  if (next === getReadingTheme() && Math.abs(themeTransitionProgress.get() - target) < 0.001) return;

  themeTransitionProgress.set(withTiming(target, {
    duration: THEME_TRANSITION_DURATION,
    easing: THEME_TRANSITION_EASING,
    reduceMotion: ReduceMotion.System,
  }, (finished) => {
    if (finished) scheduleOnRN(setReadingTheme, next);
  }));
}
