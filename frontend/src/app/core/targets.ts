export type ChallengeTarget = {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly ra: number;
  readonly dec: number;
  /** Approximate visit count from recorded demo. */
  readonly visits: number;
  readonly spanLabel: string;
};

export const CHALLENGE_TARGETS: readonly ChallengeTarget[] = [
  {
    slug: 'barnards-star',
    name: "Barnard's Star",
    description: 'Nearby fast star — moves ~10″ per year',
    ra: 269.44850253,
    dec: 4.73942005,
    visits: 3,
    spanLabel: '2025-09 → 2026-10 · 3 visits',
  },
  {
    slug: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    description: 'Nearby brown dwarf — clear proper motion',
    ra: 331.0764526,
    dec: -56.79381207,
    visits: 4,
    spanLabel: '2025-04 → 2026-10 · 4 visits',
  },
  {
    slug: 'wise-0855',
    name: 'WISE 0855-0714',
    description: 'Coldest known brown dwarf — extreme motion',
    ra: 133.7952573,
    dec: -7.245091,
    visits: 2,
    spanLabel: '2025–2026 · 2 visits',
  },
  {
    slug: 'rw-aurigae',
    name: 'RW Aurigae',
    description: 'Young variable star — brightness changes',
    ra: 76.9560812,
    dec: 30.40120459,
    visits: 2,
    spanLabel: '2025–2026 · 2 visits',
  },
  {
    slug: 'r-draconis',
    name: 'R Draconis',
    description: 'Pulsating giant — long-period variable',
    ra: 248.16737837,
    dec: 66.75500675,
    visits: 3,
    spanLabel: '2025–2026 · 3 visits',
  },
];

const SLUG_TO_CANONICAL: Record<string, string> = {
  'barnards-star': "Barnard's Star",
  'epsilon-indi-b': 'Epsilon Indi B',
  'wise-0855': 'WISE 0855-0714',
  'rw-aurigae': 'RW Aurigae',
  'r-draconis': 'R Draconis',
};

const NAME_ALIASES: Record<string, string> = {
  "barnard's star": 'barnards-star',
  'barnards star': 'barnards-star',
  'barnards-star': 'barnards-star',
  'epsilon indi b': 'epsilon-indi-b',
  'eps indi b': 'epsilon-indi-b',
  'epsilon-indi-b': 'epsilon-indi-b',
  'wise 0855-0714': 'wise-0855',
  'wise 0855': 'wise-0855',
  'wise-0855': 'wise-0855',
  'rw aurigae': 'rw-aurigae',
  'rw-aurigae': 'rw-aurigae',
  'r draconis': 'r-draconis',
  'r-draconis': 'r-draconis',
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
}

export function canonicalNameForSlug(slug: string): string | null {
  return SLUG_TO_CANONICAL[slug] ?? null;
}

export function slugFromName(name: string): string | null {
  const key = normalize(name);
  if (NAME_ALIASES[key]) return NAME_ALIASES[key];
  const dashed = key.replace(/\s+/g, '-');
  if (NAME_ALIASES[dashed]) return NAME_ALIASES[dashed];
  if (SLUG_TO_CANONICAL[dashed]) return dashed;
  return null;
}

export function targetBySlug(slug: string): ChallengeTarget | undefined {
  return CHALLENGE_TARGETS.find(t => t.slug === slug);
}
