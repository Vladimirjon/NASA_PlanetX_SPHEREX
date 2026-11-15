import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeTip, type Box } from '../place-tip';

const AVOID_SELECTORS = ['.left-col', '.dock', '.sheet.open', '.cutout-card', '.intro-card'];

function rectsFromSelectors(selectors: readonly string[]): Box[] {
  const out: Box[] = [];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push({ x: r.x, y: r.y, width: r.width, height: r.height });
  }
  return out;
}

/** Bubbles opened from inside the dock float above it, over the map, so they never cover dock text. */
function placeAboveDock(anchor: DOMRect, size: { width: number; height: number }): { left: number; top: number } | null {
  const dock = document.querySelector('.dock')?.getBoundingClientRect();
  if (!dock || anchor.top < dock.top - 1 || anchor.bottom > dock.bottom + 1) return null;
  const margin = 8;
  const top = dock.top - size.height - 10;
  if (top < margin) return null;
  const centred = anchor.left + anchor.width / 2 - size.width / 2;
  return { left: Math.min(window.innerWidth - size.width - margin, Math.max(margin, centred)), top };
}

type Props = {
  readonly title: string;
  readonly body: string;
  readonly aboutLabel: string;
  readonly preferSide?: 'left' | 'right' | 'top';
};

export function Tip({ title, body, aboutLabel, preferSide = 'right' }: Props) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !tipRef.current) return;
    const anchor = btnRef.current.getBoundingClientRect();
    const tipEl = tipRef.current;
    const measured = { width: tipEl.offsetWidth || 280, height: tipEl.offsetHeight || 96 };
    const above = placeAboveDock(btnRef.current.getBoundingClientRect(), measured);
    if (above) {
      setPos(above);
      return;
    }
    const avoid = rectsFromSelectors(AVOID_SELECTORS);
    const prefer =
      preferSide === 'right' && anchor.top > window.innerHeight * 0.52 ? 'top' : preferSide;
    const placed = placeTip(
      { x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height },
      measured,
      { width: window.innerWidth, height: window.innerHeight },
      avoid,
      { prefer, margin: 8, gap: 10 },
    );
    setPos(placed);
  }, [open, preferSide, title, body]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (!btnRef.current || !tipRef.current) return;
      const anchor = btnRef.current.getBoundingClientRect();
      const measured = { width: tipRef.current.offsetWidth || 280, height: tipRef.current.offsetHeight || 96 };
      const above = placeAboveDock(anchor, measured);
      if (above) {
        setPos(above);
        return;
      }
      const avoid = rectsFromSelectors(AVOID_SELECTORS);
      setPos(
        placeTip(
          { x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height },
          measured,
          { width: window.innerWidth, height: window.innerHeight },
          avoid,
          { prefer: preferSide, margin: 8, gap: 10 },
        ),
      );
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [open, preferSide]);

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
      {createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          className={`tipbox glass-opaque${open ? ' on' : ''}`}
          style={{ left: pos.left, top: pos.top }}
        >
          <b>{title}</b>
          {body}
        </div>,
        document.body,
      )}
    </>
  );
}