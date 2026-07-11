import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

import { ambienceTrackById } from '@/features/ambience/tracks';
import { useAmbienceTrackId, useAmbienceVolume } from '@/features/ambience/ambiencePreference';

// Drives reading ambience for the screen that mounts it (the Reader). Watches
// the shared ambience preference: plays the chosen loop, follows volume, and
// stops when the user picks "Off". expo-audio's useAudioPlayer auto-releases
// the player when the Reader unmounts, so leaving a book stops the audio for
// free — no manual teardown, no audio bleeding into the library/settings tabs.
export function useAmbiencePlayer(): void {
  const trackId = useAmbienceTrackId();
  const volume = useAmbienceVolume();
  const track = ambienceTrackById(trackId);

  // Mix under the app rather than duck it, keep playing when the screen dims,
  // and honour the silent switch off (ambience is opt-in, not a notification).
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      // Non-fatal — playback still works with the default session mode.
    });
  }, []);

  // Passing the URL (or null for "Off") re-creates the player when the track
  // changes; downloadFirst streams then caches to disk for offline replay.
  const player = useAudioPlayer(track ? { uri: track.url } : null, { downloadFirst: true });

  useEffect(() => {
    if (!track) {
      player.pause();
      return;
    }
    player.loop = true;
    player.volume = volume;
    player.play();
  }, [player, track, volume]);
}
