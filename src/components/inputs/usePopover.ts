'use client';

import { useEffect, useRef, useState } from 'react';

// Open/close state for a floating panel: closes on outside click and on Escape.
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

// Floating panels are the one place a surface fill is allowed (they sit over content).
export const panelClass = 'absolute top-full start-0 z-30 mt-1 rounded-xl border border-line bg-surface p-3 shadow-sm';
