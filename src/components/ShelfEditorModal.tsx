import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { BookRow } from '@/db/repositories/books';
import { useTheme } from '@/theme/ThemeProvider';

const SCREEN_H = Dimensions.get('window').height;
const LIST_MAX_HEIGHT = SCREEN_H * 0.5;
const SHEET_CHROME_H = 210;

export type ShelfDraft = { id: string; name: string; bookIds: string[] } | null;

type ShelfEditorModalProps = {
  visible: boolean;
  // null = creating a new shelf; otherwise editing an existing one.
  draft: ShelfDraft;
  books: BookRow[];
  onSave: (name: string, bookIds: string[]) => void;
  onDelete?: () => void;
  onClose: () => void;
};

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
      <Path d="M4 10.5l4 4 8-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ShelfEditorModal({ visible, draft, books, onSave, onDelete, onClose }: ShelfEditorModalProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Seed the fields whenever the sheet (re)opens.
  useEffect(() => {
    if (visible) {
      setName(draft?.name ?? '');
      setSelected(new Set(draft?.bookIds ?? []));
    }
  }, [visible, draft]);

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

  const toggle = (bookId: string) => {
    // Any interaction below the name field means typing is over — close the
    // keyboard here so by the time Create is tapped the sheet is stable
    // (a tap while the keyboard is up gets eaten by its dismissal on Android).
    Keyboard.dismiss();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const canSave = name.trim().length > 0;
  // One save per press-gesture, whichever of onPressIn/onPress fires first.
  const savedThisPress = useRef(false);
  const fireSave = () => {
    if (!canSave || savedThisPress.current) return;
    savedThisPress.current = true;
    onSave(name.trim(), Array.from(selected));
  };
  const listMaxHeight = Math.max(
    120,
    Math.min(LIST_MAX_HEIGHT, SCREEN_H - insets.top - keyboardHeight - SHEET_CHROME_H),
  );
  const countLabel = useMemo(() => `${selected.size} book${selected.size === 1 ? '' : 's'}`, [selected]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          // Capture phase: the first touch anywhere on the sheet while the
          // keyboard is up dismisses it (returning false still lets the touch
          // continue to whatever was tapped, e.g. the Create button's
          // onPressIn below).
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

          <View style={styles.headerRow}>
            <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 15 }]}>
              {draft ? 'Edit shelf' : 'New shelf'}
            </Text>
            {draft && onDelete ? (
              <Pressable onPress={onDelete} hitSlop={8}>
                <Text style={[typography.uiRowTitle, { color: colors.highlight.clay, fontSize: 12 }]}>Delete</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Shelf name (e.g. Classics, To read)"
            placeholderTextColor={colors.fawn}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            style={[
              typography.uiRowTitle,
              styles.nameInput,
              { color: colors.ink, backgroundColor: colors.segmentedTrack, borderColor: colors.hairline, borderRadius: radius.pill },
            ]}
          />

          <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>
            Books · {countLabel}
          </Text>

          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={[styles.list, { maxHeight: listMaxHeight }]}
            ListEmptyComponent={
              <Text style={[typography.metadataCaption, { color: colors.fawn, textAlign: 'center', marginTop: spacing.lg }]}>
                No books yet.
              </Text>
            }
            renderItem={({ item }) => {
              const on = selected.has(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={[styles.row, on && { backgroundColor: colors.pairPillBackground, borderRadius: radius.card }]}
                >
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text
                      numberOfLines={1}
                      style={[typography.uiRowTitle, { color: on ? colors.pairPillText : colors.ink, fontSize: 14 }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[typography.metadataCaption, { color: on ? colors.pairPillText : colors.fawn, fontSize: 11, marginTop: 1 }]}
                    >
                      {item.author}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: on ? colors.flameAmber : colors.straw,
                        backgroundColor: on ? colors.flameAmber : 'transparent',
                      },
                    ]}
                  >
                    {on ? <CheckIcon color={colors.primaryDark} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />

          <Pressable
            disabled={!canSave}
            // While the keyboard is up, save on touch-DOWN: the tap that
            // dismisses the keyboard shifts the sheet mid-gesture, so the
            // release lands outside the button and a plain onPress gets
            // cancelled — that's why creating used to take two taps.
            onPressIn={() => {
              savedThisPress.current = false;
              if (keyboardHeight > 0) fireSave();
            }}
            onPress={fireSave}
            style={[
              styles.saveButton,
              { backgroundColor: canSave ? colors.flameAmber : colors.hairline, borderRadius: radius.pill },
            ]}
          >
            <Text style={[typography.uiRowTitle, { color: canSave ? colors.primaryDark : colors.fawn, fontSize: 13 }]}>
              {draft ? 'Save shelf' : 'Create shelf'}
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
    maxHeight: '86%',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nameInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    // Vertical gap so adjacent selected rows' rounded highlight boxes don't
    // touch and read as one merged/overlapping shape.
    marginVertical: 3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
