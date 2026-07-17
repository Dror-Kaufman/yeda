import { Platform } from 'react-native';

/**
 * Cross-platform prompt that works on web (react-native-web).
 *
 * `Alert.prompt` is iOS-only and throws on web. This wrapper uses
 * `window.prompt` on web and logs a warning on native (Phase 3 will
 * add native prompt support).
 *
 * Matches the signature pattern used by Alert.prompt:
 *   showPrompt(title, message, callback, defaultValue?)
 *
 * @param title - Dialog title
 * @param message - Dialog message/placeholder
 * @param callback - Called with the entered text (empty string if cancelled)
 * @param defaultValue - Optional pre-filled value
 */
export function showPrompt(
  title: string,
  message: string,
  callback: (text: string) => void,
  defaultValue?: string,
): void {
  if (Platform.OS === 'web') {
    // Use setTimeout to defer window.prompt out of the current call stack.
    // window.prompt is synchronous and blocks the JS thread, which prevents
    // Playwright from detecting that a click action completed.
    setTimeout(() => {
      const result = window.prompt(`${title}\n${message}`, defaultValue ?? '');
      if (result !== null) {
        callback(result);
      }
    }, 0);
  } else {
    // iOS-only: Alert.prompt is not available on Android or other platforms.
    // Phase 3 will add a proper native modal for this.
    console.warn('showPrompt is not supported on this platform yet.');
  }
}
