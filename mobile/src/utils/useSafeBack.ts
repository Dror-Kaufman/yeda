import { useCallback } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Returns a safe "go back" handler that:
 * 1. Uses browser history on web (matching browser back button behavior)
 * 2. Uses router.back() on native if there's navigation history
 * 3. Falls back to router.dismissTo(fallback) if there's no history
 *
 * This prevents the "The action 'GO_BACK' was not handled by any navigator" error
 * that occurs when router.back() is called from the first screen in a stack.
 *
 * On web, React Navigation's in-memory stack can be empty (after page refresh or
 * direct URL entry) even when browser history has valid entries. This hook uses
 * window.history.back() on web to match the browser back button exactly.
 *
 * @param fallback - Route to navigate to if there's nothing to go back to.
 *                   If omitted, falls back to router.dismissAll().
 *
 * @example
 * ```tsx
 * const goBack = useSafeBack('/topic/123');
 * <TouchableOpacity onPress={goBack}><Text>Back</Text></TouchableOpacity>
 * ```
 */
export function useSafeBack(fallback?: string) {
  return useCallback(() => {
    if (Platform.OS === 'web') {
      // On web, browser history is the source of truth. After page refresh or
      // direct URL entry, React Navigation's stack may be empty even though
      // browser history has valid entries. Use history.back() to match the
      // browser back button exactly, falling back to the specified route when
      // there's no browser history (fresh tab, bookmark entry).
      if (window.history.length > 1) {
        window.history.back();
      } else if (fallback) {
        router.dismissTo(fallback as any);
      } else {
        router.dismissAll();
      }
    } else {
      // On native, check React Navigation's in-memory stack
      if (router.canGoBack()) {
        router.back();
      } else if (fallback) {
        router.dismissTo(fallback as any);
      } else {
        router.dismissAll();
      }
    }
  }, [fallback]);
}
