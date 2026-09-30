/* The last answer the console got for a read, kept in localStorage so the next
   visit can paint it straight away and refresh underneath instead of opening on
   a spinner. It is only ever a first frame: every page that shows one of these
   still asks the API and replaces it the moment the answer lands.

   Nothing secret goes in here — who is signed in, their workspaces, and app
   names, addresses and states. It is cleared on sign-out and whenever the
   session turns out to be over, so the next person at this browser never sees
   the last one's apps. */

const PREFIX = "hns.lastSeen:";

export function readLastSeen<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLastSeen(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Full or blocked storage only costs the instant first frame.
  }
}

export function clearLastSeen() {
  try {
    const store = window.localStorage;
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i);
      if (key?.startsWith(PREFIX)) store.removeItem(key);
    }
  } catch {
    // ignore
  }
}
