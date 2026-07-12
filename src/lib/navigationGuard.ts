import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';

// A fast double-tap on a list row fires onPress twice before the first
// router.push unmounts the pressable, pushing the destination screen twice —
// back then has to be tapped twice to actually leave. This locks after the
// first push and only unlocks once this screen is focused again (i.e. the
// user has navigated back to it), so genuine re-navigation still works.
export function useGuardedPush() {
  const lockedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      lockedRef.current = false;
    }, []),
  );

  return useCallback((...args: Parameters<typeof router.push>) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    router.push(...args);
  }, []);
}
