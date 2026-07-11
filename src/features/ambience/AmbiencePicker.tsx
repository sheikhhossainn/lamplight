import { useRef, useState } from 'react';
import { LayoutChangeEvent, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { SoundWaveIcon } from '@/components/icons';
import {
  setAmbienceTrackId,
  setAmbienceVolume,
  useAmbienceTrackId,
  useAmbienceVolume,
} from '@/features/ambience/ambiencePreference';
import { AMBIENCE_TRACKS } from '@/features/ambience/tracks';
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

  const rows: { id: string | null; label: string; hint: string }[] = [
    { id: null, label: 'Off', hint: 'Read in silence' },
    ...AMBIENCE_TRACKS,
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.hairline, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: spacing.md }]}>
            Reading sounds
          </Text>

          {rows.map((row) => {
            const on = row.id === selectedId;
            return (
              <Pressable
                key={row.id ?? 'off'}
                onPress={() => setAmbienceTrackId(row.id)}
                style={[
                  styles.row,
                  { borderRadius: radius.card },
                  on && { backgroundColor: colors.pairPillBackground },
                ]}
              >
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={[typography.uiRowTitle, { color: on ? colors.pairPillText : colors.ink, fontSize: 14 }]}>
                    {row.label}
                  </Text>
                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: on ? colors.pairPillText : colors.fawn, fontSize: 11, marginTop: 1 },
                    ]}
                  >
                    {row.hint}
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

          {selectedId ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>Volume</Text>
              <VolumeSlider />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
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
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
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
});
