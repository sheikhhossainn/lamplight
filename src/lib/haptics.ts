import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for LampLight ritual moments.
 * Safely wraps expo-haptics calls to guarantee non-blocking, fail-safe execution across platforms.
 */

/**
 * Trigger soft tactile impact when turning a page in the reader.
 */
export async function hapticPageTurn(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Fail silently if haptics are unsupported on device
  }
}

/**
 * Trigger success notification feedback when saving a word or quote.
 */
export async function hapticSaveWord(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Fall back to medium impact if notification feedback is unavailable
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Fail silently
    }
  }
}

/**
 * Trigger tactile feedback on flashcard actions (card flip or graduating/advancing to the next card).
 */
export async function hapticFlashcardAction(action: 'flip' | 'next' | 'graduate' = 'next'): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (action === 'flip') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Trigger tactile feedback when opening the Scripture Q&A inquiry modal/drawer.
 */
export async function hapticOpenInquiry(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Fail silently
  }
}

/**
 * Trigger subtle, crisp selection feedback when toggling reading theme (Day <-> Lamp).
 */
export async function hapticThemeToggle(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // Fail silently if haptics are unsupported on device
  }
}
