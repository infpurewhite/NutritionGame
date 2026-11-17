/**
 * Device storage with a graceful fallback (SPEC section 9). Storage can be
 * missing or throw (private windows, blocked site data); the game then keeps
 * working with in-memory state only.
 */
const PREFIX = 'nutrition-game:';

export function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, value);
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}
