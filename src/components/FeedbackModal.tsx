import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { StarIcon } from '@/components/icons';
import {
  submitFeedback,
  type FeedbackCategory,
  type FeedbackTargetType,
} from '@/features/feedback/feedbackService';

type FeedbackModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCategory?: FeedbackCategory;
  initialRating?: number;
  targetType?: FeedbackTargetType;
  targetId?: string;
  title?: string;
  subtitle?: string;
};

const CATEGORIES: Array<{ key: FeedbackCategory; label: string }> = [
  { key: 'general', label: 'General' },
  { key: 'bug', label: 'Bug' },
  { key: 'feature', label: 'Idea' },
  { key: 'translation', label: 'Translation' },
];

const QUICK_TAGS: Record<FeedbackCategory, string[]> = {
  general: ['Calm design', 'Pleasant fonts', 'Smooth ambience', 'Intuitive navigation'],
  bug: ['App froze', 'Layout glitch', 'Audio stutter', 'Slow sync', 'Text cut off'],
  feature: ['More books', 'Offline dictionary', 'Reading stats', 'Audio downloads'],
  translation: ['Incorrect word', 'Context mismatch', 'Missing grammar note', 'Language gap'],
};

export function FeedbackModal({
  visible,
  onClose,
  onSuccess,
  initialCategory = 'general',
  initialRating = 0,
  targetType = 'app',
  targetId,
  title = 'Rate & Share Feedback',
  subtitle = 'Help us shape Lamplight into the most focused reading sanctuary.',
}: FeedbackModalProps) {
  const { colors, typography, radius, spacing } = useTheme();

  const [rating, setRating] = useState<number>(initialRating);
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [message, setMessage] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleRatingSelect = (selectedStar: number) => {
    setRating(selectedStar);
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => {});
    }
  };

  const handleCategorySelect = (selectedCat: FeedbackCategory) => {
    setCategory(selectedCat);
    setSelectedTags([]);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => {});
    }
  };

  const handleSubmit = async () => {
    if (!rating && !message.trim() && selectedTags.length === 0) {
      setIsError(true);
      setStatusMessage('Please choose a star rating or write a quick note.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await submitFeedback({
        rating: rating > 0 ? rating : undefined,
        category,
        targetType,
        targetId,
        message: message.trim(),
        tags: selectedTags,
      });

      if (res.success) {
        setIsError(false);
        setStatusMessage(res.message);
        onSuccess?.();
        setTimeout(() => {
          handleClose();
        }, 1400);
      } else {
        setIsError(true);
        setStatusMessage(res.message);
      }
    } catch {
      setIsError(true);
      setStatusMessage('Failed to send feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setRating(initialRating);
    setCategory(initialCategory);
    setMessage('');
    setSelectedTags([]);
    setStatusMessage(null);
    setIsError(false);
    onClose();
  };

  const currentTags = QUICK_TAGS[category] ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPressable} onPress={handleClose}>
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: radius.card,
                borderColor: colors.hairline,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>{title}</Text>
              <Text
                style={[
                  typography.metadataCaption,
                  { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 },
                ]}
              >
                {subtitle}
              </Text>

              {/* Star Rating Row */}
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    hitSlop={8}
                    onPress={() => handleRatingSelect(star)}
                    style={styles.starButton}
                  >
                    <StarIcon
                      filled={star <= rating}
                      color={star <= rating ? colors.flameAmber : colors.straw}
                      size={28}
                    />
                  </Pressable>
                ))}
              </View>

              {/* Category Selector Pills */}
              <Text
                style={[
                  typography.eyebrowLabel,
                  { color: colors.fawn, marginTop: spacing.md, marginBottom: spacing.xs, fontSize: 10 },
                ]}
              >
                CATEGORY
              </Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => handleCategorySelect(cat.key)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isSelected ? colors.flameAmber : colors.parchment,
                          borderColor: isSelected ? colors.flameAmber : colors.hairline,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.uiRowTitle,
                          {
                            fontSize: 11,
                            color: isSelected ? colors.primaryDark : colors.ink,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Quick Tags */}
              {currentTags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {currentTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={[
                          styles.tagChip,
                          {
                            backgroundColor: isSelected ? (category === 'bug' ? colors.highlight.clay : colors.card) : colors.parchment,
                            borderColor: isSelected ? colors.flameAmber : colors.hairline,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.metadataCaption,
                            {
                              fontSize: 10,
                              color: isSelected ? colors.ink : colors.fawn,
                            },
                          ]}
                        >
                          {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Notes TextInput */}
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: colors.hairline,
                    color: colors.ink,
                    backgroundColor: colors.parchment,
                    borderRadius: radius.card,
                  },
                ]}
                placeholder={
                  category === 'bug'
                    ? 'What went wrong? Any details help us fix it.'
                    : category === 'feature'
                      ? 'What feature or book would you like to see next?'
                      : category === 'translation'
                        ? 'Which word or phrase needs review?'
                        : 'Share your thoughts, suggestions, or feedback…'
                }
                placeholderTextColor={colors.straw}
                multiline
                numberOfLines={4}
                maxLength={600}
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  if (statusMessage) setStatusMessage(null);
                }}
                editable={!loading}
              />

              {/* Status/Error Message */}
              {statusMessage ? (
                <Text
                  style={[
                    typography.metadataCaption,
                    {
                      color: isError ? colors.highlight.clay : colors.flameAmber,
                      marginTop: spacing.sm,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {statusMessage}
                </Text>
              ) : null}

              {/* Actions Button Row */}
              <View style={[styles.actionsRow, { marginTop: spacing.md }]}>
                <Pressable
                  onPress={handleClose}
                  disabled={loading}
                  style={[styles.actionButton, { borderRadius: radius.pill }]}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.fawn, fontSize: 13 }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={[
                    styles.actionButton,
                    styles.submitButton,
                    {
                      backgroundColor: colors.flameAmber,
                      borderRadius: radius.pill,
                      opacity: loading ? 0.7 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 13 }]}>
                      Submit
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  starButton: {
    padding: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  textInput: {
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    elevation: 2,
  },
});
