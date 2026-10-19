'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm, type DefaultValues, type FieldValues, type Path } from 'react-hook-form';
import type { z } from 'zod';
import type { ActionResult } from '@/lib/validation/common';

type Status = { tone: 'brand' | 'danger'; text: string } | null;

// React Hook Form + the same Zod schema as the Server Action. Server field errors are mapped back onto the form.
export function useActionForm<S extends z.ZodTypeAny, R extends object>(opts: {
  schema: S;
  action: (values: z.output<S>) => Promise<ActionResult<R>>;
  defaultValues: DefaultValues<z.input<S> & FieldValues>;
  successText: string | ((res: { ok: true } & R) => string);
  onSuccess?: (res: { ok: true } & R, values: z.output<S>) => void;
}) {
  const form = useForm<z.input<S> & FieldValues, unknown, z.output<S>>({
    resolver: zodResolver(opts.schema),
    defaultValues: opts.defaultValues,
  });
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const onSubmit = form.handleSubmit((values) => {
    setStatus(null);
    startTransition(async () => {
      const res = await opts.action(values);
      if (res.ok) {
        setStatus({ tone: 'brand', text: typeof opts.successText === 'function' ? opts.successText(res) : opts.successText });
        opts.onSuccess?.(res, values);
        return;
      }
      for (const [field, msgs] of Object.entries(res.errors ?? {})) {
        if (msgs?.[0]) form.setError(field as Path<z.input<S> & FieldValues>, { message: msgs[0] });
      }
      setStatus({ tone: 'danger', text: res.message ?? 'تحقق من الحقول المظللة' });
    });
  });

  const err = (name: string) => {
    const e = name.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], form.formState.errors) as { message?: string } | undefined;
    return e?.message;
  };

  return { form, onSubmit, pending, status, err };
}
