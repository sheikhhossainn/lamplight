import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

import { getPageTurnSoundEnabled } from '@/features/settings/soundPrefs';

// A soft page-turn SFX played on each swipe. The clip is tiny (~9KB) so it's
// bundled, not streamed. Returns a play() that restarts the sample from the
// top each call (seekTo(0) — a page turn can come faster than the ~0.7s clip)
// and no-ops when the sound setting is off. Reads the flag imperatively at
// call time so toggling it never re-creates the player.
export function usePageTurnSound(): () => void {
  const player = useAudioPlayer(require('../../../assets/sfx/page-turn.mp3'), { updateInterval: 1000 });

  return useCallback(() => {
    if (!getPageTurnSoundEnabled()) return;
    try {
      player.seekTo(0);
      player.volume = 0.5;
      player.play();
    } catch {
      // Player not ready yet (first swipe right after open) — skip silently.
    }
  }, [player]);
}
