import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FlashcardsIllustration } from '@/components/NotebookIllustrations';
import { useTheme } from '@/theme/ThemeProvider';

type VocabReviewPromptProps = {
  visible: boolean;
  wordCount: number;
  onReview: () => void;
  onDismiss: () => void;
};

// The app's only unprompted interruption, so it earns its place: it appears at
// most once a day, and only when there are words old enough that recalling them
// means something (see features/vocabulary/reviewPrompt.ts). Shares
// ConfirmDialog's card/backdrop shape, but carries the animated flashcard
// illustration — this is an invitation, not a confirmation.
export function VocabReviewPrompt({ visible, wordCount, onReview, onDismiss }: VocabReviewPromptProps) {
  const { colors, typography, radius, spacing } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.hairline },
          ]}
          onPress={() => {}}
        >
          <FlashcardsIllustration />

          <Text
            style={[typography.uiRowTitle, { color: colors.ink, fontSize: 17, marginTop: spacing.lg }]}
          >
            Test your vocabulary?
          </Text>
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.umber, marginTop: spacing.sm, lineHeight: 19, textAlign: 'center' },
            ]}
          >
            {wordCount} {wordCount === 1 ? 'word is' : 'words are'} waiting in your notebook. A quick pass
            through the flashcards is how they stick.
          </Text>

          <Pressable
            onPress={onReview}
            style={[
              styles.primaryAction,
              { backgroundColor: colors.flameAmber, borderRadius: radius.pill, marginTop: spacing.lg },
            ]}
          >
            <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Review now</Text>
          </Pressable>
          <Pressable onPress={onDismiss} hitSlop={8} style={{ paddingVertical: spacing.xsm }}>
            <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 14 }]}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,27,30,0.55)',
    paddingHorizontal: 40,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 12,
    alignItems: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
