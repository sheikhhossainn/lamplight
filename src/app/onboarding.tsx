import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ChevronRightIcon } from '@/components/icons';
import { logEvent } from '@/features/analytics/analytics';
import { markOnboardingComplete } from '@/features/settings/onboardingStatus';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Slide = {
  key: string;
  headline: string;
  subtext: string;
};

const SLIDES: Slide[] = [
  {
    key: 'read',
    headline: 'Read like it’s 1890.',
    subtext:
      'Lamplight turns any page into the glow of a real book — worn, warm, and yours.',
  },
  {
    key: 'translate',
    headline: 'Hold a word. Meet its meaning.',
    subtext:
      'Press and hold — no dictionary, no tab-switching, no losing your place.',
  },
  {
    key: 'shelf',
    headline: 'Bring your own shelf.',
    subtext:
      "Import any EPUB, or start with a library of classics in the language you're learning.",
  },
];

function finishOnboarding() {
  markOnboardingComplete();
  logEvent('onboarding_complete');
  router.replace('/library');
}

function ReadIllustration() {
  const { colors } = useTheme();
  const ruledLines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <View style={[illustrationStyles.foldWrap, { transform: [{ rotate: '-4deg' }] }]}>
      <View style={[illustrationStyles.foldCard, { backgroundColor: colors.parchment }]}>
        <View style={illustrationStyles.ruledLines}>
          {ruledLines.map((i) => (
            <View key={i} style={[illustrationStyles.ruledLine, { backgroundColor: '#3A352C' }]} />
          ))}
        </View>
        <View style={illustrationStyles.foldTriangle} />
      </View>
    </View>
  );
}

function TranslateIllustration() {
  const { colors, typography, radius, spacing } = useTheme();
  return (
    <View style={illustrationStyles.translateWrap}>
      <View
        style={[
          illustrationStyles.sentenceCard,
          { backgroundColor: colors.parchment, borderRadius: radius.card, padding: spacing.md },
        ]}
      >
        <Text style={[typography.readingBody, { color: colors.ink, fontSize: 15, lineHeight: 26 }]}>
          …a single man in possession of a good{' '}
          <Text
            style={{
              backgroundColor: 'rgba(245,166,35,0.35)',
              color: colors.ink,
              borderWidth: 2,
              borderColor: 'rgba(245,166,35,0.55)',
              borderRadius: 3,
            }}
          >
            fortune
          </Text>
          , must be…
        </Text>
      </View>
      <View
        style={[
          illustrationStyles.translatePopup,
          { backgroundColor: colors.primaryDark, borderRadius: radius.card },
        ]}
      >
        <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>fortune</Text>
        <Text style={[typography.translatedWordInline, { color: colors.flameAmber, fontSize: 14 }]}>
          fortuna
        </Text>
      </View>
    </View>
  );
}

function ShelfIllustration() {
  const { colors, radius } = useTheme();
  const spines = [
    { color: colors.flameAmber, rotate: '-6deg', height: 78 },
    { color: colors.parchment, rotate: '0deg', height: 86 },
    { color: '#8A6A3A', rotate: '6deg', height: 78 },
  ] as const;
  return (
    <View style={illustrationStyles.fanWrap}>
      {spines.map((spine, index) => (
        <View
          key={index}
          style={[
            illustrationStyles.fanSpine,
            {
              height: spine.height,
              backgroundColor: spine.color,
              transform: [{ rotate: spine.rotate }],
              marginLeft: index === 0 ? 0 : -14,
              zIndex: index === 1 ? 2 : 1,
              borderTopLeftRadius: radius.bookCoverSpine,
              borderBottomLeftRadius: radius.bookCoverSpine,
              borderTopRightRadius: radius.bookCoverOuter,
              borderBottomRightRadius: radius.bookCoverOuter,
            },
          ]}
        />
      ))}
    </View>
  );
}

const ILLUSTRATIONS: Record<string, () => React.JSX.Element> = {
  read: ReadIllustration,
  translate: TranslateIllustration,
  shelf: ShelfIllustration,
};

export default function OnboardingScreen() {
  const { colors, typography, spacing } = useTheme();
  const listRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setActiveIndex(first.index);
      }
    },
  ).current;

  const goToNext = useCallback(() => {
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  }, [activeIndex]);

  const renderSlide = useCallback(
    ({ item, index }: { item: Slide; index: number }) => {
      const Illustration = ILLUSTRATIONS[item.key];
      const isLast = index === SLIDES.length - 1;
      return (
        <View style={[styles.slide, { width: screenWidth }]}>
          <Pressable
            style={styles.skip}
            onPress={finishOnboarding}
            hitSlop={12}
            pointerEvents={isLast ? 'none' : 'auto'}
          >
            <Text style={[typography.uiRowTitle, { color: colors.mutedOnDark, opacity: isLast ? 0 : 1 }]}>
              Skip
            </Text>
          </Pressable>

          <View style={styles.middleSection}>
            <Illustration />
            <View style={[styles.copy, { gap: spacing.sm, marginTop: 26 }]}>
              <Text style={[typography.onboardingHeadline, { color: colors.lampText, textAlign: 'center' }]}>
                {item.headline}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, textAlign: 'center' }]}>
                {item.subtext}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [colors, spacing, typography],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryDark }]}>
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="onboardingBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1C1B1E" />
            <Stop offset="55%" stopColor="#201E22" />
            <Stop offset="100%" stopColor="#26221F" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#onboardingBg)" />
      </Svg>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        overScrollMode="never"
      />

      <View
        style={[
          isLastSlide ? styles.footerColumn : styles.footerRow,
          { paddingHorizontal: spacing.xl },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  width: index === activeIndex ? 20 : 6,
                  backgroundColor: index === activeIndex ? colors.flameAmber : colors.dotInactive,
                },
              ]}
            />
          ))}
        </View>

        {isLastSlide ? (
          <Pressable
            style={[styles.getStartedButton, { backgroundColor: colors.flameAmber }]}
            onPress={finishOnboarding}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>
              Get started
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextButton, { backgroundColor: colors.flameAmber }]}
            onPress={goToNext}
          >
            <ChevronRightIcon color={colors.primaryDark} size={20} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 41,
  },
  skip: {
    alignSelf: 'flex-end',
  },
  middleSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    maxWidth: 280,
    alignItems: 'center',
  },
  footerRow: {
    paddingBottom: 48,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerColumn: {
    paddingBottom: 48,
    paddingTop: 12,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  nextButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButton: {
    width: '100%',
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const illustrationStyles = StyleSheet.create({
  foldWrap: {
    width: 120,
    height: 150,
  },
  foldCard: {
    width: 120,
    height: 150,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  ruledLines: {
    position: 'absolute',
    top: 14,
    left: 20,
    right: 14,
    bottom: 14,
    justifyContent: 'space-between',
  },
  ruledLine: {
    height: 2,
    opacity: 0.5,
    borderRadius: 1,
  },
  foldTriangle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderBottomWidth: 34,
    borderLeftWidth: 34,
    borderBottomColor: 'rgba(28,27,30,0.35)',
    borderLeftColor: 'transparent',
  },
  translateWrap: {
    alignItems: 'center',
  },
  sentenceCard: {
    width: 230,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  translatePopup: {
    marginTop: -20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 2,
    zIndex: 2,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fanWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    paddingLeft: 14,
  },
  fanSpine: {
    width: 54,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 6 },
    elevation: 4,
  },
});
