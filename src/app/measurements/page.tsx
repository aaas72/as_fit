import type { Metadata } from 'next';
import { Badge, type Tone } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DeleteButton } from '@/components/forms/DeleteButton';
import { Num } from '@/components/Num';
import { EmptyState, PageHeader, SectionTitle } from '@/components/ui';
import { SideColumn } from '@/components/SideColumn';
import { bodyFatCategory, navyBodyFat, whrRisk, whtr, whtrRisk, type BodyFatCategory } from '@/domain/anthropometry';
import { deleteMeasurement } from '@/server/actions/measurements';
import { getMeasurements, type MeasurementView } from '@/server/queries/logs';
import { resolveDate } from '@/server/queries/page';
import { getProfileAndSettings } from '@/server/queries/profile';
import { USER_ID } from '@/server/session';
import { MeasurementsForm } from './MeasurementsForm';
import { TBody, THead, Table, Td, Tr } from '@/components/Table';
import { formatDate } from '@/lib/inputs';

export const metadata: Metadata = { title: 'القياسات الشهرية', description: 'محيطات الجسم ونسبة الخصر للورك وللطول ونسبة الدهون.' };

const BF_LABEL: Record<BodyFatCategory, [string, Tone]> = {
  essential: ['دهون أساسية', 'warning'], athlete: ['رياضي', 'brand'], fitness: ['لياقة', 'brand'], average: ['متوسط', 'warning'], obese: ['مرتفع', 'danger'],
};

export default async function MeasurementsPage() {
  const { today } = await resolveDate();
  const [ps, rows] = await Promise.all([getProfileAndSettings(USER_ID), getMeasurements(USER_ID)]);
  const profile = ps?.profile;
  const [latest, previous] = rows;

  const indices = (m: MeasurementView) => {
    if (!profile) return null;
    const ratio = whtr(m.waistCm, profile.heightCm);
    const bf = navyBodyFat({ gender: profile.gender, heightCm: profile.heightCm, waistCm: m.waistCm, neckCm: m.neckCm, hipCm: m.hipCm });
    return { whr: m.whr, whrRisk: whrRisk(m.whr, profile.gender), whtr: ratio, whtrRisk: whtrRisk(ratio), bf, bfCat: bf == null ? null : bodyFatCategory(bf, profile.gender) };
  };
  const cur = latest ? indices(latest) : null;
  const prev = previous ? indices(previous) : null;
  const delta = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? null : a - b);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="القياسات الشهرية" description="قِس في الصباح، بنفس الشريط ونفس المواضع كل مرة. القياس الجديد بنفس التاريخ يحدّث السابق." />

      {latest && cur && profile && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col gap-2">
            <span className="text-sm text-ink-muted">نسبة الخصر للورك (WHR)</span>
            <span className="flex items-center gap-2 text-3xl font-semibold"><Num value={cur.whr} digits={3} />
              <Badge tone={cur.whrRisk === 'high' ? 'danger' : 'brand'}>{cur.whrRisk === 'high' ? 'خطر مرتفع' : 'طبيعي'}</Badge></span>
            <span className="text-xs text-ink-muted">الحد: {profile.gender === 'male' ? '0.90' : '0.85'} (WHO 2008)</span>
            {prev && <Delta value={delta(cur.whr, prev.whr)} digits={3} />}
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-sm text-ink-muted">نسبة الخصر للطول (WHtR)</span>
            <span className="flex items-center gap-2 text-3xl font-semibold"><Num value={cur.whtr} digits={2} />
              <Badge tone={cur.whtrRisk === 'healthy' ? 'brand' : cur.whtrRisk === 'increased' ? 'warning' : 'danger'}>{cur.whtrRisk === 'healthy' ? 'صحي' : cur.whtrRisk === 'increased' ? 'خطر متزايد' : 'خطر مرتفع'}</Badge></span>
            <span className="text-xs text-ink-muted">الهدف أقل من 0.50 (Ashwell 2016)</span>
            {prev && <Delta value={delta(cur.whtr, prev.whtr)} digits={2} />}
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-sm text-ink-muted">نسبة الدهون (US Navy)</span>
            {cur.bf == null ? (
              <span className="text-sm text-ink-muted">يتطلب محيط الرقبة{profile.gender === 'female' ? ' والورك' : ''}.</span>
            ) : (
              <>
                <span className="flex items-center gap-2 text-3xl font-semibold"><Num value={cur.bf} digits={1} unit="%" />
                  {cur.bfCat && <Badge tone={BF_LABEL[cur.bfCat][1]}>{BF_LABEL[cur.bfCat][0]}</Badge>}</span>
                <span className="text-xs text-ink-muted">تقدير بخطأ ± 3–4%، فئات ACE</span>
                {prev && <Delta value={delta(cur.bf, prev.bf)} digits={1} unit="%" />}
              </>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <SectionTitle>قياس جديد</SectionTitle>
          <MeasurementsForm today={today} />
        </Card>
        <SideColumn title={<SectionTitle>السجل</SectionTitle>}>
          {rows.length === 0 && <EmptyState title="لا توجد قياسات بعد" />}
          {rows.length > 0 && (
            <Table>
              <THead columns={['التاريخ', 'خصر', 'ورك', 'رقبة', 'WHR', '']} />
              <TBody>
                {rows.map((m) => (
                  <Tr key={m.id}>
                    <Td num>{formatDate(m.date)}</Td>
                    <Td num>{m.waistCm.toFixed(1)}</Td>
                    <Td num>{m.hipCm.toFixed(1)}</Td>
                    <Td num>{m.neckCm == null ? '—' : m.neckCm.toFixed(1)}</Td>
                    <Td num className="font-semibold">{m.whr.toFixed(3)}</Td>
                    <Td className="text-end"><DeleteButton id={m.id} action={deleteMeasurement} /></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </SideColumn>
      </div>
    </div>
  );
}

// Lower is better for every index here
function Delta({ value, digits, unit }: { value: number | null; digits: number; unit?: string }) {
  if (value == null) return null;
  const tone: Tone = value < 0 ? 'brand' : value > 0 ? 'warning' : 'brand';
  return <Badge tone={tone} className="w-fit text-xs">مقارنة بالسابق: <Num value={value} digits={digits} unit={unit} /></Badge>;
}
