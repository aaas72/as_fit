import type { Metadata } from 'next';
import { Cairo, JetBrains_Mono } from 'next/font/google';
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
        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
          <header className="flex items-center justify-between">
            <span className="text-xl font-extrabold text-brand-ink">AS_FIT</span>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line pt-4 text-sm text-ink-muted">أداة تتبع شخصية وليست جهازاً طبياً.</footer>
        </div>
      </body>
    </html>
  );
}
