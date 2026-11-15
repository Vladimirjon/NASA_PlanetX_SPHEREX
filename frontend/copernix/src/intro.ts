const INTRO_KEY = 'copernix_intro';

/** Returns true if the first-visit guide should show. */
export function shouldShowIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* private mode / quota */
  }
}

export function clearIntroSeen(): void {
  try {
    localStorage.removeItem(INTRO_KEY);
  } catch {
    /* ignore */
  }
}
