import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { cycleTargetLanguage, targetLanguageLabel, useTargetLanguage } from '@/features/settings/languagePair';
import {
  fontSizePxFromPref,
  lineHeightMultiplierFromPref,
  setFontSize,
  setLineSpacing,
  useReadingPrefs,
} from '@/features/settings/readingPrefs';
import { setReadingTheme, useReadingTheme } from '@/features/settings/readingTheme';
import { isPremiumUser } from '@/features/subscription/subscriptionState';
import { checkTranslationCap } from '@/features/translation';
import { useTheme } from '@/theme/ThemeProvider';

function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={4.5} fill={color} />
    </Svg>
  );
}

function LampDropIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={14} viewBox="0 0 20 20">
      <Path
        d="M10 3c-3 3.5-4.5 6-3 8.5 1-1 2-1.8 3-2.2 1 0.4 2 1.2 3 2.2 1.5-2.5 0-5-3-8.5z"
        fill={color}
      />
    </Svg>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggleTrack, { backgroundColor: value ? colors.flameAmber : colors.hairline }]}
    >
      <View style={[styles.toggleThumb, value ? { right: 2 } : { left: 2 }]} />
    </Pressable>
  );
}

function SettingsSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  return (
    <Pressable
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      onPress={(e) => {
        if (trackWidth > 0) {
          onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth)));
        }
      }}
      style={styles.sliderHitArea}
    >
      <View style={[styles.sliderTrack, { backgroundColor: colors.hairline }]}>
        <View
          style={[
            styles.sliderFill,
            { width: `${value * 100}%`, backgroundColor: colors.flameAmber },
          ]}
        />
      </View>
      <View
        style={[
          styles.sliderThumb,
          { left: `${value * 100}%`, backgroundColor: colors.flameAmber, borderColor: colors.parchment },
        ]}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const theme = useReadingTheme();
  const globalPrefs = useReadingPrefs();
  const targetLanguage = useTargetLanguage();
  const [pageTurnSound, setPageTurnSound] = useState(true);
  const [translationsLeft, setTranslationsLeft] = useState<number | null>(null);

  // The slider itself stays instantly responsive (local state), but writing
  // through to the shared store — which is what re-renders the Reader's
  // pages — is debounced until the user stops dragging. Applying on every
  // intermediate tick was what made this feel laggy: each nudge forced a full
  // reading-page re-render mid-gesture.
  const [fontSize, setLocalFontSize] = useState(globalPrefs.fontSize);
  const [lineSpacing, setLocalLineSpacing] = useState(globalPrefs.lineSpacing);
  const fontSizeCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineSpacingCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFontSizeChange = (value: number) => {
    setLocalFontSize(value);
    if (fontSizeCommitTimer.current) clearTimeout(fontSizeCommitTimer.current);
    fontSizeCommitTimer.current = setTimeout(() => setFontSize(value), 300);
  };

  const handleLineSpacingChange = (value: number) => {
    setLocalLineSpacing(value);
    if (lineSpacingCommitTimer.current) clearTimeout(lineSpacingCommitTimer.current);
    lineSpacingCommitTimer.current = setTimeout(() => setLineSpacing(value), 300);
  };

  useEffect(() => {
    return () => {
      if (fontSizeCommitTimer.current) clearTimeout(fontSizeCommitTimer.current);
      if (lineSpacingCommitTimer.current) clearTimeout(lineSpacingCommitTimer.current);
    };
  }, []);

  useEffect(() => {
    checkTranslationCap(isPremiumUser()).then((cap) => {
      setTranslationsLeft(cap.remaining === Infinity ? null : cap.remaining);
    });
  }, []);

  const fontSizePx = fontSizePxFromPref(fontSize);
  const lineSpacingValue = lineHeightMultiplierFromPref(lineSpacing).toFixed(2);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.parchment, paddingHorizontal: spacing.xl, paddingTop: insets.top + 16 },
      ]}
    >
      <Text style={[typography.screenTitle, { color: colors.ink, marginBottom: spacing.lg }]}>
        Settings
      </Text>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Appearance
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginBottom: 10 }]}>
          Reading theme
        </Text>
        <View style={[styles.segmented, { backgroundColor: colors.segmentedTrack, borderRadius: radius.pill }]}>
          <Pressable
            onPress={() => setReadingTheme('day')}
            style={[
              styles.segment,
              theme === 'day' && { backgroundColor: colors.primaryDark, borderRadius: radius.pill },
            ]}
          >
            <SunIcon color={theme === 'day' ? colors.flameAmber : colors.fawn} />
            <Text
              style={[
                typography.uiRowTitle,
                { fontSize: 12, marginLeft: 6, color: theme === 'day' ? colors.lampText : colors.fawn },
              ]}
            >
              Day
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setReadingTheme('lamp')}
            style={[
              styles.segment,
              theme === 'lamp' && { backgroundColor: colors.primaryDark, borderRadius: radius.pill },
            ]}
          >
            <LampDropIcon color={theme === 'lamp' ? colors.flameAmber : colors.fawn} />
            <Text
              style={[
                typography.uiRowTitle,
                { fontSize: 12, marginLeft: 6, color: theme === 'lamp' ? colors.lampText : colors.fawn },
              ]}
            >
              Lamp
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Reading
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl, paddingVertical: 4 },
        ]}
      >
        <View style={[styles.settingsRow, { borderBottomColor: 'rgba(43,38,33,0.08)', borderBottomWidth: 1 }]}>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Page-turn sound</Text>
          <ToggleSwitch value={pageTurnSound} onChange={setPageTurnSound} />
        </View>

        <View style={[styles.settingsColumn, { borderBottomColor: 'rgba(43,38,33,0.08)', borderBottomWidth: 1 }]}>
          <View style={styles.sliderHeader}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Font size</Text>
            <Text style={[typography.translatedWordInline, { color: colors.fawn, fontSize: 12 }]}>
              {fontSizePx}px
            </Text>
          </View>
          <SettingsSlider value={fontSize} onChange={handleFontSizeChange} />
        </View>

        <View style={styles.settingsColumn}>
          <View style={styles.sliderHeader}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>Line spacing</Text>
            <Text style={[typography.translatedWordInline, { color: colors.fawn, fontSize: 12 }]}>
              {lineSpacingValue}
            </Text>
          </View>
          <SettingsSlider value={lineSpacing} onChange={handleLineSpacingChange} />
        </View>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Language
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsRow,
          { backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card, marginBottom: spacing.xl },
        ]}
      >
        <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13 }]}>
          Default language pair
        </Text>
        <Pressable
          onPress={cycleTargetLanguage}
          style={[styles.pairPill, { backgroundColor: colors.pairPillBackground, borderRadius: radius.pill }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.pairPillText, fontSize: 12 }]}>
            EN → {targetLanguageLabel(targetLanguage)}
          </Text>
        </Pressable>
      </View>

      <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
        Account
      </Text>
      <View
        style={[
          styles.card,
          styles.settingsRow,
          { backgroundColor: colors.primaryDark, borderRadius: radius.card },
        ]}
      >
        <View>
          <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13 }]}>Free plan</Text>
          <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, fontSize: 11, marginTop: 2 }]}>
            {translationsLeft == null ? 'Unlimited translations' : `${translationsLeft} translations left today`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.pill }]}
        >
          <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 12 }]}>Upgrade</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    padding: 16,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingsColumn: {
    paddingVertical: 14,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderHitArea: {
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    borderWidth: 2,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 100,
    justifyContent: 'center',
  },
  toggleThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5EDE1',
  },
  pairPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  upgradeButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
});
