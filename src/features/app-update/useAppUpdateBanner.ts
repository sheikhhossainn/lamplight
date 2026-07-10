import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';

// Silently checks for an EAS Update on launch, downloads it in the
// background, and only surfaces anything once it's fully ready to apply —
// so the banner means "restart now for the update", never "downloading,
// wait". Updates.isEnabled is false in Expo Go / a dev client (no update
// channel configured there), so this is a no-op outside a real EAS build.
export function useAppUpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || cancelled) return;
        await Updates.fetchUpdateAsync();
        if (!cancelled) setUpdateReady(true);
      } catch {
        // Offline, or the check failed — silently skip; the next launch
        // tries again on its own, no need to surface a transient error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    Updates.reloadAsync();
  }, []);

  return { updateReady, applyUpdate };
}
