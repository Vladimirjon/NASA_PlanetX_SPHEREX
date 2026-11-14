type Option<T extends string> = { readonly value: T; readonly label: string };

type Props<T extends string> = {
  readonly label: string;
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? 'seg-btn is-active' : 'seg-btn'}
          aria-pressed={opt.value === value}
          onClick={() => {
            onChange(opt.value);
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
