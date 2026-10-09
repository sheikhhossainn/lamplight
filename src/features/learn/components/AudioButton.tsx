import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SpeakerIcon } from '@/components/icons';
import {
  toggleSpeech,
  useCurrentSpeechId,
} from '@/features/audio/pronunciationEngine';
import { useTheme } from '@/theme/ThemeProvider';

export type AudioButtonProps = {
  text: string;
  lang?: string;
  autoPlay?: boolean;
  showSlow?: boolean;
  size?: 'normal' | 'large' | 'compact';
};

export function AudioButton({
  text,
  lang = 'ja',
  autoPlay = false,
  showSlow = true,
  size = 'normal',
}: AudioButtonProps) {
  const { colors, typography, scheme } = useTheme();
  const currentSpeechId = useCurrentSpeechId();
  // Derive stable IDs for this button instance
  const normalId = `audio-${text}-normal`;
  const slowId = `audio-${text}-slow`;
  const isPlaying = currentSpeechId === normalId;
  const isSlowPlaying = currentSpeechId === slowId;

  // autoPlay fires exactly once per (text, autoPlay=true) combination
  const autoPlayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoPlay || !text.trim()) return;
    if (autoPlayedRef.current === text) return; // already fired for this text
    autoPlayedRef.current = text;

    const timer = setTimeout(() => {
      void toggleSpeech(normalId, text, lang, 'normal');
    }, 280);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  const handlePlayNormal = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void toggleSpeech(normalId, text, lang, 'normal');
  };

  const handlePlaySlow = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void toggleSpeech(slowId, text, lang, 'slow');
  };

  const isLamp = scheme === 'lamp';
  const buttonBg = isLamp ? colors.card : colors.parchment;
  const isLarge = size === 'large';
  const isCompact = size === 'compact';

  const iconSize = isLarge ? 26 : isCompact ? 18 : 22;
  const mainBtnHeight = isLarge ? 56 : isCompact ? 40 : 48;
  const mainBtnWidth = isLarge ? 56 : isCompact ? 40 : 48;

  return (
    <View style={styles.container}>
      {/* Primary Normal Speed Button */}
      <Pressable
        onPress={handlePlayNormal}
        accessibilityRole="button"
        accessibilityLabel="উচ্চারণ শুনুন (Play pronunciation)"
        hitSlop={8}
        style={({ pressed }) => [
          styles.mainButton,
          {
            backgroundColor: isPlaying ? colors.flameAmber : buttonBg,
            borderColor: colors.hairline,
            width: mainBtnWidth,
            height: mainBtnHeight,
            borderRadius: mainBtnHeight / 2,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <SpeakerIcon
          size={iconSize}
          color={isPlaying ? colors.primaryDark : colors.flameAmber}
        />
      </Pressable>

      {/* Slow Speed Button (Turtle 🐢) */}
      {showSlow && (
        <Pressable
          onPress={handlePlaySlow}
          accessibilityRole="button"
          accessibilityLabel="ধীরে শুনুন (Play slowly)"
          hitSlop={8}
          style={({ pressed }) => [
            styles.slowButton,
            {
              backgroundColor: isSlowPlaying ? colors.flameAmber : buttonBg,
              borderColor: colors.hairline,
              height: isCompact ? 36 : 42,
              borderRadius: isCompact ? 18 : 21,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.turtleEmoji, { fontSize: isCompact ? 14 : 17 }]}>🐢</Text>
          <Text
            style={[
              typography.metadataCaption,
              {
                color: isSlowPlaying ? colors.primaryDark : colors.umber,
                fontWeight: '600',
                marginLeft: 4,
              },
            ]}
          >
            ধীরে
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  slowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
  },
  turtleEmoji: {
    textAlign: 'center',
  },
});
