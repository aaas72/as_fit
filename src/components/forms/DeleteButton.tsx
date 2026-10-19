'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/validation/common';
import { Icon } from '../Icon';

const small = 'inline-flex h-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-150 disabled:opacity-50';

// Two-step delete: a trash icon asks, "تأكيد" confirms (no browser dialogs).
export function DeleteButton({ id, action, label = 'حذف' }: { id: number; action: (id: number) => Promise<ActionResult>; label?: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return (
      <button
        id={`delete-${id}`} type="button" aria-label={label} title={label} onClick={() => setArmed(true)}
        className={`${small} w-8 shrink-0 text-ink-muted hover:bg-danger-soft hover:text-danger-ink`}
      >
        <Icon name="trash" className="size-4" />
      </button>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <button id={`confirm-delete-${id}`} type="button" disabled={pending} onClick={() => start(async () => { await action(id); })}
        className={`${small} bg-danger-soft px-3 text-danger-ink hover:bg-danger hover:text-white`}>
        {pending ? 'جارٍ الحذف…' : 'تأكيد الحذف'}
      </button>
      <button type="button" aria-label="إلغاء" onClick={() => setArmed(false)} className={`${small} w-8 text-ink-muted hover:bg-brand-soft`}>✕</button>
    </span>
  );
}
