import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

type EmblemProps = {
  color?: string;
  size?: number;
};

/**
 * Professional, museum-grade sacred emblem for Islam (The Holy Quran):
 * Features an authentic Rub el Hizb (eight-pointed geometric Islamic star)
 * with a refined inner calligraphic ring and crescent-star motif.
 */
export function IslamEmblem({ color = '#F5A623', size = 32 }: EmblemProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Outer subtle halo ring */}
      <Circle cx={32} cy={32} r={30} stroke={color} strokeWidth={1} strokeOpacity={0.25} />
      <Circle cx={32} cy={32} r={27} stroke={color} strokeWidth={0.8} strokeDasharray="2 2" strokeOpacity={0.4} />

      {/* Primary Rub el Hizb (Two interlocking squares rotated by 45 degrees) */}
      <Rect
        x={14}
        y={14}
        width={36}
        height={36}
        rx={3}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.06}
      />
      <Rect
        x={14}
        y={14}
        width={36}
        height={36}
        rx={3}
        transform="rotate(45 32 32)"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.06}
      />

      {/* Inner circular medina ring */}
      <Circle cx={32} cy={32} r={14} stroke={color} strokeWidth={1.2} strokeOpacity={0.6} />

      {/* Central Islamic Crescent & Star */}
      <Path
        d="M36 24C31.582 24 28 27.582 28 32C28 36.418 31.582 40 36 40C37.8 40 39.4 39.4 40.7 38.3C38.6 38.8 35.6 38.1 33.8 36.3C32 34.5 31.3 31.4 31.7 29.2C32.7 30.5 34.3 31.3 36 31.3C36 31.3 36 24 36 24Z"
        fill={color}
      />
      <Path
        d="M39.5 28L40.1 29.8L41.9 30L40.4 31.2L40.9 33L39.5 32L38.1 33L38.6 31.2L37.1 30L38.9 29.8L39.5 28Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Professional, architectural emblem for Christianity (New Testament):
 * Features a proportioned Latin Cross with Byzantine serif terminals
 * encircled by an open solar radiance halo.
 */
export function ChristianityEmblem({ color = '#F5A623', size = 32 }: EmblemProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Outer celestial radiance ring */}
      <Circle cx={32} cy={32} r={30} stroke={color} strokeWidth={1} strokeOpacity={0.25} />
      <Circle cx={32} cy={27} r={17} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} strokeDasharray="3 2" />

      {/* Cross Vertical Beam */}
      <Path
        d="M29 11C29 10 30 9 32 9C34 9 35 10 35 11V53C35 54 34 55 32 55C30 55 29 54 29 53V11Z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* Cross Horizontal Beam */}
      <Path
        d="M17 24C16 24 15 25 15 27C15 29 16 30 17 30H47C48 30 49 29 49 27C49 25 48 24 47 24H17Z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* Center Intersection Diamond */}
      <Rect
        x={29.5}
        y={24.5}
        width={5}
        height={5}
        transform="rotate(45 32 27)"
        fill={color}
      />

      {/* Base Mount / Calvery pedestal accent */}
      <Path d="M25 55H39" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Professional, geometric emblem for Judaism (Torah & Tanakh):
 * Features a mathematically precise Star of David (Magen David)
 * with interlocking double-stroke lines and twin arch tablets of the Decalogue.
 */
export function JudaismEmblem({ color = '#F5A623', size = 32 }: EmblemProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Outer covenant ring */}
      <Circle cx={32} cy={32} r={30} stroke={color} strokeWidth={1} strokeOpacity={0.25} />
      <Circle cx={32} cy={32} r={26} stroke={color} strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.4} />

      {/* Star of David - Triangle 1 (Point Upward) */}
      <Path
        d="M32 12L49 42H15L32 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.08}
      />

      {/* Star of David - Triangle 2 (Point Downward) */}
      <Path
        d="M32 52L15 22H49L32 52Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.08}
      />

      {/* Central Hexagram Core Accent */}
      <Circle cx={32} cy={32} r={4.5} stroke={color} strokeWidth={1.2} fill={color} fillOpacity={0.2} />
    </Svg>
  );
}

/**
 * Professional, sacred emblem for Hinduism (Vedas & Rigveda):
 * Features the sacred primordial Vedic Om (ॐ) resting upon an open Lotus pedestal
 * surrounded by an eight-spoke cosmic Dharma / Surya chakra.
 */
export function HinduismEmblem({ color = '#F5A623', size = 32 }: EmblemProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Outer cosmic Surya chakra ring */}
      <Circle cx={32} cy={32} r={30} stroke={color} strokeWidth={1} strokeOpacity={0.25} />
      <Circle cx={32} cy={32} r={26} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />

      {/* 8 Solar Chakra Rays */}
      <Path d="M32 2V6M32 58V62M2 32H6M58 32H62M11 11L14 14M50 50L53 53M11 53L14 50M50 14L53 11" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />

      {/* Sacred AUM (ॐ) Glyph in clean vector curves */}
      <Path
        d="M24 25C22 23 20 25 20 28C20 31 23 33 26 33C29 33 32 35 32 39C32 43 28 46 23 45C19 44 17 41 17 38"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path
        d="M26 33C29 33 34 32 37 28C39 25 39 20 36 17"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {/* Right sweeping tail */}
      <Path
        d="M28 39C32 40 37 40 42 35C45 32 47 26 47 21"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {/* Upper Chandra-Bindu (Crescent and dot) */}
      <Path
        d="M40 16C43 18 48 18 51 16"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={45.5} cy={12.5} r={2} fill={color} />
    </Svg>
  );
}

export const SACRED_TRADITION_EMBLEMS: Record<string, React.ComponentType<EmblemProps>> = {
  quran: IslamEmblem,
  'bible-nt': ChristianityEmblem,
  'bible-ot': JudaismEmblem,
  torah: JudaismEmblem,
  vedas: HinduismEmblem,
};

/**
 * Professional vector balance scale of justice icon for the Debated questions tab.
 */
export function ScalesOfJusticeIcon({ color = '#F5A623', size = 16 }: EmblemProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Central Pillar and Base */}
      <Path d="M12 3V20" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M8 20H16" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx={12} cy={3} r={1.5} fill={color} />

      {/* Main Horizontal Crossbeam */}
      <Path d="M4 7H20" stroke={color} strokeWidth={1.7} strokeLinecap="round" />

      {/* Left Balance Strings & Dish */}
      <Path d="M4 7L2 12M4 7L6 12" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M1.5 12C1.5 13.5 2.6 14.5 4 14.5C5.4 14.5 6.5 13.5 6.5 12H1.5Z" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.2} />

      {/* Right Balance Strings & Dish */}
      <Path d="M20 7L18 12M20 7L22 12" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M17.5 12C17.5 13.5 18.6 14.5 20 14.5C21.4 14.5 22.5 13.5 22.5 12H17.5Z" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}
