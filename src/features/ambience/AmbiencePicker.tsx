import { router } from 'expo-router';
import { useRef } from 'react';
import { Alert, LayoutChangeEvent, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CloseIcon, SoundWaveIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import {
  setAmbienceTrackId,
  setAmbienceVolume,
  useAmbienceTrackId,
  useAmbienceVolume,
  startAmbiencePreview,
  cancelAmbiencePreview,
  useAmbiencePreviewTrackId,
  setAmbienceSleepTimer,
  useAmbienceSleepTimer,
  type SleepTimerMinutes,
  useStopOnReaderClose,
  setStopOnReaderClose,
} from '@/features/ambience/ambiencePreference';
import { AMBIENCE_TRACKS, type AmbienceTrack } from '@/features/ambience/tracks';
import { useAppFlag } from '@/features/config/appConfig';
import { canUse } from '@/features/subscription/subscriptionState';
import { hapticFlashcardAction } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
      <Path d="M4 10.5l4 4 8-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// A minimal drag-to-set volume bar — no slider dependency, same PanResponder
// approach the reader already uses. Maps the finger's ABSOLUTE x (pageX) minus
// the track's measured screen-left to a 0..1 fraction. Using pageX (not the
// event's locationX) is what makes it precise: locationX is relative to
// whichever sub-view the touch is over, so once the finger crosses onto the
// moving knob it jumps into the knob's coordinate space and the value leaps.
function VolumeSlider() {
  const { colors, radius } = useTheme();
  const volume = useAmbienceVolume();
  const layoutRef = useRef({ x: 0, width: 0 });
  const trackRef = useRef<View>(null);

  const setFromPageX = (pageX: number) => {
    const { x, width } = layoutRef.current;
    if (width <= 0) return;
    setAmbienceVolume((pageX - x) / width);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromPageX(e.nativeEvent.pageX),
      onPanResponderMove: (e) => setFromPageX(e.nativeEvent.pageX),
    }),
  ).current;

  // Measure the track's absolute screen position on layout; re-measure lazily
  // isn't needed since the sheet doesn't move while open.
  const onLayout = (_e: LayoutChangeEvent) => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      layoutRef.current = { x, width };
    });
  };

  return (
    <View style={styles.volumeRow}>
      <SoundWaveIcon color={colors.fawn} size={16} />
      <View ref={trackRef} style={styles.volumeTrackWrap} onLayout={onLayout} {...pan.panHandlers}>
        <View style={[styles.volumeTrack, { backgroundColor: colors.hairline, borderRadius: radius.pill }]}>
          <View
            style={[
              styles.volumeFill,
              { width: `${Math.round(volume * 100)}%`, backgroundColor: colors.flameAmber, borderRadius: radius.pill },
            ]}
          />
          <View
            style={[
              styles.volumeKnob,
              { left: `${Math.round(volume * 100)}%`, backgroundColor: colors.flameAmber },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

type AmbiencePickerProps = {
  visible: boolean;
  onClose: () => void;
};

export function AmbiencePicker({ visible, onClose }: AmbiencePickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const selectedId = useAmbienceTrackId();
  const ambientSoundsEnabled = useAppFlag('ambient_sounds_enabled');

  const previewTrackId = useAmbiencePreviewTrackId();
  const sleepTimer = useAmbienceSleepTimer();
  const stopOnReaderClose = useStopOnReaderClose();

  const rows: { id: string | null; label: string; hint: string; isPremium?: boolean }[] = [
    { id: null, label: 'Off', hint: 'Read in silence', isPremium: false },
    ...AMBIENCE_TRACKS,
  ];

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      {({ requestClose }) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom + 16, 28),
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 18 }]}>
                Listen to Nature Sounds
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 2 }]}>
                Soothing soundscapes while you read
              </Text>
            </View>
            <Pressable onPress={requestClose} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon color={colors.fawn} size={16} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {!ambientSoundsEnabled ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: radius.card,
                  backgroundColor: colors.card,
                  marginBottom: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                }}
              >
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12 }]}>
                  Ambient sound playback is temporarily paused for service maintenance. Core reading remains fully available.
                </Text>
              </View>
            ) : null}

            {/* Background Ambience / Music Section */}
            <View style={{ marginBottom: spacing.sm }}>
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.fawn, marginBottom: spacing.xs, fontSize: 10, letterSpacing: 0.8 },
                ]}
              >
                BACKGROUND AMBIENCE
              </Text>
              {rows.map((row) => {
                const on = row.id === selectedId;
                const isLocked = Boolean(row.isPremium && !canUse('full_ambience'));
                const isPreviewing = Boolean(row.id && previewTrackId === row.id);

                return (
                  <Pressable
                    key={row.id ?? 'off'}
                    onPress={() => {
                      if (!ambientSoundsEnabled && row.id !== null) {
                        Alert.alert(
                          'Ambient Sounds Paused',
                          'Ambient audio playback is temporarily undergoing service maintenance. Core reading remains fully available.',
                        );
                        return;
                      }
                      if (isLocked) {
                        Alert.alert(
                          'Atmospheric Soundscape',
                          `"${row.label}" is part of Lamplight Premium. You can sample it now for 30 seconds or unlock the full library.`,
                          [
                            { text: 'Not Now', style: 'cancel' },
                            {
                              text: 'Preview (30s)',
                              onPress: () => {
                                if (row.id) {
                                  startAmbiencePreview(row.id, 30);
                                  void hapticFlashcardAction('graduate');
                                }
                              },
                            },
                            {
                              text: 'View Premium',
                              onPress: () => {
                                requestClose();
                                router.push({
                                  pathname: '/paywall',
                                  params: { feature: 'full_ambience', trigger: 'ambience_track' },
                                });
                              },
                            },
                          ],
                        );
                        return;
                      }
                      void hapticFlashcardAction('graduate');
                      setAmbienceTrackId(row.id);
                    }}
                    style={[
                      styles.row,
                      { borderRadius: radius.card },
                      on && { backgroundColor: colors.pairPillBackground },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[typography.uiRowTitle, { color: on ? colors.pairPillText : colors.ink, fontSize: 14 }]}>
                          {row.label}
                        </Text>
                        {isLocked ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: radius.pill,
                                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                              }}
                            >
                              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 8.5 }]}>
                                PREMIUM
                              </Text>
                            </View>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                if (!ambientSoundsEnabled || !row.id) return;
                                if (isPreviewing) {
                                  cancelAmbiencePreview();
                                } else {
                                  startAmbiencePreview(row.id, 30);
                                  void hapticFlashcardAction('graduate');
                                }
                              }}
                              hitSlop={6}
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: radius.pill,
                                backgroundColor: isPreviewing ? colors.flameAmber : 'rgba(245, 166, 35, 0.12)',
                              }}
                            >
                              <Text
                                style={[
                                  typography.eyebrowLabel,
                                  {
                                    color: isPreviewing ? colors.primaryDark : colors.flameAmber,
                                    fontSize: 8.5,
                                    fontWeight: '700',
                                  },
                                ]}
                              >
                                {isPreviewing ? 'STOP (30s)' : 'PREVIEW'}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: on ? colors.pairPillText : colors.fawn, fontSize: 11, marginTop: 1 },
                        ]}
                      >
                        {isPreviewing ? 'Playing temporary 30s sample' : row.hint}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.check,
                        { borderColor: on ? colors.flameAmber : colors.straw, backgroundColor: on ? colors.flameAmber : 'transparent' },
                      ]}
                    >
                      {on ? <CheckIcon color={colors.primaryDark} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectedId ? (
              <View style={{ marginTop: spacing.sm }}>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.fawn, marginBottom: spacing.xs, fontSize: 10, letterSpacing: 0.8 },
                  ]}
                >
                  VOLUME
                </Text>
                <VolumeSlider />
              </View>
            ) : null}

            {/* Sleep Timer (FULLAPP §14.1 item 4) */}
            <View style={{ marginTop: spacing.md }}>
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.fawn, marginBottom: spacing.xs, fontSize: 10, letterSpacing: 0.8 },
                ]}
              >
                SLEEP TIMER
              </Text>
              <View style={styles.sleepTimerRow}>
                {([null, 15, 30, 45, 60] as const).map((mins) => {
                  const isActive = sleepTimer === mins;
                  const label = mins === null ? 'Off' : `${mins}m`;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => {
                        setAmbienceSleepTimer(mins);
                        void hapticFlashcardAction('next');
                      }}
                      style={[
                        styles.timerPill,
                        {
                          backgroundColor: isActive ? colors.flameAmber : colors.card,
                          borderColor: isActive ? colors.flameAmber : colors.hairline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.uiRowTitle,
                          {
                            color: isActive ? colors.primaryDark : colors.ink,
                            fontSize: 12,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Stop on reader close preference (FULLAPP §14.1 item 4) */}
            <Pressable
              onPress={() => {
                setStopOnReaderClose(!stopOnReaderClose);
                void hapticFlashcardAction('next');
              }}
              style={[
                styles.preferenceRow,
                { borderColor: colors.hairline, backgroundColor: colors.card },
              ]}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
                  Pause audio on leaving book
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginTop: 2 }]}>
                  Automatically stops playback when closing the reader
                </Text>
              </View>
              <View
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: stopOnReaderClose ? colors.flameAmber : colors.hairline,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: colors.primaryDark,
                      transform: [{ translateX: stopOnReaderClose ? 14 : 0 }],
                    },
                  ]}
                />
              </View>
            </Pressable>

            {/* Catalog Rights and Attribution (FULLAPP §14.1 item 1) */}
            <View style={{ marginTop: spacing.md, paddingHorizontal: 4 }}>
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.fawn, fontSize: 10.5, lineHeight: 15, textAlign: 'center' },
                ]}
              >
                All soundscapes in Lamplight are curated under CC0 1.0 Universal (Public Domain) · Rights-safe and distraction-free
              </Text>
            </View>
          </ScrollView>
        </View>
      )}
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  closeBtn: {
    padding: 6,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 3,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeTrackWrap: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 5,
    justifyContent: 'center',
  },
  volumeFill: {
    height: 5,
  },
  volumeKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: -5.5,
  },
  sleepTimerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timerPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  togglePill: {
    width: 38,
    height: 22,
    borderRadius: 11,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
