import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { SCENE_HEIGHT, SCENE_VIEWBOX, getCultureSceneMarkup } from '@/components/cultureScenes';
import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';

/** True when the theme has a landmark scene to draw (classic does not). */
export const hasCultureScene = (theme: LiteraryThemeCode) => getCultureSceneMarkup(theme, '#000') != null;

/**
 * Landmark vignette pinned to the foot of a card: torii and Fuji, hanok pavilion, mosque skyline,
 * river boat and palms, or library windows. Purely decorative.
 */
export function CultureScene({ theme, color }: { theme: LiteraryThemeCode; color: string }) {
  const markup = getCultureSceneMarkup(theme, color);
  if (!markup) return null;

  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.scene}>
      <SvgXml
        xml={`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`}
        width="100%"
        height={SCENE_HEIGHT}
        viewBox={SCENE_VIEWBOX}
        preserveAspectRatio="xMidYMax slice"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCENE_HEIGHT,
  },
});
