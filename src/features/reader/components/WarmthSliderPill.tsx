import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { FlameDrop } from '@/components/FlameDrop';

const PRESETS = [0.15, 0.4, 0.6, 0.8, 1];

type WarmthSliderPillProps = {
  value: number;
  onChange: (value: number) => void;
};

// The vertical pill warmth control shown in Lamp Alt: a sun-ray icon at top,
// a gradient track, and a flame-drop icon anchored at the bottom, with a
// draggable-looking thumb at the current level. Tap zones stand in for full
// drag-gesture support — a pragmatic simplification.
export function WarmthSliderPill({ value, onChange }: WarmthSliderPillProps) {
  const closestIndex = PRESETS.reduce(
    (best, preset, index) => (Math.abs(preset - value) < Math.abs(PRESETS[best] - value) ? index : best),
    0,
  );
  const thumbPercent = 1 - closestIndex / (PRESETS.length - 1);

  return (
    <View style={styles.pill}>
      <Svg width={16} height={16} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={4} fill="none" stroke="#F0E6D6" strokeWidth={1.5} />
        <Line x1={10} y1={1} x2={10} y2={3} stroke="#F0E6D6" strokeWidth={1.5} />
        <Line x1={10} y1={17} x2={10} y2={19} stroke="#F0E6D6" strokeWidth={1.5} />
        <Line x1={1} y1={10} x2={3} y2={10} stroke="#F0E6D6" strokeWidth={1.5} />
        <Line x1={17} y1={10} x2={19} y2={10} stroke="#F0E6D6" strokeWidth={1.5} />
      </Svg>

      <View style={styles.trackWrap}>
        <View style={styles.track} />
        {PRESETS.map((preset, index) => (
          <Pressable
            key={preset}
            onPress={() => onChange(preset)}
            style={[styles.tapZone, { top: `${(index / (PRESETS.length - 1)) * 100}%` }]}
          />
        ))}
        <View style={[styles.thumb, { top: `${thumbPercent * 100}%` }]} />
      </View>

      <FlameDrop size={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 38,
    height: 190,
    borderRadius: 19,
    backgroundColor: 'rgba(37,34,40,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.25)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  trackWrap: {
    flex: 1,
    width: 4,
    marginVertical: 8,
  },
  track: {
    flex: 1,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(240,230,214,0.5)',
  },
  tapZone: {
    position: 'absolute',
    left: -14,
    width: 32,
    height: 24,
    marginTop: -12,
  },
  thumb: {
    position: 'absolute',
    left: -9,
    width: 22,
    height: 22,
    marginTop: -11,
    borderRadius: 11,
    backgroundColor: '#F5A623',
    borderWidth: 2,
    borderColor: '#1C1B1E',
  },
});
