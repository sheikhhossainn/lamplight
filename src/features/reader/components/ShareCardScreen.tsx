import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import { CloseIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { FontFamily } from '@/theme/typography';

export type Variant =
  | 'parchment'
  | 'gradient'
  | 'botanical'
  | 'foldSplit'
  | 'gildedVellum'
  | 'morocco'
  | 'celestial'
  | 'obsidian'
  | 'editorial'
  | 'midnightGold'
  | 'cyanotype'
  | 'washi'
  | 'broadside'
  | 'tanzaku';

export type TemplateCategory = 'classic' | 'premium';

export interface TemplateInfo {
  id: Variant;
  name: string;
  category: TemplateCategory;
}

export const TEMPLATES: TemplateInfo[] = [
  // Classic collection (timeless, understated reading paper)
  { id: 'parchment', name: 'Parchment', category: 'classic' },
  { id: 'gradient', name: 'Amber Glow', category: 'classic' },
  { id: 'botanical', name: 'Herbarium', category: 'classic' },
  { id: 'foldSplit', name: 'Fold Split', category: 'classic' },

  // Premium collection (artisan bookplates, fine bindings, illuminated folios)
  { id: 'gildedVellum', name: 'Gilded Vellum', category: 'premium' },
  { id: 'morocco', name: 'Oxford Morocco', category: 'premium' },
  { id: 'celestial', name: 'Celestial Folio', category: 'premium' },
  { id: 'obsidian', name: 'Obsidian Ember', category: 'premium' },
  { id: 'editorial', name: 'Ex Libris', category: 'premium' },
  { id: 'midnightGold', name: 'Clothbound', category: 'premium' },
  { id: 'cyanotype', name: 'Atelier Nocturne', category: 'premium' },
  { id: 'washi', name: 'Archive Slip', category: 'premium' },
  { id: 'broadside', name: 'Broadside Proof', category: 'premium' },
  { id: 'tanzaku', name: 'Tanzaku Poetry', category: 'premium' },
];

export const VARIANTS: Variant[] = TEMPLATES.map((t) => t.id);

const FLAME_PATH =
  'M100 46 C 78 78, 70 100, 84 122 C 84 108, 92 98, 100 92 C 108 98, 116 108, 116 122 C 130 100, 122 78, 100 46 Z';

function FlameMark({ size, color = '#F5A623' }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d={FLAME_PATH} fill={color} />
    </Svg>
  );
}

function GildedFiligreeFrame({ width, height }: { width: number; height: number }) {
  const margin = 10;
  const stroke = '#C59B27';
  const innerMargin = 14;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect
          x={margin}
          y={margin}
          width={width - margin * 2}
          height={height - margin * 2}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
          opacity={0.8}
        />
        <Rect
          x={innerMargin}
          y={innerMargin}
          width={width - innerMargin * 2}
          height={height - innerMargin * 2}
          stroke={stroke}
          strokeWidth={0.6}
          fill="none"
          opacity={0.45}
        />
        {/* Top-Left Corner Filigree Flourish */}
        <Path
          d={`M ${margin} ${margin + 18} C ${margin} ${margin + 8} ${margin + 8} ${margin} ${margin + 18} ${margin}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
        />
        <Circle cx={margin + 16} cy={margin + 16} r={2.2} fill={stroke} opacity={0.85} />

        {/* Top-Right Corner Filigree Flourish */}
        <Path
          d={`M ${width - margin - 18} ${margin} C ${width - margin - 8} ${margin} ${width - margin} ${margin + 8} ${width - margin} ${margin + 18}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
        />
        <Circle cx={width - margin - 16} cy={margin + 16} r={2.2} fill={stroke} opacity={0.85} />

        {/* Bottom-Left Corner Filigree Flourish */}
        <Path
          d={`M ${margin} ${height - margin - 18} C ${margin} ${height - margin - 8} ${margin + 8} ${height - margin} ${margin + 18} ${height - margin}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
        />
        <Circle cx={margin + 16} cy={height - margin - 16} r={2.2} fill={stroke} opacity={0.85} />

        {/* Bottom-Right Corner Filigree Flourish */}
        <Path
          d={`M ${width - margin - 18} ${height - margin} C ${width - margin - 8} ${height - margin} ${width - margin} ${height - margin - 8} ${width - margin} ${height - margin - 18}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
        />
        <Circle cx={width - margin - 16} cy={height - margin - 16} r={2.2} fill={stroke} opacity={0.85} />
      </Svg>
    </View>
  );
}

function MoroccoLeatherFrame({ width, height }: { width: number; height: number }) {
  const margin = 10;
  const stroke = '#D4AF37';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="moroccoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#360E16" />
            <Stop offset="50%" stopColor="#22070D" />
            <Stop offset="100%" stopColor="#150307" />
          </LinearGradient>
          <RadialGradient id="moroccoGlow" cx="50%" cy="40%" r="65%">
            <Stop offset="0%" stopColor="#631C28" stopOpacity={0.25} />
            <Stop offset="100%" stopColor="#0F0205" stopOpacity={0.65} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#moroccoBg)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#moroccoGlow)" />

        <Rect
          x={margin}
          y={margin}
          width={width - margin * 2}
          height={height - margin * 2}
          stroke={stroke}
          strokeWidth={1.4}
          fill="none"
          opacity={0.85}
        />
        <Rect
          x={margin + 4}
          y={margin + 4}
          width={width - (margin + 4) * 2}
          height={height - (margin + 4) * 2}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth={0.8}
          fill="none"
        />

        {[
          { cx: margin + 7, cy: margin + 7 },
          { cx: width - margin - 7, cy: margin + 7 },
          { cx: margin + 7, cy: height - margin - 7 },
          { cx: width - margin - 7, cy: height - margin - 7 },
        ].map((pt, i) => (
          <G key={i}>
            <Circle cx={pt.cx} cy={pt.cy} r={3} fill="#D4AF37" opacity={0.9} />
            <Circle cx={pt.cx} cy={pt.cy} r={1.2} fill="#360E16" />
          </G>
        ))}

        <Rect x={0} y={0} width={4} height={height} fill="#D4AF37" opacity={0.6} />
      </Svg>
    </View>
  );
}

