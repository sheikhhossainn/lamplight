import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

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

export function ChevronDownIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
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

export function TrashIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 7H19"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M9 7V4.8C9 4.358 9.358 4 9.8 4H14.2C14.642 4 15 4.358 15 4.8V7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 7L7.2 19.2C7.234 19.812 7.74 20.286 8.353 20.286H15.647C16.26 20.286 16.766 19.812 16.8 19.2L17.5 7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10.3 10.5V17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M13.7 10.5V17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

// Reading-ambience toggle. Three rising arcs read as sound whether or not
// audio is playing; the reader tints it amber when a track is active.
export function SoundWaveIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 9.5c1.6 1.6 1.6 3.4 0 5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.5 6.5c3 3 3 8 0 11"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 4c4.2 4.2 4.2 11.8 0 16"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SunIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth={1.7} />
      <Line x1="12" y1="2.8" x2="12" y2="5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="21.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="2.8" y1="12" x2="5" y2="12" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="19" y1="12" x2="21.2" y2="12" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="5.5" y1="5.5" x2="7.1" y2="7.1" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="16.9" y1="16.9" x2="18.5" y2="18.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="5.5" y1="18.5" x2="7.1" y2="16.9" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="16.9" y1="7.1" x2="18.5" y2="5.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function MoonIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.2 13.6A8.4 8.4 0 1110.4 3.8a6.6 6.6 0 009.8 9.8Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Globe glyph — the common "switch language" symbol (same one iOS uses for
// its keyboard-language key), so it reads as translate/language without
// needing a two-letter code in the chrome.
export function TranslateIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.4" stroke={color} strokeWidth={1.6} />
      <Line x1="3.6" y1="12" x2="20.4" y2="12" stroke={color} strokeWidth={1.6} />
      <Path
        d="M12 3.6C14.4 6.2 15.7 9 15.7 12C15.7 15 14.4 17.8 12 20.4C9.6 17.8 8.3 15 8.3 12C8.3 9 9.6 6.2 12 3.6Z"
        stroke={color}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

export function SearchIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={1.7} />
      <Line x1="15.3" y1="15.3" x2="20" y2="20" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5L10 17.5L19 7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Funnel — signals the "All books" header is a category filter.
export function FilterIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5h16l-6 7v5l-4 2v-7l-6-7Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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

// Arrow up out of an open tray — the standard "share/export" glyph. Arrowhead
// vertex sits at the top of the shaft; a downward-pointing vertex here would
// read as "download" instead (that was the previous, mislabeled path).
export function ShareIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 13V2M10 2l-4 4M10 2l4 4M4 15v2a1 1 0 001 1h10a1 1 0 001-1v-2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Speech bubble with a small heart — "tell us how you feel" prompt (context
// verse search entry point).
export function FeelingPromptIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5h16v10H9l-4 3.5v-3.5H4v-10Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13c-2-1.3-3-2.3-3-3.6a1.7 1.7 0 013-1 1.7 1.7 0 013 1c0 1.3-1 2.3-3 3.6Z"
        fill={color}
      />
    </Svg>
  );
}

// 3-line hamburger menu icon for the reader tools drawer
export function MenuIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="4" y1="17" x2="20" y2="17" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function MicrophoneIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C10.34 2 9 3.34 9 5V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V5C15 3.34 13.66 2 12 2Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 10V12C19 15.87 15.87 19 12 19M5 10V12C5 15.87 8.13 19 12 19M12 19V22M8 22H16"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StopIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="5" width="14" height="14" rx="2.5" fill={color} />
    </Svg>
  );
}



