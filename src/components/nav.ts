export type NavItem = { href: string; label: string; icon: IconName };
export type IconName = 'home' | 'meal' | 'cup' | 'run' | 'screen' | 'moon' | 'scale' | 'tape' | 'chart' | 'bell' | 'book' | 'gear'
  | 'calendar' | 'clock' | 'chevron' | 'plus' | 'minus' | 'check';

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'اليوم', items: [{ href: '/', label: 'لوحة التحكم', icon: 'home' }] },
  {
    title: 'التسجيل اليومي',
    items: [
      { href: '/log/meals', label: 'الوجبات', icon: 'meal' },
      { href: '/log/beverages', label: 'المشروبات', icon: 'cup' },
      { href: '/log/activity', label: 'التمارين', icon: 'run' },
      { href: '/log/screen', label: 'الشاشات', icon: 'screen' },
      { href: '/log/sleep', label: 'النوم', icon: 'moon' },
    ],
  },
  {
    title: 'القياس',
    items: [
      { href: '/weigh-in', label: 'الوزن المعياري', icon: 'scale' },
      { href: '/measurements', label: 'القياسات الشهرية', icon: 'tape' },
    ],
  },
  {
    title: 'التحليل',
    items: [
      { href: '/trends', label: 'الاتجاهات', icon: 'chart' },
      { href: '/insights', label: 'التنبيهات', icon: 'bell' },
    ],
  },
  {
    title: 'الإدارة',
    items: [
      { href: '/foods', label: 'قاموس الأغذية', icon: 'book' },
      { href: '/drinks', label: 'قائمة المشروبات', icon: 'cup' },
      { href: '/settings', label: 'الإعدادات', icon: 'gear' },
    ],
  },
];

// Bottom bar on phones: the five most frequent destinations
export const MOBILE_NAV: NavItem[] = [
  { href: '/', label: 'اليوم', icon: 'home' },
  { href: '/log/meals', label: 'وجبة', icon: 'meal' },
  { href: '/log/beverages', label: 'مشروب', icon: 'cup' },
  { href: '/weigh-in', label: 'الوزن', icon: 'scale' },
  { href: '/trends', label: 'الاتجاهات', icon: 'chart' },
];