function CelestialStarMap({ width, height }: { width: number; height: number }) {
  const moonX = Math.round(width * 0.82);
  const moonY = Math.round(height * 0.12);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="celestialSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0B101E" />
            <Stop offset="45%" stopColor="#121B2F" />
            <Stop offset="100%" stopColor="#080C14" />
          </LinearGradient>
          <RadialGradient id="celestialNebula" cx="45%" cy="38%" r="55%">
            <Stop offset="0%" stopColor="#2E446B" stopOpacity={0.28} />
            <Stop offset="60%" stopColor="#141E34" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#0B101E" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#celestialSky)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#celestialNebula)" />

        <Line
          x1={width * 0.1}
          y1={height * 0.28}
          x2={width * 0.9}
          y2={height * 0.28}
          stroke="#C9A050"
          strokeWidth={0.6}
          strokeDasharray="3,4"
          opacity={0.22}
        />
        <Line
          x1={width * 0.1}
          y1={height * 0.72}
          x2={width * 0.9}
          y2={height * 0.72}
          stroke="#C9A050"
          strokeWidth={0.6}
          strokeDasharray="3,4"
          opacity={0.22}
        />
        <Line
          x1={width * 0.5}
          y1={height * 0.08}
          x2={width * 0.5}
          y2={height * 0.92}
          stroke="#C9A050"
          strokeWidth={0.5}
          strokeDasharray="2,5"
          opacity={0.18}
        />

        <Circle
          cx={width * 0.5}
          cy={height * 0.45}
          r={width * 0.42}
          stroke="#C9A050"
          strokeWidth={0.6}
          strokeDasharray="4,6"
          fill="none"
          opacity={0.15}
        />

        {/* Ursa Major asterism (top left) */}
        <Line x1={28} y1={52} x2={52} y2={46} stroke="#E5C158" strokeWidth={0.7} opacity={0.4} />
        <Line x1={52} y1={46} x2={78} y2={58} stroke="#E5C158" strokeWidth={0.7} opacity={0.4} />
        <Line x1={78} y1={58} x2={90} y2={76} stroke="#E5C158" strokeWidth={0.7} opacity={0.4} />
        <Circle cx={28} cy={52} r={1.6} fill="#FFF" opacity={0.9} />
        <Circle cx={52} cy={46} r={1.8} fill="#FFEDBA" opacity={0.95} />
        <Circle cx={78} cy={58} r={1.5} fill="#FFF" opacity={0.85} />
        <Circle cx={90} cy={76} r={1.7} fill="#FFF" opacity={0.9} />

        {/* Cassiopeia segment (mid right) */}
        <Line
          x1={width - 70}
          y1={height * 0.65}
          x2={width - 50}
          y2={height * 0.68}
          stroke="#E5C158"
          strokeWidth={0.7}
          opacity={0.4}
        />
        <Line
          x1={width - 50}
          y1={height * 0.68}
          x2={width - 32}
          y2={height * 0.64}
          stroke="#E5C158"
          strokeWidth={0.7}
          opacity={0.4}
        />
        <Circle cx={width - 70} cy={height * 0.65} r={1.5} fill="#FFF" opacity={0.8} />
        <Circle cx={width - 50} cy={height * 0.68} r={1.7} fill="#FFEDBA" opacity={0.9} />
        <Circle cx={width - 32} cy={height * 0.64} r={1.5} fill="#FFF" opacity={0.85} />

        {/* Elegant Gold Starlight Crescent Moon */}
        <Path
          d={`M ${moonX} ${moonY - 14} C ${moonX + 10} ${moonY - 8} ${moonX + 10} ${moonY + 8} ${moonX} ${moonY + 14} C ${moonX + 5} ${moonY + 8} ${moonX + 5} ${moonY - 8} ${moonX} ${moonY - 14} Z`}
          fill="#E5C158"
          opacity={0.85}
        />
        <Circle cx={moonX + 3} cy={moonY} r={1} fill="#FFF" opacity={0.9} />

        {/* Scattered Starlight Points */}
        <Circle cx={width * 0.18} cy={height * 0.18} r={1.2} fill="#FFF" opacity={0.65} />
        <Circle cx={width * 0.88} cy={height * 0.32} r={1.4} fill="#FFEDBA" opacity={0.7} />
        <Circle cx={width * 0.14} cy={height * 0.6} r={1.1} fill="#FFF" opacity={0.5} />
        <Circle cx={width * 0.84} cy={height * 0.8} r={1.3} fill="#FFF" opacity={0.6} />
        <Circle cx={width * 0.26} cy={height * 0.82} r={1.2} fill="#FFEDBA" opacity={0.55} />

        {/* Corner Starburst */}
        <Path
          d={`M ${width * 0.24} ${height * 0.12 - 4} L ${width * 0.24} ${height * 0.12 + 4} M ${width * 0.24 - 4} ${height * 0.12} L ${width * 0.24 + 4} ${height * 0.12}`}
          stroke="#E5C158"
          strokeWidth={0.8}
          opacity={0.7}
        />
      </Svg>
    </View>
  );
}

