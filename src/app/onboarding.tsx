import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CheckIcon, ChevronRightIcon } from '@/components/icons';
import { logEvent } from '@/features/analytics/analytics';
import {
  LITERARY_THEMES,
  getLiteraryTheme,
  setLiteraryTheme,
  type LiteraryThemeCode,
} from '@/features/settings/literaryTheme';
import {
  MOTHER_TONGUES,
  getMotherTongue,
  setMotherTongue,
  type MotherTongueCode,
} from '@/features/settings/motherTongue';
import { markOnboardingComplete } from '@/features/settings/onboardingStatus';
import {
  TARGET_READING_LANGUAGES,
  getTargetReadingLanguage,
  setTargetReadingLanguage,
  type TargetReadingLanguageCode,
} from '@/features/settings/targetReadingLanguage';
import {
  CALIBRATION_WORDS,
  calculateVocabularyEstimate,
  getPresetWordIds,
  saveCalibrationData,
  type CalibrationPreset,
} from '@/features/vocabulary/calibration';
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
    headline: 'Read in the original tongue.',
    subtext:
      'An 1890s candlelit sanctuary — ambient nature sounds, timeless typography, and zero distractions.',
  },
  {
    key: 'coverage',
    headline: 'Know what you can understand.',
    subtext:
      'Every book is analyzed against your vocabulary. Discover books near 98% coverage for effortless reading with zero fatigue.',
  },
  {
    key: 'memory',
    headline: 'Meet a word. Keep it forever.',
    subtext:
      'Look up any unfamiliar word to add it to your spaced memory deck. Watch harder books unlock as your lexicon grows.',
  },
  {
    key: 'mother_tongue',
    headline: 'What is your mother tongue?',
    subtext:
      'We translate unfamiliar words into your native language and showcase native literature.',
  },
  {
    key: 'target_language',
    headline: 'What do you wish to read?',
    subtext:
      'Select the literature you wish to explore and expand your vocabulary in.',
  },
  {
    key: 'theme',
    headline: 'What themes draw you in?',
    subtext:
      'We tailor your starting shelf to stories that captivate your imagination.',
  },
  {
    key: 'calibration',
    headline: 'Calibrate your bookshelf',
    subtext:
      'Tap words you recognize to calculate your 98% coverage on day one.',
  },
];

function ReadIllustration() {
  const { colors, typography, radius } = useTheme();
  const textLines = [0, 1, 2, 3, 4];
  return (
    <View style={illustrationStyles.readCardWrap}>
      <View
        style={[
          illustrationStyles.readBookPage,
          {
            backgroundColor: colors.parchment,
            borderRadius: radius.card,
            borderColor: 'rgba(245, 166, 35, 0.25)',
            borderWidth: 1,
          },
        ]}
      >
        <Text
          style={[
            typography.eyebrowLabel,
            { color: colors.fawn, fontSize: 9, textAlign: 'center', marginBottom: 10, letterSpacing: 1.2 },
          ]}
        >
          CHAPTER I
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
          <Text
            style={[
              typography.wordmark,
              { color: colors.flameAmber, fontSize: 24, lineHeight: 26, marginRight: 8 },
            ]}
          >
            I
          </Text>
          <View style={{ flex: 1, gap: 5, paddingTop: 4 }}>
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: colors.ink, opacity: 0.2, width: '100%' },
              ]}
            />
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: colors.ink, opacity: 0.2, width: '88%' },
              ]}
            />
          </View>
        </View>
        <View style={{ gap: 6 }}>
          {textLines.map((i) => (
            <View
              key={i}
              style={[
                illustrationStyles.textLine,
                {
                  backgroundColor: colors.ink,
                  opacity: 0.16,
                  width: i === textLines.length - 1 ? '60%' : '100%',
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function CoverageIllustration() {
  const { colors, radius, typography } = useTheme();
  return (
    <View style={illustrationStyles.coverageWrap}>
      <View style={illustrationStyles.bookshelfRow}>
        {/* Left Book: 95% */}
        <View
          style={[
            illustrationStyles.bookCardSmall,
            {
              backgroundColor: '#26232A',
              borderTopLeftRadius: radius.card,
              borderBottomLeftRadius: radius.card,
            },
          ]}
        >
          <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 8 }]}>95%</Text>
        </View>

        {/* Center Hero Book: 98% Ready to Read */}
        <View
          style={[
            illustrationStyles.bookCardHero,
            {
              backgroundColor: colors.parchment,
              borderRadius: radius.card,
              borderColor: colors.flameAmber,
              borderWidth: 1.5,
              shadowColor: colors.flameAmber,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            },
          ]}
        >
          <View style={[illustrationStyles.coverageBadge, { backgroundColor: colors.flameAmber }]}>
            <Text
              style={[
                typography.eyebrowLabel,
                { color: colors.primaryDark, fontSize: 9, letterSpacing: 0.8 },
              ]}
            >
              98% READY
            </Text>
          </View>
          <View style={{ gap: 4, width: '100%', alignItems: 'center' }}>
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: colors.ink, opacity: 0.25, width: '70%' },
              ]}
            />
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: colors.ink, opacity: 0.15, width: '50%' },
              ]}
            />
          </View>
        </View>

        {/* Right Book: 88% */}
        <View
          style={[
            illustrationStyles.bookCardSmall,
            {
              backgroundColor: '#2D2825',
              borderTopRightRadius: radius.card,
              borderBottomRightRadius: radius.card,
            },
          ]}
        >
          <Text style={[typography.eyebrowLabel, { color: colors.straw, fontSize: 8 }]}>88%</Text>
        </View>
      </View>

      {/* Wooden Shelf Baseline */}
      <View style={[illustrationStyles.shelfBar, { backgroundColor: '#3A332C' }]} />
    </View>
  );
}

