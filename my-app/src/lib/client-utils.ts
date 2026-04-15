/**
 * Generate a UUID, with fallback for browsers that don't support crypto.randomUUID
 * (Safari < 15.4, older WebKit builds).
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safely read from localStorage. Returns null on any error
 * (Safari Private Browsing throws SecurityError, quota errors, etc.)
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely write to localStorage. Silently fails on any error.
 */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari Private Browsing, quota exceeded, etc.
  }
}

/**
 * Safely remove from localStorage. Silently fails on any error.
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Safari Private Browsing, etc.
  }
}

/**
 * Safely parse JSON. Returns null on any parse error instead of throwing.
 */
export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Safely call response.json(). Returns null if the body isn't valid JSON.
 */
export async function safeResponseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
