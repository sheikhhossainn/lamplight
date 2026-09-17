import { setAudioModeAsync, useAudioPlaylist, useAudioPlaylistStatus } from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PauseIcon, ReloadIcon, SpeakerIcon } from '@/components/icons';
import {
  downloadQuranSurahRecitation,
  isQuranSurahRecitationDownloaded,
  quranAyahRecitationSource,
} from '@/features/scripture-audio/scriptureAudio';
import { useTheme } from '@/theme/ThemeProvider';

type QuranRecitationButtonProps = {
  surahName: string;
  surahNumber: number;
  verses: Array<{ number: number }>;
  onActiveVerseChange: (verseNumber: number | null) => void;
};

export function QuranRecitationButton({ surahName, surahNumber, verses, onActiveVerseChange }: QuranRecitationButtonProps) {
  const { colors, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasStarted, setHasStarted] = useState(false);
  const [hasRecitationSession, setHasRecitationSession] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [shouldStartFromBeginning, setShouldStartFromBeginning] = useState(false);
  const [preferOffline, setPreferOffline] = useState(() => isQuranSurahRecitationDownloaded(surahNumber));
  const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [downloadSheetVisible, setDownloadSheetVisible] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const sources = useMemo(
    () => verses.map((verse) => ({ uri: quranAyahRecitationSource(surahNumber, verse.number, preferOffline) })),
    [preferOffline, surahNumber, verses],
  );
  const playlist = useAudioPlaylist({ sources, loop: 'none', updateInterval: 250 });
  const status = useAudioPlaylistStatus(playlist);

  useEffect(() => {
    setHasStarted(false);
    setHasRecitationSession(false);
    setShouldAutoplay(false);
    setShouldStartFromBeginning(false);
    setPreferOffline(isQuranSurahRecitationDownloaded(surahNumber));
    setDownloadProgress(null);
    setDownloadSheetVisible(false);
    setDownloadError(null);
  }, [surahNumber]);

  useEffect(() => {
    onActiveVerseChange(status.playing ? (verses[status.currentIndex]?.number ?? null) : null);
  }, [onActiveVerseChange, status.currentIndex, status.playing, verses]);

  useEffect(() => {
    return () => onActiveVerseChange(null);
  }, [onActiveVerseChange]);

  useEffect(() => {
    if (!shouldAutoplay || !status.isLoaded) return;
    if (shouldStartFromBeginning) playlist.skipTo(0);
    playlist.play();
    setShouldAutoplay(false);
    setShouldStartFromBeginning(false);
  }, [playlist, shouldAutoplay, shouldStartFromBeginning, status.isLoaded]);

  useEffect(() => {
    if (hasStarted && status.didJustFinish && status.currentIndex === verses.length - 1) {
      setHasStarted(false);
    }
  }, [hasStarted, status.currentIndex, status.didJustFinish, verses.length]);

  const beginPlayback = (offline: boolean) => {
    setPreferOffline(offline);
    setHasStarted(true);
    setHasRecitationSession(true);
    setShouldStartFromBeginning(true);
    setShouldAutoplay(true);
  };

  const restartPlayback = () => {
    beginPlayback(preferOffline);
  };

  const downloadForOffline = async () => {
    const verseNumbers = verses.map((verse) => verse.number);
    setDownloadError(null);
    setDownloadProgress({ completed: 0, total: verseNumbers.length });
    try {
      await downloadQuranSurahRecitation(surahNumber, verseNumbers, (completed, total) => {
        setDownloadProgress({ completed, total });
      });
      setDownloadProgress(null);
      setDownloadSheetVisible(false);
      beginPlayback(true);
    } catch {
      setDownloadProgress(null);
      setDownloadError('The download was interrupted. Your audio was not marked as saved—try again when the connection is stable.');
    }
  };

  const promptForAudio = () => {
    setDownloadError(null);
    setDownloadSheetVisible(true);
  };

  const togglePlayback = () => {
    if (status.playing) {
      playlist.pause();
      return;
    }

    if (hasStarted && status.isLoaded) {
      playlist.play();
      return;
    }

    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch(() => {
      // Playback can still proceed with the default audio session.
    });
    if (isQuranSurahRecitationDownloaded(surahNumber)) {
      beginPlayback(true);
    } else {
      promptForAudio();
    }
  };

  const label = status.playing
    ? 'Pause'
    : downloadProgress
      ? `Saving ${downloadProgress.completed}/${downloadProgress.total}`
      : status.isBuffering || shouldAutoplay
        ? 'Loading'
        : hasStarted
          ? 'Continue'
          : 'Listen';
  const showPrimaryControl = !hasRecitationSession || hasStarted;

  return (
    <>
      <View style={styles.controls}>
        {showPrimaryControl ? (
          <Pressable
            disabled={downloadProgress !== null}
            onPress={togglePlayback}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${label} Quran recitation by Mishary Rashid Alafasy`}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: `${colors.flameAmber}1F`,
                borderColor: `${colors.flameAmber}66`,
                borderRadius: radius.pill,
                opacity: downloadProgress ? 0.7 : pressed ? 0.7 : 1,
              },
            ]}
          >
            {status.playing ? <PauseIcon color={colors.flameAmber} size={15} /> : <SpeakerIcon color={colors.flameAmber} size={15} />}
            <Text style={[typography.metadataCaption, { color: colors.progressLabel, fontWeight: '700' }]}>{label}</Text>
          </Pressable>
        ) : null}
        {hasRecitationSession ? (
          <Pressable
            disabled={downloadProgress !== null}
            onPress={restartPlayback}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Restart recitation from the beginning of this surah"
            style={({ pressed }) => [
              styles.restartButton,
              {
                borderColor: colors.hairline,
                borderRadius: radius.pill,
                opacity: downloadProgress ? 0.7 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <ReloadIcon color={colors.umber} size={14} />
            <Text style={[typography.metadataCaption, { color: colors.umber, fontWeight: '700' }]}>Restart</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={downloadSheetVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !downloadProgress && setDownloadSheetVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close audio download options"
            style={StyleSheet.absoluteFill}
            disabled={downloadProgress !== null}
            onPress={() => setDownloadSheetVisible(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: `${colors.flameAmber}44`,
                borderRadius: radius.card,
                paddingBottom: Math.max(insets.bottom + 18, 28),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.hairline, borderRadius: radius.pill }]} />
            <View style={[styles.iconTile, { backgroundColor: `${colors.flameAmber}1F`, borderRadius: radius.card }]}>
              <SpeakerIcon color={colors.flameAmber} size={24} />
            </View>
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, marginTop: 18 }]}>OFFLINE RECITATION</Text>
            <Text style={[typography.onboardingHeadline, { color: colors.ink, marginTop: 8 }]}>Save {surahName} to listen anywhere.</Text>
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 10, lineHeight: 23 }]}>
              Keep every ayah on this device for uninterrupted, offline recitation. You can still stream without saving anything.
            </Text>

            <View style={[styles.creditCard, { backgroundColor: `${colors.flameAmber}12`, borderColor: `${colors.flameAmber}33`, borderRadius: radius.card }]}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn }]}>RECITER</Text>
              <Text style={[typography.uiRowTitle, { color: colors.ink, marginTop: 3 }]}>Mishary Rashid Alafasy</Text>
              <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 4 }]}>Audio provided by Al Quran Cloud</Text>
            </View>

            {downloadProgress ? (
              <View style={styles.progressArea}>
                <View style={[styles.progressTrack, { backgroundColor: colors.hairline, borderRadius: radius.pill }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.flameAmber,
                        borderRadius: radius.pill,
                        width: `${(downloadProgress.completed / downloadProgress.total) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressLabelRow}>
                  <ActivityIndicator size="small" color={colors.flameAmber} />
                  <Text style={[typography.metadataCaption, { color: colors.umber }]}>Saving {downloadProgress.completed} of {downloadProgress.total} ayahs</Text>
                </View>
                <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 6 }]}>Keep Lamplight open while saving.</Text>
              </View>
            ) : (
              <>
                {downloadError ? <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: 16 }]}>{downloadError}</Text> : null}
                <Pressable
                  onPress={() => void downloadForOffline()}
                  accessibilityRole="button"
                  accessibilityLabel={`Download ${surahName} recitation for offline listening`}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    { backgroundColor: colors.flameAmber, borderRadius: radius.card, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Download {verses.length} ayahs</Text>
                  <Text style={[typography.metadataCaption, { color: colors.primaryDark, opacity: 0.72, marginTop: 2 }]}>Listen offline anytime</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDownloadSheetVisible(false);
                    beginPlayback(false);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.hairline, borderRadius: radius.card, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[typography.buttonLabel, { color: colors.ink }]}>Stream this time</Text>
                </Pressable>
                <Pressable onPress={() => setDownloadSheetVisible(false)} hitSlop={10} style={styles.notNowAction}>
                  <Text style={[typography.metadataCaption, { color: colors.fawn }]}>Not now</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  restartButton: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  modalRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 27, 30, 0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    height: 4,
    width: 38,
  },
  iconTile: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    marginTop: 24,
    width: 52,
  },
  creditCard: {
    borderWidth: 1,
    marginTop: 20,
    padding: 14,
  },
  primaryAction: {
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  secondaryAction: {
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  notNowAction: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  progressArea: {
    marginTop: 24,
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  progressLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
});
