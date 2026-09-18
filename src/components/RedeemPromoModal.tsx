import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { redeemPromoCode } from '@/features/subscription/entitlementService';
import { useTheme } from '@/theme/ThemeProvider';

type RedeemPromoModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export function RedeemPromoModal({ visible, onClose, onSuccess }: RedeemPromoModalProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await redeemPromoCode(trimmed);
      if (res.success) {
        setIsError(false);
        setMessage(res.message);
        onSuccess?.(res.message);
        setTimeout(() => {
          onClose();
          setCode('');
          setMessage(null);
        }, 1200);
      } else {
        setIsError(true);
        setMessage(res.message);
      }
    } catch {
      setIsError(true);
      setMessage('Failed to redeem promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setCode('');
    setMessage(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.hairline },
          ]}
          onPress={() => {}}
        >
          <Text style={[typography.uiRowTitle, { color: colors.ink, fontSize: 16 }]}>Redeem promo code</Text>
          <Text style={[typography.metadataCaption, { color: colors.umber, marginTop: spacing.xs, lineHeight: 18 }]}>
            Enter your code below to activate your Lamplight access grant.
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.hairline,
                color: colors.ink,
                backgroundColor: colors.parchment,
                borderRadius: radius.card,
              },
            ]}
            placeholder="Enter promo code"
            placeholderTextColor={colors.straw}
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              if (message) setMessage(null);
            }}
            editable={!loading}
          />

          {message ? (
            <Text
              style={[
                typography.metadataCaption,
                { color: isError ? colors.highlight.clay : colors.flameAmber, marginTop: spacing.sm },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <View style={[styles.actions, { marginTop: spacing.lg }]}>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.action} disabled={loading}>
              <Text style={[typography.buttonLabel, { color: colors.fawn, fontSize: 14 }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleRedeem}
              hitSlop={8}
              style={[
                styles.action,
                styles.redeemBtn,
                { backgroundColor: colors.flameAmber, borderRadius: radius.pill },
              ]}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Text style={[typography.buttonLabel, { color: colors.primaryDark, fontSize: 14 }]}>Redeem</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  redeemBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