function MemoryIllustration() {
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(245, 166, 35, 0.15)',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
            marginTop: 4,
          }}
        >
          <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 8, letterSpacing: 0.5 }]}>
            Spaced Memory · 3d
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedMotherTongue, setSelectedMotherTongue] = useState<MotherTongueCode>(() => getMotherTongue());
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<TargetReadingLanguageCode>(() => {
    const current = getTargetReadingLanguage();
    return current ?? 'en';
  });
  const [selectedTheme, setSelectedTheme] = useState<LiteraryThemeCode>(() => getLiteraryTheme());

  // Calibration state
  const [activePreset, setActivePreset] = useState<CalibrationPreset | null>('intermediate');
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(() => {
    return new Set(getPresetWordIds('en', 'intermediate'));
  });

  const isLastSlide = activeIndex === SLIDES.length - 1;

  // Real-time calculation of vocabulary estimate incorporating target language, words, and theme
  const vocabEstimate = useMemo(() => {
    return calculateVocabularyEstimate(selectedTargetLanguage, selectedWordIds, selectedTheme);
  }, [selectedTargetLanguage, selectedWordIds, selectedTheme]);

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

  const handleSkipToIntroQuestions = useCallback(() => {
    listRef.current?.scrollToIndex({ index: 3, animated: true });
  }, []);

  // Update target language and sync calibration words
  const handleSelectTargetLanguage = useCallback((code: TargetReadingLanguageCode) => {
    setSelectedTargetLanguage(code);
    setActivePreset('intermediate');
    setSelectedWordIds(new Set(getPresetWordIds(code, 'intermediate')));
  }, []);

  // Select preset level in calibration
  const handleSelectPreset = useCallback(
    (preset: CalibrationPreset) => {
      setActivePreset(preset);
      setSelectedWordIds(new Set(getPresetWordIds(selectedTargetLanguage, preset)));
    },
    [selectedTargetLanguage],
  );

  // Toggle individual word chip in calibration
  const handleToggleWord = useCallback((id: string) => {
    setActivePreset(null);
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleFinish = useCallback(async () => {
    setMotherTongue(selectedMotherTongue);
    setTargetReadingLanguage(selectedTargetLanguage);
    setLiteraryTheme(selectedTheme);

    await saveCalibrationData({
      targetReadingLanguage: selectedTargetLanguage,
      estimatedWords: vocabEstimate.count,
      tierLabel: vocabEstimate.tierLabel,
      selectedWordIds: Array.from(selectedWordIds),
      recommendedBookId: vocabEstimate.startingBook.id,
    });

    markOnboardingComplete();
    logEvent('onboarding_complete', {
      mother_tongue: selectedMotherTongue,
      target_reading_language: selectedTargetLanguage,
      literary_theme: selectedTheme,
      estimated_words: vocabEstimate.count,
      recommended_book: vocabEstimate.startingBook.id,
    });

    router.replace('/homescreen' as any);
  }, [selectedMotherTongue, selectedTargetLanguage, selectedTheme, selectedWordIds, vocabEstimate]);

  const renderSlide = useCallback(
    ({ item }: { item: Slide; index: number }) => {
      const isMotherTongue = item.key === 'mother_tongue';
      const isTargetLang = item.key === 'target_language';
      const isTheme = item.key === 'theme';
      const isCalibration = item.key === 'calibration';
      const isIntro = !isMotherTongue && !isTargetLang && !isTheme && !isCalibration;

      return (
        <View
          style={[
            styles.slide,
            {
              width: screenWidth,
              paddingTop: Math.max(insets.top + 6, 18),
            },
          ]}
        >
          {/* Top Header / Skip Button */}
          <View style={styles.topBar}>
            {isIntro ? (
              <Pressable
                style={styles.skip}
                onPress={handleSkipToIntroQuestions}
                hitSlop={14}
              >
                <Text style={[typography.uiRowTitle, { color: colors.mutedOnDark, fontSize: 13 }]}>
                  Skip Intro
                </Text>
              </Pressable>
            ) : isCalibration ? (
              <Pressable
                style={styles.skip}
                onPress={handleFinish}
                hitSlop={14}
              >
                <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 13 }]}>
                  Skip test
                </Text>
              </Pressable>
            ) : (
              <View style={styles.skipPlaceholder} />
            )}
          </View>

          {/* Slide Body Content */}
          {isMotherTongue ? (
            /* Slide 4: Mother Tongue Question */
            <View style={styles.questionSection}>
              <Animated.View
                entering={FadeIn.delay(100).duration(450).easing(Easing.out(Easing.cubic))}
                style={[styles.copy, { marginBottom: spacing.md }]}
              >
                <Text
                  style={[
                    typography.onboardingHeadline,
                    { color: colors.lampText, textAlign: 'center', fontSize: 23 },
                  ]}
                >
                  {item.headline}
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.mutedOnDark, textAlign: 'center', marginTop: 6, fontSize: 13 },
                  ]}
                >
                  {item.subtext}
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeIn.delay(200).duration(450).easing(Easing.out(Easing.cubic))}
                style={styles.optionsList}
              >
                {MOTHER_TONGUES.map((opt) => {
                  const isSelected = selectedMotherTongue === opt.code;
                  return (
                    <Pressable
                      key={opt.code}
                      onPress={() => setSelectedMotherTongue(opt.code)}
                      style={({ pressed }) => [
                        styles.languageCard,
                        {
                          backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.08)' : colors.ember,
                          borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                          borderWidth: isSelected ? 1.5 : 1,
                          borderRadius: radius.card,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.flagEmoji}>{opt.flag}</Text>
                      <View style={styles.languageInfo}>
                        <View style={styles.languageTitleRow}>
                          <Text
                            style={[
                              typography.uiRowTitle,
                              { color: colors.lampText, fontSize: 16 },
                            ]}
                          >
                            {opt.nativeName}{' '}
                            <Text style={{ color: colors.fawn, fontSize: 13, fontWeight: '400' }}>
                              ({opt.name})
                            </Text>
                          </Text>
                        </View>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.flameAmber, fontSize: 12, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.sourceName}
                        </Text>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.mutedOnDark, fontSize: 11, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.sampleAuthors}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioIndicator,
                          {
                            borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                            backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                          },
                        ]}
                      >
                        {isSelected ? <CheckIcon color={colors.primaryDark} size={11} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </Animated.View>
            </View>
          ) : isTargetLang ? (
            /* Slide 5: Target Reading Language */
            <View style={styles.questionSection}>
              <Animated.View
                entering={FadeIn.delay(100).duration(450).easing(Easing.out(Easing.cubic))}
                style={[styles.copy, { marginBottom: spacing.md }]}
              >
                <Text
                  style={[
                    typography.onboardingHeadline,
                    { color: colors.lampText, textAlign: 'center', fontSize: 23 },
                  ]}
                >
                  {item.headline}
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.mutedOnDark, textAlign: 'center', marginTop: 6, fontSize: 13 },
                  ]}
                >
                  {item.subtext}
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeIn.delay(200).duration(450).easing(Easing.out(Easing.cubic))}
                style={styles.optionsList}
              >
                {TARGET_READING_LANGUAGES.map((opt) => {
                  const isSelected = selectedTargetLanguage === opt.code;
                  return (
                    <Pressable
                      key={opt.code}
                      onPress={() => handleSelectTargetLanguage(opt.code)}
                      style={({ pressed }) => [
                        styles.languageCard,
                        {
                          backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.08)' : colors.ember,
                          borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                          borderWidth: isSelected ? 1.5 : 1,
                          borderRadius: radius.card,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.flagEmoji}>{opt.flag}</Text>
                      <View style={styles.languageInfo}>
                        <View style={styles.languageTitleRow}>
                          <Text
                            style={[
                              typography.uiRowTitle,
                              { color: colors.lampText, fontSize: 16 },
                            ]}
                          >
                            {opt.name}{' '}
                            <Text style={{ color: colors.fawn, fontSize: 13, fontWeight: '400' }}>
                              ({opt.nativeName})
                            </Text>
                          </Text>
                        </View>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.flameAmber, fontSize: 12, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.sourceName}
                        </Text>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.mutedOnDark, fontSize: 11, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.sampleAuthors}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioIndicator,
                          {
                            borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                            backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                          },
                        ]}
                      >
                        {isSelected ? <CheckIcon color={colors.primaryDark} size={11} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </Animated.View>
            </View>
          ) : isTheme ? (
            /* Slide 6: Literary Themes Selection */
            <View style={styles.questionSection}>
              <Animated.View
                entering={FadeIn.delay(100).duration(450).easing(Easing.out(Easing.cubic))}
                style={[styles.copy, { marginBottom: spacing.md }]}
              >
                <Text
                  style={[
                    typography.onboardingHeadline,
                    { color: colors.lampText, textAlign: 'center', fontSize: 23 },
                  ]}
                >
                  {item.headline}
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.mutedOnDark, textAlign: 'center', marginTop: 6, fontSize: 13 },
                  ]}
                >
                  {item.subtext}
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeIn.delay(200).duration(450).easing(Easing.out(Easing.cubic))}
                style={styles.optionsList}
              >
                {LITERARY_THEMES.map((opt) => {
                  const isSelected = selectedTheme === opt.code;
                  return (
                    <Pressable
                      key={opt.code}
                      onPress={() => setSelectedTheme(opt.code)}
                      style={({ pressed }) => [
                        styles.languageCard,
                        {
                          backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.08)' : colors.ember,
                          borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                          borderWidth: isSelected ? 1.5 : 1,
                          borderRadius: radius.card,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.flagEmoji}>{opt.icon}</Text>
                      <View style={styles.languageInfo}>
                        <View style={styles.languageTitleRow}>
                          <Text
                            style={[
                              typography.uiRowTitle,
                              { color: colors.lampText, fontSize: 16 },
                            ]}
                          >
                            {opt.title}
                          </Text>
                        </View>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.flameAmber, fontSize: 12, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.subtitle}
                        </Text>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.mutedOnDark, fontSize: 11, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.sampleAuthors}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioIndicator,
                          {
                            borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                            backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                          },
                        ]}
                      >
                        {isSelected ? <CheckIcon color={colors.primaryDark} size={11} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </Animated.View>
            </View>
          ) : isCalibration ? (
            /* Slide 7: Vocabulary Calibration Test */
            <View style={styles.calibrationSection}>
              <Animated.View
                entering={FadeIn.delay(100).duration(450).easing(Easing.out(Easing.cubic))}
                style={[styles.copy, { marginBottom: 12 }]}
              >
                <Text
                  style={[
                    typography.onboardingHeadline,
                    { color: colors.lampText, textAlign: 'center', fontSize: 23 },
                  ]}
                >
                  {item.headline}
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.mutedOnDark, textAlign: 'center', marginTop: 4, fontSize: 12 },
                  ]}
                >
                  {item.subtext}
                </Text>
              </Animated.View>

              {/* Level Presets Row */}
              <Animated.View
                entering={FadeIn.delay(180).duration(450).easing(Easing.out(Easing.cubic))}
                style={styles.presetsRow}
              >
                {(
                  [
                    { key: 'foundational', label: 'Foundational' },
                    { key: 'intermediate', label: 'Intermediate' },
                    { key: 'advanced', label: 'Advanced' },
                    { key: 'scholar', label: 'Scholar' },
                  ] as const
                ).map((p) => {
                  const isActive = activePreset === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => handleSelectPreset(p.key)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isActive ? colors.flameAmber : 'rgba(255, 255, 255, 0.05)',
                          borderColor: isActive ? colors.flameAmber : 'rgba(255, 255, 255, 0.1)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.eyebrowLabel,
                          {
                            color: isActive ? colors.primaryDark : colors.straw,
                            fontSize: 10,
                            letterSpacing: 0.4,
                          },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </Animated.View>

              {/* 12-Word Recognition Grid */}
              <ScrollView
                style={styles.wordsScroll}
                contentContainerStyle={styles.wordsGrid}
                showsVerticalScrollIndicator={false}
              >
                {(CALIBRATION_WORDS[selectedTargetLanguage] ?? CALIBRATION_WORDS.en).map((itemWord) => {
                  const isChecked = selectedWordIds.has(itemWord.id);
                  return (
                    <Pressable
                      key={itemWord.id}
                      onPress={() => handleToggleWord(itemWord.id)}
                      style={({ pressed }) => [
                        styles.wordCard,
                        {
                          backgroundColor: isChecked ? 'rgba(245, 166, 35, 0.12)' : colors.ember,
                          borderColor: isChecked ? colors.flameAmber : 'rgba(255, 255, 255, 0.08)',
                          borderWidth: isChecked ? 1.5 : 1,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.wordCheckDot,
                          {
                            backgroundColor: isChecked ? colors.flameAmber : 'transparent',
                            borderColor: isChecked ? colors.flameAmber : 'rgba(255, 255, 255, 0.25)',
                          },
                        ]}
                      >
                        {isChecked ? <CheckIcon color={colors.primaryDark} size={9} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            typography.uiRowTitle,
                            {
                              color: isChecked ? colors.flameAmber : colors.lampText,
                              fontSize: 14,
                              fontWeight: isChecked ? '600' : '400',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {itemWord.word}
                          {itemWord.phonetic ? (
                            <Text style={{ color: colors.fawn, fontSize: 11, fontWeight: '400' }}>
                              {' '}· {itemWord.phonetic}
                            </Text>
                          ) : null}
                        </Text>
                        <Text
                          style={[
                            typography.metadataCaption,
                            { color: colors.mutedOnDark, fontSize: 10, marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {itemWord.meaning}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Dynamic Lexicon Live Estimate Card with Book Unlock Match */}
              <Animated.View
                entering={FadeInUp.delay(260).duration(450).easing(Easing.out(Easing.cubic))}
                style={[
                  styles.estimationCard,
                  {
                    backgroundColor: 'rgba(245, 166, 35, 0.08)',
                    borderColor: 'rgba(245, 166, 35, 0.35)',
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.estimationTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: colors.flameAmber, fontSize: 14 }}>✦</Text>
                    <Text
                      style={[
                        typography.uiRowTitle,
                        { color: colors.lampText, fontSize: 13, fontWeight: '600' },
                      ]}
                    >
                      Lexicon: {vocabEstimate.countLabel}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.coverageBadgePill,
                      { backgroundColor: colors.flameAmber, borderRadius: 10 },
                    ]}
                  >
                    <Text
                      style={[
                        typography.eyebrowLabel,
                        { color: colors.primaryDark, fontSize: 9, letterSpacing: 0.6 },
                      ]}
                    >
                      {vocabEstimate.coverageBadge}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.lampText, fontSize: 12, marginTop: 4, fontWeight: '500' },
                  ]}
                  numberOfLines={1}
                >
                  Unlocks: {vocabEstimate.startingBook.title}
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.fawn, fontSize: 11, marginTop: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {vocabEstimate.startingBook.reason}
                </Text>
              </Animated.View>
            </View>
          ) : (
            /* Intro Promo Slides (Read, Coverage, Memory) */
            <View style={styles.middleSection}>
              <Animated.View entering={FadeIn.delay(100).duration(480).easing(Easing.out(Easing.cubic))}>
                {item.key === 'read' ? (
                  <ReadIllustration />
                ) : item.key === 'coverage' ? (
                  <CoverageIllustration />
                ) : (
                  <MemoryIllustration />
                )}
              </Animated.View>
              <Animated.View
                entering={FadeIn.delay(240).duration(450).easing(Easing.out(Easing.cubic))}
                style={[styles.copy, { gap: spacing.sm, marginTop: 26 }]}
              >
                <Text
                  style={[
                    typography.onboardingHeadline,
                    { color: colors.lampText, textAlign: 'center' },
                  ]}
                >
                  {item.headline}
                </Text>
                <Text
                  style={[
                    typography.metadataCaption,
                    { color: colors.mutedOnDark, textAlign: 'center' },
                  ]}
                >
                  {item.subtext}
                </Text>
              </Animated.View>
            </View>
          )}
        </View>
      );
    },
    [
      activePreset,
      colors,
      handleFinish,
      handleSelectPreset,
      handleSelectTargetLanguage,
      handleSkipToIntroQuestions,
      handleToggleWord,
      insets.top,
      radius.card,
      selectedMotherTongue,
      selectedTargetLanguage,
      selectedTheme,
      selectedWordIds,
      spacing.md,
      spacing.sm,
      typography,
      vocabEstimate,
    ],
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

      {/* Footer Navigation Area */}
      <Animated.View
        entering={FadeInUp.delay(350).duration(450).easing(Easing.out(Easing.cubic))}
        style={[
          isLastSlide ? styles.footerColumn : styles.footerRow,
          {
            paddingHorizontal: spacing.xl,
            paddingBottom: Math.max(insets.bottom + 14, 24),
          },
        ]}
      >
        {/* Progress Dots */}
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

        {/* Action Button */}
        {isLastSlide ? (
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              {
                backgroundColor: colors.flameAmber,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={handleFinish}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 15 }]}>
              Begin Reading
            </Text>
            <View style={{ marginLeft: 6 }}>
              <ChevronRightIcon color={colors.primaryDark} size={17} />
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              {
                backgroundColor: colors.flameAmber,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
            onPress={goToNext}
          >
            <ChevronRightIcon color={colors.primaryDark} size={20} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: 32,
    alignItems: 'center',
  },
  skip: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipPlaceholder: {
    height: 24,
  },
  middleSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  questionSection: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  calibrationSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingBottom: 10,
  },
  copy: {
    maxWidth: 320,
    alignSelf: 'center',
    alignItems: 'center',
  },
  optionsList: {
    gap: 10,
    marginTop: 4,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  flagEmoji: {
    fontSize: 26,
    marginRight: 14,
  },
  languageInfo: {
    flex: 1,
  },
  languageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    justifyContent: 'center',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  wordsScroll: {
    flex: 1,
    maxHeight: 280,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  wordCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  wordCheckDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  estimationCard: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  estimationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverageBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  footerRow: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerColumn: {
    paddingTop: 8,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
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
    height: 50,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const illustrationStyles = StyleSheet.create({
  readCardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readBookPage: {
    width: 148,
    height: 148,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  textLine: {
    height: 3,
    borderRadius: 1.5,
  },
  coverageWrap: {
    alignItems: 'center',
    width: 220,
  },
  bookshelfRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  bookCardHero: {
    width: 92,
    height: 118,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    zIndex: 3,
  },
  bookCardSmall: {
    width: 44,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    opacity: 0.8,
  },
  coverageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shelfBar: {
    width: 210,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
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
});
