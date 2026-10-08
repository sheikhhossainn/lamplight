import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import {
  CheckIcon,
  CloseIcon,
  CompanionIcon,
  ReloadIcon,
  SendIcon,
  ShieldIcon,
  SparkleIcon,
} from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import { createReaderNote } from '@/db/repositories/readerNotes';
import { useTheme } from '@/theme/ThemeProvider';
import { LamplightColor, Spacing } from '@/theme/tokens';
import { getCompanionQuota, type CompanionQuotaStatus } from './companionQuota';
import {
  askCompanionQuestion,
  boundExcerpt,
  computeScopeLabel,
  explainPassage,
  extractPriorText,
  generateReflectiveQuestions,
  recapCharacters,
  reportCompanionFeedback,
  simplifySentence,
  summarizeChapter,
  type CompanionAskResult,
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
  onSaveNote?: (noteText: string) => Promise<void>;
  onViewNotes?: () => void;
};

type SelectionAction = 'explain' | 'reference' | 'simplify' | 'tone' | 'ask';
type ChapterAction = 'summary' | 'characters' | 'reflections' | 'ask';

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
  onSaveNote,
  onViewNotes,
}: ReadingCompanionModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius } = useTheme();

  const isSelectionMode = Boolean(selectedText && selectedText.trim().length > 0);

  // Active action pill
  const [selectionAction, setSelectionAction] = useState<SelectionAction>('explain');
  const [chapterAction, setChapterAction] = useState<ChapterAction>('summary');

  // Loading & Quota state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Consulting companion...');
  const [quotaStatus, setQuotaStatus] = useState<CompanionQuotaStatus | null>(null);

  // Excerpt accordion toggle
  const [excerptExpanded, setExcerptExpanded] = useState(false);

  // Cached responses per session
  const [explainData, setExplainData] = useState<CompanionExplainResult | null>(null);
  const [referenceData, setReferenceData] = useState<CompanionExplainResult | null>(null);
  const [simplifyData, setSimplifyData] = useState<CompanionSimplifyResult | null>(null);
  const [toneData, setToneData] = useState<CompanionAskResult | null>(null);
  const [summaryData, setSummaryData] = useState<CompanionSummaryResult | null>(null);
  const [charactersData, setCharactersData] = useState<CompanionCharactersResult | null>(null);
  const [reflectionsData, setReflectionsData] = useState<CompanionReflectionsResult | null>(null);

  // Interactive Question State
  const [customQuestion, setCustomQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string; themes?: string[] }>>([]);

  // Note save & copy toasts
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [noteSavedSuccess, setNoteSavedSuccess] = useState(false);

  // Feedback reporting
  const [reportingFeedback, setReportingFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState<'spoiler' | 'inaccurate' | 'other'>('spoiler');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Refresh quota on mount/visible
  const refreshQuota = useCallback(async () => {
    try {
      const q = await getCompanionQuota();
      setQuotaStatus(q);
    } catch {
      // Non-blocking
    }
  }, []);

  // Compute scope label
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

  // Load active content
  const loadContentForAction = useCallback(async (action: SelectionAction | ChapterAction) => {
    setCopiedSuccess(false);
    setNoteSavedSuccess(false);

    if (action === 'ask') {
      return;
    }

    if (isSelectionMode && selectedText) {
      if (action === 'explain') {
        if (explainData) return;
        setLoading(true);
        setLoadingStep('Reading passage closely...');
        const res = await explainPassage({
          excerpt: selectedText,
          bookTitle,
          bookAuthor,
          chapterTitle,
          chapterIndex,
          isReference: false,
        });
        setLoading(false);
        if (res.data) setExplainData(res.data);
      } else if (action === 'reference') {
        if (referenceData) return;
        setLoading(true);
        setLoadingStep('Unearthing classical allusions...');
        const res = await explainPassage({
          excerpt: selectedText,
          bookTitle,
          bookAuthor,
          chapterTitle,
          chapterIndex,
          isReference: true,
        });
        setLoading(false);
        if (res.data) setReferenceData(res.data);
      } else if (action === 'simplify') {
        if (simplifyData) return;
        setLoading(true);
        setLoadingStep('Translating archaic prose into modern English...');
        const res = await simplifySentence({
          sentence: selectedText,
          bookTitle,
          bookAuthor,
          chapterIndex,
        });
        setLoading(false);
        if (res.data) setSimplifyData(res.data);
      } else if (action === 'tone') {
        if (toneData) return;
        setLoading(true);
        setLoadingStep('Analyzing literary tone & imagery...');
        const res = await askCompanionQuestion({
          question: 'Analyze the literary tone, dramatic tension, and prose style of this passage.',
          excerpt: selectedText,
          bookTitle,
          bookAuthor,
          chapterTitle,
          chapterIndex,
        });
        setLoading(false);
        if (res.data) setToneData(res.data);
      }
    } else {
      // Chapter mode
      if (action === 'summary') {
        if (summaryData) return;
        setLoading(true);
        setLoadingStep('Synthesizing chapter events (spoiler-free)...');
        const res = await summarizeChapter({
          chapterExcerpt: currentChapterText || 'Chapter excerpt unavailable.',
          chapterIndex,
          chapterTitle,
          bookTitle,
          bookAuthor,
        });
        setLoading(false);
        if (res.data) setSummaryData(res.data);
      } else if (action === 'characters') {
        if (charactersData) return;
        setLoading(true);
        setLoadingStep('Tracking named characters up to this chapter...');
        const priorText = extractPriorText(priorChapterTexts, chapterIndex, currentChapterText);
        const res = await recapCharacters({
          textUpToNow: priorText || currentChapterText || 'Text unavailable.',
          chapterIndex,
          chapterTitle,
          bookTitle,
          bookAuthor,
        });
        setLoading(false);
        if (res.data) setCharactersData(res.data);
      } else if (action === 'reflections') {
        if (reflectionsData) return;
        setLoading(true);
        setLoadingStep('Formulating philosophical reflection questions...');
        const res = await generateReflectiveQuestions({
          chapterExcerpt: currentChapterText || 'Chapter excerpt unavailable.',
          chapterIndex,
          chapterTitle,
          bookTitle,
          bookAuthor,
        });
        setLoading(false);
        if (res.data) setReflectionsData(res.data);
      }
    }

    void refreshQuota();
  }, [
    isSelectionMode,
    selectedText,
    bookTitle,
    bookAuthor,
    chapterTitle,
    chapterIndex,
    currentChapterText,
    priorChapterTexts,
    explainData,
    referenceData,
    simplifyData,
    toneData,
    summaryData,
    charactersData,
    reflectionsData,
    refreshQuota,
  ]);

  // Initial trigger when modal mounts or mode changes
  useEffect(() => {
    if (!visible) {
      setReportingFeedback(false);
      setFeedbackSubmitted(false);
      setFeedbackNotes('');
      setCopiedSuccess(false);
      setNoteSavedSuccess(false);
      return;
    }

    void refreshQuota();
    const active = isSelectionMode ? selectionAction : chapterAction;
    void loadContentForAction(active);
  }, [visible, isSelectionMode, selectionAction, chapterAction, loadContentForAction, refreshQuota]);

  // Action chip switcher
  const handleSelectAction = (action: SelectionAction | ChapterAction) => {
    void Haptics.selectionAsync();
    if (isSelectionMode) {
      setSelectionAction(action as SelectionAction);
    } else {
      setChapterAction(action as ChapterAction);
    }
    void loadContentForAction(action);
  };

  // Submit custom question
  const handleAskQuestion = async (prefilledText?: string) => {
    const q = (prefilledText || customQuestion).trim();
    if (!q || loading) return;

    Keyboard.dismiss();
    setCustomQuestion('');
    setLoading(true);
    setLoadingStep('Consulting companion on your question...');

    const res = await askCompanionQuestion({
      question: q,
      excerpt: selectedText || undefined,
      bookTitle,
      bookAuthor,
      chapterTitle,
      chapterIndex,
    });

    setLoading(false);

    if (res.data) {
      setChatHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: res.data!.answer,
          themes: res.data!.keyThemes,
        },
      ]);
    }

    void refreshQuota();
  };

  // Copy insight
  const handleCopyText = async (textToCopy: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Save to reader notes
  const handleSaveToNotes = async (textToSave: string, title?: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const noteBody = `${title ? `[AI Companion: ${title}]\n` : ''}${textToSave}`;
    if (onSaveNote) {
      await onSaveNote(noteBody);
    } else if (bookId) {
      await createReaderNote({
        bookId,
        chapterIndex,
        pageIndex: pageIndex ?? 0,
        noteText: noteBody,
      }).catch(() => {});
    }

    setNoteSavedSuccess(true);
    setTimeout(() => setNoteSavedSuccess(false), 4000);
  };

  // Submit feedback
  const handleSendFeedback = async () => {
    await reportCompanionFeedback({
      targetAction: isSelectionMode ? selectionAction : chapterAction,
      bookId,
      chapterIndex,
      reason: feedbackReason,
      notes: feedbackNotes,
    });
    setFeedbackSubmitted(true);
  };

  // Quota label
  const quotaBadge = useMemo(() => {
    if (!quotaStatus) return null;
    if (quotaStatus.isPremium) {
      return (
        <View style={[styles.quotaPill, { backgroundColor: colors.flameAmber + '18', borderColor: colors.flameAmber }]}>
          <SparkleIcon size={12} color={colors.flameAmber} />
          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginLeft: 4 }]}>
            Premium
          </Text>
        </View>
      );
    }
    return (
      <Pressable
        onPress={() => {
          onClose();
          onUpgradePress?.();
        }}
        style={[styles.quotaPill, { backgroundColor: colors.card, borderColor: colors.hairline }]}
      >
        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700' }]}>
          ✦ {quotaStatus.remaining} free
        </Text>
      </Pressable>
    );
  }, [quotaStatus, colors, typography, onClose, onUpgradePress]);

  // Current active result text for copy / note save
  const currentResultText = useMemo(() => {
    if (isSelectionMode) {
      if (selectionAction === 'explain' && explainData) return explainData.explanation;
      if (selectionAction === 'reference' && referenceData) return referenceData.explanation;
      if (selectionAction === 'simplify' && simplifyData) return `${simplifyData.simplified}\n\n${simplifyData.originalMeaning}`;
      if (selectionAction === 'tone' && toneData) return toneData.answer;
    } else {
      if (chapterAction === 'summary' && summaryData) return summaryData.summary;
      if (chapterAction === 'characters' && charactersData) {
        return charactersData.characters.map((c) => `${c.name} (${c.role}): ${c.statusUpToNow}`).join('\n\n');
      }
      if (chapterAction === 'reflections' && reflectionsData) {
        return reflectionsData.questions.map((q) => `• [${q.theme}] ${q.question}`).join('\n\n');
      }
    }
    return null;
  }, [
    isSelectionMode,
    selectionAction,
    chapterAction,
    explainData,
    referenceData,
    simplifyData,
    toneData,
    summaryData,
    charactersData,
    reflectionsData,
  ]);

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.sheetContainer,
          {
            backgroundColor: colors.libraryBackground,
            borderTopColor: colors.hairline,
            maxHeight: screenHeight * 0.88,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handleBar, { backgroundColor: colors.hairline }]} />
        </View>

        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.card }]}>
              <CompanionIcon size={18} color={colors.flameAmber} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, fontWeight: '700' }]}>
                Reading Companion
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                {scopeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightRow}>
            {quotaBadge}
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: colors.card }]}
            >
              <CloseIcon size={14} color={colors.umber} />
            </Pressable>
          </View>
        </View>

        {/* Context Scope Card */}
        {isSelectionMode && selectedText ? (
          <View style={[styles.excerptCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={styles.excerptHeader}>
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700' }]}>
                SELECTED PASSAGE
              </Text>
              <Pressable
                onPress={() => setExcerptExpanded(!excerptExpanded)}
                hitSlop={8}
              >
                <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11 }]}>
                  {excerptExpanded ? 'Show less' : 'Expand full'}
                </Text>
              </Pressable>
            </View>
            <Text
              style={[
                styles.excerptText,
                { color: colors.ink },
                !excerptExpanded && { maxHeight: 52 },
              ]}
              numberOfLines={excerptExpanded ? undefined : 2}
            >
              “{boundExcerpt(selectedText, excerptExpanded ? 800 : 220)}”
            </Text>
          </View>
        ) : (
          <View style={[styles.chapterScopeBanner, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={styles.shieldRow}>
              <ShieldIcon size={15} color={colors.flameAmber} />
              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginLeft: 6 }]}>
                Spoiler-Free Guarantee
              </Text>
            </View>
            <Text style={[typography.metadataCaption, { color: colors.umber, fontSize: 11, marginTop: 2 }]}>
              Scope strictly bounded to Chapter {chapterIndex + 1} and prior pages. Future plots remain sacred.
            </Text>
          </View>
        )}

        {/* Action Chip Bar */}
        <View style={styles.actionChipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionChipsContainer}
          >
            {isSelectionMode ? (
              <>
                <Pressable
                  onPress={() => handleSelectAction('explain')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    selectionAction === 'explain' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectionAction === 'explain' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    💡 Deep Meaning
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('reference')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    selectionAction === 'reference' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectionAction === 'reference' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    🏛️ Classical Allusions
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('simplify')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    selectionAction === 'simplify' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectionAction === 'simplify' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    🪶 Simplify Prose
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('tone')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    selectionAction === 'tone' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectionAction === 'tone' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    🎭 Tone & Subtext
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('ask')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    selectionAction === 'ask' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectionAction === 'ask' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    💬 Ask Question
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => handleSelectAction('summary')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    chapterAction === 'summary' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: chapterAction === 'summary' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    📜 Chapter Summary
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('characters')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    chapterAction === 'characters' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: chapterAction === 'characters' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    👥 Character Dossier
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('reflections')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    chapterAction === 'reflections' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: chapterAction === 'reflections' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    💭 Reflections
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSelectAction('ask')}
                  style={[
                    styles.chip,
                    { borderColor: colors.hairline, backgroundColor: colors.card },
                    chapterAction === 'ask' && { backgroundColor: colors.flameAmber, borderColor: colors.flameAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: chapterAction === 'ask' ? LamplightColor.primaryDark : colors.ink },
                    ]}
                  >
                    💬 Ask Question
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>

        {/* Body Content */}
        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.flameAmber} />
              <Text style={[typography.uiRowTitle, { color: colors.ink, marginTop: 14, fontSize: 14 }]}>
                {loadingStep}
              </Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
                Analyzing prose craft, subtext, and literary context
              </Text>
            </View>
          ) : (
            <>
              {/* SELECTION MODE CONTENT */}
              {isSelectionMode && (
                <>
                  {selectionAction === 'explain' && explainData && (
                    <View>
                      <Text style={[styles.literaryBodyText, { color: colors.ink }]}>
                        {explainData.explanation}
                      </Text>

                      {explainData.referenceNote ? (
                        <View style={[styles.referenceCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 4 }]}>
                            LITERARY ALLUSION
                          </Text>
                          <Text style={[typography.readingBody, { color: colors.ink, fontSize: 15 }]}>
                            {explainData.referenceNote}
                          </Text>
                        </View>
                      ) : null}

                      {explainData.keyThemes?.length > 0 && (
                        <View style={styles.themesWrapper}>
                          {explainData.keyThemes.map((theme, i) => (
                            <View key={i} style={[styles.themeChip, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11 }]}>
                                {theme}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {selectionAction === 'reference' && referenceData && (
                    <View>
                      <Text style={[styles.literaryBodyText, { color: colors.ink }]}>
                        {referenceData.explanation}
                      </Text>

                      {referenceData.referenceNote ? (
                        <View style={[styles.referenceCard, { backgroundColor: colors.card, borderColor: colors.flameAmber }]}>
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 4 }]}>
                            CANONICAL ALLUSION
                          </Text>
                          <Text style={[typography.readingBody, { color: colors.ink, fontSize: 15 }]}>
                            {referenceData.referenceNote}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {selectionAction === 'simplify' && simplifyData && (
                    <View>
                      <View style={[styles.simplifiedCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 6 }]}>
                          CLEAR MODERN PARAPHRASE
                        </Text>
                        <Text style={[styles.literaryBodyText, { color: colors.ink }]}>
                          {simplifyData.simplified}
                        </Text>
                      </View>

                      <View style={{ marginTop: 14 }}>
                        <Text style={[typography.metadataCaption, { color: colors.fawn, fontWeight: '600', marginBottom: 4 }]}>
                          ORIGINAL INTENT
                        </Text>
                        <Text style={[typography.readingBody, { color: colors.umber, fontSize: 15 }]}>
                          {simplifyData.originalMeaning}
                        </Text>
                      </View>

                      {simplifyData.vocabularyBreakdown && simplifyData.vocabularyBreakdown.length > 0 && (
                        <View style={{ marginTop: 18 }}>
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 8 }]}>
                            ARCHAIC VOCABULARY BREAKDOWN
                          </Text>
                          {simplifyData.vocabularyBreakdown.map((item, idx) => (
                            <View key={idx} style={[styles.vocabRow, { borderBottomColor: colors.hairline }]}>
                              <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 14, fontFamily: 'Lora' }]}>
                                {item.archaicWord}
                              </Text>
                              <Text style={[typography.readingBody, { color: colors.ink, fontSize: 14 }]}>
                                → {item.modernMeaning}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {selectionAction === 'tone' && toneData && (
                    <View>
                      <Text style={[styles.literaryBodyText, { color: colors.ink }]}>
                        {toneData.answer}
                      </Text>

                      {toneData.keyThemes && toneData.keyThemes.length > 0 && (
                        <View style={styles.themesWrapper}>
                          {toneData.keyThemes.map((th, i) => (
                            <View key={i} style={[styles.themeChip, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11 }]}>
                                {th}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* CHAPTER MODE CONTENT */}
              {!isSelectionMode && (
                <>
                  {chapterAction === 'summary' && summaryData && (
                    <View>
                      <Text style={[styles.literaryBodyText, { color: colors.ink }]}>
                        {summaryData.summary}
                      </Text>

                      {summaryData.keyDevelopments?.length > 0 && (
                        <View style={{ marginTop: 18 }}>
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 8 }]}>
                            KEY CHAPTER TURNING POINTS
                          </Text>
                          {summaryData.keyDevelopments.map((dev, i) => (
                            <View key={i} style={styles.bulletRow}>
                              <Text style={{ color: colors.flameAmber, marginRight: 8, fontSize: 16 }}>•</Text>
                              <Text style={[typography.readingBody, { color: colors.ink, flex: 1, fontSize: 15 }]}>
                                {dev}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {summaryData.thematicFocus ? (
                        <View style={[styles.referenceCard, { backgroundColor: colors.card, borderColor: colors.hairline, marginTop: 16 }]}>
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 4 }]}>
                            THEMATIC FOCUS
                          </Text>
                          <Text style={[typography.readingBody, { color: colors.ink, fontSize: 15 }]}>
                            {summaryData.thematicFocus}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {chapterAction === 'characters' && charactersData && (
                    <View>
                      {charactersData.characters.map((char, i) => (
                        <View key={i} style={[styles.characterCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                          <View style={styles.characterHeaderRow}>
                            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                              {char.name}
                            </Text>
                            <View style={[styles.roleBadge, { backgroundColor: colors.flameAmber + '15', borderColor: colors.flameAmber }]}>
                              <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700' }]}>
                                {char.role}
                              </Text>
                            </View>
                          </View>
                          <Text style={[typography.readingBody, { color: colors.umber, marginTop: 6, fontSize: 14 }]}>
                            {char.statusUpToNow}
                          </Text>
                          {char.keyRelationships ? (
                            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 6 }]}>
                              {char.keyRelationships}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}

                  {chapterAction === 'reflections' && reflectionsData && (
                    <View>
                      {reflectionsData.questions.map((q, i) => (
                        <View key={i} style={[styles.reflectionCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                          <View style={styles.themePillInline}>
                            <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontSize: 11, fontWeight: '700' }]}>
                              {q.theme.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.literaryBodyText, { color: colors.ink, fontSize: 16, marginTop: 8 }]}>
                            {q.question}
                          </Text>
                          {q.contextNote ? (
                            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 6, fontStyle: 'italic' }]}>
                              {q.contextNote}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* CONVERSATIONAL CHAT HISTORY */}
              {chatHistory.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700', marginBottom: 12 }]}>
                    YOUR QUESTIONS
                  </Text>
                  {chatHistory.map((item, idx) => (
                    <View key={idx} style={[styles.chatCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                      <View style={styles.chatQuestionRow}>
                        <Text style={[typography.uiRowTitle, { color: colors.flameAmber, fontSize: 14 }]}>
                          Q: {item.question}
                        </Text>
                      </View>
                      <Text style={[styles.literaryBodyText, { color: colors.ink, fontSize: 16, marginTop: 8 }]}>
                        {item.answer}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Bar: Copy, Save Note */}
              {currentResultText && (
                <View style={styles.actionToolbar}>
                  <Pressable
                    onPress={() => handleCopyText(currentResultText)}
                    style={[styles.toolButton, { backgroundColor: colors.card, borderColor: colors.hairline }]}
                  >
                    {copiedSuccess ? (
                      <>
                        <CheckIcon size={14} color={colors.flameAmber} />
                        <Text style={[typography.metadataCaption, { color: colors.flameAmber, marginLeft: 6 }]}>
                          Copied
                        </Text>
                      </>
                    ) : (
                      <Text style={[typography.metadataCaption, { color: colors.ink }]}>
                        📋 Copy Insight
                      </Text>
                    )}
                  </Pressable>

                  {bookId || onSaveNote ? (
                    <Pressable
                      onPress={() => handleSaveToNotes(currentResultText, isSelectionMode ? selectionAction : chapterAction)}
                      style={[
                        styles.toolButton,
                        { backgroundColor: colors.card, borderColor: noteSavedSuccess ? colors.flameAmber : colors.hairline },
                      ]}
                    >
                      {noteSavedSuccess ? (
                        <>
                          <CheckIcon size={14} color={colors.flameAmber} />
                          <Text style={[typography.metadataCaption, { color: colors.flameAmber, marginLeft: 6 }]}>
                            Saved to Notes
                          </Text>
                        </>
                      ) : (
                        <Text style={[typography.metadataCaption, { color: colors.ink }]}>
                          🔖 Save to Notes
                        </Text>
                      )}
                    </Pressable>
                  ) : null}

                  {noteSavedSuccess && onViewNotes ? (
                    <Pressable
                      onPress={onViewNotes}
                      style={[styles.toolButton, { backgroundColor: colors.flameAmber + '20', borderColor: colors.flameAmber }]}
                    >
                      <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '700' }]}>
                        View Notes →
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => loadContentForAction(isSelectionMode ? selectionAction : chapterAction)}
                    style={[styles.toolButton, { backgroundColor: colors.card, borderColor: colors.hairline }]}
                  >
                    <ReloadIcon size={13} color={colors.umber} />
                    <Text style={[typography.metadataCaption, { color: colors.umber, marginLeft: 6 }]}>
                      Refresh
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Question Suggestions */}
              {(isSelectionMode ? selectionAction === 'ask' : chapterAction === 'ask') && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, marginBottom: 8 }]}>
                    SUGGESTED QUESTIONS:
                  </Text>
                  {[
                    'What subtle irony or subtext is at play here?',
                    'Explain the moral or philosophical choice being made.',
                    'How does this scene reflect the historical period?',
                  ].map((sug, i) => (
                    <Pressable
                      key={i}
                      onPress={() => handleAskQuestion(sug)}
                      style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.hairline }]}
                    >
                      <Text style={[typography.metadataCaption, { color: colors.ink, fontSize: 13 }]}>
                        ✦ {sug}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Feedback Footer */}
              <View style={styles.feedbackFooter}>
                {feedbackSubmitted ? (
                  <Text style={[typography.metadataCaption, { color: colors.flameAmber, textAlign: 'center' }]}>
                    ✓ Report recorded. Thank you for keeping Lamplight spoiler-free!
                  </Text>
                ) : reportingFeedback ? (
                  <View style={[styles.feedbackBox, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                    <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 13, marginBottom: 8 }]}>
                      Report spoiler or inaccuracy
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
                              color: feedbackReason === r ? LamplightColor.primaryDark : colors.fawn,
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
                      placeholder="Optional notes..."
                      placeholderTextColor={colors.fawn}
                      value={feedbackNotes}
                      onChangeText={setFeedbackNotes}
                      style={[styles.feedbackInput, { color: colors.ink, borderColor: colors.hairline }]}
                    />
                    <View style={styles.feedbackActionRow}>
                      <Pressable onPress={() => setReportingFeedback(false)} style={{ marginRight: 16 }}>
                        <Text style={{ color: colors.fawn, fontSize: 13 }}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={handleSendFeedback} style={[styles.submitButton, { backgroundColor: colors.flameAmber }]}>
                        <Text style={{ color: LamplightColor.primaryDark, fontSize: 12, fontWeight: '700' }}>Submit</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setReportingFeedback(true)} hitSlop={8}>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, textAlign: 'center' }]}>
                      Report spoiler or inaccuracy
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom Interactive Question Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.hairline }]}>
          <TextInput
            placeholder={isSelectionMode ? 'Ask anything about this passage...' : 'Ask about this chapter...'}
            placeholderTextColor={colors.fawn}
            value={customQuestion}
            onChangeText={setCustomQuestion}
            onSubmitEditing={() => handleAskQuestion()}
            returnKeyType="send"
            style={[styles.textInput, { color: colors.ink }]}
          />
          <Pressable
            onPress={() => handleAskQuestion()}
            disabled={!customQuestion.trim() || loading}
            style={[
              styles.sendButton,
              { backgroundColor: customQuestion.trim() && !loading ? colors.flameAmber : colors.libraryBackground },
            ]}
          >
            <SendIcon
              size={15}
              color={customQuestion.trim() && !loading ? LamplightColor.primaryDark : colors.fawn}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excerptCard: {
    marginHorizontal: Spacing.xl,
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  excerptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  excerptText: {
    fontFamily: 'Lora',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
  },
  chapterScopeBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionChipsWrapper: {
    marginTop: 10,
    paddingBottom: 4,
  },
  actionChipsContainer: {
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  bodyScroll: {
    paddingHorizontal: Spacing.xl,
  },
  bodyContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  literaryBodyText: {
    fontFamily: 'Lora',
    fontSize: 17,
    lineHeight: 17 * 1.85,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  referenceCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  simplifiedCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  themesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  vocabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  characterCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
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
  reflectionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  themePillInline: {
    alignSelf: 'flex-start',
  },
  chatCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  chatQuestionRow: {
    marginBottom: 4,
  },
  actionToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionChip: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  feedbackFooter: {
    marginTop: 20,
    paddingTop: 12,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 10,
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
    marginBottom: 8,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
