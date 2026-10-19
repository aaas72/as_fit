import { revalidatePath } from 'next/cache';
import type { ZodError } from 'zod';

export const invalid = (error: ZodError) => ({ ok: false as const, errors: error.flatten().fieldErrors as Record<string, string[]> });
export const failure = (message: string) => ({ ok: false as const, message });

// Every page reads derived numbers (TDEE, deficit, insights), so a write refreshes the whole app.
export const refreshAll = () => revalidatePath('/', 'layout');

export const toNumStr = (v: number | null | undefined, digits = 2) => (v == null ? null : v.toFixed(digits));
