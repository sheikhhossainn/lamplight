import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

// Thin line strokes (1.6-1.8px), rounded caps/joins, per the icon spec. The
// bookmark/save glyph is the one icon that's always filled, never stroked.
type IconProps = {
  color: string;
  size?: number;
};

export function HomeIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V13H15V21"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

// Question mark icon for reader guide and help triggers
export function QuestionIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="17.2" r="1.15" fill={color} />
    </Svg>
  );
}

// Speaker / Pronunciation icon for language learners
export function SpeakerIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2V15H6L11 19V5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.54 8.46C16.48 9.4 17 10.65 17 12C17 13.35 16.48 14.6 15.54 15.54"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.07 4.93C20.94 6.8 22 9.3 22 12C22 14.7 20.94 17.2 19.07 19.07"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PauseIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5V19" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 5V19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Canonical Feather rotate-cw / reload icon — matches the line weight and caps of the system icons
export function ReloadIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 4v6h-6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Professional Literary Theme Icons matching Lamplight's 1.7px stroke aesthetic
export function BengaliThemeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fountain pen nib & river ink flow */}
      <Path
        d="M12 2.5L6 9C6 11.5 7.5 13.5 9 15L10 21.5H14L15 15C16.5 13.5 18 11.5 18 9L12 2.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="2.5" x2="12" y2="10.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="10.5" r="1.2" fill={color} />
      <Path d="M9.5 15H14.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function KoreanThemeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Traditional Hanji scroll & manuscript roll */}
      <Path
        d="M6 4.5C6 3.67 6.67 3 7.5 3H18.5C19.33 3 20 3.67 20 4.5C20 5.33 19.33 6 18.5 6H7.5C6.67 6 6 5.33 6 4.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 19.5C4 18.67 4.67 18 5.5 18H16.5C17.33 18 18 18.67 18 19.5C18 20.33 17.33 21 16.5 21H5.5C4.67 21 4 20.33 4 19.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 5.5V18M18 5.5V18.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="9" y1="10" x2="15" y2="10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="9" y1="14" x2="13.5" y2="14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function ArabicThemeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Moorish pointed archway & crescent */}
      <Path
        d="M4 21V12.5C4 7.2 8 3.5 12 3.5C16 3.5 20 7.2 20 12.5V21"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 21V13.8C7.5 10 9.8 7 12 6.2C14.2 7 16.5 10 16.5 13.8V21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="11.5" r="1.4" fill={color} />
      <Line x1="3" y1="21" x2="21" y2="21" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function JapaneseThemeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Torii Gate sanctuary motif */}
      <Path
        d="M2.5 5.5C6.5 4.5 17.5 4.5 21.5 5.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line x1="4.5" y1="8.8" x2="19.5" y2="8.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="7.5" y1="5.5" x2="7" y2="20.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="16.5" y1="5.5" x2="17" y2="20.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="12" y1="5.5" x2="12" y2="8.8" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function WesternThemeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Classic hardcover open book with bookmark ribbon */}
      <Path
        d="M3 6C3 6 6.5 4.5 12 6C17.5 4.5 21 6 21 6V19C21 19 17.5 17.5 12 19C6.5 17.5 3 19 3 19V6Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="6" x2="12" y2="19" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path
        d="M12 6V13L14 11.5L16 13V6"
        fill={color}
        opacity={0.35}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LamplightClassicThemeIcon({
  color,
  flameColor,
  size = 20,
}: IconProps & { flameColor?: string }) {
  const actualFlameColor = flameColor ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Hand-drawn 1890s literary oil lamp with organic curves & radiant warmth */}
      {/* 1. Organic arched carry bail at top */}
      <Path
        d="M8.5 4.8C8.5 2.5 15.5 2.5 15.5 4.8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />

      {/* 2. Chimney hood & collar */}
      <Path
        d="M8 6.8C9.5 6.0 14.5 6.0 16 6.8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M7.5 8.2C9 7.8 15 7.8 16.5 8.2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* 3. Hand-blown glass globe with fluid hourglass curve */}
      <Path
        d="M8.2 8.5C6.5 11.8 6.5 13.8 8 16.5C9.5 17 14.5 17 16 16.5C17.5 13.8 17.5 11.8 15.8 8.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Living flame with organic calligraphic contour */}
      <Path
        d="M12 9.5C10.8 11.2 10.5 12.4 11.2 13.5C11.6 14.1 12.4 14.1 12.8 13.5C13.5 12.4 13.2 11.2 12 9.5Z"
        fill={actualFlameColor}
      />

      {/* 5. Delicate hand-drawn radiant light ticks (vintage ink illustration) */}
      <Path d="M4.2 12.5H2.2" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M21.8 12.5H19.8" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M4.6 8.5L3.0 7.2" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M21.0 7.2L19.4 8.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />

      {/* 6. Pedestal oil font & grounding foot */}
      <Path
        d="M8 16.5C7.2 18.0 6.5 19.4 6.5 20.2C8 20.9 16 20.9 17.5 20.2C17.5 19.4 16.8 18.0 16 16.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 21H18.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LiteraryThemeIcon({
  theme,
  color,
  size = 20,
}: {
  theme: string;
  color: string;
  size?: number;
}) {
  switch (theme) {
    case 'bengali':
      return <BengaliThemeIcon color={color} size={size} />;
    case 'korean':
      return <KoreanThemeIcon color={color} size={size} />;
    case 'arabic':
      return <ArabicThemeIcon color={color} size={size} />;
    case 'japanese':
      return <JapaneseThemeIcon color={color} size={size} />;
    case 'western':
      return <WesternThemeIcon color={color} size={size} />;
    case 'classic':
    default:
      return <LamplightClassicThemeIcon color={color} size={size} />;
  }
}

export function StarIcon({
  color,
  size = 20,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShieldIcon({ size = 24, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={`${color}15`}
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CompanionIcon({ size = 24, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M15 5l.5 1.5L17 7l-1.5.5L15 9l-.5-1.5L13 7l1.5-.5L15 5z"
        fill={color}
        opacity={0.7}
      />
      <Path
        d="M11 10l.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3.3-.9z"
        fill={color}
        opacity={0.5}
      />
    </Svg>
  );
}
