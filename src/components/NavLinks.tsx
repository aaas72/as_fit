'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { MOBILE_NAV, NAV_GROUPS } from './nav';

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="التنقل الرئيسي" className="flex flex-col gap-6">
      {NAV_GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-semibold tracking-wide text-ink-muted">{g.title}</span>
          {g.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                  active ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-brand-soft/60',
                )}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="التنقل السريع" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-col items-center gap-1 py-2 text-xs font-medium', active ? 'text-brand-ink' : 'text-ink-muted')}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
