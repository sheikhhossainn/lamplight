/**
 * @deprecated Use ScriptureInquiryModal from @/features/scripture-qa/ScriptureInquiryModal instead.
 * Deprecated as part of Feature L-2 (Scripture Cross-Tradition Q&A Interface).
 */
import React from 'react';
import { ScriptureInquiryModal } from '@/features/scripture-qa/ScriptureInquiryModal';

export type FeelingPromptModalProps = {
  visible: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
};

/**
 * @deprecated Redirected to ScriptureInquiryModal. Use ScriptureInquiryModal directly.
 */
export function FeelingPromptModal({ visible, onSubmit, onClose }: FeelingPromptModalProps) {
  return (
    <ScriptureInquiryModal
      visible={visible}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}

export default FeelingPromptModal;
