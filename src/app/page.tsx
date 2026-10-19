import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Num } from '@/components/Num';
import { getSystemStatus } from '@/server/queries/system';

export const dynamic = 'force-dynamic';

// P0 placeholder: confirms DB + seed + design tokens. Replaced by the real dashboard in P4.
export default async function DashboardPage() {
  const status = await getSystemStatus();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>

      {status.ok ? (
        <div className="flex flex-wrap gap-2">
          <Badge>قاعدة البيانات متصلة</Badge>
          {status.profileName ? <Badge>الملف: {status.profileName}</Badge> : <Badge tone="warning">لا يوجد ملف شخصي — شغّل pnpm db:seed</Badge>}
        </div>
      ) : (
        <Card className="border-danger bg-danger-soft">
          <h2 className="font-bold text-danger-ink">تعذّر الاتصال بقاعدة البيانات</h2>
          <p className="mt-2 text-sm text-danger-ink">شغّل <code className="font-mono">pnpm db:up</code> ثم <code className="font-mono">pnpm db:migrate</code>.</p>
          <p className="mt-2 font-mono text-xs text-ink-muted" dir="ltr">{status.error}</p>
        </Card>
      )}

      {status.ok && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <p className="text-sm text-ink-muted">أصناف قاموس الأغذية</p>
            <Num value={status.foods} className="text-3xl font-semibold" />
          </Card>
          <Card>
            <p className="text-sm text-ink-muted">تمارين الكتالوج</p>
            <Num value={status.exercises} className="text-3xl font-semibold" />
          </Card>
        </div>
      )}
    </div>
  );
}
