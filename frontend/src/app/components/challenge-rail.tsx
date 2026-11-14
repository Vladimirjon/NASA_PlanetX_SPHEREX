import { CHALLENGE_TARGETS } from '../core/targets';

type Props = {
  readonly activeSlug: string | null;
  readonly onSelect: (slug: string) => void;
};

export function ChallengeRail({ activeSlug, onSelect }: Props) {
  return (
    <aside className="rail" aria-label="Challenge targets">
      <h2>Challenge targets</h2>
      <p className="muted">Five example regions — click to fly the map and open the time series.</p>
      <ul className="target-list">
        {CHALLENGE_TARGETS.map(t => {
          const selected = t.slug === activeSlug;
          return (
            <li key={t.slug}>
              <button
                type="button"
                className={selected ? 'target-card is-active' : 'target-card'}
                aria-current={selected ? 'true' : undefined}
                onClick={() => {
                  onSelect(t.slug);
                }}
              >
                <span className="target-name">{t.name}</span>
                <span className="target-desc">{t.description}</span>
                <span className="target-meta">{t.spanLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
