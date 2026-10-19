'use client';

import { useEffect, useRef, useState } from 'react';

const GAP = 24; // px kept clear below the list
const WIDE = '(min-width: 1280px)'; // xl: side-by-side layout

// Side history column. On wide screens it is pinned beside the form and its list is exactly as tall as the
// space left on the current screen (from where the list starts to the bottom), recomputed on scroll and resize;
// the list scrolls on its own with the scrollbar hidden. On phones it is a normal stacked section.
export function SideColumn({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(WIDE);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = listRef.current;
        if (!el || !media.matches) return setMaxHeight(undefined);
        setMaxHeight(Math.max(160, Math.floor(window.innerHeight - el.getBoundingClientRect().top - GAP)));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    media.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      media.removeEventListener('change', update);
    };
  }, []);

  return (
    <section className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6 xl:self-start">
      {title}
      <div
        ref={listRef}
        data-side-list
        style={{ maxHeight }}
        className="flex min-h-0 flex-col gap-3 [scrollbar-width:none] xl:overflow-y-auto [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
