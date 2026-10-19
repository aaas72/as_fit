import type { IconName } from './nav';

// Inline stroke icons (no icon library); currentColor follows the text token.
const PATHS: Record<IconName, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  meal: 'M4 3v8a3 3 0 006 0V3M7 3v18M17 3c-2 2-3 5-3 8h3v10',
  cup: 'M4 8h13v6a6 6 0 01-6 6h-1a6 6 0 01-6-6V8zM17 10h1a3 3 0 010 6h-1M8 2v3M12 2v3',
  run: 'M13 4a2 2 0 104 0 2 2 0 00-4 0M5 21l4-7 3 2 2 5M9 14l1-5 4 1 3 3 3 1M10 9L7 9 5 12',
  screen: 'M3 4h18v12H3zM8 20h8M12 16v4',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  scale: 'M4 4h16v16H4zM8 9a4 4 0 018 0M12 9l2-2',
  tape: 'M3 12a9 5 0 0018 0 9 5 0 00-18 0zM3 12v5c0 2.8 4 5 9 5h9v-5M12 12h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0',
  book: 'M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4zM4 17a3 3 0 013-3h11',
  calendar: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  chevron: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12l5 5 9-10',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
};

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
