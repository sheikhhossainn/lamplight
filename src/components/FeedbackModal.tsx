import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { submitFeedback, type FeedbackCategory } from '@/features/feedback/feedbackService';
import { useTheme } from '@/theme/ThemeProvider';

type FeedbackModalProps = {
  visible: boolean;
  onClose: () => void;
};

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'bug', label: 'Bug' },
  { id: 'feature_request', label: 'Feature Idea' },
];

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setLoading(true);
    setFeedbackStatus(null);
    setIsError(false);

    const res = await submitFeedback(category, trimmed);
    setLoading(false);

    if (res.success) {
      setIsError(false);
      setFeedbackStatus('Thank you! Your feedback helps us illuminate Lamplight.');
      setTimeout(() => {
        handleClose();
      }, 1400);
    } else {
      setIsError(true);
      setFeedbackStatus(res.error ?? 'Failed to send feedback.');
    }
  };

  const handleClose = () => {
    if (loading) return;
    setMessage('');
    setFeedbackStatus(null);
    setIsError(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: radius.card,
              borderColor: colors.hairline,
            },
          ]}
          onPress={() => {}}
        >
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
            Send Feedback
          </Text>
          <Text
            style={[
              typography.metadataCaption,
              { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 },
            ]}
          >
            We read every note. Let us know how your reading experience feels.
          </Text>

          {/* Category selection */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.categoryPill,
                    {
                      borderRadius: radius.pill,
                      borderColor: active ? colors.flameAmber : colors.hairline,
                      backgroundColor: active ? colors.flameAmber : colors.parchment,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.metadataCaption,
                      {
                        color: active ? colors.primaryDark : colors.ink,
                        fontWeight: active ? '600' : '400',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Message input */}
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.hairline,
                color: colors.ink,
                backgroundColor: colors.parchment,
                borderRadius: radius.card,
              },
            ]}
            placeholder="Share your thoughts, suggestions, or issues..."
            placeholderTextColor={colors.straw}
            multiline
            numberOfLines={4}
            maxLength={1000}
            value={message}
            onChangeText={(txt) => {
              setMessage(txt);
              if (feedbackStatus) setFeedbackStatus(null);
            }}
            editable={!loading}
          />

          {feedbackStatus ? (
            <Text
              style={[
                typography.metadataCaption,
                {
                  color: isError ? colors.highlight.clay : colors.flameAmber,
                  marginTop: spacing.sm,
                },
              ]}
            >
              {feedbackStatus}
            </Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleClose}
              disabled={loading}
              style={[
                styles.cancelButton,
                { borderRadius: radius.pill, borderColor: colors.hairline },
              ]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 13 }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !message.trim()}
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.flameAmber,
                  borderRadius: radius.pill,
                  opacity: loading || !message.trim() ? 0.5 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Text
                  style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 13 }]}
                >
                  Send
                </Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
});
