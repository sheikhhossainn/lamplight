import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio';

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  MicrophoneIcon,
  SearchIcon,
  StopIcon,
  TranslateIcon,
} from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { transcribeAudioUri, translateToEnglishIfNeeded } from './voiceTranscriber';

type FeelingPromptModalProps = {
  visible: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
};

const PRESETS = [
  { label: 'Lonely', phrase: 'I feel lonely and disconnected from everyone.' },
  { label: 'Numb', phrase: 'I feel numb, like I cannot feel anything right now.' },
  { label: 'Do not know', phrase: "I don't even know what I am feeling, everything is just heavy." },
  { label: 'Sad', phrase: 'I feel a deep sadness in my chest today.' },
  { label: 'Depressed', phrase: 'I feel depressed, dark, and like getting up is hard.' },
  { label: 'Anxious', phrase: 'I feel so anxious and my thoughts will not stop racing.' },
  { label: 'Overwhelmed', phrase: "I'm overwhelmed by life, expectations, and pressure." },
  { label: 'Heartbroken', phrase: 'My heart is broken from loss and disappointment.' },
  { label: 'Exhausted', phrase: 'I am completely exhausted, burnt out, and running on empty.' },
  { label: 'Grateful', phrase: 'I feel a quiet gratitude and want words of peace.' },
];

