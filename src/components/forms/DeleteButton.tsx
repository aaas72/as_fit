'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/validation/common';
import { Button } from '../ui';

// Two-step delete: first click asks, second click confirms (no browser dialogs).
export function DeleteButton({ id, action, label = 'حذف' }: { id: number; action: (id: number) => Promise<ActionResult>; label?: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return <Button id={`delete-${id}`} variant="danger" className="px-2 py-1 text-sm" onClick={() => setArmed(true)}>{label}</Button>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Button id={`confirm-delete-${id}`} variant="danger" className="px-2 py-1 text-sm" disabled={pending} onClick={() => start(async () => { await action(id); })}>
        {pending ? 'جارٍ الحذف…' : 'تأكيد'}
      </Button>
      <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setArmed(false)}>إلغاء</Button>
    </span>
  );
}
