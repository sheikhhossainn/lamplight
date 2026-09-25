import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LamplightClassicThemeIcon, CompanionIcon, ShieldIcon } from '@/components/icons';
import { canUse } from '@/features/subscription/subscriptionState';
import { LamplightColor, Spacing } from '@/theme/tokens';
import { LamplightTypography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import {
  boundExcerpt,
  computeScopeLabel,
  explainPassage,
  extractPriorText,
  generateReflectiveQuestions,
  recapCharacters,
  reportCompanionFeedback,
  simplifySentence,
  summarizeChapter,
  type CompanionCharactersResult,
  type CompanionExplainResult,
  type CompanionReflectionsResult,
  type CompanionSimplifyResult,
  type CompanionSummaryResult,
} from './readingCompanionService';

const { height: screenHeight } = Dimensions.get('window');

export type ReadingCompanionModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedText?: string | null;
  bookId?: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterIndex: number;
  totalChapters?: number;
  chapterTitle?: string;
  pageIndex?: number;
  totalPages?: number;
  currentChapterText?: string;
  priorChapterTexts?: string[];
  onUpgradePress?: () => void;
};

type SelectionTab = 'explain' | 'reference' | 'simplify';
type ChapterTab = 'summary' | 'characters' | 'reflections';

export function ReadingCompanionModal({
  visible,
  onClose,
  selectedText,
  bookId,
  bookTitle,
  bookAuthor,
  chapterIndex,
  totalChapters,
  chapterTitle,
  pageIndex,
  totalPages,
  currentChapterText = '',
  priorChapterTexts = [],
  onUpgradePress,
}: ReadingCompanionModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius } = useTheme();

  const isSelectionMode = Boolean(selectedText && selectedText.trim().length > 0);
  const [selectionTab, setSelectionTab] = useState<SelectionTab>('explain');
  const [chapterTab, setChapterTab] = useState<ChapterTab>('summary');

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cached results per session
  const [explainData, setExplainData] = useState<CompanionExplainResult | null>(null);
  const [simplifyData, setSimplifyData] = useState<CompanionSimplifyResult | null>(null);
  const [summaryData, setSummaryData] = useState<CompanionSummaryResult | null>(null);
  const [charactersData, setCharactersData] = useState<CompanionCharactersResult | null>(null);
  const [reflectionsData, setReflectionsData] = useState<CompanionReflectionsResult | null>(null);

  // Feedback reporting state
  const [reportingFeedback, setReportingFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState<'spoiler' | 'inaccurate' | 'inappropriate' | 'other'>('spoiler');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const isPremium = canUse('ai_companion');

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const selectedWordCount = useMemo(() => {
    if (!selectedText) return 0;
    return selectedText.trim().split(/\s+/).filter(Boolean).length;
  }, [selectedText]);

  const scopeLabel = useMemo(() => {
    return computeScopeLabel({
      chapterIndex,
      totalChapters,
      chapterTitle,
      pageIndex,
      totalPages,
      selectedWords: isSelectionMode ? selectedWordCount : undefined,
    });
  }, [chapterIndex, totalChapters, chapterTitle, pageIndex, totalPages, isSelectionMode, selectedWordCount]);

  // Load content when tab or modal visibility changes
  useEffect(() => {
    if (!visible) {
      setReportingFeedback(false);
      setFeedbackSubmitted(false);
      setFeedbackNotes('');
      return;
    }

    if (!isPremium) return;

    void fetchActiveContent();
  }, [visible, isSelectionMode, selectionTab, chapterTab, isPremium]);

  const fetchActiveContent = async () => {
    setErrorMessage(null);

    if (isSelectionMode && selectedText) {
      if (selectionTab === 'explain' || selectionTab === 'reference') {
        if (explainData && !selectionTab) return;
        setLoading(true);
        const res = await explainPassage({
          excerpt: selectedText,
          bookTitle,
          bookAuthor,
          chapterTitle,
          chapterIndex,
          isReference: selectionTab === 'reference',
        });
        setLoading(false);
        if (res.success && res.data) {
          setExplainData(res.data);
        } else {
          setErrorMessage(res.error || 'Unable to explain passage.');
        }
      } else if (selectionTab === 'simplify') {
        if (simplifyData) return;
        setLoading(true);
        const res = await simplifySentence({
          sentence: selectedText,
          bookTitle,
          bookAuthor,
          chapterIndex,
        });
        setLoading(false);
        if (res.success && res.data) {
          setSimplifyData(res.data);
        } else {
          setErrorMessage(res.error || 'Unable to simplify sentence.');
        }
      }
    } else {
      // Chapter mode
      if (chapterTab === 'summary') {
        if (summaryData) return;
        setLoading(true);
        const res = await summarizeChapter({
          chapterExcerpt: currentChapterText || 'Chapter excerpt unavailable.',
          chapterIndex,
          chapterTitle,
          bookTitle,
          bookAuthor,
        });
        setLoading(false);
        if (res.success && res.data) {
          setSummaryData(res.data);
        } else {
          setErrorMessage(res.error || 'Unable to summarize chapter.');
        }
      } else if (chapterTab === 'characters') {
        if (charactersData) return;
        setLoading(true);
        const priorText = extractPriorText(priorChapterTexts, chapterIndex, currentChapterText);
        const res = await recapCharacters({
          textUpToNow: priorText || currentChapterText || 'Text unavailable.',
          chapterIndex,
          chapterTitle,
          bookTitle,
          bookAuthor,
        });
        setLoading(false);
        if (res.success && res.data) {
          setCharactersData(res.data);
        } else {
          setErrorMessage(res.error || 'Unable to recap characters.');
        }
      } else if (chapterTab === 'reflections') {
        if (reflectionsData) return;
        setLoading(true);
        const res = await generateReflectiveQuestions({
          chapterExcerpt: currentChapterText || 'Chapter excerpt unavailable.',
          chapterIndex,
          chapterTitle,
          bookTitle,
          bookAuthor,
        });
        setLoading(false);
        if (res.success && res.data) {
          setReflectionsData(res.data);
        } else {
          setErrorMessage(res.error || 'Unable to generate reflection questions.');
        }
      }
    }
  };

  const handleSendFeedback = async () => {
    await reportCompanionFeedback({
      targetAction: isSelectionMode ? selectionTab : chapterTab,
      bookId,
      chapterIndex,
      reason: feedbackReason,
      notes: feedbackNotes,
    });
    setFeedbackSubmitted(true);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.libraryBackground,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, 20) + keyboardHeight,
              maxHeight: screenHeight * 0.82 - keyboardHeight,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.mutedOnDark }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <CompanionIcon color={colors.flameAmber} size={20} />
              <Text style={[styles.sectionTitle, { color: colors.lampText, marginLeft: 8, fontSize: 18 }]}>
                AI Reading Companion
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: colors.card }]}
            >
              <Text style={{ color: colors.mutedOnDark, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          {/* Scope and Spoiler Badge */}
          <View style={[styles.scopeBanner, { backgroundColor: colors.flameAmber + '10', borderColor: colors.flameAmber + '30', borderWidth: 1, borderRadius: 8 }]}>
            <Text style={[typography.metadataCaption, { color: colors.lampText, fontWeight: '600' }]} numberOfLines={1}>
              {scopeLabel}
            </Text>
            <View style={styles.shieldRow}>
              <ShieldIcon size={14} color={colors.flameAmber} />
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700', marginLeft: 4 }]}>
                Spoiler-Safe Scope
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {isSelectionMode ? (
              <>
                <Pressable
                  onPress={() => setSelectionTab('explain')}
                  style={[
                    styles.tabButton,
                    selectionTab === 'explain' && { borderBottomColor: colors.flameAmber, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: selectionTab === 'explain' ? colors.flameAmber : colors.mutedOnDark, fontSize: 13 },
                    ]}
                  >
                    Explain Passage
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectionTab('reference')}
                  style={[
                    styles.tabButton,
                    selectionTab === 'reference' && { borderBottomColor: colors.flameAmber, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: selectionTab === 'reference' ? colors.flameAmber : colors.mutedOnDark, fontSize: 13 },
                    ]}
                  >
                    Allusions & Context
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectionTab('simplify')}
                  style={[
                    styles.tabButton,
                    selectionTab === 'simplify' && { borderBottomColor: colors.flameAmber, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: selectionTab === 'simplify' ? colors.flameAmber : colors.mutedOnDark, fontSize: 13 },
                    ]}
                  >
                    Simplify
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => setChapterTab('summary')}
                  style={[
                    styles.tabButton,
                    chapterTab === 'summary' && { borderBottomColor: colors.flameAmber, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: chapterTab === 'summary' ? colors.flameAmber : colors.mutedOnDark, fontSize: 13 },
                    ]}
                  >
                    Chapter Summary
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setChapterTab('characters')}
                  style={[
                    styles.tabButton,
                    chapterTab === 'characters' && { borderBottomColor: colors.flameAmber, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: chapterTab === 'characters' ? colors.flameAmber : colors.mutedOnDark, fontSize: 13 },
                    ]}
                  >
                    Character Recap
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setChapterTab('reflections')}
                  style={[
                    styles.tabButton,
                    chapterTab === 'reflections' && { borderBottomColor: colors.flameAmber, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      typography.uiRowTitle,
                      { color: chapterTab === 'reflections' ? colors.flameAmber : colors.mutedOnDark, fontSize: 13 },
                    ]}
                  >
                    Reflections
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Main Body */}
          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
            {!isPremium ? (
              <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.flameAmber }]}>
                <LamplightClassicThemeIcon color={colors.flameAmber} size={32} />
                <Text style={[styles.sectionTitle, { color: colors.lampText, marginTop: 12, textAlign: 'center' }]}>
                  Lamplight Premium
                </Text>
                <Text style={[styles.secondaryText, { color: colors.mutedOnDark, textAlign: 'center', marginTop: 8 }]}>
                  The AI Reading Companion delivers deep literary explanations, archaic sentence simplification, spoiler-free chapter summaries, and character tracking.
                </Text>
                <Pressable
                  style={[styles.upgradeButton, { backgroundColor: colors.flameAmber, borderRadius: radius.card }]}
                  onPress={() => {
                    onClose();
                    onUpgradePress?.();
                  }}
                >
                  <Text style={[typography.uiRowTitle, { color: LamplightColor.primaryDark, fontWeight: '700' }]}>
                    Upgrade to Premium
                  </Text>
                </Pressable>
              </View>
            ) : loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.flameAmber} />
                <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, marginTop: 14 }]}>
                  Consulting literary companion models...
                </Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.secondaryText, { color: colors.lampText, textAlign: 'center' }]}>
                  {errorMessage}
                </Text>
                <Pressable
                  style={[styles.retryButton, { borderColor: colors.flameAmber }]}
                  onPress={fetchActiveContent}
                >
                  <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>
                    Try Again
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Content Renderers */}
                {isSelectionMode && (selectionTab === 'explain' || selectionTab === 'reference') && explainData && (
                  <View>
                    <Text style={[styles.readingBodyText, { color: colors.lampText }]}>
                      {explainData.explanation}
                    </Text>

                    {explainData.referenceNote ? (
                      <View style={[styles.referenceBox, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 4 }]}>
                          LITERARY ALLUSION
                        </Text>
                        <Text style={[styles.secondaryText, { color: colors.lampText, fontSize: 14 }]}>
                          {explainData.referenceNote}
                        </Text>
                      </View>
                    ) : null}

                    {explainData.keyThemes?.length > 0 && (
                      <View style={styles.themeRow}>
                        {explainData.keyThemes.map((th, idx) => (
                          <View key={idx} style={[styles.themePill, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                            <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11 }]}>
                              {th}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {isSelectionMode && selectionTab === 'simplify' && simplifyData && (
                  <View>
                    <View style={[styles.cardSection, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                      <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 4 }]}>
                        SIMPLIFIED PARAPHRASE
                      </Text>
                      <Text style={[styles.readingBodyText, { color: colors.lampText }]}>
                        {simplifyData.simplified}
                      </Text>
                    </View>

                    <View style={{ marginTop: 14 }}>
                      <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, fontWeight: '600', marginBottom: 4 }]}>
                        ORIGINAL INTENT
                      </Text>
                      <Text style={[styles.secondaryText, { color: colors.lampText }]}>
                        {simplifyData.originalMeaning}
                      </Text>
                    </View>

                    {simplifyData.vocabularyBreakdown && simplifyData.vocabularyBreakdown.length > 0 && (
                      <View style={{ marginTop: 16 }}>
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 6 }]}>
                          ARCHAIC VOCABULARY
                        </Text>
                        {simplifyData.vocabularyBreakdown.map((item, idx) => (
                          <View key={idx} style={[styles.vocabRow, { borderBottomColor: colors.hairline }]}>
                            <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 13 }]}>
                              {item.archaicWord}
                            </Text>
                            <Text style={[styles.secondaryText, { color: colors.lampText, fontSize: 13 }]}>
                              → {item.modernMeaning}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {!isSelectionMode && chapterTab === 'summary' && summaryData && (
                  <View>
                    <Text style={[styles.readingBodyText, { color: colors.lampText }]}>
                      {summaryData.summary}
                    </Text>

                    {summaryData.keyDevelopments?.length > 0 && (
                      <View style={{ marginTop: 18 }}>
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 8 }]}>
                          KEY CHAPTER DEVELOPMENTS
                        </Text>
                        {summaryData.keyDevelopments.map((dev, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <Text style={{ color: colors.flameAmber, marginRight: 8, fontSize: 16 }}>•</Text>
                            <Text style={[styles.secondaryText, { color: colors.lampText, flex: 1 }]}>
                              {dev}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {summaryData.thematicFocus ? (
                      <View style={[styles.referenceBox, { backgroundColor: colors.card, borderColor: colors.hairline, marginTop: 16 }]}>
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 4 }]}>
                          THEMATIC FOCUS
                        </Text>
                        <Text style={[styles.secondaryText, { color: colors.lampText, fontSize: 14 }]}>
                          {summaryData.thematicFocus}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {!isSelectionMode && chapterTab === 'characters' && charactersData && (
                  <View>
                    {charactersData.characters.map((char, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.cardSection,
                          { backgroundColor: colors.card, borderColor: colors.hairline, marginBottom: 12 },
                        ]}
                      >
                        <View style={styles.characterHeaderRow}>
                          <Text style={[styles.sectionTitle, { color: colors.lampText, fontSize: 16 }]}>
                            {char.name}
                          </Text>
                          <View style={[styles.roleBadge, { backgroundColor: colors.libraryBackground, borderColor: colors.flameAmber }]}>
                            <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11 }]}>
                              {char.role}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.secondaryText, { color: colors.lampText, marginTop: 6, fontSize: 14 }]}>
                          {char.statusUpToNow}
                        </Text>
                        {char.keyRelationships ? (
                          <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, marginTop: 6 }]}>
                            Key ties: {char.keyRelationships}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {!isSelectionMode && chapterTab === 'reflections' && reflectionsData && (
                  <View>
                    {reflectionsData.questions.map((q, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.cardSection,
                          { backgroundColor: colors.card, borderColor: colors.hairline, marginBottom: 12 },
                        ]}
                      >
                        <View style={styles.themePillInline}>
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700' }]}>
                            {q.theme.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.readingBodyText, { color: colors.lampText, fontSize: 16, marginTop: 8 }]}>
                          {q.question}
                        </Text>
                        {q.contextNote ? (
                          <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, marginTop: 6, fontStyle: 'italic' }]}>
                            {q.contextNote}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Feedback reporting dialog */}
                <View style={styles.feedbackFooter}>
                  {feedbackSubmitted ? (
                    <Text style={[typography.metadataCaption, { color: colors.flameAmber, textAlign: 'center' }]}>
                      ✓ Thank you! Your report helps keep Lamplight accurate and spoiler-free.
                    </Text>
                  ) : reportingFeedback ? (
                    <View style={[styles.feedbackForm, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                      <Text style={[typography.uiRowTitle, { color: colors.lampText, fontSize: 13, marginBottom: 8 }]}>
                        Report issue or spoiler
                      </Text>
                      <View style={styles.reasonRow}>
                        {(['spoiler', 'inaccurate', 'other'] as const).map((r) => (
                          <Pressable
                            key={r}
                            onPress={() => setFeedbackReason(r)}
                            style={[
                              styles.reasonChip,
                              feedbackReason === r && { backgroundColor: colors.flameAmber },
                            ]}
                          >
                            <Text
                              style={{
                                color: feedbackReason === r ? LamplightColor.primaryDark : colors.mutedOnDark,
                                fontSize: 12,
                                fontWeight: '600',
                              }}
                            >
                              {r === 'spoiler' ? 'Spoiler' : r === 'inaccurate' ? 'Inaccurate' : 'Other'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        placeholder="Optional details..."
                        placeholderTextColor={colors.mutedOnDark}
                        value={feedbackNotes}
                        onChangeText={setFeedbackNotes}
                        style={[styles.feedbackInput, { color: colors.lampText, borderColor: colors.hairline }]}
                      />
                      <View style={styles.feedbackActionRow}>
                        <Pressable onPress={() => setReportingFeedback(false)} style={{ marginRight: 16 }}>
                          <Text style={{ color: colors.mutedOnDark, fontSize: 13 }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleSendFeedback} style={[styles.submitButton, { backgroundColor: colors.flameAmber }]}>
                          <Text style={{ color: LamplightColor.primaryDark, fontSize: 12, fontWeight: '700' }}>Submit Report</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable onPress={() => setReportingFeedback(true)} hitSlop={8}>
                      <Text style={[typography.metadataCaption, { color: colors.mutedOnDark, fontSize: 11, textAlign: 'center' }]}>
                        Report issue or spoiler
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bodyScroll: {
    paddingHorizontal: Spacing.xl,
  },
  bodyContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  readingBodyText: {
    fontFamily: 'Lora',
    fontSize: 17,
    lineHeight: 17 * 1.85,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  referenceBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  themePillInline: {
    alignSelf: 'flex-start',
  },
  cardSection: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  vocabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  characterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  premiumCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 12,
  },
  upgradeButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  feedbackFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  feedbackForm: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    marginBottom: 10,
  },
  feedbackActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  submitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  secondaryText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 22,
  },
});
