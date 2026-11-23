const memoryFallback = new Map<string, string>();

/**
 * Safe storage wrapper that degrades gracefully to an in-memory map
 * when localStorage is unavailable (e.g. private mode or restricted sandboxes).
 * Per SPEC.md §9.
 */
export function readStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Fall through to memory fallback
  }
  return memoryFallback.get(key) ?? null;
}

export function writeStorage(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Graceful fallback: already stored in memoryFallback
  }
}
