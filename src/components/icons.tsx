import Svg, { Circle, Line, Path } from 'react-native-svg';

// Thin line strokes (1.6-1.8px), rounded caps/joins, per the icon spec. The
// bookmark/save glyph is the one icon that's always filled, never stroked.
type IconProps = {
  color: string;
  size?: number;
};

export function LibraryIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5C4 5.5 7.5 4 12 5.5C16.5 4 20 5.5 20 5.5V18.5C20 18.5 16.5 17 12 18.5C7.5 17 4 18.5 4 18.5V5.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="5.5" x2="12" y2="18.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function VocabularyIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 3.5H17.5V20.5L12 16.5L6.5 20.5V3.5Z" fill={color} />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="14" cy="7" r="2.1" fill={color} />
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="9" cy="12" r="2.1" fill={color} />
      <Line x1="4" y1="17" x2="20" y2="17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="16" cy="17" r="2.1" fill={color} />
    </Svg>
  );
}

export function ChevronRightIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5L16 12L9 19"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5L8 12L15 19"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MoreHorizontalIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="12" r="1.6" fill={color} />
      <Circle cx="12" cy="12" r="1.6" fill={color} />
      <Circle cx="19" cy="12" r="1.6" fill={color} />
    </Svg>
  );
}

export function BookmarkIcon({ color, size = 18, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 3.5H17.5V20.5L12 16.5L6.5 20.5V3.5Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
