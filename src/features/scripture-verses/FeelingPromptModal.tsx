import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

type FeelingPromptModalProps = {
  visible: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
};

// Free-text "what are you feeling" prompt — no mood buttons, no typing
// constraints. Sheet chrome mirrors ShelfEditorModal (grabber, keyboard-aware
// bottom padding, disabled-until-valid submit) minus the list, since this is
// a single text field.
export function FeelingPromptModal({ visible, onSubmit, onClose }: FeelingPromptModalProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const submittedThisPress = useRef(false);

  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const canSubmit = text.trim().length > 0;
  const fireSubmit = () => {
    if (!canSubmit || submittedThisPress.current) return;
    submittedThisPress.current = true;
    onSubmit(text.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          onStartShouldSetResponderCapture={() => {
            if (keyboardHeight > 0) Keyboard.dismiss();
            return false;
          }}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15, marginBottom: spacing.xs }]}>
            What are you feeling?
          </Text>
          <Text style={[typography.metadataCaption, { color: colors.fawn, marginBottom: spacing.md }]}>
            A sentence or two is plenty — we&apos;ll find words that fit.
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. I'm anxious about a decision I have to make"
            placeholderTextColor={colors.fawn}
            multiline
            style={[
              typography.readingBody,
              styles.input,
              { color: colors.ink, backgroundColor: colors.segmentedTrack, borderColor: colors.hairline, borderRadius: radius.card, fontSize: 15 },
            ]}
          />

          <Pressable
            disabled={!canSubmit}
            onPressIn={() => {
              submittedThisPress.current = false;
              if (keyboardHeight > 0) fireSubmit();
            }}
            onPress={fireSubmit}
            style={[
              styles.submitButton,
              { backgroundColor: canSubmit ? colors.flameAmber : colors.hairline, borderRadius: radius.pill, marginTop: spacing.lg },
            ]}
          >
            <Text style={[typography.uiRowTitle, { color: canSubmit ? colors.primaryDark : colors.fawn, fontSize: 13 }]}>
              Find verses
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