function BotanicalFrame({ width, height }: { width: number; height: number }) {
  const margin = 10;
  const stroke = '#3D4D3A';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect
          x={margin}
          y={margin}
          width={width - margin * 2}
          height={height - margin * 2}
          stroke={stroke}
          strokeWidth={1}
          fill="none"
          opacity={0.4}
        />
        <Rect
          x={margin + 3}
          y={margin + 3}
          width={width - (margin + 3) * 2}
          height={height - (margin + 3) * 2}
          stroke={stroke}
          strokeWidth={0.5}
          fill="none"
          opacity={0.2}
        />

        {/* Top-Left Botanical Laurel Sprig */}
        <Path
          d={`M ${margin + 4} ${margin + 24} Q ${margin + 6} ${margin + 12} ${margin + 20} ${margin + 6}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
          opacity={0.7}
        />
        <Path
          d={`M ${margin + 8} ${margin + 18} C ${margin + 4} ${margin + 14} ${margin + 8} ${margin + 12} ${margin + 12} ${margin + 16} Z`}
          fill={stroke}
          opacity={0.55}
        />
        <Path
          d={`M ${margin + 16} ${margin + 11} C ${margin + 14} ${margin + 6} ${margin + 19} ${margin + 6} ${margin + 19} ${margin + 10} Z`}
          fill={stroke}
          opacity={0.55}
        />

        {/* Top-Right Botanical Laurel Sprig */}
        <Path
          d={`M ${width - margin - 4} ${margin + 24} Q ${width - margin - 6} ${margin + 12} ${width - margin - 20} ${margin + 6}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
          opacity={0.7}
        />
        <Path
          d={`M ${width - margin - 8} ${margin + 18} C ${width - margin - 4} ${margin + 14} ${width - margin - 8} ${margin + 12} ${width - margin - 12} ${margin + 16} Z`}
          fill={stroke}
          opacity={0.55}
        />
        <Path
          d={`M ${width - margin - 16} ${margin + 11} C ${width - margin - 14} ${margin + 6} ${width - margin - 19} ${margin + 6} ${width - margin - 19} ${margin + 10} Z`}
          fill={stroke}
          opacity={0.55}
        />

        {/* Bottom-Left Sprig */}
        <Path
          d={`M ${margin + 4} ${height - margin - 24} Q ${margin + 6} ${height - margin - 12} ${margin + 20} ${height - margin - 6}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
          opacity={0.7}
        />
        {/* Bottom-Right Sprig */}
        <Path
          d={`M ${width - margin - 4} ${height - margin - 24} Q ${width - margin - 6} ${height - margin - 12} ${width - margin - 20} ${height - margin - 6}`}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
          opacity={0.7}
        />
      </Svg>
    </View>
  );
}

function ObsidianEmberFrame({ width, height }: { width: number; height: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <RadialGradient id="obsidianGlow" cx="50%" cy="42%" r="58%">
            <Stop offset="0%" stopColor="#F5A623" stopOpacity={0.24} />
            <Stop offset="45%" stopColor="#F5A623" stopOpacity={0.07} />
            <Stop offset="100%" stopColor="#121114" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="obsidianBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#17151A" />
            <Stop offset="60%" stopColor="#121114" />
            <Stop offset="100%" stopColor="#0B0A0C" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#obsidianBase)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#obsidianGlow)" />

        {/* Floating Amber Embers */}
        <Circle cx={width * 0.16} cy={height * 0.22} r={1.6} fill="#F5A623" opacity={0.65} />
        <Circle cx={width * 0.84} cy={height * 0.26} r={1.4} fill="#FFB84D" opacity={0.75} />
        <Circle cx={width * 0.12} cy={height * 0.62} r={1.2} fill="#F5A623" opacity={0.5} />
        <Circle cx={width * 0.88} cy={height * 0.58} r={1.8} fill="#FFC966" opacity={0.65} />
        <Circle cx={width * 0.22} cy={height * 0.78} r={1.5} fill="#F5A623" opacity={0.6} />
        <Circle cx={width * 0.78} cy={height * 0.75} r={1.3} fill="#FFB84D" opacity={0.55} />

        <Rect
          x={10}
          y={10}
          width={width - 20}
          height={height - 20}
          stroke="#F5A623"
          strokeWidth={0.8}
          fill="none"
          opacity={0.3}
          rx={6}
        />
      </Svg>
    </View>
  );
}

export type ScriptType = 'bangla' | 'arabic' | 'devanagari' | 'cjk' | 'latin';

export function detectScript(str: string): ScriptType {
  if (/[\u0980-\u09FF]/.test(str)) return 'bangla';
  if (/[\u0600-\u06FF]/.test(str)) return 'arabic';
  if (/[\u0900-\u097F]/.test(str)) return 'devanagari';
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/.test(str)) return 'cjk';
  return 'latin';
}

export function getScriptFont(script: ScriptType, isItalic = true): string {
  switch (script) {
    case 'bangla':
      return FontFamily.atmaSemiBold;
    case 'arabic':
      return FontFamily.amiriBold;
    case 'devanagari':
      return FontFamily.kalamBold;
    case 'cjk':
      return FontFamily.loraRegular;
    case 'latin':
    default:
      return isItalic ? FontFamily.loraItalicMedium : FontFamily.loraRegular;
  }
}

export function getLineHeightMultiplier(script: ScriptType): number {
  switch (script) {
    case 'bangla':
    case 'devanagari':
      return 1.68;
    case 'arabic':
      return 1.76;
    case 'cjk':
      return 1.62;
    case 'latin':
    default:
      return 1.48;
  }
}

function calculateQuoteStyles(text: string, translation?: string) {
  const quoteScript = detectScript(text);
  const quoteMult = getLineHeightMultiplier(quoteScript);
  const quoteFont = getScriptFont(quoteScript, true);

  const hasTranslation = Boolean(translation && translation.trim().length > 0);
  const totalLen = text.length + (hasTranslation ? (translation?.length ?? 0) : 0);

  let quoteSize: number;
  let transSize: number;

  if (!hasTranslation) {
    if (totalLen <= 60) quoteSize = 22;
    else if (totalLen <= 120) quoteSize = 19.5;
    else if (totalLen <= 200) quoteSize = 17.5;
    else if (totalLen <= 300) quoteSize = 15.5;
    else if (totalLen <= 420) quoteSize = 14;
    else quoteSize = 12.5;
    transSize = 12;
  } else {
    if (totalLen <= 100) {
      quoteSize = 17.5;
      transSize = 13;
    } else if (totalLen <= 180) {
      quoteSize = 15.5;
      transSize = 12;
    } else if (totalLen <= 280) {
      quoteSize = 14;
      transSize = 11;
    } else {
      quoteSize = 12.5;
      transSize = 10;
    }
  }

  const transScript = hasTranslation ? detectScript(translation ?? '') : 'latin';
  const transMult = getLineHeightMultiplier(transScript);
  const transFont = getScriptFont(transScript, false);

  return {
    quote: {
      fontSize: quoteSize,
      lineHeight: Math.round(quoteSize * quoteMult),
      fontFamily: quoteFont,
      isRtl: quoteScript === 'arabic',
    },
    translation: {
      fontSize: transSize,
      lineHeight: Math.round(transSize * transMult),
      fontFamily: transFont,
      isRtl: transScript === 'arabic',
    },
    hasTranslation,
  };
}

function QuoteGlyph({ color, size = 40 }: { color: string; size?: number }) {
  const h = Math.round(size * 0.85);
  return (
    <Svg width={size} height={h} viewBox="0 0 44 38" fill="none">
      <Path
        d="M4 24c0-10 5.5-18 15-21l1.6 4.6C15 10 12 14 11.4 18.5c1.1-.5 2.4-.8 3.8-.8 4.1 0 7 3 7 7.2 0 4.4-3.4 7.6-7.8 7.6C8.5 32.5 4 28.5 4 24Zm22 0c0-10 5.5-18 15-21l1.6 4.6C37 10 34 14 33.4 18.5c1.1-.5 2.4-.8 3.8-.8 4.1 0 7 3 7 7.2 0 4.4-3.4 7.6-7.8 7.6C30.5 32.5 26 28.5 26 24Z"
        fill={color}
      />
    </Svg>
  );
}

function CardCredit({
  attribution,
  tone,
}: {
  attribution: string;
  tone: 'dark' | 'light' | 'gold' | 'cinnabar' | 'editorial' | 'gilt' | 'vermillion' | 'botanical';
}) {
  let attributionColor: string;
  let ruleColor: string;
  let brandColor: string;
  let flameColor: string;

  switch (tone) {
    case 'dark':
      attributionColor = 'rgba(240,230,214,0.85)';
      ruleColor = 'rgba(245,166,35,0.30)';
      brandColor = '#F5A623';
      flameColor = '#F5A623';
      break;
    case 'gold':
      attributionColor = '#E8C868';
      ruleColor = 'rgba(212,175,55,0.40)';
      brandColor = '#D4AF37';
      flameColor = '#D4AF37';
      break;
    case 'cinnabar':
      attributionColor = 'rgba(60,50,40,0.72)';
      ruleColor = 'rgba(194,84,56,0.35)';
      brandColor = '#C25438';
      flameColor = '#C25438';
      break;
    case 'editorial':
      attributionColor = 'rgba(26,24,28,0.65)';
      ruleColor = 'rgba(26,24,28,0.15)';
      brandColor = '#161518';
      flameColor = '#161518';
      break;
    case 'gilt':
      attributionColor = '#3D3124';
      ruleColor = '#C59B27';
      brandColor = '#9A7416';
      flameColor = '#C59B27';
      break;
    case 'botanical':
      attributionColor = 'rgba(35, 43, 33, 0.75)';
      ruleColor = 'rgba(61, 77, 58, 0.35)';
      brandColor = '#3D4D3A';
      flameColor = '#4E634A';
      break;
    case 'vermillion':
      attributionColor = 'rgba(250, 242, 234, 0.82)';
      ruleColor = 'rgba(217, 78, 48, 0.50)';
      brandColor = '#E0684B';
      flameColor = '#E0684B';
      break;
    case 'light':
    default:
      attributionColor = 'rgba(43,38,33,0.65)';
      ruleColor = 'rgba(43,38,33,0.14)';
      brandColor = '#F5A623';
      flameColor = '#F5A623';
      break;
  }

  return (
    <View style={[styles.credit, { zIndex: 10, elevation: 4 }]}>
      <Text style={[styles.attribution, { color: attributionColor }]} numberOfLines={2}>
        {attribution}
      </Text>
      <View style={[styles.creditRule, { backgroundColor: ruleColor }]} />
      <View style={styles.brandRow}>
        <FlameMark size={13} color={flameColor} />
        <Text style={[styles.brandTag, { color: brandColor }]}>Shared from Lamplight</Text>
      </View>
    </View>
  );
}

function ShareCard({
  variant,
  text,
  attribution,
  translation,
  width,
  height,
}: {
  variant: Variant;
  text: string;
  attribution: string;
  translation?: string;
  width: number;
  height: number;
}) {
  const { radius } = useTheme();
  const metrics = calculateQuoteStyles(text, translation);

  if (variant === 'parchment') {
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#EFE4D2',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: 'rgba(43,38,33,0.12)',
          },
        ]}
      >
        <View style={[styles.quoteBlock, { top: 28, bottom: 98, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <QuoteGlyph color="rgba(180,134,58,0.35)" />
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#2B2621',
                marginTop: 10,
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(180,134,58,0.35)' }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(43,38,33,0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <CardCredit attribution={attribution} tone="light" />
        <View style={[styles.foldCurl, { borderBottomColor: 'rgba(43,38,33,0.16)' }]} />
      </View>
    );
  }

  if (variant === 'foldSplit') {
    const foldLeftY = Math.round(height * (metrics.hasTranslation ? 0.52 : 0.58));
    const foldRise = Math.min(Math.round(height * 0.09), 48);
    const foldRightY = foldLeftY - foldRise;
    const foldShadow = 8;
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#1E1B22',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: 'rgba(245, 166, 35, 0.32)',
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Polygon points={`0,0 ${width},0 ${width},${foldRightY} 0,${foldLeftY}`} fill="#F5EDE1" />
            <Polygon
              points={`0,${foldLeftY} ${width},${foldRightY} ${width},${foldRightY + foldShadow} 0,${foldLeftY + foldShadow}`}
              fill="rgba(10,8,12,0.30)"
            />
          </Svg>
        </View>

        {/* Upper cream area: Primary quote */}
        <View
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            bottom: height - foldRightY + 12,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            elevation: 4,
          }}
        >
          <QuoteGlyph color="rgba(180,134,58,0.35)" size={32} />
          <Text
            numberOfLines={metrics.hasTranslation ? 6 : 9}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#2B2621',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
                marginTop: 6,
              },
            ]}
          >
            {text}
          </Text>
        </View>

        {/* Lower dark area: Translation OR Illuminated Seal Medallion */}
        {metrics.hasTranslation ? (
          <View
            style={{
              position: 'absolute',
              top: foldLeftY + 18,
              left: 24,
              right: 24,
              bottom: 74,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              elevation: 4,
            }}
          >
            <View style={[styles.dividerBar, { backgroundColor: 'rgba(245,166,35,0.45)', marginBottom: 8 }]} />
            <Text
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.translationText,
                {
                  fontFamily: metrics.translation.fontFamily,
                  fontSize: metrics.translation.fontSize,
                  lineHeight: metrics.translation.lineHeight,
                  color: '#F5EDE1',
                  textAlign: metrics.translation.isRtl ? 'right' : 'center',
                  writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                },
              ]}
            >
              {translation}
            </Text>
          </View>
        ) : (
          <View
            style={{
              position: 'absolute',
              top: foldLeftY + 16,
              left: 24,
              right: 24,
              bottom: 76,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                borderWidth: 1.2,
                borderColor: 'rgba(245, 166, 35, 0.45)',
                backgroundColor: 'rgba(245, 166, 35, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <FlameMark size={20} color="#F5A623" />
            </View>
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 8.5,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'rgba(245, 166, 35, 0.75)',
              }}
            >
              LAMPLIGHT FOLIO • 1890
            </Text>
          </View>
        )}

        <CardCredit attribution={attribution} tone="dark" />
      </View>
    );
  }

  if (variant === 'botanical') {
    // BOTANICAL HERBARIUM — Pressed Flora & Naturalist Monograph
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#F3F5EE',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#3D4D3A',
          },
        ]}
      >
        <BotanicalFrame width={width} height={height} />

        <View style={{ paddingTop: 18, alignItems: 'center', zIndex: 10, elevation: 4 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 2.5,
              borderWidth: 1,
              borderColor: '#3D4D3A',
              borderRadius: 2,
              backgroundColor: 'rgba(61, 77, 58, 0.06)',
            }}
          >
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 7.8,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#3D4D3A',
              }}
            >
              HERBARIUM • MONOGRAPH
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Manrope_600SemiBold',
              fontSize: 7.2,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'rgba(61, 77, 58, 0.65)',
              marginTop: 4,
            }}
          >
            LAMPLIGHT BOTANICAL COLLECTION • 1892
          </Text>
        </View>

        <View style={[styles.quoteBlock, { top: 62, bottom: 84, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <QuoteGlyph color="rgba(61, 77, 58, 0.35)" size={32} />
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#232B20',
                marginTop: 8,
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(61, 77, 58, 0.30)', marginVertical: 8 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(35, 43, 32, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <CardCredit attribution={attribution} tone="botanical" />
      </View>
    );
  }

  if (variant === 'gildedVellum') {
    // GILDED VELLUM — 15th-Century Illuminated Manuscript
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#FAF4E7',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#C59B27',
          },
        ]}
      >
        <GildedFiligreeFrame width={width} height={height} />

        <View style={{ paddingTop: 18, alignItems: 'center', zIndex: 10, elevation: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FlameMark size={11} color="#C59B27" />
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 7.8,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: '#9A7416',
              }}
            >
              ILLUMINATED FOLIO • 1492
            </Text>
            <FlameMark size={11} color="#C59B27" />
          </View>
          <View style={{ width: 34, height: 1, backgroundColor: 'rgba(197, 155, 39, 0.40)', marginTop: 5 }} />
        </View>

        <View style={[styles.quoteBlock, { top: 58, bottom: 84, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <FlameMark size={22} color="#C59B27" />
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#261E16',
                marginTop: 8,
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(197, 155, 39, 0.45)', marginVertical: 8 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(38, 30, 22, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <CardCredit attribution={attribution} tone="gilt" />
      </View>
    );
  }

  if (variant === 'morocco') {
    // OXFORD MOROCCO — Gilt-Tooled Crimson Morocco Binding
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#20070D',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#D4AF37',
          },
        ]}
      >
        <MoroccoLeatherFrame width={width} height={height} />

        <View style={{ paddingTop: 18, alignItems: 'center', zIndex: 10, elevation: 4 }}>
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 7.8,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              color: '#E8C868',
            }}
          >
            OXFORD MOROCCO • DE LUXE
          </Text>
          <View style={{ width: 32, height: 1, backgroundColor: 'rgba(212, 175, 55, 0.35)', marginTop: 5 }} />
        </View>

        <View style={[styles.quoteBlock, { top: 58, bottom: 84, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <Text
            style={{
              fontFamily: FontFamily.loraSemiBold,
              fontSize: 22,
              lineHeight: 22,
              color: '#D4AF37',
              marginBottom: 4,
              opacity: 0.9,
            }}
          >
            “
          </Text>
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#FDF8F0',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(212, 175, 55, 0.40)', marginVertical: 8 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(253, 248, 240, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <CardCredit attribution={attribution} tone="gold" />
      </View>
    );
  }

  if (variant === 'celestial') {
    // CELESTIAL FOLIO — 17th-Century Uranometria Star Atlas
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#090D18',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#C9A050',
          },
        ]}
      >
        <CelestialStarMap width={width} height={height} />

        <View style={{ paddingTop: 18, alignItems: 'center', zIndex: 10, elevation: 4 }}>
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 7.8,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: '#E5C158',
            }}
          >
            URANOMETRIA • ASTRONOMICAL FOLIO
          </Text>
          <View style={{ width: 36, height: 1, backgroundColor: 'rgba(229, 193, 88, 0.35)', marginTop: 5 }} />
        </View>

        <View style={[styles.quoteBlock, { top: 58, bottom: 84, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 12,
              color: '#E5C158',
              marginBottom: 4,
              textAlign: 'center',
              opacity: 0.9,
            }}
          >
            ✦
          </Text>
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#FAF7F0',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(229, 193, 88, 0.40)', marginVertical: 8 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(250, 247, 240, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <CardCredit attribution={attribution} tone="gold" />
      </View>
    );
  }

  if (variant === 'obsidian') {
    // OBSIDIAN & EMBER — Midnight Candlelit Sanctuary
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#121114',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: 'rgba(245, 166, 35, 0.40)',
          },
        ]}
      >
        <ObsidianEmberFrame width={width} height={height} />

        <View style={{ paddingTop: 18, alignItems: 'center', zIndex: 10, elevation: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FlameMark size={12} color="#F5A623" />
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 7.8,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: '#F5A623',
              }}
            >
              LAMPLIGHT SANCTUARY • 1890
            </Text>
            <FlameMark size={12} color="#F5A623" />
          </View>
          <View style={{ width: 32, height: 1, backgroundColor: 'rgba(245, 166, 35, 0.35)', marginTop: 5 }} />
        </View>

        <View style={[styles.quoteBlock, { top: 58, bottom: 84, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <FlameMark size={34} color="#F5A623" />
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#FAF1E3',
                marginTop: 10,
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(245, 166, 35, 0.40)', marginVertical: 8 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(250, 241, 227, 0.78)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <CardCredit attribution={attribution} tone="dark" />
      </View>
    );
  }

  if (variant === 'editorial') {
    // EX LIBRIS — 1890s Antiquarian Collector's Bookplate
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#F5EEDB',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: '#362E27',
          },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              margin: 8,
              borderWidth: 1,
              borderColor: 'rgba(54, 46, 39, 0.25)',
              borderRadius: Math.max(radius.card - 5, 6),
            },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              margin: 11,
              borderWidth: 0.5,
              borderColor: 'rgba(54, 46, 39, 0.15)',
              borderRadius: Math.max(radius.card - 7, 4),
            },
          ]}
          pointerEvents="none"
        />

        <View
          style={{
            paddingTop: 18,
            alignItems: 'center',
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 3,
              backgroundColor: '#362E27',
              borderRadius: 2,
            }}
          >
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 8.5,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                color: '#F5EEDB',
              }}
            >
              EX LIBRIS
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Manrope_600SemiBold',
              fontSize: 7.5,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'rgba(54, 46, 39, 0.55)',
              marginTop: 4,
            }}
          >
            THE LAMPLIGHT COLLECTION
          </Text>
          <View style={{ width: 36, height: 1, backgroundColor: 'rgba(54, 46, 39, 0.20)', marginTop: 6 }} />
        </View>

        <View style={[styles.quoteBlock, { top: 68, bottom: 85, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#241D17',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(54, 46, 39, 0.20)', marginVertical: 10 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(36, 29, 23, 0.70)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 16,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: 'rgba(54, 46, 39, 0.20)',
              paddingTop: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(54, 46, 39, 0.50)',
                }}
              >
                PROVENANCE
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 10.5,
                  color: '#241D17',
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {attribution}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <FlameMark size={12} color="#362E27" />
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.5,
                  letterSpacing: 1,
                  color: '#362E27',
                }}
              >
                1890
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'midnightGold') {
    // CLOTHBOUND — Luxury Hardcover Edition with Silk Ribbon Bookmark
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#141518',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#26272E',
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2.5,
            backgroundColor: '#C8A97E',
            opacity: 0.75,
            zIndex: 15,
          }}
        />

        <View
          style={[
            StyleSheet.absoluteFill,
            {
              margin: 10,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: Math.max(radius.card - 5, 6),
            },
          ]}
          pointerEvents="none"
        />

        {/* Tactile Silk Bookmark Ribbon */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 26,
            zIndex: 20,
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 4,
          }}
          pointerEvents="none"
        >
          <Svg width={20} height={50} viewBox="0 0 20 50">
            <Defs>
              <LinearGradient id="clothboundRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#781C2A" />
                <Stop offset="30%" stopColor="#A52A3C" />
                <Stop offset="70%" stopColor="#871F2F" />
                <Stop offset="100%" stopColor="#5E1420" />
              </LinearGradient>
            </Defs>
            <Polygon points="0,0 20,0 20,50 10,42 0,50" fill="url(#clothboundRibbon)" />
            <Rect x={9.5} y={0} width={1} height={42} fill="rgba(255,255,255,0.15)" />
            <Rect x={0} y={0} width={20} height={2.5} fill="#C8A97E" />
          </Svg>
        </View>

        <View
          style={{
            paddingTop: 18,
            paddingLeft: 24,
            paddingRight: 56,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 8,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#C8A97E',
              }}
            >
              CLOTHBOUND
            </Text>
            <Text
              style={{
                fontFamily: 'Manrope_600SemiBold',
                fontSize: 7.5,
                letterSpacing: 1.2,
                color: 'rgba(237, 231, 220, 0.40)',
                textTransform: 'uppercase',
              }}
            >
              • FOLIO EDITION
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.quoteBlock,
            {
              top: 52,
              bottom: 82,
              paddingHorizontal: 26,
              zIndex: 10,
              elevation: 4,
              alignItems: metrics.quote.isRtl ? 'flex-end' : 'flex-start',
              justifyContent: 'center',
            },
          ]}
        >
          <Text
            style={{
              fontFamily: FontFamily.loraSemiBold,
              fontSize: 20,
              lineHeight: 20,
              color: '#C8A97E',
              marginBottom: 4,
              opacity: 0.85,
            }}
          >
            “
          </Text>

          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#FAF6EE',
                textAlign: metrics.quote.isRtl ? 'right' : 'left',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View
                style={{
                  width: 32,
                  height: 1,
                  backgroundColor: 'rgba(200, 169, 126, 0.35)',
                  marginVertical: 10,
                  alignSelf: metrics.translation.isRtl ? 'flex-end' : 'flex-start',
                }}
              />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(250, 246, 238, 0.68)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'left',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 16,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginBottom: 9 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 10.5,
                  color: '#EDE7DC',
                }}
                numberOfLines={1}
              >
                {attribution}
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.2,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(200, 169, 126, 0.65)',
                  marginTop: 2,
                }}
              >
                Lamplight Press
              </Text>
            </View>

            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: 'rgba(200, 169, 126, 0.45)',
                backgroundColor: 'rgba(200, 169, 126, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlameMark size={13} color="#C8A97E" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'washi') {
    // ARCHIVE — Vintage Library Catalog Card & Ticket
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#EFE6D5',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#3D352E',
          },
        ]}
      >
        <View
          style={{
            paddingTop: 16,
            paddingHorizontal: 20,
            paddingBottom: 10,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 8,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#3D352E',
                }}
              >
                LAMPLIGHT ARCHIVE
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 7.5,
                  color: 'rgba(61, 53, 46, 0.55)',
                  marginTop: 2,
                }}
              >
                DRAWER 14 • REF. 1894
              </Text>
            </View>

            <View
              style={{
                borderWidth: 1.4,
                borderColor: '#A83220',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(168, 50, 32, 0.08)',
                transform: [{ rotate: '-3deg' }],
              }}
            >
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.5,
                  letterSpacing: 1,
                  color: '#A83220',
                }}
              >
                CIRCULATED
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 4,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View
            style={{
              flex: 1,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(61, 53, 46, 0.25)',
              borderStyle: 'dashed',
            }}
          />
        </View>

        <View style={[styles.quoteBlock, { top: 68, bottom: 85, paddingHorizontal: 26, zIndex: 10, elevation: 4 }]}>
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#26201B',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: '#A83220', marginVertical: 10 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(38, 32, 27, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 14,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ height: 1, backgroundColor: 'rgba(61, 53, 46, 0.18)', marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 10.5,
                  color: '#26201B',
                }}
                numberOfLines={1}
              >
                {attribution}
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.5,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'rgba(61, 53, 46, 0.50)',
                  marginTop: 2,
                }}
              >
                Lamplight Archival Slip
              </Text>
            </View>

            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: 'rgba(61, 53, 46, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(61, 53, 46, 0.35)',
                marginRight: 10,
              }}
            />

            <Svg width={44} height={16} viewBox="0 0 44 16">
              <Rect x={0} y={0} width={2} height={16} fill="#3D352E" />
              <Rect x={4} y={0} width={1} height={16} fill="#3D352E" />
              <Rect x={7} y={0} width={3} height={16} fill="#3D352E" />
              <Rect x={12} y={0} width={1.5} height={16} fill="#3D352E" />
              <Rect x={15} y={0} width={2} height={16} fill="#3D352E" />
              <Rect x={19} y={0} width={1} height={16} fill="#3D352E" />
              <Rect x={22} y={0} width={3.5} height={16} fill="#3D352E" />
              <Rect x={27} y={0} width={2} height={16} fill="#3D352E" />
              <Rect x={31} y={0} width={1} height={16} fill="#3D352E" />
              <Rect x={34} y={0} width={3} height={16} fill="#3D352E" />
              <Rect x={39} y={0} width={1.5} height={16} fill="#3D352E" />
              <Rect x={42} y={0} width={2} height={16} fill="#3D352E" />
            </Svg>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'cyanotype') {
    // ATELIER — Hand-Painted Gouache Nocturne (Studio Plein Air)
    // Refined: Moon moved to top-right corner to eliminate text overlap completely.
    const moonCx = Math.round(width * 0.78);
    const moonCy = Math.round(height * 0.14);

    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#0C101A',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#242C3F',
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <LinearGradient id="atelierSky" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0B0F19" />
                <Stop offset="38%" stopColor="#151C2C" />
                <Stop offset="72%" stopColor="#253046" />
                <Stop offset="90%" stopColor="#383848" />
                <Stop offset="100%" stopColor="#141720" />
              </LinearGradient>

              <RadialGradient id="atelierMoonAura" cx="78%" cy="14%" r="35%">
                <Stop offset="0%" stopColor="#FFECC7" stopOpacity={0.32} />
                <Stop offset="50%" stopColor="#E2AC68" stopOpacity={0.08} />
                <Stop offset="100%" stopColor="#0B0F19" stopOpacity={0} />
              </RadialGradient>
            </Defs>

            <Rect x={0} y={0} width={width} height={height} fill="url(#atelierSky)" />
            <Rect x={0} y={0} width={width} height={height} fill="url(#atelierMoonAura)" />

            <Path
              d={`M 0 ${height * 0.08} Q ${width * 0.3} ${height * 0.05} ${width * 0.65} ${height * 0.09} T ${width} ${height * 0.07} L ${width} ${height * 0.14} Q ${width * 0.5} ${height * 0.1} 0 ${height * 0.15} Z`}
              fill="rgba(37, 48, 70, 0.40)"
            />
            <Path
              d={`M 0 ${height * 0.68} Q ${width * 0.35} ${height * 0.64} ${width * 0.7} ${height * 0.7} T ${width} ${height * 0.67} L ${width} ${height * 0.77} Q ${width * 0.45} ${height * 0.73} 0 ${height * 0.79} Z`}
              fill="rgba(56, 56, 72, 0.35)"
            />

            {/* Organic Moon Disc in upper right corner */}
            <Circle
              cx={moonCx}
              cy={moonCy}
              r={24}
              stroke="rgba(244, 196, 114, 0.20)"
              strokeWidth={1}
              strokeDasharray="4,6"
              fill="none"
            />
            <Path
              d={`M ${moonCx - 12} ${moonCy + 1} Q ${moonCx - 10} ${moonCy - 11} ${moonCx + 1} ${moonCy - 12} Q ${moonCx + 12} ${moonCy - 9} ${moonCx + 13} ${moonCy + 1} Q ${moonCx + 9} ${moonCy + 12} ${moonCx - 1} ${moonCy + 13} Q ${moonCx - 11} ${moonCy + 11} ${moonCx - 12} ${moonCy + 1} Z`}
              fill="#FFF8EC"
              opacity={0.92}
            />
            <Path
              d={`M ${moonCx - 2} ${moonCy - 11} Q ${moonCx + 10} ${moonCy - 4} ${moonCx + 9} ${moonCy + 8} Q ${moonCx + 3} ${moonCy + 11} ${moonCx + 12} ${moonCy + 1} Q ${moonCx + 9} ${moonCy - 8} ${moonCx - 2} ${moonCy - 11} Z`}
              fill="rgba(235, 210, 175, 0.55)"
            />

            {/* Starlight Flecks */}
            <Circle cx={width * 0.12} cy={height * 0.16} r={1} fill="#FFF" opacity={0.65} />
            <Circle cx={width * 0.18} cy={height * 0.26} r={1.4} fill="#FFECC7" opacity={0.75} />
            <Circle cx={width * 0.26} cy={height * 0.11} r={1.8} fill="#FFF" opacity={0.8} />
            <Circle cx={width * 0.32} cy={height * 0.22} r={1.1} fill="#FFF" opacity={0.5} />
            <Circle cx={width * 0.48} cy={height * 0.12} r={1.3} fill="#FFECC7" opacity={0.6} />
            <Circle cx={width * 0.14} cy={height * 0.44} r={1.3} fill="#FFF" opacity={0.55} />
            <Circle cx={width * 0.88} cy={height * 0.46} r={1.4} fill="#FFECC7" opacity={0.6} />
            <Circle cx={width * 0.2} cy={height * 0.6} r={1} fill="#FFF" opacity={0.45} />
            <Circle cx={width * 0.82} cy={height * 0.62} r={1.2} fill="#FFECC7" opacity={0.5} />

            {/* Silhouette Forest Ridge at Base */}
            <Path
              d={`M 0 ${height - 42} Q ${width * 0.3} ${height - 60} ${width * 0.68} ${height - 45} T ${width} ${height - 52} L ${width} ${height} L 0 ${height} Z`}
              fill="rgba(18, 23, 34, 0.78)"
            />
            <Path
              d={`
                M 0 ${height - 18}
                L 8 ${height - 34} L 12 ${height - 18}
                L 22 ${height - 46} L 26 ${height - 18}
                L 36 ${height - 38} L 40 ${height - 18}
                L 50 ${height - 52} L 54 ${height - 18}
                L 64 ${height - 36} L 68 ${height - 18}
                L ${width * 0.38} ${height - 22}
                L ${width * 0.65} ${height - 20}
                L ${width - 64} ${height - 18} L ${width - 60} ${height - 40} L ${width - 56} ${height - 18}
                L ${width - 46} ${height - 18} L ${width - 42} ${height - 48} L ${width - 38} ${height - 18}
                L ${width - 26} ${height - 18} L ${width - 22} ${height - 36} L ${width - 18} ${height - 18}
                L ${width - 6} ${height - 26} L ${width} ${height - 18}
                L ${width} ${height} L 0 ${height} Z
              `}
              fill="#080B12"
            />
          </Svg>
        </View>

        <View
          style={[
            StyleSheet.absoluteFill,
            {
              margin: 8,
              borderWidth: 0.8,
              borderColor: 'rgba(244, 196, 114, 0.16)',
              borderRadius: Math.max(radius.card - 5, 6),
            },
          ]}
          pointerEvents="none"
        />

        <View
          style={{
            paddingTop: 18,
            paddingHorizontal: 22,
            alignItems: 'center',
            zIndex: 10,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 7.5,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              color: 'rgba(244, 196, 114, 0.75)',
            }}
          >
            ATELIER • NOCTURNE STUDY
          </Text>
        </View>

        <View
          style={[
            styles.quoteBlock,
            {
              top: 58,
              bottom: 84,
              paddingHorizontal: 26,
              zIndex: 10,
              elevation: 4,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 12,
              color: '#F4C472',
              marginBottom: 4,
              textAlign: 'center',
              opacity: 0.9,
            }}
          >
            ✦
          </Text>

          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#FAF6EE',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View
                style={{
                  width: 30,
                  height: 1.5,
                  backgroundColor: 'rgba(244, 196, 114, 0.35)',
                  borderRadius: 1,
                  marginVertical: 10,
                  alignSelf: 'center',
                }}
              />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(250, 246, 239, 0.75)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 22,
            right: 22,
            bottom: 16,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ height: 1, backgroundColor: 'rgba(244, 196, 114, 0.18)', marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 10.5,
                  color: '#FAF6EE',
                }}
                numberOfLines={1}
              >
                {attribution}
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.2,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(244, 196, 114, 0.65)',
                  marginTop: 2,
                }}
              >
                Oil & Gouache on Board
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <FlameMark size={14} color="#F4C472" />
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.2,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: '#F4C472',
                }}
              >
                ATELIER
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'broadside') {
    // BROADSIDE — Traditional Hand-Pulled Letterpress Galley Proof
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#F6F1E7',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#2B2521',
          },
        ]}
      >
        <View style={{ position: 'absolute', top: 8, left: 8 }} pointerEvents="none">
          <Svg width={10} height={10} viewBox="0 0 10 10">
            <Line x1="5" y1="0" x2="5" y2="10" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
            <Line x1="0" y1="5" x2="10" y2="5" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
          </Svg>
        </View>
        <View style={{ position: 'absolute', top: 8, right: 8 }} pointerEvents="none">
          <Svg width={10} height={10} viewBox="0 0 10 10">
            <Line x1="5" y1="0" x2="5" y2="10" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
            <Line x1="0" y1="5" x2="10" y2="5" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
          </Svg>
        </View>
        <View style={{ position: 'absolute', bottom: 8, left: 8 }} pointerEvents="none">
          <Svg width={10} height={10} viewBox="0 0 10 10">
            <Line x1="5" y1="0" x2="5" y2="10" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
            <Line x1="0" y1="5" x2="10" y2="5" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
          </Svg>
        </View>
        <View style={{ position: 'absolute', bottom: 8, right: 8 }} pointerEvents="none">
          <Svg width={10} height={10} viewBox="0 0 10 10">
            <Line x1="5" y1="0" x2="5" y2="10" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
            <Line x1="0" y1="5" x2="10" y2="5" stroke="rgba(43, 37, 33, 0.35)" strokeWidth="0.8" />
          </Svg>
        </View>

        <View
          style={{
            paddingTop: 18,
            paddingHorizontal: 22,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 8,
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  color: '#2B2521',
                }}
              >
                GALLEY PROOF
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 7.2,
                  letterSpacing: 0.8,
                  color: 'rgba(43, 37, 33, 0.55)',
                  marginTop: 2,
                }}
              >
                PRESS NO. 04 • FIRST IMPRESSION
              </Text>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: '#2B2521',
                paddingHorizontal: 5,
                paddingVertical: 2,
                borderRadius: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7,
                  letterSpacing: 1,
                  color: '#2B2521',
                }}
              >
                REG. 3B
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(43, 37, 33, 0.18)', marginTop: 9 }} />
        </View>

        <View
          style={[
            styles.quoteBlock,
            {
              top: 58,
              bottom: 82,
              paddingHorizontal: 26,
              zIndex: 10,
              elevation: 4,
              alignItems: metrics.quote.isRtl ? 'flex-end' : 'flex-start',
              justifyContent: 'center',
            },
          ]}
        >
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#1E1A17',
                textAlign: metrics.quote.isRtl ? 'right' : 'left',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 4,
                  marginVertical: 10,
                  alignSelf: metrics.translation.isRtl ? 'flex-end' : 'flex-start',
                }}
              >
                <Text style={{ fontSize: 6, color: 'rgba(43, 37, 33, 0.40)' }}>◆</Text>
                <Text style={{ fontSize: 6, color: 'rgba(43, 37, 33, 0.40)' }}>◆</Text>
                <Text style={{ fontSize: 6, color: 'rgba(43, 37, 33, 0.40)' }}>◆</Text>
              </View>
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(30, 26, 23, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'left',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 22,
            right: 22,
            bottom: 16,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ height: 1, backgroundColor: 'rgba(43, 37, 33, 0.18)', marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 10.5,
                  color: '#1E1A17',
                }}
                numberOfLines={1}
              >
                {attribution}
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.2,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: 'rgba(43, 37, 33, 0.50)',
                  marginTop: 2,
                }}
              >
                [ Sig. 4A • Lamplight Letterpress ]
              </Text>
            </View>

            <Svg width={22} height={22} viewBox="0 0 22 22">
              <Circle cx="11" cy="11" r="9" stroke="#2B2521" strokeWidth="0.8" strokeDasharray="2,2" fill="none" />
              <Circle cx="11" cy="11" r="2.5" fill="#2B2521" />
            </Svg>
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'tanzaku') {
    // TANZAKU — Japanese Poetic Paper Slip (短冊)
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: '#F7EFE2',
            borderRadius: radius.card,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#3F332A',
          },
        ]}
      >
        {/* Drifting Kirihaku Gold Flecks */}
        <View style={{ position: 'absolute', top: 12, left: 16 }} pointerEvents="none">
          <Svg width={24} height={20} viewBox="0 0 24 20">
            <Rect x="2" y="2" width="3.5" height="3.5" fill="#D4AF37" opacity={0.45} transform="rotate(15 3.5 3.5)" />
            <Rect x="14" y="8" width="2.5" height="2.5" fill="#D4AF37" opacity={0.35} transform="rotate(30 15 9)" />
            <Rect x="8" y="14" width="4" height="2" fill="#D4AF37" opacity={0.40} transform="rotate(-20 10 15)" />
          </Svg>
        </View>

        {/* Brass Eyelet Ring & Knotted Crimson Silk Hanging Cord (Centered on all viewports) */}
        <View
          style={{ position: 'absolute', top: 4, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}
          pointerEvents="none"
        >
          <Svg width={24} height={34} viewBox="0 0 24 34">
            <Path d="M12 0 C 7 0, 7 9, 12 9 C 17 9, 17 0, 12 0 Z" fill="#8C1D2C" />
            <Circle cx="12" cy="10" r="5" fill="#C5A059" />
            <Circle cx="12" cy="10" r="2.6" fill="#3F332A" />
            <Path d="M11 15 C 9.5 20, 8.5 26, 7.5 32" stroke="#8C1D2C" strokeWidth="1.6" strokeLinecap="round" />
            <Path d="M13 15 C 14.5 20, 15.5 26, 16.5 32" stroke="#8C1D2C" strokeWidth="1.6" strokeLinecap="round" />
          </Svg>
        </View>

        <View
          style={{
            paddingTop: 36,
            paddingHorizontal: 22,
            alignItems: 'center',
            zIndex: 10,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'Manrope_700Bold',
              fontSize: 7.5,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: 'rgba(63, 51, 42, 0.55)',
            }}
          >
            TANZAKU • POETIC FOLIO
          </Text>
        </View>

        <View style={[styles.quoteBlock, { top: 58, bottom: 82, paddingHorizontal: 26, zIndex: 10, elevation: 4 }]}>
          <Text
            numberOfLines={metrics.hasTranslation ? 7 : 12}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={[
              styles.quoteText,
              {
                fontFamily: metrics.quote.fontFamily,
                fontSize: metrics.quote.fontSize,
                lineHeight: metrics.quote.lineHeight,
                color: '#221C16',
                textAlign: metrics.quote.isRtl ? 'right' : 'center',
                writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
              },
            ]}
          >
            {text}
          </Text>

          {metrics.hasTranslation && (
            <>
              <View style={[styles.dividerBar, { backgroundColor: 'rgba(184, 50, 38, 0.25)', marginVertical: 10 }]} />
              <Text
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.translationText,
                  {
                    fontFamily: metrics.translation.fontFamily,
                    fontSize: metrics.translation.fontSize,
                    lineHeight: metrics.translation.lineHeight,
                    color: 'rgba(34, 28, 22, 0.72)',
                    textAlign: metrics.translation.isRtl ? 'right' : 'center',
                    writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {translation}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 22,
            right: 22,
            bottom: 16,
            zIndex: 10,
            elevation: 4,
          }}
        >
          <View style={{ height: 1, backgroundColor: 'rgba(63, 51, 42, 0.16)', marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 10.5,
                  color: '#221C16',
                }}
                numberOfLines={1}
              >
                {attribution}
              </Text>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 7.2,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'rgba(63, 51, 42, 0.50)',
                  marginTop: 2,
                }}
              >
                Lamplight Tanzaku Slip
              </Text>
            </View>

            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 2,
                borderWidth: 1.5,
                borderColor: '#B83226',
                backgroundColor: 'rgba(184, 50, 38, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: '-2deg' }],
              }}
            >
              <FlameMark size={13} color="#B83226" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Variant: 'gradient' (Amber Glow)
  return (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          borderRadius: radius.card,
          overflow: 'hidden',
          backgroundColor: '#201D24',
          borderWidth: 1.5,
          borderColor: 'rgba(245, 166, 35, 0.35)',
        },
      ]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="gradBase" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0%" stopColor="#26212B" />
              <Stop offset="55%" stopColor="#352D23" />
              <Stop offset="100%" stopColor="#1E1C22" />
            </LinearGradient>
            <RadialGradient id="gradGlow" cx="50%" cy="36%" r="55%">
              <Stop offset="0%" stopColor="#F5A623" stopOpacity={0.25} />
              <Stop offset="70%" stopColor="#F5A623" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#gradBase)" />
          <Rect x={0} y={0} width={width} height={height} fill="url(#gradGlow)" />
        </Svg>
      </View>

      <View style={[styles.quoteBlock, { top: 28, bottom: 98, paddingHorizontal: 28, zIndex: 10, elevation: 4 }]}>
        <FlameMark size={34} />
        <Text
          numberOfLines={metrics.hasTranslation ? 7 : 12}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[
            styles.quoteText,
            {
              fontFamily: metrics.quote.fontFamily,
              fontSize: metrics.quote.fontSize,
              lineHeight: metrics.quote.lineHeight,
              color: '#F5EDE1',
              marginTop: 16,
              textAlign: metrics.quote.isRtl ? 'right' : 'center',
              writingDirection: metrics.quote.isRtl ? 'rtl' : 'ltr',
            },
          ]}
        >
          {text}
        </Text>

        {metrics.hasTranslation && (
          <>
            <View style={[styles.dividerBar, { backgroundColor: 'rgba(245,166,35,0.40)' }]} />
            <Text
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.translationText,
                {
                  fontFamily: metrics.translation.fontFamily,
                  fontSize: metrics.translation.fontSize,
                  lineHeight: metrics.translation.lineHeight,
                  color: 'rgba(245,237,225,0.82)',
                  textAlign: metrics.translation.isRtl ? 'right' : 'center',
                  writingDirection: metrics.translation.isRtl ? 'rtl' : 'ltr',
                },
              ]}
            >
              {translation}
            </Text>
          </>
        )}
      </View>

      <CardCredit attribution={attribution} tone="dark" />
    </View>
  );
}

export type ShareCardScreenProps = {
  text: string;
  attribution: string;
  translation?: string;
  onToggleTranslation?: () => void;
  hasTranslationAvailable?: boolean;
  isTranslating?: boolean;
};

export function ShareCardScreen({
  text,
  attribution,
  translation,
  onToggleTranslation,
  hasTranslationAvailable,
  isTranslating,
}: ShareCardScreenProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Responsive card sizing calculated per viewport (Instagram Story 9:16 aspect ratio)
  const cardWidth = Math.max(Math.min(windowWidth - 48, 320), 1);
  const maxAvailableCardHeight = Math.max(windowHeight - insets.top - insets.bottom - 220, 1);
  const cardHeight = Math.min(Math.round((cardWidth * 16) / 9), maxAvailableCardHeight);

  const [variant, setVariant] = useState<Variant>('parchment');
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const currentTemplate = TEMPLATES.find((t) => t.id === variant) ?? TEMPLATES[0];
  const activeCategory = currentTemplate.category;

  const handleSelectCategory = (cat: TemplateCategory) => {
    void Haptics.selectionAsync();
    const firstInCat = TEMPLATES.find((t) => t.category === cat);
    if (firstInCat) {
      setVariant(firstInCat.id);
    }
  };

  const handleSelectVariant = (v: Variant) => {
    void Haptics.selectionAsync();
    setVariant(v);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < 30) return;
        const dir = gesture.dx < 0 ? 1 : -1;
        void Haptics.selectionAsync();
        setVariant((prev) => {
          const idx = VARIANTS.indexOf(prev);
          return VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length];
        });
      },
    }),
  ).current;

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: Math.round(cardWidth * 3),
        height: Math.round(cardHeight * 3),
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Quote' });
      } else {
        Alert.alert('Sharing unavailable', 'This device cannot share files directly.');
      }
    } catch {
      Alert.alert('Share failed', 'Could not create the share image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // Dark cards (amber share button on dark background)
  const isDarkCard =
    variant === 'gradient' ||
    variant === 'foldSplit' ||
    variant === 'midnightGold' ||
    variant === 'cyanotype' ||
    variant === 'morocco' ||
    variant === 'celestial' ||
    variant === 'obsidian';
  const shareButtonIsDark = !isDarkCard;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.primaryDark, paddingHorizontal: 24, paddingTop: insets.top + 16 },
      ]}
    >
      <View style={styles.topBar}>
        {hasTranslationAvailable ? (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onToggleTranslation?.();
            }}
            hitSlop={8}
            style={[
              styles.translationPill,
              {
                backgroundColor: Boolean(translation) ? colors.flameAmber : 'rgba(240,230,214,0.10)',
                borderColor: Boolean(translation) ? colors.flameAmber : 'rgba(240,230,214,0.18)',
              },
            ]}
          >
            <Text
              style={[
                typography.metadataCaption,
                {
                  color: Boolean(translation) ? colors.primaryDark : colors.lampText,
                  fontWeight: '600',
                  fontSize: 11.5,
                },
              ]}
            >
              {isTranslating ? 'Translating…' : Boolean(translation) ? '✓ Translation' : '+ Translation'}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <Pressable
          onPress={() => router.back()}
          style={styles.close}
          hitSlop={16}
          accessibilityLabel="Close share card"
        >
          <CloseIcon color={colors.lampText} size={18} />
        </Pressable>
      </View>

      <View style={styles.cardWrap} {...panResponder.panHandlers}>
        <View ref={cardRef} collapsable={false}>
          <ShareCard
            variant={variant}
            text={text}
            attribution={attribution}
            translation={translation}
            width={cardWidth}
            height={cardHeight}
          />
        </View>
      </View>

      {/* Category Toggle Bar: Classic vs Premium */}
      <View style={styles.categoryBar}>
        <Pressable
          onPress={() => handleSelectCategory('classic')}
          hitSlop={6}
          style={[styles.categoryTab, activeCategory === 'classic' && styles.categoryTabActiveClassic]}
        >
          <Text
            style={[
              typography.metadataCaption,
              styles.categoryTabText,
              { color: activeCategory === 'classic' ? colors.flameAmber : 'rgba(240,230,214,0.55)' },
            ]}
          >
            Classic
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSelectCategory('premium')}
          hitSlop={6}
          style={[styles.categoryTab, activeCategory === 'premium' && styles.categoryTabActivePremium]}
        >
          <Text
            style={[
              typography.metadataCaption,
              styles.categoryTabText,
              { color: activeCategory === 'premium' ? '#D4AF37' : 'rgba(240,230,214,0.55)' },
            ]}
          >
            ★ Premium
          </Text>
        </Pressable>
      </View>

      {/* Template Named Chips for active category */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.templatePillsScroll}
        style={styles.templatePillsContainer}
      >
        {TEMPLATES.filter((t) => t.category === activeCategory).map((t) => {
          const isSelected = variant === t.id;
          const isPremium = t.category === 'premium';
          const activeColor = isPremium ? '#D4AF37' : colors.flameAmber;
          return (
            <Pressable
              key={t.id}
              onPress={() => handleSelectVariant(t.id)}
              hitSlop={6}
              style={[
                styles.templatePill,
                isSelected
                  ? isPremium
                    ? styles.templatePillActivePremium
                    : styles.templatePillActiveClassic
                  : styles.templatePillInactive,
              ]}
            >
              <Text
                style={[
                  typography.metadataCaption,
                  {
                    color: isSelected ? activeColor : 'rgba(240, 230, 214, 0.65)',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: 11,
                  },
                ]}
              >
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={onShare}
        disabled={sharing}
        style={({ pressed }) => [
          styles.shareButton,
          {
            width: cardWidth,
            backgroundColor: shareButtonIsDark ? colors.primaryDark : colors.flameAmber,
            borderColor: shareButtonIsDark ? 'rgba(245,166,35,0.40)' : 'transparent',
            borderWidth: shareButtonIsDark ? 1 : 0,
            borderRadius: radius.pill,
            marginTop: spacing.md,
            marginBottom: Math.max(insets.bottom, 16),
            opacity: sharing ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
          <Path
            d="M10 13V2M10 2l-4 4M10 2l4 4M4 15v2a1 1 0 001 1h10a1 1 0 001-1v-2"
            stroke={shareButtonIsDark ? colors.flameAmber : colors.primaryDark}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            typography.buttonLabel,
            { color: shareButtonIsDark ? colors.lampText : colors.primaryDark, marginLeft: 8 },
          ]}
        >
          {sharing ? 'Preparing high-res…' : 'Share card'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  close: {
    padding: 6,
  },
  translationPill: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  quoteBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    letterSpacing: 0,
  },
  translationText: {
    letterSpacing: 0,
  },
  dividerBar: {
    width: 26,
    height: 1,
    marginVertical: 10,
  },
  credit: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 20,
    alignItems: 'center',
  },
  attribution: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  creditRule: {
    width: 28,
    height: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#F5A623',
  },
  categoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 230, 214, 0.06)',
    borderRadius: 16,
    padding: 3,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(240, 230, 214, 0.10)',
    gap: 4,
  },
  categoryTab: {
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryTabActiveClassic: {
    backgroundColor: 'rgba(245, 166, 35, 0.16)',
    borderColor: '#F5A623',
  },
  categoryTabActivePremium: {
    backgroundColor: 'rgba(212, 175, 55, 0.20)',
    borderColor: '#D4AF37',
  },
  categoryTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  templatePillsContainer: {
    flexGrow: 0,
    marginTop: 8,
    maxHeight: 38,
  },
  templatePillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  templatePill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  templatePillActiveClassic: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  templatePillActivePremium: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
  },
  templatePillInactive: {
    borderColor: 'rgba(240, 230, 214, 0.10)',
    backgroundColor: 'rgba(240, 230, 214, 0.04)',
  },
  shareButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foldCurl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderBottomWidth: 28,
    borderLeftWidth: 28,
    borderLeftColor: 'transparent',
  },
});
