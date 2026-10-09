import type { ViewStyle } from 'react-native';

import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';

/** Card silhouette per culture: Arabic arches, Japanese and Western squarer, Korean crisp, others soft. */
export function getCultureCardShape(theme: LiteraryThemeCode, softRadius: number): ViewStyle {
  switch (theme) {
    case 'arabic':
      return { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 };
    case 'japanese':
      return { borderRadius: 4 };
    case 'western':
      return { borderRadius: 6 };
    case 'korean':
      return { borderRadius: 10 };
    default:
      return { borderRadius: softRadius };
  }
}
