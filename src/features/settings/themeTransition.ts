import {
  getReadingTheme,
  setReadingTheme,
  subscribeToReadingTheme,
  type ReadingTheme,
} from './readingTheme';
import {
  cancelAnimation,
  Easing,
  makeMutable,
  ReduceMotion,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Symmetric ease-in-out: a dissolve that starts and lands gently. Front-loaded
// curves do most of their change in the first 2-3 frames, which reads as a jump.
export const THEME_TRANSITION_DURATION = 300;
export const THEME_TRANSITION_EASING = Easing.inOut(Easing.cubic);

const initialProgress = getReadingTheme() === 'lamp' ? 1 : 0;
// 0 = day, 1 = lamp. Drives theme *colors* on UI-thread styles. Snaps to the new
// theme under the transition overlay's snapshot so the live UI underneath is
// always internally consistent (text and backgrounds from the same theme).
export const themeTransitionProgress = makeMutable(initialProgress);
// 0 = day, 1 = lamp. Drives the Day/Night switch *selection* (pill slide, icons)
// — the only thing that moves while the snapshot dissolves.
export const themeSelectionProgress = makeMutable(initialProgress);

let isColorTransitionActive = false;
let isSelectionPending = false;

function snap(value: SharedValue<number>): void {
  const target = getReadingTheme() === 'lamp' ? 1 : 0;
  if (Math.abs(value.value - target) > 0.01) {
    cancelAnimation(value);
    value.value = target;
  }
}

// Keep both in sync with readingTheme changes from outside sources (e.g. Reader),
// and snap the colors when the overlay swaps the theme under its snapshot.
subscribeToReadingTheme(() => {
  if (!isColorTransitionActive) snap(themeTransitionProgress);
  if (!isSelectionPending) snap(themeSelectionProgress);
});

// Runs on the JS thread — the withTiming callback is a UI-thread worklet, so it
// can't clear the flag directly (that would only mutate the worklet's copy).
function settleColorTransition(): void {
  isColorTransitionActive = false;
  snap(themeTransitionProgress);
}

const timing = {
  duration: THEME_TRANSITION_DURATION,
  easing: THEME_TRANSITION_EASING,
  reduceMotion: ReduceMotion.System,
};

// `run`: `animateSelection` must be called exactly once, when the new theme is on
// screen. `prepare`: warm up ahead of a likely `run` (e.g. on press-in).
type Runner = {
  run: (next: ReadingTheme, animateSelection: () => void) => void;
  prepare: () => void;
};
let runner: Runner | null = null;

export function registerThemeTransitionRunner(r: Runner | null): void {
  runner = r;
}

// Call on press-in of a theme control so the transition can start on release
// without waiting on the screen capture.
export function prepareThemeChange(): void {
  runner?.prepare();
}

export function requestThemeChange(next: ReadingTheme): void {
  if (next === getReadingTheme()) return;

  const target = next === 'lamp' ? 1 : 0;
  isSelectionPending = true;
  const animateSelection = () => {
    isSelectionPending = false;
    cancelAnimation(themeSelectionProgress);
    themeSelectionProgress.value = withTiming(target, timing);
  };

  if (runner) {
    runner.run(next, animateSelection);
    return;
  }

  // No overlay mounted — animate the colors on the UI thread instead.
  isColorTransitionActive = true;
  setReadingTheme(next);
  animateSelection();
  cancelAnimation(themeTransitionProgress);
  themeTransitionProgress.value = withTiming(target, timing, (finished) => {
    if (finished) scheduleOnRN(settleColorTransition);
  });
}
