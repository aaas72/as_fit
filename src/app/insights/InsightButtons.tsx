'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui';
import { dismissInsight, refreshInsights } from '@/server/actions/insights';

export function DismissButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <Button id={`dismiss-${id}`} variant="ghost" className="px-3 py-1 text-sm" disabled={pending} onClick={() => start(async () => { await dismissInsight(id); })}>
      {pending ? '…' : 'تجاهل'}
    </Button>
  );
}

export function RefreshButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-sm text-ink-muted" role="status">{msg}</span>}
      <Button id="refresh-insights" variant="secondary" disabled={pending} onClick={() => start(async () => {
        const r = await refreshInsights();
        setMsg(r.ok ? (r.created > 0 ? `${r.created} تنبيهات جديدة` : 'لا جديد') : null);
      })}>
        {pending ? 'جارٍ التحليل…' : 'تحليل الآن'}
      </Button>
    </span>
  );
}
