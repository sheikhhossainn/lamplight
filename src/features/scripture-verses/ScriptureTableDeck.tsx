import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { BookmarkIcon, ChevronLeftIcon, CloseIcon } from '@/components/icons';
import { createBibleHighlight } from '@/db/repositories/bible';
import { createQuranHighlight } from '@/db/repositories/quran';
import { logEvent } from '@/features/analytics/analytics';
import { useTheme } from '@/theme/ThemeProvider';

import { drawTableDeck } from './empatheticMatcher';
import { TRADITION_LABELS, type ScriptureVerseCard } from './moods';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Tradition Seals & Emblems for the Sacred Card Backs
// ---------------------------------------------------------------------------

function QuranSeal({ color = '#F5A623' }: { color?: string }) {
  return (
    <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={1.2} opacity={0.6} />
      <Circle cx={24} cy={24} r={19} stroke={color} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      {/* Crescent */}
      <Path
        d="M26 14C20.477 14 16 18.477 16 24C16 29.523 20.477 34 26 34C28.2 34 30.2 33.2 31.8 31.9C29.2 32.5 25.5 31.5 23.2 29.2C20.9 26.9 20 23 20.5 20.2C21.8 21.8 23.8 22.8 26 22.8C26 22.8 26 14 26 14Z"
        fill={color}
        opacity={0.9}
      />
      {/* Radiant Star */}
      <Path
        d="M31 19L31.8 21.2L34 21.5L32.2 23L32.8 25.2L31 24L29.2 25.2L29.8 23L28 21.5L30.2 21.2L31 19Z"
        fill={color}
      />
    </Svg>
  );
}

