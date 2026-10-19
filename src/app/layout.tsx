import type { Metadata } from 'next';
import Link from 'next/link';
import { Cairo, JetBrains_Mono } from 'next/font/google';
import { BottomNav, SideNav } from '@/components/NavLinks';
import '@/styles/globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-num', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'AS_FIT', template: '%s · AS_FIT' },
  description: 'نظام شخصي لتتبع الأيض بتغذية راجعة: السعرات، الوزن، النوم، والكافيين.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh max-w-7xl gap-8 px-4 sm:px-6">
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 overflow-y-auto py-8 lg:flex">
            <Link href="/" className="px-3 text-2xl font-extrabold text-brand-ink">AS_FIT</Link>
            <SideNav />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-8 pt-6 pb-28 lg:py-8">
            <header className="flex items-center justify-between lg:hidden">
              <Link href="/" className="text-xl font-extrabold text-brand-ink">AS_FIT</Link>
              <Link href="/settings" className="text-sm font-medium text-ink-muted">الإعدادات</Link>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-line pt-4 text-sm text-ink-muted">أداة تتبع شخصية وليست جهازاً طبياً.</footer>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
