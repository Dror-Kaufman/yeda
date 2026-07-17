import { useCallback } from 'react';
import { router } from 'expo-router';

/**
 * Returns a safe "go back" handler that:
 * 1. Uses router.back() if there's navigation history
 * 2. Falls back to router.dismissTo(fallback) if there's no history
 *
 * This prevents the "The action 'GO_BACK' was not handled by any navigator" error
 * that occurs when router.back() is called from the first screen in a stack.
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
    if (router.canGoBack()) {
      router.back();
    } else if (fallback) {
      router.dismissTo(fallback as any);
    } else {
      router.dismissAll();
    }
  }, [fallback]);
}
