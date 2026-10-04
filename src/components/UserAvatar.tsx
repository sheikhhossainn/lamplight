import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import {
  getPresetAvatar,
  isRemoteImageUrl,
  useUserAvatar,
  type PresetAvatar,
} from '@/features/account/userAvatar';
import { useTheme } from '@/theme/ThemeProvider';

export type UserAvatarProps = {
  avatar?: string | null;
  size?: number;
  focused?: boolean;
  border?: boolean;
  borderColor?: string;
  nameFallback?: string;
  style?: StyleProp<ViewStyle>;
};

function PresetIconGlyph({
  presetId,
  color,
  size,
}: {
  presetId: string;
  color: string;
  size: number;
}) {
  const iconSize = Math.round(size * 0.54);

  switch (presetId) {
    case 'flame':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C9.5 6.5 8 9.5 8 13.5a4 4 0 0 0 8 0c0-4-1.5-7-4-11.5z"
            fill={color}
          />
          <Path
            d="M12 9c-1 2-1.8 3.5-1.8 5.5a1.8 1.8 0 0 0 3.6 0C13.8 12.5 13 11 12 9z"
            fill="#FFF5E5"
            opacity={0.8}
          />
        </Svg>
      );

    case 'owl':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Owl silhouette with large wise eyes */}
          <Path
            d="M5 4.5l3.5 2C10 6 11 6 12 6s2 0 3.5-.5l3.5-2v4c0 6.5-3 12-7 12s-7-5.5-7-12v-4z"
            fill={color}
          />
          <Circle cx="9" cy="11.5" r="2.4" fill="#0C1711" />
          <Circle cx="15" cy="11.5" r="2.4" fill="#0C1711" />
          <Circle cx="9.6" cy="11" r="0.9" fill="#FFF" />
          <Circle cx="15.6" cy="11" r="0.9" fill="#FFF" />
          <Path d="M12 13l-1 2h2l-1-2z" fill="#F5A623" />
        </Svg>
      );

    case 'scholar':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Open Book */}
          <Path
            d="M3 6.5C3 5.7 6.5 4 12 5.5C17.5 4 21 5.7 21 6.5V18.5C21 19.3 17.5 17.5 12 19C6.5 17.5 3 19.3 3 18.5V6.5Z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 5.5V19"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Path
            d="M6 9.5h3.5M6 13h3.5M14.5 9.5H18M14.5 13H18"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'quill':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Feather Quill and ink */}
          <Path
            d="M20.5 3.5c-3 0-7 2-10 6-2 2.5-3.5 5.5-4.5 9.5 2-.5 4.5-1.5 6.5-3.5 3-3 5-6.5 5.5-9.5z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6 19l-3 2 1.5-3.5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10.5 9.5l4 4"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'coffee':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Cup */}
          <Path
            d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          {/* Rising steam */}
          <Path
            d="M7 4c0 1.5 1 1.5 1 3M11 3c0 1.5 1 1.5 1 4M15 4c0 1.5 1 1.5 1 3"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'moon':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Crescent Moon & Stars */}
          <Path
            d="M16.5 14.5A7.5 7.5 0 0 1 9.5 3 8 8 0 1 0 17 19.5a7.9 7.9 0 0 1-.5-5z"
            fill={color}
          />
          <Path
            d="M19 5l.7 1.5L21.2 7l-1.5.7L19 9.2l-.7-1.5L16.8 7l1.5-.7L19 5z"
            fill="#FFF"
            opacity={0.9}
          />
          <Circle cx="15.5" cy="11.5" r="0.9" fill="#FFF" opacity={0.8} />
        </Svg>
      );

    case 'wanderer':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Compass rose */}
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.7} />
          <Path
            d="M12 5.5l2.2 4.3L18.5 12l-4.3 2.2L12 18.5l-2.2-4.3L5.5 12l4.3-2.2L12 5.5z"
            fill={color}
          />
          <Circle cx="12" cy="12" r="1.5" fill="#1A0E08" />
        </Svg>
      );

    case 'sanctuary':
    default:
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Botanical leaf */}
          <Path
            d="M19.5 4.5c-7.5 0-13 4.5-13 12 0 1 .5 2.5 1.5 3 0-4.5 3-8 8-9.5-3.5 2.5-4.5 5.5-4 9.5 5.5-.5 9.5-5 9.5-13 0-.7-.5-1.5-2-2z"
            fill={color}
          />
        </Svg>
      );
  }
}

export function UserAvatar({
  avatar,
  size = 36,
  focused = false,
  border = false,
  borderColor,
  nameFallback,
  style,
}: UserAvatarProps) {
  const { colors, typography } = useTheme();
  const context = useUserAvatar();

  const effectiveAvatar = avatar !== undefined ? avatar : context.avatar;
  const isImage = isRemoteImageUrl(effectiveAvatar);
  const preset: PresetAvatar | null = getPresetAvatar(effectiveAvatar);

  const radius = Math.round(size / 2);
  const strokeWidth = focused ? 2 : 1.2;
  const computedBorderColor =
    borderColor ?? (focused ? colors.flameAmber : colors.hairline);

  // 1. Remote Image URL (e.g. Google OAuth profile picture)
  if (isImage && effectiveAvatar) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: border || focused ? strokeWidth : 0,
            borderColor: computedBorderColor,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: effectiveAvatar }}
          style={[
            styles.image,
            {
              width: size - (border || focused ? strokeWidth * 2 : 0),
              height: size - (border || focused ? strokeWidth * 2 : 0),
              borderRadius: radius,
            },
          ]}
          contentFit="cover"
          transition={150}
        />
      </View>
    );
  }

  // 2. Curated Preset Literary Avatar
  if (preset) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: preset.backgroundColor,
            borderWidth: border || focused ? strokeWidth : 1,
            borderColor: focused ? colors.flameAmber : computedBorderColor,
          },
          style,
        ]}
      >
        <PresetIconGlyph
          presetId={preset.id}
          color={preset.accentColor}
          size={size}
        />
      </View>
    );
  }

  // 3. Fallback Monogram / Generic Silhouette
  const initial = nameFallback
    ? nameFallback.trim().charAt(0).toUpperCase()
    : 'R';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.card,
          borderWidth: border || focused ? strokeWidth : 1,
          borderColor: computedBorderColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.wordmark,
          {
            color: focused ? colors.flameAmber : colors.ink,
            fontSize: Math.round(size * 0.44),
            lineHeight: Math.round(size * 0.52),
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    overflow: 'hidden',
  },
});
