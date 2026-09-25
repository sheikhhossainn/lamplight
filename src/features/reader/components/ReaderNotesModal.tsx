import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, TrashIcon } from '@/components/icons';
import { ReaderOverlay } from '@/features/reader/components/ReaderOverlay';
import type { ReaderNote } from '@/db/repositories/readerNotes';
import { useTheme } from '@/theme/ThemeProvider';

type ReaderNotesModalProps = {
  visible: boolean;
  notes: ReaderNote[];
  currentChapterTitle: string;
  currentChapterIndex: number;
  currentPageIndex: number;
  onSave: (noteText: string) => void;
  onEdit: (id: string, noteText: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onClose: () => void;
};

export function ReaderNotesModal({
  visible,
  notes,
  currentChapterTitle,
  currentChapterIndex,
  currentPageIndex,
  onSave,
  onEdit,
  onDelete,
  onExport,
  onClose,
}: ReaderNotesModalProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft('');
      setEditingNoteId(null);
      setEditingDraft('');
    }
  }, [visible]);

  return (
    <ReaderOverlay visible={visible} onClosed={onClose} variant="bottomSheet">
      {({ requestClose }) => (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          <View style={styles.grabber}>
            <View style={[styles.grabberBar, { backgroundColor: colors.hairline }]} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[typography.uiRowTitle, styles.title, { color: colors.ink }]}>Private notes</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn }]}>Saved only on this device</Text>
            </View>
            <Pressable onPress={onExport} accessibilityRole="button" accessibilityLabel="Export notes" hitSlop={8} style={styles.exportButton}>
              <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 12 }]}>Export</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close notes"
              hitSlop={12}
              onPress={requestClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.55 }]}
            >
              <CloseIcon color={colors.fawn} size={17} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.sm }}
          >
            <View style={[styles.composer, { backgroundColor: colors.parchment, borderColor: colors.hairline, borderRadius: radius.card }]}>
              <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>Note on {currentChapterTitle}</Text>
              <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 3 }]}>Page {currentPageIndex + 1}</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="What do you want to remember?"
                placeholderTextColor={colors.fawn}
                selectionColor={colors.flameAmber}
                multiline
                textAlignVertical="top"
                style={[typography.uiRowTitle, styles.input, { color: colors.ink, borderColor: colors.hairline, backgroundColor: colors.card, borderRadius: radius.card }]}
                accessibilityLabel="New private note"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save note"
                disabled={!draft.trim()}
                onPress={() => {
                  onSave(draft);
                  setDraft('');
                }}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.flameAmber, borderRadius: radius.pill, opacity: draft.trim() ? (pressed ? 0.75 : 1) : 0.45 },
                ]}
              >
                <Text style={[typography.buttonLabel, { color: colors.primaryDark }]}>Save note</Text>
              </Pressable>
            </View>

            {notes.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[typography.eyebrowLabel, { color: colors.fawn, marginBottom: spacing.sm }]}>Saved notes</Text>
                {notes.map((note) => (
                  <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.parchment, borderColor: colors.hairline, borderRadius: radius.card }]}>
                    <View style={styles.noteMeta}>
                      <Text style={[typography.eyebrowLabel, { color: colors.flameAmber }]}>
                        Chapter {note.chapterIndex + 1} · Page {note.pageIndex + 1}
                      </Text>
                      <View style={styles.noteActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Edit note"
                          hitSlop={8}
                          onPress={() => {
                            setEditingNoteId(note.id);
                            setEditingDraft(note.noteText);
                          }}
                        >
                          <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 12 }]}>Edit</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete note"
                          hitSlop={8}
                          onPress={() => onDelete(note.id)}
                        >
                          <TrashIcon color={colors.fawn} size={15} />
                        </Pressable>
                      </View>
                    </View>
                    {editingNoteId === note.id ? (
                      <>
                        <TextInput
                          value={editingDraft}
                          onChangeText={setEditingDraft}
                          multiline
                          textAlignVertical="top"
                          selectionColor={colors.flameAmber}
                          style={[typography.metadataCaption, styles.editInput, { color: colors.ink, backgroundColor: colors.card, borderColor: colors.hairline, borderRadius: radius.card }]}
                          accessibilityLabel="Edit private note"
                        />
                        <View style={styles.editActions}>
                          <Pressable onPress={() => setEditingNoteId(null)} hitSlop={6}>
                            <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 12 }]}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              if (!editingDraft.trim()) return;
                              onEdit(note.id, editingDraft);
                              setEditingNoteId(null);
                            }}
                            disabled={!editingDraft.trim()}
                            hitSlop={6}
                          >
                            <Text style={[typography.buttonLabel, { color: colors.flameAmber, fontSize: 12, opacity: editingDraft.trim() ? 1 : 0.45 }]}>Save</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <Text style={[typography.metadataCaption, styles.noteText, { color: colors.umber }]}>{note.noteText}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}
    </ReaderOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  grabber: {
    alignItems: 'center',
    marginBottom: 14,
  },
  grabberBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 6,
    marginTop: 1,
  },
  exportButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 2,
  },
  composer: {
    borderWidth: 1,
    padding: 13,
  },
  input: {
    minHeight: 82,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginTop: 10,
  },
  saveButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  noteCard: {
    borderWidth: 1,
    padding: 13,
    marginBottom: 8,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editInput: {
    minHeight: 76,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
  },
  noteText: {
    marginTop: 7,
    lineHeight: 19,
  },
});
