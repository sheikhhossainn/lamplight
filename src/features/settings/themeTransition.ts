import { setReadingTheme, type ReadingTheme } from './readingTheme';

// A single mounted overlay (ThemeTransitionOverlay) registers a runner here.
// Callers use requestThemeChange() instead of setReadingTheme() directly so the
// actual token swap happens *hidden behind* a full-screen cover — otherwise the
// screen repaints in the new theme a frame before the cover appears, which
// shows as a wrong-color flash.
type Runner = (next: ReadingTheme) => void;

let runner: Runner | null = null;

export function registerThemeTransitionRunner(r: Runner | null): void {
  runner = r;
}

export function requestThemeChange(next: ReadingTheme): void {
  if (runner) {
    runner(next);
  } else {
    // No overlay mounted (shouldn't happen in-app) — fall back to an instant swap.
    setReadingTheme(next);
  }
}
