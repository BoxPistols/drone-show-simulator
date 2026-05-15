/**
 * Mock schedule fixtures — pre-populated April 2026 season.
 * Replaces the inline EVENTS / CREW / CHECKLIST consts in the legacy
 * schedule.jsx so they're reusable from the page + tests.
 */

export type EventType = 'show' | 'rehearsal' | 'maint';

export interface WeatherForecast {
  temp: number;
  wind: number;
  visibility: string;
  humidity: number;
}

export interface ScheduleEvent {
  type: EventType;
  title: string;
  venue: string;
  time: string;
  duration?: number;
  drones?: number;
  audience?: number;
  weather?: WeatherForecast;
  notes?: string;
}

export const EVENTS: Readonly<Record<string, ScheduleEvent>> = Object.freeze({
  '2026-04-03': {
    type: 'rehearsal',
    title: '予行演習',
    venue: '葛飾・小合溜',
    time: '19:30',
    duration: 35,
    drones: 400,
  },
  '2026-04-10': {
    type: 'show',
    title: '春の宴 / Haru no Utage',
    venue: '横浜みなとみらい',
    time: '20:00',
    duration: 18,
    drones: 660,
    audience: 120000,
    weather: { temp: 14, wind: 3.1, visibility: '良好', humidity: 58 },
  },
  '2026-04-11': {
    type: 'show',
    title: '春の宴 (2日目)',
    venue: '横浜みなとみらい',
    time: '20:00',
    duration: 18,
    drones: 660,
    audience: 120000,
  },
  '2026-04-14': {
    type: 'maint',
    title: '定期整備',
    venue: '倉庫 B-02',
    time: '09:00',
    notes: 'AS-100〜AS-200 点検',
  },
  '2026-04-18': {
    type: 'rehearsal',
    title: '本番前リハ',
    venue: '東京湾・お台場沖',
    time: '21:00',
    duration: 22,
    drones: 660,
  },
  '2026-04-19': {
    type: 'rehearsal',
    title: '技術確認',
    venue: '東京湾・お台場沖',
    time: '21:00',
    duration: 22,
    drones: 660,
  },
  '2026-04-28': {
    type: 'show',
    title: '東京湾の星座',
    venue: '東京湾・お台場沖',
    time: '19:00',
    duration: 22,
    drones: 660,
    audience: 180000,
    weather: { temp: 16, wind: 2.4, visibility: '良好', humidity: 52 },
  },
  '2026-04-29': {
    type: 'show',
    title: '東京湾の星座 (昭和の日)',
    venue: '東京湾・お台場沖',
    time: '19:00',
    duration: 22,
    drones: 660,
    audience: 200000,
  },
  '2026-05-03': {
    type: 'show',
    title: 'Golden Week 特別公演',
    venue: '大阪・万博記念公園',
    time: '19:30',
    duration: 24,
    drones: 660,
    audience: 95000,
  },
});

export interface CrewMember {
  name: string;
  role: string;
  initials: string;
  color: string;
  status: 'CONFIRMED' | 'PENDING';
}

export const CREW: readonly CrewMember[] = [
  {
    name: 'Morgan Riley',
    role: 'Flight Director',
    initials: 'MR',
    color: '#31a9c7',
    status: 'CONFIRMED',
  },
  {
    name: '佐藤 美咲',
    role: 'Choreographer',
    initials: 'MS',
    color: '#d429e0',
    status: 'CONFIRMED',
  },
  {
    name: 'ライアン・ホール',
    role: 'Safety Officer',
    initials: 'RH',
    color: '#ffb347',
    status: 'CONFIRMED',
  },
  {
    name: '田中 健',
    role: 'Ground Ops Lead',
    initials: 'TK',
    color: '#98ff9e',
    status: 'CONFIRMED',
  },
  { name: '小林 陽子', role: 'Music Sync', initials: 'KY', color: '#ff69b4', status: 'PENDING' },
];

export interface ChecklistItem {
  label: string;
  done: boolean;
  warn?: boolean;
  note?: string;
}

export const CHECKLIST: readonly ChecklistItem[] = [
  { label: '航空局飛行許可 (DID区域)', done: true, note: 'No. 2026-0428-T' },
  { label: '気象予報確認(H-72)', done: true },
  { label: '会場入構許可(港湾局)', done: true },
  { label: '全機バッテリー校正', done: true, note: '660/660' },
  { label: '音響システム同期テスト', done: false, warn: true, note: 'H-6 予定' },
  { label: '観客動線・警備計画', done: false },
  { label: '緊急着陸ゾーン確認', done: false },
  { label: '保険付保確認', done: true },
];

export const TYPE_META: Readonly<Record<EventType, { jp: string; chip: string; dot: string }>> =
  Object.freeze({
    show: { jp: '本番', chip: '#31a9c7', dot: '●' },
    rehearsal: { jp: 'リハ', chip: '#ffb347', dot: '●' },
    maint: { jp: '整備', chip: '#ef4444', dot: '●' },
  });

export const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const;
export const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function dateKey(year: number, monthIndex: number, day: number): string {
  return `${String(year)}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
