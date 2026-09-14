import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import {
  CloseIcon,
  MicrophoneIcon,
  SearchIcon,
  StopIcon,
} from '@/components/icons';
import { transcribeAudioUri } from '@/features/scripture-verses/voiceTranscriber';
import { useTheme } from '@/theme/ThemeProvider';

import {
  CURATED_SCRIPTURE_QA,
  type CuratedScriptureQA,
} from './curatedScriptureQA';
import {
  clearInquiryCache,
  getRecentInquiries,
  removeCachedInquiry,
  type CachedInquiryItem,
} from './inquiryCache';

type ScriptureInquiryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (question: string) => void;
};

type ModalTab = 'ask' | 'curated' | 'recent';

const CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'women', label: 'Women & Family' },
  { id: 'justice', label: 'Justice & Law' },
  { id: 'warfare', label: 'Warfare & Peace' },
] as const;

const SUGGESTED_INQUIRIES = [
  {
    icon: '✨',
    title: 'Charity & Giving',
    question: 'What do scriptures say about charity and helping the poor?',
  },
  {
    icon: '🌙',
    title: 'Fasting & Discipline',
    question: 'What do religions teach regarding fasting and spiritual discipline?',
  },
  {
    icon: '🕊️',
    title: 'The Soul & Afterlife',
    question: 'What do scriptures teach about the human soul and the afterlife?',
  },
  {
    icon: '🌿',
    title: 'Animals & Nature',
    question: 'What do religious scriptures command regarding animals and the environment?',
  },
  {
    icon: '⚖️',
    title: 'Justice & Rulers',
    question: 'What do scriptures say about just governance and rulers?',
  },
];

// --- Custom Tab & Feature Icons ---

function SparklesIcon({ color = '#F5A623', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
        fill={color}
      />
      <Path
        d="M19 16L19.9 18.1L22 19L19.9 19.9L19 22L18.1 19.9L16 19L18.1 18.1L19 16Z"
        fill={color}
        opacity={0.8}
      />
    </Svg>
  );
}

