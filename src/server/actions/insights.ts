'use server';

import { and, eq } from 'drizzle-orm';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { insights } from '@/server/db/schema';
import { refreshAll } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { USER_ID } from '@/server/session';

// A dismissed insight keeps its row, so the unique (rule, period) key stops it from coming back.
export async function dismissInsight(id: number): Promise<ActionResult> {
  await db.update(insights).set({ dismissedAt: new Date() }).where(and(eq(insights.id, id), eq(insights.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}

export async function refreshInsights(): Promise<ActionResult<{ created: number }>> {
  const created = await runInsights(USER_ID);
  refreshAll();
  return { ok: true, created };
}
