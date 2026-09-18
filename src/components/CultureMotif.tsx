import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';

type CultureMotifProps = {
  theme: LiteraryThemeCode;
  color: string;
  opacity?: number;
};

export function CultureMotif({ theme, color, opacity = 1 }: CultureMotifProps) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 120" preserveAspectRatio="none">
        {theme === 'bengali' ? (
          <>
            <Path d="M-16 74 C44 42 78 103 142 72 S239 42 298 72 S354 97 382 55" fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={1.2} />
            <Path d="M-16 91 C42 61 83 118 148 89 S242 61 302 90 S354 112 382 74" fill="none" stroke={color} strokeOpacity={0.14} strokeWidth={0.9} />
            <Circle cx="316" cy="30" r="17" fill="none" stroke={color} strokeOpacity={0.12} strokeWidth={1} />
          </>
        ) : theme === 'korean' ? (
          <>
            <Path d="M218 25 C254 4 303 13 323 42 C342 70 322 101 286 104 C252 106 224 88 226 66 C228 48 249 39 268 42 C289 45 299 64 290 78" fill="none" stroke={color} strokeOpacity={0.17} strokeWidth={1.5} />
            <Line x1="24" y1="84" x2="168" y2="84" stroke={color} strokeOpacity={0.12} />
            <Line x1="24" y1="91" x2="126" y2="91" stroke={color} strokeOpacity={0.08} />
          </>
        ) : theme === 'japanese' ? (
          <>
            <Circle cx="288" cy="56" r="31" fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={1.2} />
            <Line x1="194" y1="42" x2="350" y2="42" stroke={color} strokeOpacity={0.08} />
            <Line x1="178" y1="69" x2="350" y2="69" stroke={color} strokeOpacity={0.12} />
            <Line x1="225" y1="88" x2="350" y2="88" stroke={color} strokeOpacity={0.08} />
          </>
        ) : theme === 'arabic' ? (
          <>
            <Path d="M232 106 V58 C232 28 257 12 287 12 C317 12 342 28 342 58 V106" fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={1.2} />
            <Path d="M251 106 V62 C251 42 267 31 287 31 C307 31 323 42 323 62 V106" fill="none" stroke={color} strokeOpacity={0.1} strokeWidth={1} />
            <Path d="M27 91 L59 59 L91 91 L123 59 L155 91" fill="none" stroke={color} strokeOpacity={0.09} />
          </>
        ) : (
          <>
            <Rect x="232" y="21" width="91" height="71" fill="none" stroke={color} strokeOpacity={0.12} />
            <Line x1="245" y1="37" x2="309" y2="37" stroke={color} strokeOpacity={0.16} />
            <Line x1="245" y1="47" x2="296" y2="47" stroke={color} strokeOpacity={0.1} />
            <Line x1="245" y1="67" x2="309" y2="67" stroke={color} strokeOpacity={0.1} />
            <Line x1="245" y1="77" x2="284" y2="77" stroke={color} strokeOpacity={0.08} />
          </>
        )}
      </Svg>
    </View>
  );
}
