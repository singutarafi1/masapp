import { useEffect, useRef } from 'react';

interface BackStackEntry {
  id: string;
  onBack: () => void;
}

const backStack: BackStackEntry[] = [];
let isListening = false;
let ignoreNextPopCount = 0;

function ensureGlobalListener() {
  if (isListening || typeof window === 'undefined') return;
  isListening = true;

  window.addEventListener('popstate', () => {
    if (ignoreNextPopCount > 0) {
      ignoreNextPopCount--;
      return;
    }

    if (backStack.length > 0) {
      const top = backStack.pop();
      if (top) {
        top.onBack();
      }
    }
  });

  // Expose helper for Sketchware / Android WebView direct bridge if needed
  (window as any).handleAndroidBack = (): boolean => {
    if (backStack.length > 0) {
      window.history.back();
      return true;
    }
    return false;
  };
}

/**
 * Registers a step-by-step hardware Back button handler for Android WebView (SKW) and mobile browsers.
 * When `active` becomes true, pushes a history state so pressing the phone's Back button
 * invokes `onBack()` instead of exiting the WebView.
 */
export function useBackHandler(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    ensureGlobalListener();

    const id = 'bk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const entry: BackStackEntry = {
      id,
      onBack: () => onBackRef.current(),
    };

    backStack.push(entry);
    try {
      window.history.pushState({ skwBackId: id }, '');
    } catch {
      // Ignore history push errors in restricted frames
    }

    return () => {
      const idx = backStack.findIndex((item) => item.id === id);
      if (idx !== -1) {
        // Closed manually via UI button (not via hardware back button)
        backStack.splice(idx, 1);
        try {
          if (window.history.state && window.history.state.skwBackId === id) {
            ignoreNextPopCount++;
            window.history.back();
          }
        } catch {
          // Ignore
        }
      }
    };
  }, [active]);
}
