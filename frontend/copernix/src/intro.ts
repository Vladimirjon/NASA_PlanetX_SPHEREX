const INTRO_KEY = 'copernix_tour_off';

/** The guide opens on every visit unless the visitor ticked "Don't show this again". */
export function shouldShowIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) !== '1';
  } catch {
    return true;
  }
}

/** Called only when the visitor asks never to see the guide again. */
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
