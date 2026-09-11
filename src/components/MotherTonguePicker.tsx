import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import {
  MOTHER_TONGUES,
  type MotherTongueCode,
  type MotherTongueOption,
} from '@/features/settings/motherTongue';
import { useTheme } from '@/theme/ThemeProvider';

type MotherTonguePickerProps = {
  visible: boolean;
  selected: MotherTongueCode;
  onSelect: (code: MotherTongueCode) => void;
  onClose: () => void;
};

export function MotherTonguePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: MotherTonguePickerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { backgroundColor: colors.parchment, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
          <View>
            <Text style={[typography.screenTitle, { color: colors.ink }]}>Mother Tongue</Text>
            <Text style={[typography.metadataCaption, { color: colors.fawn, marginTop: 4 }]}>
              Curates your native literature shelf and bilingual lookups
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <CloseIcon color={colors.ink} size={18} />
          </Pressable>
        </View>

        <View style={[styles.list, { paddingHorizontal: spacing.xl, marginTop: spacing.xl }]}>
          {MOTHER_TONGUES.map((opt: MotherTongueOption) => {
            const isSelected = selected === opt.code;
            return (
              <Pressable
                key={opt.code}
                onPress={() => {
                  onSelect(opt.code);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.flameAmber : colors.hairline,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderRadius: radius.card,
                    padding: spacing.md,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={styles.flag}>{opt.flag}</Text>
                <View style={styles.cardInfo}>
                  <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>
                    {opt.nativeName}{' '}
                    <Text style={{ color: colors.fawn, fontSize: 13, fontWeight: '400' }}>
                      ({opt.name})
                    </Text>
                  </Text>
                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.flameAmber, fontSize: 12, marginTop: 2 },
                    ]}
                  >
                    {opt.sourceName}
                  </Text>
                  <Text
                    style={[
                      typography.metadataCaption,
                      { color: colors.umber, fontSize: 11, marginTop: 2 },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.sampleAuthors}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? colors.flameAmber : colors.straw,
                      backgroundColor: isSelected ? colors.flameAmber : 'transparent',
                    },
                  ]}
                >
                  {isSelected ? <CheckIcon color={colors.primaryDark} size={11} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 26,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
