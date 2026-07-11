import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Destructive tints the confirm action in the clay highlight rather than amber.
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Themed replacement for the bare white Android Alert — a parchment/charcoal
// card that matches the app instead of the OS default. Used for confirmations
// like deleting an imported book.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const confirmColor = destructive ? colors.highlight.clay : colors.flameAmber;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Stop the inner card from forwarding taps to the dismissing backdrop. */}
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.hairline }]}
          onPress={() => {}}
        >
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>{title}</Text>
          {message ? (
            <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.sm, lineHeight: 19 }]}>
              {message}
            </Text>
          ) : null}

          <View style={[styles.actions, { marginTop: spacing.lg }]}>
            <Pressable onPress={onCancel} hitSlop={8} style={styles.action}>
              <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 14 }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} hitSlop={8} style={styles.action}>
              <Text style={[typography.buttonLabel, { color: confirmColor, fontSize: 14 }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
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
    padding: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 26,
  },
  action: {
    paddingVertical: 4,
  },
});