function BookOpenIcon({ color = '#1C1B1E', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19.5V6.5C4 5.4 4.9 4.5 6 4.5H11.5C11.8 4.5 12 4.7 12 5V20C12 20 10 19.5 6 19.5H4Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 19.5V6.5C20 5.4 19.1 4.5 18 4.5H12.5C12.2 4.5 12 4.7 12 5V20C12 20 14 19.5 18 19.5H20Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HistoryClockIcon({ color = '#1C1B1E', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.6} />
      <Path d="M12 7V12L15.5 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function TrashMiniIcon({ color = '#A89982', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function ScriptureInquiryModal({
  visible,
  onClose,
  onSubmit,
}: ScriptureInquiryModalProps) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<ModalTab>('ask');
  const [askQuery, setAskQuery] = useState('');
  const [curatedFilter, setCuratedFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recentItems, setRecentItems] = useState<CachedInquiryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingNote, setSubmittingNote] = useState('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const submittedThisPress = useRef(false);

  // Refresh recent inquiries when modal opens or tab changes
  useEffect(() => {
    if (visible) {
      getRecentInquiries().then((items) => {
        setRecentItems(items);
      });
    }
  }, [visible, activeTab]);

  // Filter curated topics
  const filteredCurated = useMemo(() => {
    let list = CURATED_SCRIPTURE_QA;
    if (selectedCategory !== 'all') {
      list = list.filter((q) => q.category === selectedCategory);
    }
    if (curatedFilter.trim()) {
      const qLower = curatedFilter.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.question.toLowerCase().includes(qLower) ||
          q.shortTitle.toLowerCase().includes(qLower) ||
          q.searchKeywords.some((k) => k.toLowerCase().includes(qLower)),
      );
    }
    return list;
  }, [selectedCategory, curatedFilter]);

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const text = await transcribeAudioUri(uri, 'auto');
        if (text && text.trim()) {
          setAskQuery(text.trim());
        }
      }
    } catch {
      // Audio transcribe error tolerated
    } finally {
      setIsTranscribing(false);
    }
  };

  const executeSubmission = (targetQuestion: string) => {
    const q = targetQuestion.trim();
    if (!q || submittedThisPress.current) return;
    submittedThisPress.current = true;
    setIsSubmitting(true);
    setSubmittingNote('Consulting comparative scriptures across traditions...');

    setTimeout(() => {
      setIsSubmitting(false);
      submittedThisPress.current = false;
      onSubmit(q);
    }, 450);
  };

  const handleDeleteRecent = async (id: string) => {
    await removeCachedInquiry(id);
    const updated = await getRecentInquiries();
    setRecentItems(updated);
  };

  const handleClearAllRecents = async () => {
    await clearInquiryCache();
    setRecentItems([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleWrap}>
            <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, letterSpacing: 1.5 }]}>
              COMPARATIVE SCRIPTURES
            </Text>
            <Text style={[typography.screenTitle, { color: colors.primaryDark, fontSize: 21, marginTop: 2 }]}>
              Scripture Inquiry
            </Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.card }]}
          >
            <CloseIcon color={colors.primaryDark} size={18} />
          </Pressable>
        </View>

        {/* 3-Way Segment Tabs: [ Ask AI ] [ Curated Topics ] [ Recent (N) ] */}
        <View style={styles.tabBarContainer}>
          <Pressable
            onPress={() => setActiveTab('ask')}
            style={[
              styles.segmentTab,
              activeTab === 'ask' && styles.segmentTabActive,
            ]}
          >
            <SparklesIcon color={activeTab === 'ask' ? '#F5A623' : '#8A7D6B'} size={15} />
            <Text
              style={[
                typography.uiRowTitle,
                styles.tabLabel,
                { color: activeTab === 'ask' ? '#1C1B1E' : '#7A6E5D' },
                activeTab === 'ask' && { fontWeight: '700' },
              ]}
            >
              Ask AI
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('curated')}
            style={[
              styles.segmentTab,
              activeTab === 'curated' && styles.segmentTabActive,
            ]}
          >
            <BookOpenIcon color={activeTab === 'curated' ? '#1C1B1E' : '#8A7D6B'} size={15} />
            <Text
              style={[
                typography.uiRowTitle,
                styles.tabLabel,
                { color: activeTab === 'curated' ? '#1C1B1E' : '#7A6E5D' },
                activeTab === 'curated' && { fontWeight: '700' },
              ]}
            >
              Curated Topics
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('recent')}
            style={[
              styles.segmentTab,
              activeTab === 'recent' && styles.segmentTabActive,
            ]}
          >
            <HistoryClockIcon color={activeTab === 'recent' ? '#1C1B1E' : '#8A7D6B'} size={15} />
            <Text
              style={[
                typography.uiRowTitle,
                styles.tabLabel,
                { color: activeTab === 'recent' ? '#1C1B1E' : '#7A6E5D' },
                activeTab === 'recent' && { fontWeight: '700' },
              ]}
            >
              Recent{recentItems.length > 0 ? ` (${recentItems.length})` : ''}
            </Text>
          </Pressable>
        </View>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: ASK AI (Dedicated inquiry composer & suggestions)      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ask' ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.tabContentScroll, { paddingBottom: insets.bottom + 36 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* AI Banner Context Card */}
            <View style={[styles.aiHeroCard, { backgroundColor: '#FFFFFF', borderColor: '#EADBB6' }]}>
              <View style={styles.aiHeroTopRow}>
                <View style={styles.aiBadge}>
                  <SparklesIcon color="#8A5A16" size={13} />
                  <Text style={[typography.eyebrowLabel, { color: '#8A5A16', fontSize: 10, marginLeft: 4 }]}>
                    COMPARATIVE SCRIPTURE AI
                  </Text>
                </View>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                  4 Traditions
                </Text>
              </View>
              <Text style={[typography.readingBody, styles.aiHeroDescription, { color: colors.primaryDark }]}>
                Ask any question about religious commands, ethics, or history. Synthesizes verified scripture verses and classical commentaries across <Text style={{ fontWeight: '600' }}>Quran, Bible, Torah,</Text> and <Text style={{ fontWeight: '600' }}>Vedas</Text>.
              </Text>
              <View style={styles.zeroVerdictPill}>
                <Text style={[typography.metadataCaption, { color: '#735B3B', fontSize: 11 }]}>
                  ⚖️ Strictly neutral • Classical Tafsir & Exegesis • No verdicts
                </Text>
              </View>
            </View>

            {/* Composer Box */}
            <View style={[styles.composerBox, { backgroundColor: '#FFFFFF', borderColor: colors.hairline }]}>
              <TextInput
                multiline
                numberOfLines={3}
                value={askQuery}
                onChangeText={setAskQuery}
                placeholder="What do scriptures say about..."
                placeholderTextColor={colors.progressLabel}
                style={[typography.readingBody, styles.composerInput, { color: colors.primaryDark }]}
              />

              <View style={styles.composerActionsRow}>
                {/* Voice Input Button */}
                <Pressable
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isTranscribing}
                  hitSlop={8}
                  style={[
                    styles.micPill,
                    isRecording && { backgroundColor: '#E25555' },
                  ]}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color="#F5A623" />
                  ) : isRecording ? (
                    <>
                      <StopIcon color="#FFFFFF" size={14} />
                      <Text style={[typography.eyebrowLabel, { color: '#FFFFFF', fontSize: 10, marginLeft: 4 }]}>
                        STOP
                      </Text>
                    </>
                  ) : (
                    <>
                      <MicrophoneIcon color={colors.flameAmber} size={15} />
                      <Text style={[typography.metadataCaption, { color: colors.primaryDark, fontSize: 11, marginLeft: 4 }]}>
                        Voice
                      </Text>
                    </>
                  )}
                </Pressable>

                {askQuery.trim().length > 0 ? (
                  <Pressable hitSlop={8} onPress={() => setAskQuery('')} style={{ paddingHorizontal: 8 }}>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Primary Action Button */}
            <Pressable
              disabled={askQuery.trim().length === 0 || isSubmitting}
              onPress={() => executeSubmission(askQuery)}
              style={({ pressed }) => [
                styles.primarySubmitBtn,
                {
                  backgroundColor: askQuery.trim().length > 0 ? colors.flameAmber : '#E5DDCF',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator size="small" color="#1C1B1E" />
                  <Text style={[typography.uiRowTitle, { color: '#1C1B1E', fontSize: 14, marginLeft: 8 }]}>
                    {submittingNote}
                  </Text>
                </View>
              ) : (
                <View style={styles.submittingRow}>
                  <SparklesIcon color={askQuery.trim().length > 0 ? '#1C1B1E' : '#8A7D6B'} size={16} />
                  <Text
                    style={[
                      typography.uiRowTitle,
                      {
                        color: askQuery.trim().length > 0 ? '#1C1B1E' : '#8A7D6B',
                        fontSize: 14.5,
                        fontWeight: '700',
                        marginLeft: 6,
                      },
                    ]}
                  >
                    Consult Scriptures across Traditions ➔
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Suggestions / Questions List */}
            <View style={styles.suggestionsHeaderRow}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, letterSpacing: 1.1 }]}>
                OR EXPLORE COMMON THEMES
              </Text>
            </View>

            {SUGGESTED_INQUIRIES.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setAskQuery(item.question);
                  executeSubmission(item.question);
                }}
                style={({ pressed }) => [
                  styles.suggestionCard,
                  {
                    backgroundColor: pressed ? '#F5EEDB' : '#FFFFFF',
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <Text style={{ fontSize: 18, marginRight: 10 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.uiRowTitle, { color: colors.primaryDark, fontSize: 14 }]}>
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginTop: 2 }]}
                  >
                    {item.question}
                  </Text>
                </View>
                <Text style={{ color: colors.flameAmber, fontSize: 16, marginLeft: 8 }}>➔</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CURATED TOPICS (Browse deep pre-analyzed studies)      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'curated' ? (
          <View style={{ flex: 1 }}>
            {/* Search Input Filter for Curated Topics */}
            <View style={styles.searchSection}>
              <View style={[styles.searchInputRow, { backgroundColor: '#FFFFFF', borderColor: colors.hairline }]}>
                <SearchIcon color={colors.fawn} size={16} />
                <TextInput
                  value={curatedFilter}
                  onChangeText={setCuratedFilter}
                  placeholder="Filter 4 curated topics..."
                  placeholderTextColor={colors.progressLabel}
                  style={[typography.readingBody, styles.searchInput, { color: colors.primaryDark }]}
                />
                {curatedFilter.length > 0 ? (
                  <Pressable onPress={() => setCuratedFilter('')} hitSlop={8}>
                    <CloseIcon color={colors.fawn} size={14} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Categories Filter Carousel */}
            <View style={styles.categoriesRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      style={[
                        styles.categoryChip,
                        isSelected && { backgroundColor: '#1C1B1E', borderColor: '#1C1B1E' },
                      ]}
                    >
                      <Text
                        style={[
                          typography.metadataCaption,
                          {
                            color: isSelected ? '#F5EDE1' : colors.primaryDark,
                            fontWeight: isSelected ? '600' : '400',
                            fontSize: 12,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Curated Question Cards */}
            <FlatList
              data={filteredCurated}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => executeSubmission(item.question)}
                  style={({ pressed }) => [
                    styles.questionCard,
                    {
                      backgroundColor: pressed ? '#F5EEDB' : '#FFFFFF',
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.categoryBadge, { backgroundColor: '#FDF7E7' }]}>
                      <Text style={[typography.eyebrowLabel, { color: '#8A5A16', fontSize: 10 }]}>
                        {item.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                      {item.traditions.length} Traditions
                    </Text>
                  </View>

                  <Text
                    style={[
                      typography.screenTitle,
                      styles.questionCardTitle,
                      { color: colors.primaryDark, fontFamily: 'Lora_600SemiBold' },
                    ]}
                  >
                    {item.question}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={[typography.metadataCaption, styles.questionSnippet, { color: colors.umber }]}
                  >
                    {item.topicBackground}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.traditionTags}>
                      {item.traditions.map((t, idx) => (
                        <View key={t.tradition} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.traditionTagText}>
                            {t.tradition === 'quran'
                              ? 'Quran'
                              : t.tradition === 'bible-nt'
                              ? 'NT'
                              : t.tradition === 'torah'
                              ? 'Torah'
                              : 'Vedas'}
                          </Text>
                          {idx < item.traditions.length - 1 ? (
                            <Text style={styles.tagDivider}>•</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                    <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '600' }]}>
                      Explore ➔
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: RECENT INQUIRIES (Saved on-device persistent cache)    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'recent' ? (
          <View style={{ flex: 1 }}>
            {recentItems.length > 0 ? (
              <View style={styles.recentsTopBar}>
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, letterSpacing: 1.1 }]}>
                  {recentItems.length} SAVED ON DEVICE • 0 API CONSUMED
                </Text>
                <Pressable hitSlop={8} onPress={handleClearAllRecents}>
                  <Text style={[typography.metadataCaption, { color: '#B24545', fontSize: 11.5, fontWeight: '600' }]}>
                    Clear All
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <FlatList
              data={recentItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyRecentWrap}>
                  <View style={styles.emptyIconCircle}>
                    <HistoryClockIcon color="#8A7D6B" size={28} />
                  </View>
                  <Text style={[typography.readingBody, { color: colors.primaryDark, fontWeight: '600', marginTop: 12 }]}>
                    No Recent Inquiries Yet
                  </Text>
                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.fawn, textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 20 },
                    ]}
                  >
                    Questions you ask in the &quot;Ask AI&quot; tab are saved directly to your device so you can revisit comparative answers anytime offline without burning API quota.
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('ask')}
                    style={[styles.switchAskBtn, { backgroundColor: colors.flameAmber }]}
                  >
                    <Text style={[typography.uiRowTitle, { color: '#1C1B1E', fontSize: 13.5, fontWeight: '700' }]}>
                      Ask a Question Now ➔
                    </Text>
                  </Pressable>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => executeSubmission(item.query)}
                  style={({ pressed }) => [
                    styles.recentCard,
                    {
                      backgroundColor: pressed ? '#F5EEDB' : '#FFFFFF',
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <View style={styles.recentTopRow}>
                    <View style={styles.offlinePill}>
                      <Text style={[typography.eyebrowLabel, { color: '#2E6930', fontSize: 9.5 }]}>
                        ⚡ SAVED OFFLINE
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11, marginRight: 10 }]}>
                        {formatRelativeTime(item.timestamp)}
                      </Text>
                      <Pressable hitSlop={10} onPress={() => handleDeleteRecent(item.id)}>
                        <TrashMiniIcon color="#A89982" size={13} />
                      </Pressable>
                    </View>
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[typography.uiRowTitle, styles.recentQueryTitle, { color: colors.primaryDark }]}
                  >
                    &quot;{item.query}&quot;
                  </Text>

                  <View style={styles.recentTraditionsRow}>
                    {item.traditionSummary.map((t) => (
                      <View key={t.tradition} style={[styles.traditionCountBadge, { backgroundColor: '#F0E9DC' }]}>
                        <Text style={[typography.metadataCaption, { color: '#5A4C3A', fontSize: 10.5, fontWeight: '500' }]}>
                          {t.traditionName} ({t.verseCount})
                        </Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE1',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2D3B8',
  },

  // 3-Way Segment Tabs
  tabBarContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 3,
    backgroundColor: '#EAE1D2',
    borderRadius: 12,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tabLabel: {
    fontSize: 12.5,
  },

  // Tab Content Scroll
  tabContentScroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Ask AI Tab Components
  aiHeroCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  aiHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7E7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiHeroDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 10,
  },
  zeroVerdictPill: {
    backgroundColor: '#F4ECE0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  composerBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  composerInput: {
    minHeight: 70,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  composerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0E9DC',
    paddingTop: 8,
    marginTop: 4,
  },
  micPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FDF7E7',
  },
  primarySubmitBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsHeaderRow: {
    marginBottom: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },

  // Curated Topics Tab
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 14,
    paddingVertical: 0,
  },
  categoriesRow: {
    paddingVertical: 6,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#EFE8DB',
    borderWidth: 1,
    borderColor: '#E2D8C6',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  questionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questionCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  questionSnippet: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0E9DC',
    paddingTop: 10,
  },
  traditionTags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  traditionTagText: {
    fontSize: 11,
    color: '#8A5A16',
    fontWeight: '500',
  },
  tagDivider: {
    fontSize: 10,
    color: '#C4B49C',
    marginHorizontal: 5,
  },

  // Recent Inquiries Tab
  recentsTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  emptyRecentWrap: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAE1D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchAskBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
  },
  recentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  recentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  offlinePill: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  recentQueryTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 8,
  },
  recentTraditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  traditionCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
});
