import { useId, useRef, useState } from 'react';
import { parseSearchQuery, typeaheadSuggestions } from '../core/search';

type Props = {
  readonly onSubmitQuery: (raw: string) => void;
  readonly onPickTarget: (slug: string) => void;
};

export function SearchBox({ onSubmitQuery, onPickTarget }: Props) {
  const listId = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = typeaheadSuggestions(value);

  const commit = (raw: string) => {
    const q = parseSearchQuery(raw);
    if (q.kind === 'target') {
      onPickTarget(q.slug);
      setValue(q.slug);
    } else {
      onSubmitQuery(raw);
    }
    setOpen(false);
  };

  return (
    <div className="search">
      <label className="sr-only" htmlFor={listId + '-input'}>
        Search object or RA Dec
      </label>
      <input
        id={listId + '-input'}
        ref={inputRef}
        className="search-input"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && suggestions[active] ? `${listId}-${String(active)}` : undefined}
        placeholder="Search: Barnard's Star, or RA Dec…"
        value={value}
        onChange={e => {
          setValue(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
          }, 150);
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(i => Math.min(suggestions.length - 1, i + 1));
            setOpen(true);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(i => Math.max(0, i - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && suggestions[active]) {
              onPickTarget(suggestions[active].slug);
              setValue(suggestions[active].name);
              setOpen(false);
            } else {
              commit(value);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          commit(value);
        }}
      >
        Go
      </button>
      {open && suggestions.length > 0 ? (
        <ul id={listId} className="search-list" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-${String(i)}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              onMouseDown={e => {
                e.preventDefault();
                onPickTarget(s.slug);
                setValue(s.name);
                setOpen(false);
              }}
            >
              <strong>{s.name}</strong>
              <span>{s.description}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
