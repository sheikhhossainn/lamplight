import { View } from 'react-native';

import { LamplightColor } from '@/theme/tokens';

// The small abstract "flame drop" used inside the Reader's lamp controls —
// distinct from the full brand mark (FlameGlow), which also carries the
// fold-page bars that don't belong on a tiny control icon.
export function FlameDrop({ size = 16 }: { size?: number }) {
  return (
    <View
      style={{
        width: size * 0.75,
        height: size,
        backgroundColor: LamplightColor.flameAmber,
        borderTopLeftRadius: size / 2,
        borderTopRightRadius: size / 2,
        borderBottomLeftRadius: size / 2,
        borderBottomRightRadius: size * 0.19,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}
