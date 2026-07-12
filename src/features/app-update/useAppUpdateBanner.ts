import * as Updates from 'expo-updates';
import { useCallback } from 'react';

export type AppUpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

// Reads expo-updates' own state machine instead of re-running
// checkForUpdateAsync/fetchUpdateAsync by hand — that used to duplicate the
// native ON_LOAD auto-check and swallow its errors silently, leaving no way
// to tell "no update available" apart from "update check is stuck".
export function useAppUpdateBanner() {
  const { isChecking, isDownloading, isUpdatePending, checkError, downloadError, downloadProgress } =
    Updates.useUpdates();

  const status: AppUpdateStatus = isUpdatePending
    ? 'ready'
    : isDownloading
      ? 'downloading'
      : isChecking
        ? 'checking'
        : checkError || downloadError
          ? 'error'
          : 'idle';

  const applyUpdate = useCallback(() => {
    Updates.reloadAsync();
  }, []);

  return { status, downloadProgress, applyUpdate };
}
