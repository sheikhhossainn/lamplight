import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { captureScreen, releaseCapture } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';

import {
  getReadingTheme,
  setReadingTheme,
  useReadingTheme,
  type ReadingTheme,
} from '@/features/settings/readingTheme';
import {
  registerThemeTransitionRunner,
  requestThemeChange,
  THEME_TRANSITION_DURATION,
  THEME_TRANSITION_EASING,
} from '@/features/settings/themeTransition';

// The whole-app day<->night crossfade. Re-theming the app is a full JS re-render
// of every mounted screen, which can take longer than the fade itself — so it
// must never race the animation. Instead: snapshot the current screen, lay the
// snapshot over the app (pixel-identical, so nothing visibly changes), swap the
// theme hidden underneath (colors snap, so the live UI is fully new-theme), wait
// until that render has committed and painted, then dissolve the snapshot while
// only the Day/Night switch selection slides.
//
// Capturing + decoding the snapshot is the slow part, so it happens on press-in
// (`prepare`): by the time the finger lifts, the snapshot is already decoded and
// mounted at opacity 0, and the transition starts within a couple of frames.
const SNAPSHOT_MAX_AGE_MS = 1000;
const PREPARED_SNAPSHOT_TTL_MS = 1500;

type Snapshot = { uri: string; takenAt: number; loaded: boolean };
type Job = {
  next: ReadingTheme;
  animateSelection: () => void;
  phase: 'waiting' | 'swapping' | 'fading';
};

export function ThemeTransitionOverlay() {
  const opacity = useSharedValue(0);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const scheme = useReadingTheme();
  const job = useRef<Job | null>(null);
  const queued = useRef<ReadingTheme | null>(null);
  const snapshot = useRef<Snapshot | null>(null);
  const capturing = useRef(false);

  const discardSnapshot = () => {
    const s = snapshot.current;
    snapshot.current = null;
    setSnapshotUri(null);
    if (s) releaseCapture(s.uri);
  };

  const flushQueue = () => {
    const q = queued.current;
    queued.current = null;
    if (q) requestThemeChange(q);
  };

  const finish = () => {
    job.current = null;
    discardSnapshot();
    flushQueue();
  };

  const reveal = () => {
    const j = job.current;
    if (!j || j.phase !== 'swapping') return;
    j.phase = 'fading';
    j.animateSelection();
    opacity.value = withTiming(
      0,
      {
        duration: THEME_TRANSITION_DURATION,
        easing: THEME_TRANSITION_EASING,
        reduceMotion: ReduceMotion.System,
      },
      () => {
        scheduleOnRN(finish);
      },
    );
  };

  // Two frames after the theme render commits, so the native mount has painted.
  const revealAfterPaint = () => {
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  };

  // Starts the transition once a job is waiting and its snapshot is decoded.
  const maybeStart = () => {
    const j = job.current;
    if (!j || j.phase !== 'waiting' || capturing.current) return;

    const s = snapshot.current;
    if (!s) {
      // No snapshot (capture or decode failed) — instant swap; only the switch animates.
      job.current = null;
      setReadingTheme(j.next);
      j.animateSelection();
      flushQueue();
      return;
    }
    if (!s.loaded) return;

    j.phase = 'swapping';
    opacity.value = 1;
    // One frame for the (already decoded) snapshot to be shown, one of margin,
    // then swap the theme hidden underneath.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (getReadingTheme() === j.next) {
          revealAfterPaint();
        } else {
          setReadingTheme(j.next);
        }
      }),
    );
  };

  const capture = () => {
    if (capturing.current) return;
    capturing.current = true;
    discardSnapshot();
    captureScreen({ format: 'jpg', quality: 0.9, result: 'tmpfile' })
      .then((uri) => {
        snapshot.current = { uri, takenAt: Date.now(), loaded: false };
        setSnapshotUri(uri);
        // A press-in that never became a press: drop the unused snapshot.
        setTimeout(() => {
          if (!job.current && snapshot.current?.uri === uri) discardSnapshot();
        }, PREPARED_SNAPSHOT_TTL_MS);
      })
      .catch(() => {})
      .finally(() => {
        capturing.current = false;
        maybeStart();
      });
  };

  useEffect(() => {
    registerThemeTransitionRunner({
      prepare: () => {
        if (!job.current) capture();
      },
      run: (next, animateSelection) => {
        if (job.current) {
          queued.current = next;
          return;
        }
        job.current = { next, animateSelection, phase: 'waiting' };

        const s = snapshot.current;
        if (!capturing.current && (!s || Date.now() - s.takenAt > SNAPSHOT_MAX_AGE_MS)) {
          capture();
        } else {
          maybeStart();
        }
      },
    });

    return () => registerThemeTransitionRunner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme render committed — the snapshot has been covering it; now reveal.
  useEffect(() => {
    if (job.current?.phase === 'swapping') revealAfterPaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  const handleSnapshotLoad = (uri: string) => {
    if (snapshot.current?.uri !== uri) return;
    snapshot.current.loaded = true;
    maybeStart();
  };

  const handleSnapshotError = (uri: string) => {
    if (snapshot.current?.uri !== uri) return;
    discardSnapshot();
    maybeStart();
  };

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style, { zIndex: 9999, elevation: 9999 }]}
    >
      {snapshotUri ? (
        <Image
          key={snapshotUri}
          source={{ uri: snapshotUri }}
          onLoad={() => handleSnapshotLoad(snapshotUri)}
          onError={() => handleSnapshotError(snapshotUri)}
          fadeDuration={0}
          resizeMode="stretch"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </Animated.View>
  );
}
