import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, ChevronLeftIcon } from '@/components/icons';
import type { Shelf } from '@/db/repositories/shelves';
import { useTheme } from '@/theme/ThemeProvider';

type AddToShelfSheetProps = {
  visible: boolean;
  shelves: Shelf[];
  memberShelfIds: Set<string>;
  onToggle: (shelf: Shelf) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
};

export function AddToShelfSheet({ visible, shelves, memberShelfIds, onToggle, onCreate, onClose }: AddToShelfSheetProps) {
  const { colors, typography, spacing, radius, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const close = () => {
    setCreating(false);
    setName('');
    onClose();
  };

  const fireCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setCreating(false);
    setName('');
  };

  // No shelves yet -> the picker list would be empty, so skip straight to the
  // form instead of a dead-end "no shelves" message plus an extra tap.
  const hasShelves = shelves.length > 0;
  const showForm = creating || !hasShelves;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View style={[styles.root, { backgroundColor: colors.parchment }]}>
        <View style={[styles.topRow, { paddingHorizontal: layout.screenMargin, paddingTop: insets.top + 16 }]}>
          <Pressable onPress={close} hitSlop={12}>
            <ChevronLeftIcon color={colors.ink} />
          </Pressable>
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16, marginLeft: spacing.md }]}>
            Add to shelf
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingHorizontal: layout.screenMargin, paddingTop: spacing.lg, paddingBottom: keyboardHeight + insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hasShelves
            ? shelves.map((shelf) => {
                const on = memberShelfIds.has(shelf.id);
                return (
                  <Pressable
                    key={shelf.id}
                    onPress={() => onToggle(shelf)}
                    style={[styles.row, on && { backgroundColor: colors.pairPillBackground, borderRadius: radius.card }]}
                  >
                    <Text style={[typography.uiRowTitle, { color: on ? colors.pairPillText : colors.ink, fontSize: 15 }]}>
                      {shelf.name}
                    </Text>
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
              })
            : null}

          {hasShelves && !creating ? (
            <Pressable
              onPress={() => setCreating(true)}
              style={[styles.newShelf, { borderColor: colors.straw, borderRadius: radius.card, marginTop: spacing.md }]}
            >
              <Text style={[typography.uiRowTitle, { color: colors.umber, fontSize: 13 }]}>+ New shelf</Text>
            </Pressable>
          ) : null}

          {showForm ? (
            <View style={{ marginTop: hasShelves ? spacing.xl : 0 }}>
              <View style={styles.formHeader}>
                <Text style={[typography.metadataCaption, { color: colors.fawn }]}>
                  {hasShelves ? 'New shelf' : 'Give your first shelf a name.'}
                </Text>
                {hasShelves ? (
                  <Pressable onPress={() => { setCreating(false); setName(''); }} hitSlop={8}>
                    <Text style={[typography.uiRowTitle, { color: colors.progressLabel, fontSize: 12 }]}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Shelf name (e.g. Classics, To read)"
                placeholderTextColor={colors.fawn}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={fireCreate}
                style={[
                  typography.uiRowTitle,
                  styles.nameInput,
                  { color: colors.ink, backgroundColor: colors.segmentedTrack, borderColor: colors.hairline, borderRadius: radius.pill, marginTop: spacing.sm },
                ]}
              />
              <Pressable
                disabled={!name.trim()}
                onPress={fireCreate}
                style={[
                  styles.createButton,
                  { backgroundColor: name.trim() ? colors.flameAmber : colors.hairline, borderRadius: radius.pill, marginTop: spacing.md },
                ]}
              >
                <Text style={[typography.uiRowTitle, { color: name.trim() ? colors.primaryDark : colors.fawn, fontSize: 13 }]}>
                  Create shelf
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
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
  newShelf: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 15,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  createButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