function TorahSeal({ color = '#F5A623' }: { color?: string }) {
  return (
    <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={1.2} opacity={0.6} />
      <Circle cx={24} cy={24} r={19} stroke={color} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      {/* Dual Tablets of the Law */}
      <Path
        d="M17 15C17 13.343 18.343 12 20 12C21.657 12 23 13.343 23 15V34H17V15Z"
        stroke={color}
        strokeWidth={1.4}
        fill={color}
        fillOpacity={0.15}
      />
      <Path
        d="M25 15C25 13.343 26.343 12 28 12C29.657 12 31 13.343 31 15V34H25V15Z"
        stroke={color}
        strokeWidth={1.4}
        fill={color}
        fillOpacity={0.15}
      />
      {/* Ten Commandments notches */}
      <Path d="M19 18H21M19 22H21M19 26H21M19 30H21" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M27 18H29M27 22H29M27 26H29M27 30H29" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

function BibleOtSeal({ color = '#F5A623' }: { color?: string }) {
  return (
    <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={1.2} opacity={0.6} />
      <Circle cx={24} cy={24} r={19} stroke={color} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      {/* Menorah sacred branches */}
      <Path d="M24 14V34" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M20 18C20 22 24 24 24 24C24 24 28 22 28 18" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M16 16C16 24 24 28 24 28C24 28 32 24 32 16" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      {/* Base */}
      <Path d="M20 34H28" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      {/* Flame droplets */}
      <Circle cx={16} cy={13} r={1.3} fill={color} />
      <Circle cx={20} cy={14.5} r={1.3} fill={color} />
      <Circle cx={24} cy={12} r={1.4} fill={color} />
      <Circle cx={28} cy={14.5} r={1.3} fill={color} />
      <Circle cx={32} cy={13} r={1.3} fill={color} />
    </Svg>
  );
}

function BibleNtSeal({ color = '#F5A623' }: { color?: string }) {
  return (
    <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={1.2} opacity={0.6} />
      <Circle cx={24} cy={24} r={19} stroke={color} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      {/* Peaceful radiant cross */}
      <Path d="M24 13V35" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 20H32" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      {/* Gentle halo arc */}
      <Path d="M21 16A4 4 0 0 1 27 16" stroke={color} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
      <Circle cx={24} cy={20} r={2.5} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

function VedasSeal({ color = '#F5A623' }: { color?: string }) {
  return (
    <Svg width={42} height={42} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={1.2} opacity={0.6} />
      <Circle cx={24} cy={24} r={19} stroke={color} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      {/* Sacred Agni flame & lotus petals */}
      <Path
        d="M24 13C24 13 28 17 28 22C28 24.5 26.5 27 24 28C21.5 27 20 24.5 20 22C20 17 24 13 24 13Z"
        fill={color}
        fillOpacity={0.85}
      />
      {/* Inner flame core */}
      <Path
        d="M24 18C24 18 25.8 20 25.8 22.5C25.8 23.8 25 25 24 25.5C23 25 22.2 23.8 22.2 22.5C22.2 20 24 18 24 18Z"
        fill="#FFE8B3"
      />
      {/* Lotus base petals */}
      <Path
        d="M16 31C18 33 22 34 24 34C26 34 30 33 32 31C29 30 25 31 24 31C23 31 19 30 16 31Z"
        stroke={color}
        strokeWidth={1.2}
        fill={color}
        fillOpacity={0.2}
      />
    </Svg>
  );
}

const TRADITION_SEALS: Record<string, React.FC<{ color?: string }>> = {
  quran: QuranSeal,
  torah: TorahSeal,
  'bible-ot': BibleOtSeal,
  'bible-nt': BibleNtSeal,
  vedas: VedasSeal,
};

const TRADITION_SCRIPTS: Record<string, string> = {
  quran: 'القرآن الكريم',
  torah: 'תּוֹרָה',
  'bible-ot': 'תנ״ך · Covenant',
  'bible-nt': 'Εὐαγγέλιον · Gospel',
  vedas: 'ऋग्वेद · Sacred Hymns',
};

const CARD_ROTATIONS = [-1.5, 1.8, -1.2, 1.5, 0];

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type ScriptureTableDeckProps = {
  userFeelingText: string;
};

export function ScriptureTableDeck({ userFeelingText }: ScriptureTableDeckProps) {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const [cards, setCards] = useState<ScriptureVerseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [exploredIndices, setExploredIndices] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Animation values for 3D flip and zoom expansion
  const flipProgress = useSharedValue(0);
  const scaleProgress = useSharedValue(1);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    setLoading(true);
    const deck = drawTableDeck(userFeelingText);
    setCards(deck);
    setLoading(false);
  }, [userFeelingText]);

  const handleOpenCard = (index: number) => {
    setActiveCardIndex(index);
    setExploredIndices((prev) => new Set([...prev, index]));

    const card = cards[index];
    if (card) {
      logEvent('table_card_opened', { tradition: card.tradition, id: card.id });
    }

    flipProgress.value = 0;
    scaleProgress.value = reducedMotion ? 1 : 0.94;
    backdropOpacity.value = 0;

    backdropOpacity.value = withTiming(1, { duration: 250, easing: EASE_OUT });
    scaleProgress.value = withTiming(1, { duration: 320, easing: EASE_OUT });
    flipProgress.value = reducedMotion
      ? 1
      : withTiming(1, { duration: 380, easing: EASE_IN_OUT });
  };

  const onFinishClose = () => {
    setActiveCardIndex(null);
  };

  const handleCloseCard = () => {
    flipProgress.value = reducedMotion
      ? 0
      : withTiming(0, { duration: 260, easing: EASE_IN_OUT });
    scaleProgress.value = withTiming(0.94, { duration: 240, easing: EASE_OUT });
    backdropOpacity.value = withTiming(0, { duration: 240, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(onFinishClose)();
    });
  };

  const handleReadChapter = (card: ScriptureVerseCard) => {
    handleCloseCard();
    if (card.tradition === 'quran') {
      router.push({
        pathname: `/quran/${card.chapter}` as any,
        params: { jumpVerse: String(card.verseNumber) },
      });
    } else if (card.tradition === 'vedas') {
      if (card.bookId) {
        router.push({
          pathname: `/vedas/${card.bookId}` as any,
          params: { jumpChapter: String(card.chapter), jumpVerse: String(card.verseNumber) },
        });
      }
    } else if (card.tradition === 'bible-nt') {
      if (card.bookId) {
        router.push({
          pathname: `/bible-nt/${card.bookId}` as any,
          params: { jumpChapter: String(card.chapter), jumpVerse: String(card.verseNumber) },
        });
      }
    } else {
      // 'bible-ot' or 'torah'
      if (card.bookId) {
        router.push({
          pathname: `/bible/${card.bookId}` as any,
          params: { jumpChapter: String(card.chapter), jumpVerse: String(card.verseNumber) },
        });
      }
    }
  };

  const handleToggleBookmark = async (verse: ScriptureVerseCard) => {
    const isSaved = savedIds.has(verse.id);

    if (isSaved) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(verse.id);
        return next;
      });
      return;
    }

    setSavedIds((prev) => new Set([...prev, verse.id]));
    logEvent('table_verse_saved', { verseId: verse.id, tradition: verse.tradition });

    try {
      if (verse.tradition === 'quran') {
        await createQuranHighlight({
          surahNumber: verse.chapter,
          verseNumber: verse.verseNumber,
          colorKey: 'amber',
        });
      } else if (verse.tradition === 'bible-ot' || verse.tradition === 'bible-nt' || verse.tradition === 'torah') {
        if (verse.bookId) {
          await createBibleHighlight({
            bookId: verse.bookId,
            chapter: verse.chapter,
            verse: verse.verseNumber,
            colorKey: 'amber',
          });
        }
      }
    } catch {
      // Tolerate if already highlighted
    }
  };

  // Reanimated 3D flip styles
  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const activeCardBackStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { scale: scaleProgress.value },
      { rotateY: `${flipProgress.value * 180}deg` },
    ],
    opacity: flipProgress.value >= 0.5 ? 0 : 1,
  }));

  const activeCardFrontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { scale: scaleProgress.value },
      { rotateY: `${flipProgress.value * 180 + 180}deg` },
    ],
    opacity: flipProgress.value < 0.5 ? 0 : 1,
  }));

  const activeCard = activeCardIndex != null ? cards[activeCardIndex] : null;

  return (
    <View style={styles.container}>
      {/* ------------------------------------------------------------------- */}
      {/* Illuminated Sanctuary Table Background with Overhead Amber Glow     */}
      {/* ------------------------------------------------------------------- */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="tableSurface" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FAF5EE" />
            <Stop offset="35%" stopColor="#F3EADB" />
            <Stop offset="75%" stopColor="#EAE0CF" />
            <Stop offset="100%" stopColor="#E2D5C2" />
          </LinearGradient>
          <LinearGradient id="ambientLampGlow" x1="0.5" y1="0" x2="0.5" y2="0.6">
            <Stop offset="0%" stopColor="#F5A623" stopOpacity={0.14} />
            <Stop offset="50%" stopColor="#F5A623" stopOpacity={0.05} />
            <Stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#tableSurface)" />
        {/* Subtle illuminated table grain hairlines */}
        <Rect x={0} y={140} width="100%" height={1} fill="#DFD2BF" opacity={0.6} />
        <Rect x={0} y={360} width="100%" height={1} fill="#DFD2BF" opacity={0.6} />
        <Rect x={0} y={580} width="100%" height={1} fill="#DFD2BF" opacity={0.6} />
        {/* Warm overhead sanctuary light */}
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#ambientLampGlow)" />
      </Svg>

      {/* ------------------------------------------------------------------- */}
      {/* Header Bar: Navigation, Title & Explored Progress Counter           */}
      {/* ------------------------------------------------------------------- */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 10, paddingHorizontal: spacing.lg }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon color={colors.ink} size={22} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 19, letterSpacing: 0.2 }]}>
            The Sacred Table
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 12, marginTop: 1 }]} numberOfLines={1}>
            {userFeelingText ? `“${userFeelingText.trim()}”` : 'Comfort across traditions'}
          </Text>
        </View>

        <View style={styles.progressPill}>
          <Text style={[typography.eyebrowLabel, { color: '#8A5A16', fontSize: 11 }]}>
            {exploredIndices.size}/5 opened
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------------------- */}
      {/* Table Surface & Cards Layout                                        */}
      {/* ------------------------------------------------------------------- */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={colors.flameAmber} />
          <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.md }]}>
            Arranging sacred words on the table…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32, paddingTop: spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <Text style={[typography.eyebrowLabel, { color: '#8A5A16', textAlign: 'center', marginBottom: spacing.lg, letterSpacing: 1.2 }]}>
            TAP A CARD TO REVEAL ITS VERSE
          </Text>

          {/* Cards Grid: 2 rows of 2, plus 1 centered fifth card */}
          <View style={styles.gridWrap}>
            {cards.slice(0, 4).map((card, index) => {
              const SealComponent = TRADITION_SEALS[card.tradition] ?? QuranSeal;
              const isExplored = exploredIndices.has(index);
              const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];

              return (
                <Pressable
                  key={card.id}
                  onPress={() => handleOpenCard(index)}
                  style={({ pressed }) => [
                    styles.tableCardSlot,
                    {
                      transform: [
                        { rotate: `${rotation}deg` },
                        { scale: pressed ? 0.97 : 1 },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.cardSurface, { borderColor: isExplored ? '#F5A623' : 'rgba(216,166,74,0.45)' }]}>
                    {/* Corner golden accents */}
                    <View style={styles.cornerDotTL} />
                    <View style={styles.cornerDotTR} />
                    <View style={styles.cornerDotBL} />
                    <View style={styles.cornerDotBR} />

                    <View style={styles.cardSealWrap}>
                      <SealComponent color="#F5A623" />
                    </View>

                    <Text style={[typography.eyebrowLabel, styles.traditionCardTitle]}>
                      {TRADITION_LABELS[card.tradition] ?? card.tradition.toUpperCase()}
                    </Text>

                    <Text style={[typography.metadataCaption, styles.traditionScriptSubtitle]}>
                      {TRADITION_SCRIPTS[card.tradition] ?? 'Sacred Words'}
                    </Text>

                    {isExplored ? (
                      <View style={styles.exploredBadge}>
                        <Text style={[typography.eyebrowLabel, { color: '#1C1B1E', fontSize: 9.5, fontWeight: '700' }]}>
                          EXPLORED ✓
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.unopenedPill}>
                        <View style={styles.pulseDot} />
                        <Text style={[typography.metadataCaption, { color: '#9E6712', fontSize: 10.5 }]}>
                          Tap to open
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Fifth Card (Vedas) Centered */}
          {cards[4] ? (
            <View style={styles.centeredFifthSlot}>
              {(() => {
                const card = cards[4];
                const SealComponent = TRADITION_SEALS[card.tradition] ?? VedasSeal;
                const isExplored = exploredIndices.has(4);

                return (
                  <Pressable
                    onPress={() => handleOpenCard(4)}
                    style={({ pressed }) => [
                      styles.tableCardSlot,
                      {
                        transform: [
                          { rotate: '0.4deg' },
                          { scale: pressed ? 0.97 : 1 },
                        ],
                      },
                    ]}
                  >
                    <View style={[styles.cardSurface, { borderColor: isExplored ? '#F5A623' : 'rgba(216,166,74,0.45)' }]}>
                      <View style={styles.cornerDotTL} />
                      <View style={styles.cornerDotTR} />
                      <View style={styles.cornerDotBL} />
                      <View style={styles.cornerDotBR} />

                      <View style={styles.cardSealWrap}>
                        <SealComponent color="#F5A623" />
                      </View>

                      <Text style={[typography.eyebrowLabel, styles.traditionCardTitle]}>
                        {TRADITION_LABELS[card.tradition] ?? card.tradition.toUpperCase()}
                      </Text>

                      <Text style={[typography.metadataCaption, styles.traditionScriptSubtitle]}>
                        {TRADITION_SCRIPTS[card.tradition] ?? 'Sacred Words'}
                      </Text>

                      {isExplored ? (
                        <View style={styles.exploredBadge}>
                          <Text style={[typography.eyebrowLabel, { color: '#1C1B1E', fontSize: 9.5, fontWeight: '700' }]}>
                            EXPLORED ✓
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.unopenedPill}>
                          <View style={styles.pulseDot} />
                          <Text style={[typography.metadataCaption, { color: '#9E6712', fontSize: 10.5 }]}>
                            Tap to open
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })()}
            </View>
          ) : null}

          {/* Gentle Sanctuary Footnote */}
          <View style={styles.footerNote}>
            <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', fontSize: 12, lineHeight: 18 }]}>
              Each sacred card carries an answer drawn specifically for your heart from the ancient scriptures.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3D Flip & Full-Screen Expanded Card Modal Layer                    */}
      {/* ------------------------------------------------------------------- */}
      {activeCard != null ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          {/* Dimmed backdrop — tapping dismisses the card */}
          <Animated.View style={[styles.modalBackdrop, modalBackdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseCard} />
          </Animated.View>

          <View style={styles.modalCenterHost} pointerEvents="box-none">
            {/* 1. Card Back Face (visible during initial 0-90° of flip) */}
            <Animated.View style={[styles.expandedCardBase, styles.cardFaceCommon, activeCardBackStyle]}>
              <View style={styles.expandedBackInner}>
                {(() => {
                  const SealComponent = TRADITION_SEALS[activeCard.tradition] ?? QuranSeal;
                  return <SealComponent color="#F5A623" />;
                })()}
                <Text style={[typography.eyebrowLabel, { color: '#8A5A16', fontSize: 15, marginTop: spacing.md, letterSpacing: 1.5 }]}>
                  {TRADITION_LABELS[activeCard.tradition] ?? activeCard.tradition.toUpperCase()}
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 13, marginTop: 4 }]}>
                  Unfolding sacred words…
                </Text>
              </View>
            </Animated.View>

            {/* 2. Card Front Face (revealed at 90-180° — large illuminated reading card) */}
            <Animated.View style={[styles.expandedCardBase, styles.cardFaceCommon, styles.frontCardFace, activeCardFrontStyle]}>
              <ScrollView
                style={styles.cardScrollView}
                contentContainerStyle={styles.cardScrollContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Header: Tradition Pill & Citation & Close */}
                <View style={styles.expandedHeaderRow}>
                  <View style={styles.traditionTagPill}>
                    <Text style={[typography.eyebrowLabel, { color: '#8A5A16', fontSize: 11, fontWeight: '700' }]}>
                      {TRADITION_LABELS[activeCard.tradition] ?? activeCard.tradition.toUpperCase()}
                    </Text>
                  </View>

                  <Pressable onPress={handleCloseCard} hitSlop={14} style={styles.closeBtn}>
                    <CloseIcon color={colors.fawn} size={17} />
                  </Pressable>
                </View>

                {/* Citation */}
                <Text style={[typography.uiRowTitle, styles.expandedCitation]}>
                  {activeCard.book} {activeCard.chapter}:{activeCard.verseNumber}
                </Text>

                {/* Original Sacred Script (Arabic / Hebrew / Sanskrit) */}
                {activeCard.originalText && activeCard.translation ? (
                  <View style={styles.originalScriptBlock}>
                    <Text style={styles.originalScriptText}>
                      {activeCard.originalText}
                    </Text>
                  </View>
                ) : null}

                {/* English Reading Text */}
                <View style={styles.verseTextWrap}>
                  <Text style={styles.openingQuoteGlyph}>“</Text>
                  <Text style={[typography.readingBody, styles.readingBodyText]}>
                    {activeCard.translation ?? activeCard.originalText}
                  </Text>
                </View>

                {/* Context Reflection Note */}
                {activeCard.reflectionHint ? (
                  <View style={styles.reflectionBox}>
                    <Text style={[typography.metadataCaption, styles.reflectionHintText]}>
                      {activeCard.reflectionHint}
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons: Bookmark / Save & Read Chapter & Close */}
                <View style={styles.expandedActionRow}>
                  <Pressable
                    onPress={() => handleToggleBookmark(activeCard)}
                    hitSlop={8}
                    style={[
                      styles.bookmarkActionBtn,
                      savedIds.has(activeCard.id) && styles.bookmarkActionBtnSaved,
                    ]}
                  >
                    <BookmarkIcon
                      color={savedIds.has(activeCard.id) ? '#1C1B1E' : '#8A5A16'}
                      filled={savedIds.has(activeCard.id)}
                      size={18}
                    />
                    <Text
                      style={[
                        typography.uiRowTitle,
                        {
                          color: savedIds.has(activeCard.id) ? '#1C1B1E' : '#8A5A16',
                          fontSize: 13,
                          marginLeft: 6,
                        },
                      ]}
                    >
                      {savedIds.has(activeCard.id) ? 'Saved' : 'Save verse'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleReadChapter(activeCard)}
                    hitSlop={8}
                    style={styles.readChapterBtn}
                  >
                    <Text style={[typography.uiRowTitle, { color: '#8A5A16', fontSize: 13 }]}>
                      Read chapter ➔
                    </Text>
                  </Pressable>

                  <Pressable onPress={handleCloseCard} hitSlop={10} style={styles.returnTableBtn}>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 13 }]}>
                      Close
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE2D1',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitles: {
    flex: 1,
    marginRight: 10,
  },
  progressPill: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderColor: 'rgba(216,166,74,0.4)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  tableCardSlot: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: 195,
  },
  centeredFifthSlot: {
    alignItems: 'center',
    marginTop: 18,
  },
  cardSurface: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(216,166,74,0.45)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#7A6038',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSealWrap: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traditionCardTitle: {
    color: '#8A5A16',
    fontSize: 11.5,
    textAlign: 'center',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  traditionScriptSubtitle: {
    color: '#7A6F60',
    fontSize: 10.5,
    textAlign: 'center',
  },
  exploredBadge: {
    backgroundColor: '#F5A623',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  unopenedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderColor: 'rgba(245,166,35,0.25)',
    borderWidth: 0.8,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F5A623',
    marginRight: 5,
  },
  cornerDotTL: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#D4952B',
    opacity: 0.45,
  },
  cornerDotTR: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#D4952B',
    opacity: 0.45,
  },
  cornerDotBL: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#D4952B',
    opacity: 0.45,
  },
  cornerDotBR: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#D4952B',
    opacity: 0.45,
  },
  footerNote: {
    marginTop: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  // 3D Flip Modal & Expanded Card Styles
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30, 24, 18, 0.55)',
  },
  modalCenterHost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardFaceCommon: {
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  expandedCardBase: {
    width: SCREEN_WIDTH - 32,
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderRadius: 18,
    shadowColor: '#3E2F1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  expandedBackInner: {
    width: '100%',
    height: 400,
    backgroundColor: '#FBF7F0',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E6CE9C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  frontCardFace: {
    backgroundColor: '#FDFBF7',
    borderColor: '#E2D3B8',
    borderWidth: 1.2,
  },
  cardScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.82,
  },
  cardScrollContainer: {
    padding: 22,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  traditionTagPill: {
    backgroundColor: 'rgba(245,166,35,0.14)',
    borderColor: 'rgba(216,166,74,0.4)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeBtn: {
    padding: 6,
  },
  expandedCitation: {
    color: '#2B2621',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  originalScriptBlock: {
    backgroundColor: 'rgba(245,166,35,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  originalScriptText: {
    fontSize: 22,
    lineHeight: 34,
    color: '#8A5D18',
    textAlign: 'center',
    fontFamily: 'serif',
  },
  verseTextWrap: {
    marginTop: 14,
  },
  openingQuoteGlyph: {
    fontSize: 34,
    lineHeight: 36,
    color: '#F5A623',
    marginBottom: -8,
  },
  readingBodyText: {
    color: '#2B2621',
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  reflectionBox: {
    backgroundColor: 'rgba(43,38,33,0.03)',
    borderLeftWidth: 2.5,
    borderLeftColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 16,
  },
  reflectionHintText: {
    color: '#5C5346',
    fontStyle: 'italic',
    fontSize: 12.5,
    lineHeight: 18,
  },
  expandedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2D3B8',
  },
  bookmarkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4952B',
    backgroundColor: 'transparent',
  },
  bookmarkActionBtnSaved: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
  },
  readChapterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(216,166,74,0.4)',
  },
  returnTableBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
});
