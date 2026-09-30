"use client";

import { useCallback, useSyncExternalStore } from "react";

// Reads/writes one string in localStorage. The value is null on the server and whenever
// nothing has been saved yet, so callers can tell "unset" apart from a saved value.
// Setting returns true on success and false if the browser blocks storage (profile-editor shows an error).
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLocalPreference(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const setValue = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
        listeners.forEach((listener) => listener());
        return true;
      } catch {
        return false;
      }
    },
    [key],
  );
  return [value, setValue] as const;
}

// True on tablet-width screens, where globals.css expects the sidebar to start collapsed.
const tabletQuery = "(min-width: 768px) and (max-width: 1199px)";
export function useTablet() {
  return useSyncExternalStore(
    (callback) => {
      const query = window.matchMedia(tabletQuery);
      query.addEventListener("change", callback);
      return () => query.removeEventListener("change", callback);
    },
    () => window.matchMedia(tabletQuery).matches,
    () => false,
  );
}
