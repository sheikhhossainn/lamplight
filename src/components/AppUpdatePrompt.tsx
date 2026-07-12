import { usePathname } from 'expo-router';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAppUpdateBanner } from '@/features/app-update/useAppUpdateBanner';

// Global, rendered once at the app root (see _layout.tsx).
//
// Only 'ready' surfaces here, and only outside the reader. The other states are
// deliberately silent: checking and downloading happen on every cold launch,
// need nothing from the reader, and a top banner announcing them just covers
// content; a failed check is about something they never asked for and can't
// fix. Those all live in Settings' update row instead, where someone who wants
// to know goes to look. 'ready' is the one state that's an actual decision.
export function AppUpdatePrompt() {
  const { status, applyUpdate } = useAppUpdateBanner();
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // Never interrupt reading — a modal asking to restart mid-page is the worst
  // moment to ask. The pending update keeps; it re-offers on the next screen.
  const inReader = pathname.startsWith('/reader');

  return (
    <ConfirmDialog
      visible={status === 'ready' && !dismissed && !inReader}
      title="Update ready"
      message="Restart Lamplight to install the latest version."
      confirmLabel="Restart now"
      cancelLabel="Later"
      onConfirm={applyUpdate}
      onCancel={() => setDismissed(true)}
    />
  );
}
