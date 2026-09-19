import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  LiteraryThemeIcon,
  SearchIcon,
  TranslateIcon,
} from '@/components/icons';
import { LanguageBadge } from '@/components/LanguageBadge';
import { logEvent } from '@/features/analytics/analytics';
import {
  LITERARY_THEMES,
  getLiteraryTheme,
  getModularThemePresentation,
  getSuggestedThemeForMotherTongue,
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
import { LamplightColor } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Slide = {
  key: string;
  eyebrow?: string;
  headline: string;
  subtext: string;
};

const SLIDES: Slide[] = [
  {
    key: 'read',
    eyebrow: 'ORIGINAL-LANGUAGE READING',
    headline: 'Read the book in the language it was written.',
    subtext:
      'Lamplight gives you a calm reading space, with help only when you need it.',
  },
  {
    key: 'coverage',
    eyebrow: 'CHOOSE WITH CONFIDENCE',
    headline: 'Start with a book you can actually enjoy.',
    subtext:
      'See how much of each book you already understand before you begin, so reading feels challenging—not exhausting.',
  },
  {
    key: 'memory',
    eyebrow: 'LEARN WHILE READING',
    headline: 'Let every unfamiliar word make the next page easier.',
    subtext:
      'Hold a word for its meaning, save it, then revisit it in short reviews at the right time.',
  },
  {
    key: 'mother_tongue',
    headline: 'What is your mother tongue?',
    subtext:
      'Unknown words will be explained in this language. We will also surface literature from it.',
  },
  {
    key: 'target_language',
    headline: 'What do you wish to read?',
    subtext:
      'We will shape your starter shelf and word practice around the language you want to read.',
  },
  {
    key: 'theme',
    headline: 'Choose a reading theme.',
    subtext:
      'Culture-matched palettes crafted for calm, original-language reading. Suggested based on your native language.',
  },
  {
    key: 'calibration',
    headline: 'Find your first comfortable book.',
    subtext:
      'Tap words you know. We will recommend a book that lets you grow without losing the story.',
  },
];

function ReadIllustration() {
  const { typography, radius } = useTheme();
  const textLines = [0, 1, 2, 3, 4];
  return (
    <View style={illustrationStyles.readCardWrap}>
      <View
        style={[
          illustrationStyles.readBookPage,
          {
            backgroundColor: LamplightColor.parchment,
            borderRadius: radius.card,
            borderColor: 'rgba(245, 166, 35, 0.25)',
            borderWidth: 1,
          },
        ]}
      >
        <Text
          style={[
            typography.eyebrowLabel,
            { color: LamplightColor.fawn, fontSize: 9, textAlign: 'center', marginBottom: 10, letterSpacing: 1.2 },
          ]}
        >
          CHAPTER I
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
          <Text
            style={[
              typography.wordmark,
              { color: LamplightColor.flameAmber, fontSize: 24, lineHeight: 26, marginRight: 8 },
            ]}
          >
            I
          </Text>
          <View style={{ flex: 1, gap: 5, paddingTop: 4 }}>
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: LamplightColor.ink, opacity: 0.2, width: '100%' },
              ]}
            />
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: LamplightColor.ink, opacity: 0.2, width: '88%' },
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
                  backgroundColor: LamplightColor.ink,
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
              backgroundColor: LamplightColor.parchment,
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
                { backgroundColor: LamplightColor.ink, opacity: 0.25, width: '70%' },
              ]}
            />
            <View
              style={[
                illustrationStyles.textLine,
                { backgroundColor: LamplightColor.ink, opacity: 0.15, width: '50%' },
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
          { backgroundColor: LamplightColor.parchment, borderRadius: radius.card, padding: spacing.md },
        ]}
      >
        <Text style={[typography.readingBody, { color: LamplightColor.ink, fontSize: 15, lineHeight: 26 }]}>
          …a single man in possession of a good{' '}
          <Text
            style={{
              backgroundColor: 'rgba(245,166,35,0.35)',
              color: LamplightColor.ink,
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

function MotherTongueSlide({
  selectedCode,
  onSelect,
  headline,
  subtext,
}: {
  selectedCode: MotherTongueCode;
  onSelect: (code: MotherTongueCode) => void;
  headline: string;
  subtext: string;
}) {
  const { colors, typography, radius } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return MOTHER_TONGUES;
    return MOTHER_TONGUES.filter((opt) => {
      const matchName = opt.name.toLowerCase().includes(q);
      const matchNative = opt.nativeName.toLowerCase().includes(q);
      const matchSource = opt.sourceName.toLowerCase().includes(q);
      const matchAuthors = opt.sampleAuthors.toLowerCase().includes(q);
      const matchCode = opt.code.toLowerCase().includes(q);
      const synonyms: Record<string, string[]> = {
        bn: ['bangla', 'bengali', 'bengal', 'বাংলা', 'রবীন্দ্রনাথ', 'tagore', 'nazrul'],
        ja: ['japanese', 'japan', 'nihon', 'nihongo', '日本語', '和風', 'soseki', 'dazai'],
        ko: ['korean', 'korea', 'hangul', '한국', '한국어', '조선', 'yi sang'],
        ar: ['arabic', 'arab', 'arabi', 'عربي', 'العربية', 'islamic', 'quran', 'mahfouz'],
        en: ['english', 'other', 'latin', 'british', 'american', 'global', 'gutenberg'],
      };
      const extraMatches = (synonyms[opt.code] ?? []).some((s) => s.includes(q) || q.includes(s));
      return matchName || matchNative || matchSource || matchAuthors || matchCode || extraMatches;
    });
  }, [searchQuery]);

  return (
    <View style={styles.motherTongueSection}>
      <Animated.View
        entering={FadeIn.delay(60).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={[styles.copy, { marginBottom: 10 }]}
      >
        <Text
          style={[
            typography.onboardingHeadline,
            { color: colors.lampText, textAlign: 'center', fontSize: 23 },
          ]}
        >
          {headline}
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginTop: 4, fontSize: 12 },
          ]}
        >
          {subtext}
        </Text>
      </Animated.View>

      {/* Mother Tongue Search Bar */}
      <Animated.View
        entering={FadeIn.delay(90).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={styles.searchBarWrap}
      >
        <View
          style={[
            styles.searchBarContainer,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: radius.card,
            },
          ]}
        >
          <SearchIcon color={colors.mutedOnDark} size={16} />
          <TextInput
            style={[
              styles.searchInput,
              typography.uiRowTitle,
              {
                color: colors.lampText,
                fontSize: 13,
              },
            ]}
            placeholder="Search mother tongue, language, or script..."
            placeholderTextColor={colors.mutedOnDark}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
              hitSlop={8}
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear mother tongue search"
            >
              <CloseIcon color={colors.mutedOnDark} size={14} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Mother Tongue Dynamic Content */}
      <View style={styles.motherTongueContentArea}>
        {filtered.length > 0 ? (
          <>
            <View style={styles.motherTongueOptionsList}>
              {filtered.map((opt) => {
                const isSelected = selectedCode === opt.code;
                return (
                  <Pressable
                    key={opt.code}
                    onPress={() => onSelect(opt.code)}
                    style={({ pressed }) => [
                      styles.motherTongueLanguageCard,
                      {
                        backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.08)' : colors.ember,
                        borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderRadius: radius.card,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <LanguageBadge code={opt.code} size={36} isSelected={isSelected} />
                    <View style={styles.languageInfo}>
                      <View style={styles.languageTitleRow}>
                        <Text
                          style={[
                            typography.uiRowTitle,
                            { color: colors.lampText, fontSize: 15 },
                          ]}
                        >
                          {opt.nativeName}{' '}
                          <Text style={{ color: colors.fawn, fontSize: 12.5, fontWeight: '400' }}>
                            ({opt.name})
                          </Text>
                        </Text>
                      </View>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.flameAmber, fontSize: 11, marginTop: 1 },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.sourceName}
                      </Text>
                      <Text
                        style={[
                          typography.metadataCaption,
                          { color: colors.mutedOnDark, fontSize: 10.5, marginTop: 1 },
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
            </View>

            {/* More Languages Coming Soon Footer */}
            <View
              style={[
                styles.comingSoonCard,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: 'rgba(255, 255, 255, 0.07)',
                  borderRadius: radius.card,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ color: colors.flameAmber, fontSize: 11 }}>✦</Text>
                <Text
                  style={[
                    typography.eyebrowLabel,
                    { color: colors.flameAmber, fontSize: 9.5, letterSpacing: 0.6 },
                  ]}
                >
                  MORE LANGUAGES ARE COMING SOON
                </Text>
              </View>
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.mutedOnDark, fontSize: 10.5, marginTop: 2, textAlign: 'center' },
                ]}
              >
                More languages are coming soon. Persian, Sanskrit, French, German, Urdu & Russian in progress.
              </Text>
            </View>
          </>
        ) : (
          <View
            style={[
              styles.emptySearchCard,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: radius.card,
              },
            ]}
          >
            <View
              style={[
                styles.emptySearchIconWrap,
                {
                  backgroundColor: 'rgba(245, 166, 35, 0.1)',
                  borderColor: 'rgba(245, 166, 35, 0.25)',
                },
              ]}
            >
              <SearchIcon color={colors.flameAmber} size={20} />
            </View>
            <Text
              style={[
                typography.uiRowTitle,
                { color: colors.lampText, fontSize: 15, marginTop: 12, textAlign: 'center' },
              ]}
            >
              No language found for &ldquo;{searchQuery.trim()}&rdquo;
            </Text>
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.mutedOnDark, fontSize: 11.5, marginTop: 5, textAlign: 'center', maxWidth: 260 },
              ]}
            >
              More languages are coming soon. Persian, Sanskrit, French, German, Urdu & Russian in progress.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
              style={[
                styles.resetSearchChip,
                {
                  borderColor: colors.flameAmber,
                  backgroundColor: 'rgba(245, 166, 35, 0.12)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset language search"
            >
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.flameAmber, fontSize: 11, letterSpacing: 0.5 },
                ]}
              >
                Clear search
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function TargetLanguageSlide({
  selectedCode,
  onSelect,
  headline,
  subtext,
}: {
  selectedCode: TargetReadingLanguageCode;
  onSelect: (code: TargetReadingLanguageCode) => void;
  headline: string;
  subtext: string;
}) {
  const { colors, typography, radius } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TARGET_READING_LANGUAGES;
    return TARGET_READING_LANGUAGES.filter((opt) => {
      const matchName = opt.name.toLowerCase().includes(q);
      const matchNative = opt.nativeName.toLowerCase().includes(q);
      const matchSource = opt.sourceName.toLowerCase().includes(q);
      const matchAuthors = opt.sampleAuthors.toLowerCase().includes(q);
      const matchCode = opt.code.toLowerCase().includes(q);
      const synonyms: Record<string, string[]> = {
        en: ['english', 'latin', 'british', 'american', 'gutenberg', 'ইংরেজি', 'পাশ্চাত্য', 'victorian'],
        ja: ['japanese', 'japan', 'nihon', 'nihongo', '日本語', 'aozora', 'জাপানি'],
        bn: ['bangla', 'bengali', 'বাংলা', 'রবীন্দ্রনাথ', 'tagore', 'nazrul'],
        ko: ['korean', 'korea', 'hangul', '한국', '한국어', 'gongu', 'কোরীয়'],
      };
      const extraMatches = (synonyms[opt.code] ?? []).some((s) => s.includes(q) || q.includes(s));
      return matchName || matchNative || matchSource || matchAuthors || matchCode || extraMatches;
    });
  }, [searchQuery]);

  return (
    <View style={styles.motherTongueSection}>
      <Animated.View
        entering={FadeIn.delay(60).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={[styles.copy, { marginBottom: 10 }]}
      >
        <Text
          style={[
            typography.onboardingHeadline,
            { color: colors.lampText, textAlign: 'center', fontSize: 23 },
          ]}
        >
          {headline}
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginTop: 4, fontSize: 12 },
          ]}
        >
          {subtext}
        </Text>
      </Animated.View>

      {/* Target Reading Language Search Bar */}
      <Animated.View
        entering={FadeIn.delay(90).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={styles.searchBarWrap}
      >
        <View
          style={[
            styles.searchBarContainer,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: radius.card,
            },
          ]}
        >
          <SearchIcon color={colors.mutedOnDark} size={16} />
          <TextInput
            style={[
              styles.searchInput,
              typography.uiRowTitle,
              {
                color: colors.lampText,
                fontSize: 13,
              },
            ]}
            placeholder="Search reading language, script, or author..."
            placeholderTextColor={colors.mutedOnDark}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
              hitSlop={8}
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear reading language search"
            >
              <CloseIcon color={colors.mutedOnDark} size={14} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Dynamic Content */}
      <View style={styles.motherTongueContentArea}>
        {filtered.length > 0 ? (
          <View style={styles.motherTongueOptionsList}>
            {filtered.map((opt) => {
              const isSelected = selectedCode === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => onSelect(opt.code)}
                  style={({ pressed }) => [
                    styles.motherTongueLanguageCard,
                    {
                      backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.08)' : colors.ember,
                      borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderRadius: radius.card,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <LanguageBadge code={opt.code} size={36} isSelected={isSelected} />
                  <View style={styles.languageInfo}>
                    <View style={styles.languageTitleRow}>
                      <Text
                        style={[
                          typography.uiRowTitle,
                          { color: colors.lampText, fontSize: 15 },
                        ]}
                      >
                        {opt.name}{' '}
                        <Text style={{ color: colors.fawn, fontSize: 12.5, fontWeight: '400' }}>
                          ({opt.nativeName})
                        </Text>
                      </Text>
                    </View>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.flameAmber, fontSize: 11, marginTop: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.sourceName}
                    </Text>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.mutedOnDark, fontSize: 10.5, marginTop: 1 },
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
          </View>
        ) : (
          <View
            style={[
              styles.emptySearchCard,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: radius.card,
              },
            ]}
          >
            <View
              style={[
                styles.emptySearchIconWrap,
                {
                  backgroundColor: 'rgba(245, 166, 35, 0.1)',
                  borderColor: 'rgba(245, 166, 35, 0.25)',
                },
              ]}
            >
              <SearchIcon color={colors.flameAmber} size={20} />
            </View>
            <Text
              style={[
                typography.uiRowTitle,
                { color: colors.lampText, fontSize: 15, marginTop: 12, textAlign: 'center' },
              ]}
            >
              No reading language found for &ldquo;{searchQuery.trim()}&rdquo;
            </Text>
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.mutedOnDark, fontSize: 11.5, marginTop: 5, textAlign: 'center', maxWidth: 260 },
              ]}
            >
              More reading languages are in development. Classic Greek, Latin, Sanskrit & French in progress.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
              style={[
                styles.resetSearchChip,
                {
                  borderColor: colors.flameAmber,
                  backgroundColor: 'rgba(245, 166, 35, 0.12)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset reading language search"
            >
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.flameAmber, fontSize: 11, letterSpacing: 0.5 },
                ]}
              >
                Clear search
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function ThemeSlide({
  selectedCode,
  motherTongue,
  targetReadingLanguage,
  onSelect,
  headline,
  subtext,
}: {
  selectedCode: LiteraryThemeCode;
  motherTongue: MotherTongueCode;
  targetReadingLanguage: TargetReadingLanguageCode;
  onSelect: (code: LiteraryThemeCode) => void;
  headline: string;
  subtext: string;
}) {
  const { colors, typography, radius } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return LITERARY_THEMES;
    return LITERARY_THEMES.filter((t) => {
      const pres = getModularThemePresentation(t.code, motherTongue, targetReadingLanguage);
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchPresTitle = pres.title.toLowerCase().includes(q);
      const matchNative = t.nativeTitle.toLowerCase().includes(q);
      const matchPresNative = pres.nativeTitle.toLowerCase().includes(q);
      const matchSubtitle = t.subtitle.toLowerCase().includes(q);
      const matchPresSubtitle = pres.subtitle.toLowerCase().includes(q);
      const matchAuthors = t.sampleAuthors.toLowerCase().includes(q);
      const matchPresAuthors = pres.sampleAuthors.toLowerCase().includes(q);
      const matchCode = t.code.toLowerCase().includes(q);
      const matchPalette = (t.paletteLabel ?? '').toLowerCase().includes(q);
      const synonyms: Record<string, string[]> = {
        bengali: ['bangla', 'bengal', 'বাংলা', 'রবীন্দ্রনাথ', 'tagore'],
        korean: ['hangul', 'korea', '한국', '한국어', '조선', 'কোরীয়'],
        arabic: ['arab', 'arabi', 'عربي', 'العربية', 'islamic', 'আরবি'],
        japanese: ['nihon', 'nihongo', 'japan', '日本語', '和風', 'জাপানি'],
        western: ['english', 'latin', 'classic', 'british', 'american', 'victorian', 'পাশ্চাত্য'],
      };
      const extraMatches = (synonyms[t.code] ?? []).some((s) => s.includes(q) || q.includes(s));
      return (
        matchTitle ||
        matchPresTitle ||
        matchNative ||
        matchPresNative ||
        matchSubtitle ||
        matchPresSubtitle ||
        matchAuthors ||
        matchPresAuthors ||
        matchCode ||
        matchPalette ||
        extraMatches
      );
    });
  }, [searchQuery, motherTongue, targetReadingLanguage]);

  return (
    <View style={styles.themeSection}>
      <Animated.View
        entering={FadeIn.delay(60).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={[styles.copy, { marginBottom: 10 }]}
      >
        <Text
          style={[
            typography.onboardingHeadline,
            { color: colors.lampText, textAlign: 'center', fontSize: 23 },
          ]}
        >
          {headline}
        </Text>
        <Text
          style={[
            typography.metadataCaption,
            { color: colors.mutedOnDark, textAlign: 'center', marginTop: 4, fontSize: 12 },
          ]}
        >
          {subtext}
        </Text>
      </Animated.View>

      {/* Theme Search Bar */}
      <Animated.View
        entering={FadeIn.delay(90).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={styles.searchBarWrap}
      >
        <View
          style={[
            styles.searchBarContainer,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: radius.card,
            },
          ]}
        >
          <SearchIcon color={colors.mutedOnDark} size={16} />
          <TextInput
            style={[
              styles.searchInput,
              typography.uiRowTitle,
              {
                color: colors.lampText,
                fontSize: 13,
              },
            ]}
            placeholder="Search themes, languages, or authors..."
            placeholderTextColor={colors.mutedOnDark}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
              hitSlop={8}
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear theme search"
            >
              <CloseIcon color={colors.mutedOnDark} size={14} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Theme Dynamic Content */}
      <View style={styles.themeContentArea}>
        {filteredThemes.length > 0 ? (
          <View style={styles.themeOptionsList}>
            {filteredThemes.map((opt) => {
              const isSelected = selectedCode === opt.code;
              const isSuggested = opt.code === getSuggestedThemeForMotherTongue(motherTongue);
              const pres = getModularThemePresentation(opt.code, motherTongue, targetReadingLanguage);
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => onSelect(opt.code)}
                  style={({ pressed }) => [
                    styles.themeLanguageCard,
                    {
                      backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.08)' : colors.ember,
                      borderColor: isSelected ? colors.flameAmber : colors.dotInactive,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderRadius: radius.card,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.themeIconBadge,
                      {
                        backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isSelected ? 'rgba(245, 166, 35, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                  >
                    <LiteraryThemeIcon
                      theme={opt.code}
                      color={isSelected ? colors.flameAmber : colors.fawn}
                      size={19}
                    />
                  </View>
                  <View style={styles.languageInfo}>
                    <View style={styles.languageTitleRow}>
                      <Text
                        style={[
                          typography.uiRowTitle,
                          { color: colors.lampText, fontSize: 15 },
                        ]}
                      >
                        {pres.title !== opt.title ? `${pres.title} ` : opt.title}
                        {pres.title !== opt.title ? (
                          <Text style={{ color: colors.fawn, fontSize: 12.5, fontWeight: '400' }}>
                            ({opt.title})
                          </Text>
                        ) : null}
                      </Text>
                      {isSuggested ? (
                        <View
                          style={{
                            backgroundColor: 'rgba(245, 166, 35, 0.16)',
                            borderColor: 'rgba(245, 166, 35, 0.45)',
                            borderWidth: 1,
                            borderRadius: radius.pill,
                            paddingHorizontal: 7,
                            paddingVertical: 1.5,
                            marginLeft: 8,
                          }}
                        >
                          <Text
                            style={[
                              typography.eyebrowLabel,
                              { color: colors.flameAmber, fontSize: 9.5, letterSpacing: 0.5 },
                            ]}
                          >
                            Suggested
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.flameAmber, fontSize: 11, marginTop: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {pres.subtitle}
                    </Text>
                    <Text
                      style={[
                        typography.metadataCaption,
                        { color: colors.mutedOnDark, fontSize: 10.5, marginTop: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {pres.sampleAuthors}
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
          </View>
        ) : (
          <View
            style={[
              styles.emptySearchCard,
              {
                backgroundColor: 'rgba(245, 166, 35, 0.05)',
                borderColor: 'rgba(245, 166, 35, 0.22)',
                borderRadius: radius.card,
              },
            ]}
          >
            <View
              style={[
                styles.emptySearchIconWrap,
                {
                  backgroundColor: 'rgba(245, 166, 35, 0.12)',
                  borderColor: 'rgba(245, 166, 35, 0.28)',
                },
              ]}
            >
              <TranslateIcon color={colors.flameAmber} size={22} />
            </View>
            <Text
              style={[
                typography.uiRowTitle,
                { color: colors.lampText, fontSize: 15, fontWeight: '600', marginTop: 10 },
              ]}
            >
              More themes are coming soon!
            </Text>
            <Text
              style={[
                typography.metadataCaption,
                {
                  color: colors.mutedOnDark,
                  fontSize: 12,
                  textAlign: 'center',
                  marginTop: 5,
                  lineHeight: 17,
                  paddingHorizontal: 12,
                },
              ]}
            >
              We don&apos;t have &ldquo;{searchQuery}&rdquo; yet, but more themes and editions are in active development.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                Keyboard.dismiss();
              }}
              style={({ pressed }) => [
                styles.resetSearchChip,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.14)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset theme search"
            >
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.lampText, fontSize: 11, letterSpacing: 0.5 },
                ]}
              >
                Clear search
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
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
        activeIndexRef.current = first.index;
        setActiveIndex(first.index);
      }
    },
  ).current;

  const goToNext = useCallback(() => {
    Keyboard.dismiss();
    const nextIndex = activeIndexRef.current + 1;
    if (nextIndex < SLIDES.length) {
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  }, []);

  const handleGoBack = useCallback((targetIndex?: number) => {
    Keyboard.dismiss();
    const prevIndex = targetIndex != null ? targetIndex : activeIndexRef.current - 1;
    if (prevIndex >= 0) {
      listRef.current?.scrollToIndex({ index: prevIndex, animated: true });
    }
  }, []);

  useEffect(() => {
    const onHardwareBack = () => {
      if (activeIndexRef.current > 0) {
        handleGoBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [handleGoBack]);

  const handleSkipToIntroQuestions = useCallback(() => {
    Keyboard.dismiss();
    activeIndexRef.current = 3;
    listRef.current?.scrollToIndex({ index: 3, animated: true });
  }, []);

  // Update mother tongue and automatically suggest matching cultural theme
  const handleSelectMotherTongue = useCallback((code: MotherTongueCode) => {
    setSelectedMotherTongue(code);
    setSelectedTheme(getSuggestedThemeForMotherTongue(code));
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

  const handleFinish = useCallback(
    (isSkipping = false) => {
      Keyboard.dismiss();

      // 1. Immediately update in-memory settings and mark onboarding complete
      try {
        setMotherTongue(selectedMotherTongue);
        setTargetReadingLanguage(selectedTargetLanguage);
        setLiteraryTheme(selectedTheme);
        markOnboardingComplete();
      } catch (err) {
        console.warn('[Onboarding] Error syncing preferences:', err);
      }

      // 2. Persist calibration & analytics in the background (never block navigation)
      const wordsToSave = isSkipping
        ? getPresetWordIds(selectedTargetLanguage, 'intermediate')
        : Array.from(selectedWordIds);
      const estimateToSave = isSkipping
        ? calculateVocabularyEstimate(selectedTargetLanguage, wordsToSave, selectedTheme)
        : vocabEstimate;

      saveCalibrationData({
        targetReadingLanguage: selectedTargetLanguage,
        estimatedWords: estimateToSave.count,
        tierLabel: estimateToSave.tierLabel,
        selectedWordIds: wordsToSave,
        recommendedBookId: estimateToSave.startingBook.id,
      }).catch((err) => {
        console.warn('[Onboarding] Error saving calibration data:', err);
      });

      logEvent('onboarding_complete', {
        mother_tongue: selectedMotherTongue,
        target_reading_language: selectedTargetLanguage,
        literary_theme: selectedTheme,
        estimated_words: estimateToSave.count,
        recommended_book: estimateToSave.startingBook.id,
        skipped_calibration: isSkipping,
      });

      // 3. Immediately transition to homescreen
      try {
        router.replace('/homescreen' as any);
      } catch {
        router.replace('/(tabs)/homescreen' as any);
      }
    },
    [selectedMotherTongue, selectedTargetLanguage, selectedTheme, selectedWordIds, vocabEstimate],
  );

  const renderSlide = useCallback(
    ({ item, index }: { item: Slide; index: number }) => {
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
            {index > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                onPress={() => handleGoBack(index - 1)}
                hitSlop={14}
                accessibilityRole="button"
                accessibilityLabel="Go to previous onboarding step"
              >
                <Text style={[typography.uiRowTitle, { color: colors.mutedOnDark, fontSize: 13 }]}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.skipPlaceholder} />
            )}
            {isIntro ? (
              <Pressable
                style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                onPress={handleSkipToIntroQuestions}
                hitSlop={14}
              >
                <Text style={[typography.uiRowTitle, { color: colors.mutedOnDark, fontSize: 13 }]}>
                  Skip Intro
                </Text>
              </Pressable>
            ) : isCalibration ? (
              <Pressable
                style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                onPress={() => handleFinish(true)}
                hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Skip vocabulary test and begin reading"
              >
                <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13, fontWeight: '600' }]}>
                  Skip test
                </Text>
              </Pressable>
            ) : (
              <View style={styles.skipPlaceholder} />
            )}
          </View>

          {/* Slide Body Content */}
          {isMotherTongue ? (
            <MotherTongueSlide
              selectedCode={selectedMotherTongue}
              onSelect={handleSelectMotherTongue}
              headline={item.headline}
              subtext={item.subtext}
            />
          ) : isTargetLang ? (
            <TargetLanguageSlide
              selectedCode={selectedTargetLanguage}
              onSelect={handleSelectTargetLanguage}
              headline={item.headline}
              subtext={item.subtext}
            />
          ) : isTheme ? (
            <ThemeSlide
              selectedCode={selectedTheme}
              motherTongue={selectedMotherTongue}
              targetReadingLanguage={selectedTargetLanguage}
              onSelect={setSelectedTheme}
              headline={item.headline}
              subtext={item.subtext}
            />
          ) : isCalibration ? (
            /* Slide 7: Vocabulary Calibration Test */
            <View style={styles.calibrationSection}>
              <Animated.View
                entering={FadeIn.delay(60).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
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
                entering={FadeIn.delay(120).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
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
                entering={FadeInUp.delay(180).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
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
              <Animated.View entering={FadeIn.delay(60).duration(280).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}>
                {item.key === 'read' ? (
                  <ReadIllustration />
                ) : item.key === 'coverage' ? (
                  <CoverageIllustration />
                ) : (
                  <MemoryIllustration />
                )}
              </Animated.View>
              <Animated.View
                entering={FadeIn.delay(140).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
                style={[styles.copy, { gap: spacing.sm, marginTop: 26 }]}
              >
                {item.eyebrow ? (
                  <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>{item.eyebrow}</Text>
                ) : null}
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
      handleGoBack,
      handleSelectMotherTongue,
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
        extraData={`${selectedMotherTongue}_${selectedTargetLanguage}_${selectedTheme}_${activePreset}_${selectedWordIds.size}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.index * screenWidth,
            animated: true,
          });
        }}
        initialNumToRender={SLIDES.length}
        maxToRenderPerBatch={SLIDES.length}
        windowSize={SLIDES.length}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        overScrollMode="never"
      />

      {/* Footer Navigation Area */}
      <Animated.View
        entering={FadeInUp.delay(140).duration(260).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={[
          isLastSlide ? styles.footerColumn : styles.footerRow,
          {
            paddingHorizontal: spacing.xl,
            paddingBottom: Math.max(insets.bottom + 14, 24),
          },
        ]}
      >
        {/* Progress Dots */}
        <View>
          <Text style={[typography.metadataCaption, styles.stepLabel, { color: colors.mutedOnDark }]}>
            Step {activeIndex + 1} of {SLIDES.length}
          </Text>
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
            onPress={() => handleFinish(false)}
          >
            <Text
              style={[
                typography.buttonLabel,
                {
                  color: colors.primaryDark,
                  fontSize: 15,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                },
              ]}
            >
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
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            onPress={goToNext}
          >
            <Text
              style={[
                typography.buttonLabel,
                {
                  color: colors.primaryDark,
                  fontSize: 14,
                  lineHeight: 18,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                },
              ]}
            >
              Continue
            </Text>
            <ChevronRightIcon color={colors.primaryDark} size={16} />
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
    justifyContent: 'space-between',
    height: 36,
    alignItems: 'center',
    zIndex: 20,
  },
  skip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  motherTongueSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 14,
  },
  motherTongueContentArea: {
    width: '100%',
  },
  motherTongueOptionsList: {
    gap: 7,
    marginTop: 2,
  },
  motherTongueLanguageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  themeSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 14,
  },
  themeContentArea: {
    width: '100%',
  },
  themeOptionsList: {
    gap: 7,
    marginTop: 2,
  },
  themeLanguageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBarWrap: {
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  themeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  comingSoonCard: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchCard: {
    marginTop: 12,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetSearchChip: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
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
  stepLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  nextButton: {
    height: 48,
    paddingLeft: 22,
    paddingRight: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