const SPEECH_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect', nativeLabel: 'All Languages' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu' },
  { code: 'fa', label: 'Persian', nativeLabel: 'فارسی' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska' },
  { code: 'tl', label: 'Tagalog / Filipino', nativeLabel: 'Tagalog' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська' },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'ro', label: 'Romanian', nativeLabel: 'Română' },
  { code: 'cs', label: 'Czech', nativeLabel: 'Čeština' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar' },
  { code: 'fi', label: 'Finnish', nativeLabel: 'Suomi' },
  { code: 'da', label: 'Danish', nativeLabel: 'Dansk' },
  { code: 'no', label: 'Norwegian', nativeLabel: 'Norsk' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili' },
];

const CALM_MESSAGES = [
  "Listening to what you're carrying...",
  'Reflecting across sacred traditions...',
  'Drawing comforting words for you...',
];

export function FeelingPromptModal({ visible, onSubmit, onClose }: FeelingPromptModalProps) {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [text, setText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState<string>('auto');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const submittedThisPress = useRef(false);

  const selectedLanguageObj =
    SPEECH_LANGUAGES.find((l) => l.code === speechLanguage) ?? SPEECH_LANGUAGES[0];

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SPEECH_LANGUAGES;
    return SPEECH_LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  useEffect(() => {
    if (visible) {
      setText('');
      setSelectedPreset(null);
      setIsPickerOpen(false);
      setSearchQuery('');
      setIsRecording(false);
      setIsTranscribing(false);
      setIsSubmitting(false);
      submittedThisPress.current = false;
    }
  }, [visible]);

  // Rotate calming messages while submitting
  useEffect(() => {
    if (!isSubmitting) return;
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CALM_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [isSubmitting]);

  const handleSelectPreset = (preset: (typeof PRESETS)[number]) => {
    setIsPickerOpen(false);
    setSelectedPreset(preset.label);
    if (!text.trim() || PRESETS.some((p) => p.phrase === text.trim())) {
      setText(preset.phrase);
    } else {
      setText((prev) => `${prev.trim()}\n${preset.phrase}`);
    }
  };

  const handleToggleRecord = async () => {
    setIsPickerOpen(false);
    if (isTranscribing || isSubmitting) return;

    if (isRecording) {
      // Stop recording and transcribe
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        await recorder.stop();
        if (recorder.uri) {
          const transcribed = await transcribeAudioUri(recorder.uri, speechLanguage);
          if (transcribed) {
            setText((prev) => (prev.trim() ? `${prev.trim()} ${transcribed}` : transcribed));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not transcribe speech.';
        Alert.alert('Voice Reflection', msg);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Microphone access',
            'Please grant microphone permission to record your voice reflection.',
          );
          return;
        }
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start recording.';
        Alert.alert('Recording error', msg);
      }
    }
  };

  const canSubmit = text.trim().length > 0 && !isRecording && !isTranscribing && !isSubmitting;

  const handleFormSubmit = async () => {
    if (!canSubmit || submittedThisPress.current) return;
    submittedThisPress.current = true;
    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      // Translate to English in background if non-English so scripture matcher understands deeply
      const englishText = await translateToEnglishIfNeeded(text);
      // Wait at least one second so the user experiences the calming reflection spinner
      await new Promise((resolve) => setTimeout(resolve, 1200));
      onSubmit(englishText || text.trim());
    } catch {
      onSubmit(text.trim());
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (isPickerOpen) {
          setIsPickerOpen(false);
          setSearchQuery('');
        } else {
          onClose();
        }
      }}
    >
      <View
        style={[
          styles.fullScreen,
          {
            backgroundColor: colors.libraryBackground,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          {/* Top navigation row */}
          <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin }]}>
            <Pressable onPress={onClose} hitSlop={12} style={styles.backButton}>
              <ChevronLeftIcon color={colors.ink} size={22} />
            </Pressable>
            <View style={[styles.badge, { backgroundColor: `${colors.flameAmber}20`, borderRadius: radius.pill }]}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber, fontSize: 10, fontWeight: '700' }]}>
                REFLECTION
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.backButton}>
              <CloseIcon color={colors.fawn} size={18} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: layout.screenMargin }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Screen Title & Subtitle */}
            <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 24, marginTop: spacing.md }]}>
              What are you feeling?
            </Text>
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.fawn, fontSize: 14, lineHeight: 20, marginTop: spacing.xs, marginBottom: spacing.lg },
              ]}
            >
              Choose a preset below, speak in your native language, or write freely. We&apos;ll find words that comfort you.
            </Text>

            {/* Presets Row */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.xs }]}>
                PRESETS
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={styles.presetsRow}
              >
                {PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.label;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => handleSelectPreset(preset)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? colors.flameAmber : colors.card,
                          borderColor: isSelected ? colors.flameAmber : colors.hairline,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.uiRowTitle,
                          {
                            color: isSelected ? colors.primaryDark : colors.ink,
                            fontSize: 13,
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Chatbox Container */}
            <View
              style={[
                styles.chatboxCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isRecording ? colors.flameAmber : colors.hairline,
                  borderRadius: radius.card,
                },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={(newVal) => {
                  setText(newVal);
                  setSelectedPreset(null);
                }}
                onFocus={() => setIsPickerOpen(false)}
                placeholder="Speak or write what you're carrying... (any language)"
                placeholderTextColor={colors.fawn}
                multiline
                style={[
                  typography.readingBody,
                  styles.chatInput,
                  {
                    color: colors.ink,
                    fontSize: 16,
                    lineHeight: 24,
                  },
                ]}
              />

              {/* Chatbox action toolbar */}
              <View style={[styles.chatToolbar, { borderTopColor: colors.hairline }]}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  {isRecording ? (
                    <View style={styles.recordingStatus}>
                      <View style={[styles.redDot, { backgroundColor: colors.flameAmber }]} />
                      <Text style={[typography.metadataCaption, { color: colors.flameAmber, fontWeight: '600' }]}>
                        Recording... tap square to finish
                      </Text>
                    </View>
                  ) : isTranscribing ? (
                    <View style={styles.recordingStatus}>
                      <ActivityIndicator size="small" color={colors.flameAmber} />
                      <Text style={[typography.metadataCaption, { color: colors.fawn, marginLeft: 6 }]}>
                        Transcribing your words...
                      </Text>
                    </View>
                  ) : text.length > 0 ? (
                    <Pressable onPress={() => setText('')} hitSlop={8}>
                      <Text style={[typography.metadataCaption, { color: colors.straw }]}>Clear</Text>
                    </Pressable>
                  ) : (
                    <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                      Tap mic to speak
                    </Text>
                  )}
                </View>

                {/* Microphone / Stop Button */}
                <Pressable
                  onPress={handleToggleRecord}
                  disabled={isTranscribing || isSubmitting}
                  style={[
                    styles.micButton,
                    {
                      backgroundColor: isRecording ? colors.flameAmber : colors.segmentedTrack,
                      borderColor: isRecording ? colors.flameAmber : colors.hairline,
                    },
                  ]}
                  accessibilityLabel={isRecording ? 'Stop recording' : 'Start speaking'}
                >
                  {isRecording ? (
                    <StopIcon color={colors.primaryDark} size={16} />
                  ) : (
                    <MicrophoneIcon color={colors.ink} size={20} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Voice Input Language Dropdown */}
            <View style={{ marginTop: spacing.md }}>
              <View style={styles.dropdownHeaderRow}>
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, fontSize: 11 }]}>
                  VOICE INPUT LANGUAGE
                </Text>
                <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 11 }]}>
                  {speechLanguage === 'auto' ? 'Auto-detecting' : 'Locked'}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setIsPickerOpen(true);
                }}
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.hairline,
                    borderRadius: radius.card,
                    marginTop: spacing.xs,
                  },
                ]}
                accessibilityLabel="Select voice language"
              >
                <View style={styles.dropdownTriggerLeft}>
                  <TranslateIcon color={colors.flameAmber} size={18} />
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 14, marginLeft: 10 }]}>
                    {selectedLanguageObj.label}
                  </Text>
                  <Text style={[typography.metadataCaption, { color: colors.fawn, fontSize: 12, marginLeft: 6 }]}>
                    ({selectedLanguageObj.nativeLabel})
                  </Text>
                </View>
                <ChevronDownIcon color={colors.fawn} size={16} />
              </Pressable>
            </View>

            {/* Submit button */}
            <Pressable
              disabled={!canSubmit}
              onPress={handleFormSubmit}
              style={[
                styles.submitButton,
                {
                  backgroundColor: canSubmit ? colors.flameAmber : colors.hairline,
                  borderRadius: radius.pill,
                  marginTop: spacing.xl,
                },
              ]}
            >
              <Text
                style={[
                  typography.uiRowTitle,
                  {
                    color: canSubmit ? colors.primaryDark : colors.fawn,
                    fontSize: 15,
                  },
                ]}
              >
                Draw comforting verses ➔
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Full-screen Voice Language Picker Overlay with pinned top search bar */}
        {isPickerOpen ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.pickerOverlay,
              {
                backgroundColor: colors.libraryBackground,
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            <View style={[styles.pickerHeader, { paddingHorizontal: layout.screenMargin }]}>
              <Text style={[typography.screenTitle, { color: colors.ink, fontSize: 20 }]}>
                Voice language
              </Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setIsPickerOpen(false);
                  setSearchQuery('');
                }}
                hitSlop={12}
                style={styles.backButton}
              >
                <CloseIcon color={colors.fawn} size={18} />
              </Pressable>
            </View>

            {/* Pinned search input at top — completely above keyboard */}
            <View
              style={[
                styles.pickerSearchBar,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderRadius: radius.pill,
                  marginHorizontal: layout.screenMargin,
                  marginTop: spacing.md,
                },
              ]}
            >
              <SearchIcon color={colors.fawn} size={16} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search languages..."
                placeholderTextColor={colors.fawn}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
                style={[typography.uiRowTitle, styles.pickerSearchInput, { color: colors.ink }]}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.clearSearchBtn}>
                  <CloseIcon color={colors.fawn} size={14} />
                </Pressable>
              ) : null}
            </View>

            {filteredLanguages.length === 0 ? (
              <Text
                style={[
                  typography.metadataCaption,
                  {
                    color: colors.fawn,
                    textAlign: 'center',
                    marginTop: spacing.xl,
                    paddingHorizontal: spacing.xl,
                  },
                ]}
              >
                No languages match &ldquo;{searchQuery.trim()}&rdquo;
              </Text>
            ) : (
              <FlatList
                data={filteredLanguages}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={{ flex: 1, marginTop: spacing.sm }}
                contentContainerStyle={{
                  paddingHorizontal: layout.screenMargin,
                  paddingBottom: 24,
                }}
                renderItem={({ item }) => {
                  const isSelected = item.code === speechLanguage;
                  return (
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setSpeechLanguage(item.code);
                        setIsPickerOpen(false);
                        setSearchQuery('');
                      }}
                      style={[
                        styles.pickerItem,
                        { borderBottomWidth: 1, borderBottomColor: colors.hairline },
                        isSelected && {
                          backgroundColor: `${colors.flameAmber}15`,
                          borderRadius: radius.card,
                        },
                      ]}
                    >
                      <View style={styles.dropdownItemLeft}>
                        <Text
                          style={[
                            typography.uiRowTitle,
                            {
                              color: isSelected ? colors.flameAmber : colors.ink,
                              fontSize: 15,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            typography.metadataCaption,
                            {
                              color: isSelected ? colors.flameAmber : colors.fawn,
                              fontSize: 13,
                              marginLeft: 8,
                            },
                          ]}
                        >
                          {item.nativeLabel}
                        </Text>
                      </View>
                      {isSelected ? <CheckIcon color={colors.flameAmber} size={16} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        ) : null}

        {/* Calming submission overlay with rotating messages */}
        {isSubmitting ? (
          <View style={[StyleSheet.absoluteFill, styles.submittingOverlay, { backgroundColor: colors.libraryBackground }]}>
            <ActivityIndicator size="large" color={colors.flameAmber} />
            <Text
              style={[
                typography.screenTitle,
                { color: colors.ink, fontSize: 18, marginTop: spacing.lg, textAlign: 'center' },
              ]}
            >
              {CALM_MESSAGES[messageIndex]}
            </Text>
            <Text
              style={[
                typography.metadataCaption,
                { color: colors.fawn, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: 32 },
              ]}
            >
              Finding comforting words across scriptures for you
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  backButton: {
    padding: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerOverlay: {
    zIndex: 50,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    padding: 0,
    fontSize: 15,
  },
  clearSearchBtn: {
    padding: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatboxCard: {
    borderWidth: 1,
    padding: 14,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  chatInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  chatToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
});
