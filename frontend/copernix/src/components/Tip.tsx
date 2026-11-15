import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  readonly title: string;
  readonly body: string;
  readonly aboutLabel: string;
};

export function Tip({ title, body, aboutLabel }: Props) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 300, Math.max(10, r.left - 40));
    const top = Math.min(window.innerHeight - 120, r.bottom + 8);
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="tip"
        aria-label={`${aboutLabel}: ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(v => !v);
        }}
      >
        ?
      </button>
      <div
        id={id}
        role="tooltip"
        className={`tipbox glass-opaque${open ? ' on' : ''}`}
        style={{ left: pos.left, top: pos.top }}
      >
        <b>{title}</b>
        {body}
      </div>
    </>
  );
}
