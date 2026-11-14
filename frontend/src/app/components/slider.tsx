type Props = {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly readout: string;
  readonly onChange: (value: number) => void;
  readonly marks?: readonly { readonly value: number; readonly label: string }[];
};

export function Slider({ label, value, min, max, step = 1, readout, onChange, marks }: Props) {
  return (
    <div className="slider">
      <div className="slider-head">
        <span id={`${label}-label`}>{label}</span>
        <span className="slider-readout" aria-live="polite">
          {readout}
        </span>
      </div>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-labelledby={`${label}-label`}
        aria-valuetext={readout}
        onChange={e => {
          onChange(Number(e.target.value));
        }}
      />
      {marks && marks.length > 0 ? (
        <div className="slider-marks" aria-hidden="true">
          {marks.map(m => (
            <span key={m.value} style={{ left: `${((m.value - min) / (max - min)) * 100}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
