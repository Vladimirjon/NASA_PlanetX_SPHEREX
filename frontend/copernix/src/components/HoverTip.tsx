import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  readonly text: string;
  readonly className?: string;
  readonly dataOn?: boolean;
  readonly children: ReactNode;
};

/** A focusable label whose explanation floats above the page (portal on body), so no column or panel can clip it. */
export function HoverTip({ text, className, dataOn, children }: Props) {
  const id = useId();
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open || !hostRef.current || !tipRef.current) return;
    const a = hostRef.current.getBoundingClientRect();
    const w = tipRef.current.offsetWidth;
    const h = tipRef.current.offsetHeight;
    const margin = 8;
    const above = a.top - h - 10;
    const top = above >= margin ? above : Math.min(window.innerHeight - h - margin, a.bottom + 10);
    const left = Math.min(window.innerWidth - w - margin, Math.max(margin, a.left + a.width / 2 - w / 2));
    setPos({ left, top });
  }, [open, text]);

  return (
    <span
      ref={hostRef}
      className={className}
      data-on={dataOn}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
      onFocus={() => {
        setOpen(true);
      }}
      onBlur={() => {
        setOpen(false);
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      {children}
      {open
        ? createPortal(
            <span ref={tipRef} id={id} role="tooltip" className="hovertip" style={{ left: pos.left, top: pos.top }}>
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
