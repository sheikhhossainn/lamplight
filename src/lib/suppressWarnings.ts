import { LogBox } from 'react-native';

const IGNORED_WARNINGS = [
  'ProgressBarAndroid has been extracted',
  'SafeAreaView has been deprecated',
  'Clipboard has been extracted',
  'InteractionManager has been deprecated',
  'PushNotificationIOS has been extracted',
];

LogBox.ignoreLogs(IGNORED_WARNINGS);

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (IGNORED_WARNINGS.some((pattern) => message.includes(pattern))) {
    return;
  }
  originalWarn(...args);
};
