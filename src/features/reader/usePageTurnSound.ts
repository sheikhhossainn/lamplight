import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

import { getPageTurnSoundEnabled } from '@/features/settings/soundPrefs';
import { hapticPageTurn } from '@/lib/haptics';

// A soft page-turn SFX and tactile haptic feedback played on each swipe.
// The clip is tiny (~9KB) so it's bundled, not streamed. Returns a play() that
// restarts the sample from the top each call and triggers non-blocking haptic feedback.
export type PageTurnSoundControls = {
  play: () => void;
  stop: () => void;
};

export function usePageTurnSound(): PageTurnSoundControls {
  const player = useAudioPlayer(require('../../../assets/sfx/page-turn.mp3'), { updateInterval: 1000 });

  const play = useCallback(() => {
    void hapticPageTurn();
    if (!getPageTurnSoundEnabled()) return;
    try {
      player.seekTo(0);
      player.volume = 0.5;
      player.play();
    } catch {
      // Player not ready yet (first swipe right after open) — skip silently.
    }
  }, [player]);

  const stop = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      // Player not ready yet — skip silently.
    }
  }, [player]);

  return { play, stop };
}
