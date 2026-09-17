import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PauseIcon, SpeakerIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';

type ScriptureAudioButtonProps = {
  source: string;
  accessibilityLabel: string;
};

export function ScriptureAudioButton({ source, accessibilityLabel }: ScriptureAudioButtonProps) {
  const { colors, typography, radius } = useTheme();
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const player = useAudioPlayer(activeSource ? { uri: activeSource } : null, {
    downloadFirst: true,
    updateInterval: 500,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!shouldAutoplay || !status.isLoaded) return;
    player.play();
    setShouldAutoplay(false);
  }, [player, shouldAutoplay, status.isLoaded]);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (activeSource === source && status.isLoaded) {
      player.play();
      return;
    }

    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch(() => {
      // Playback can still proceed with the default audio session.
    });
    setShouldAutoplay(true);
    setActiveSource(source);
  };

  const label = status.playing ? 'Pause' : status.isBuffering || shouldAutoplay ? 'Loading' : 'Listen';

  return (
    <Pressable
      onPress={togglePlayback}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${status.playing ? 'Pause' : 'Listen to'} ${accessibilityLabel}`}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: `${colors.flameAmber}1F`,
          borderColor: `${colors.flameAmber}66`,
          borderRadius: radius.pill,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {status.playing ? <PauseIcon color={colors.flameAmber} size={15} /> : <SpeakerIcon color={colors.flameAmber} size={15} />}
      <Text style={[typography.metadataCaption, { color: colors.progressLabel, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
});
