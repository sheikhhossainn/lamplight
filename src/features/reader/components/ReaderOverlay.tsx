import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type ReaderOverlayVariant = 'bottomSheet' | 'centerDialog' | 'fullscreen';

export type ReaderOverlayContextValue = {
  requestClose: () => void;
};

export const ReaderOverlayContext = createContext<ReaderOverlayContextValue>({
  requestClose: () => {},
});

export const useReaderOverlay = () => useContext(ReaderOverlayContext);

export type ReaderOverlayProps = {
  visible: boolean;
  onClosed: () => void;
  variant?: ReaderOverlayVariant;
  children: React.ReactNode | ((context: { requestClose: () => void }) => React.ReactNode);
};

const SHEET_ENTRY_DURATION = 220;
const SHEET_EXIT_DURATION = 180;
const DIALOG_ENTRY_DURATION = 180;
const DIALOG_EXIT_DURATION = 150;

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);

export function ReaderOverlay({
  visible,
  onClosed,
  variant = 'bottomSheet',
  children,
}: ReaderOverlayProps) {
  const { height: windowHeight } = useWindowDimensions();
  const screenHeight = windowHeight || 800;

  const [mounted, setMounted] = useState(visible);
  const [isInteractive, setIsInteractive] = useState(true);
  const isClosingRef = useRef(false);
  const transitionIdRef = useRef(0);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  // Shared animation values
  const backdropOpacity = useSharedValue(0);
  const sheetY = useSharedValue(screenHeight);
  const dialogOpacity = useSharedValue(0);
  const dialogScale = useSharedValue(0.98);
  const fullscreenY = useSharedValue(screenHeight);

  const cancelOverlayAnimations = useCallback(() => {
    cancelAnimation(backdropOpacity);
    cancelAnimation(sheetY);
    cancelAnimation(dialogOpacity);
    cancelAnimation(dialogScale);
    cancelAnimation(fullscreenY);
  }, [backdropOpacity, sheetY, dialogOpacity, dialogScale, fullscreenY]);

  const handleAnimationEnd = useCallback((transitionId: number) => {
    if (transitionId !== transitionIdRef.current) return;
    setMounted(false);
    isClosingRef.current = false;
    onClosedRef.current();
  }, []);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsInteractive(false);
    Keyboard.dismiss();
    const transitionId = ++transitionIdRef.current;
    cancelOverlayAnimations();

    if (variant === 'bottomSheet') {
      backdropOpacity.value = withTiming(0, {
        duration: SHEET_EXIT_DURATION,
        easing: EASE_IN,
        reduceMotion: ReduceMotion.System,
      });
      sheetY.value = withTiming(
        screenHeight,
        {
          duration: SHEET_EXIT_DURATION,
          easing: EASE_IN,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleAnimationEnd)(transitionId);
          }
        },
      );
    } else if (variant === 'centerDialog') {
      backdropOpacity.value = withTiming(0, {
        duration: DIALOG_EXIT_DURATION,
        easing: EASE_IN,
        reduceMotion: ReduceMotion.System,
      });
      dialogScale.value = withTiming(0.98, {
        duration: DIALOG_EXIT_DURATION,
        easing: EASE_IN,
        reduceMotion: ReduceMotion.System,
      });
      dialogOpacity.value = withTiming(
        0,
        {
          duration: DIALOG_EXIT_DURATION,
          easing: EASE_IN,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleAnimationEnd)(transitionId);
          }
        },
      );
    } else {
      // Fullscreen
      fullscreenY.value = withTiming(
        screenHeight,
        {
          duration: SHEET_EXIT_DURATION,
          easing: EASE_IN,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleAnimationEnd)(transitionId);
          }
        },
      );
    }
  }, [
    variant,
    screenHeight,
    backdropOpacity,
    sheetY,
    dialogOpacity,
    dialogScale,
    fullscreenY,
    cancelOverlayAnimations,
    handleAnimationEnd,
  ]);

  useEffect(() => {
    if (visible) {
      transitionIdRef.current += 1;
      cancelOverlayAnimations();
      setMounted(true);
      setIsInteractive(true);
      isClosingRef.current = false;

      if (variant === 'bottomSheet') {
        backdropOpacity.value = 0;
        sheetY.value = screenHeight;
        backdropOpacity.value = withTiming(1, {
          duration: SHEET_ENTRY_DURATION,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        });
        sheetY.value = withTiming(0, {
          duration: SHEET_ENTRY_DURATION,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        });
      } else if (variant === 'centerDialog') {
        backdropOpacity.value = 0;
        dialogOpacity.value = 0;
        dialogScale.value = 0.98;
        backdropOpacity.value = withTiming(1, {
          duration: DIALOG_ENTRY_DURATION,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        });
        dialogOpacity.value = withTiming(1, {
          duration: DIALOG_ENTRY_DURATION,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        });
        dialogScale.value = withTiming(1, {
          duration: DIALOG_ENTRY_DURATION,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        });
      } else {
        // Fullscreen
        fullscreenY.value = screenHeight;
        fullscreenY.value = withTiming(0, {
          duration: SHEET_ENTRY_DURATION,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        });
      }
    } else if (mounted && !isClosingRef.current) {
      requestClose();
    }
  }, [
    visible,
    mounted,
    variant,
    screenHeight,
    backdropOpacity,
    sheetY,
    dialogOpacity,
    dialogScale,
    fullscreenY,
    cancelOverlayAnimations,
    requestClose,
  ]);

  useEffect(() => () => {
    transitionIdRef.current += 1;
    cancelOverlayAnimations();
  }, [cancelOverlayAnimations]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const animatedDialogStyle = useAnimatedStyle(() => ({
    opacity: dialogOpacity.value,
    transform: [{ scale: dialogScale.value }],
  }));

  const animatedFullscreenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: fullscreenY.value }],
  }));

  if (!mounted) return null;

  const renderedContent =
    typeof children === 'function' ? children({ requestClose }) : children;

  return (
    <ReaderOverlayContext.Provider value={{ requestClose }}>
      <Modal
        visible={mounted}
        transparent={variant !== 'fullscreen'}
        animationType="none"
        statusBarTranslucent
        onRequestClose={requestClose}
      >
        {variant === 'bottomSheet' && (
          <View
            style={styles.bottomSheetRoot}
            pointerEvents={isInteractive ? 'auto' : 'none'}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.sheetBackdrop,
                animatedBackdropStyle,
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
            </Animated.View>
            <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
              {renderedContent}
            </Animated.View>
          </View>
        )}

        {variant === 'centerDialog' && (
          <View
            style={styles.dialogRoot}
            pointerEvents={isInteractive ? 'auto' : 'none'}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.dialogBackdrop,
                animatedBackdropStyle,
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
            </Animated.View>
            <Animated.View style={[styles.dialogContainer, animatedDialogStyle]}>
              {renderedContent}
            </Animated.View>
          </View>
        )}

        {variant === 'fullscreen' && (
          <View
            style={styles.fullscreenRoot}
            pointerEvents={isInteractive ? 'auto' : 'none'}
          >
            <Animated.View style={[styles.fullscreenContainer, animatedFullscreenStyle]}>
              {renderedContent}
            </Animated.View>
          </View>
        )}
      </Modal>
    </ReaderOverlayContext.Provider>
  );
}

const styles = StyleSheet.create({
  bottomSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(28, 27, 30, 0.52)',
  },
  sheetContainer: {
    width: '100%',
  },
  dialogRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  dialogContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenRoot: {
    flex: 1,
  },
  fullscreenContainer: {
    flex: 1,
  },
});
