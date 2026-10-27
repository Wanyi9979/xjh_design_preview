import { resolveAdmissionDate } from './assistantData.ts';

export type ScheduleRunStatus = 'success' | 'failed' | 'skipped';
export type ScheduleRun = { id: string; time: string; status: ScheduleRunStatus; detail: string; conversationKey?: string };
export type CallTrigger = 'admission' | 'incomplete-plan';
export type ScheduledTask = {
  id: string;
  type: 'call' | 'admission';
  name: string;
  enabled: boolean;
  scope: string[];
  leadMinutes?: number;
  callTriggers?: CallTrigger[];
  pushTime?: string;
  time?: string;
  repeat?: 'daily' | 'weekdays' | 'once';
  executionDate?: string;
  aggregation?: 'all' | 'group';
  admissionDateMode?: 'relative' | 'fixed';
  admissionDays?: number;
  admissionDate?: string;
  deletedAt?: string;
  nextRun: string;
  lastRun?: ScheduleRun;
  runs: ScheduleRun[];
};
export type ScheduleDraft = Omit<ScheduledTask, 'id' | 'nextRun' | 'lastRun' | 'runs' | 'deletedAt'>;

export function scheduleAdmissionDate(schedule: ScheduleDraft, execution = new Date()): string | undefined {
  if (schedule.admissionDateMode === 'fixed') {
    return schedule.admissionDate ? resolveAdmissionDate(`【入院时间：${schedule.admissionDate}】`, execution) : undefined;
  }
  const days = schedule.admissionDays ?? 1;
  if (!Number.isInteger(days) || days < 0) return undefined;
  const date = new Date(execution);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return resolveAdmissionDate('【入院时间：今日】', date);
}

export function admissionDateRuleLabel(schedule: ScheduleDraft) {
  if (schedule.admissionDateMode === 'fixed') return `入院日期 ${schedule.admissionDate ?? '待设置'}`;
  const days = schedule.admissionDays ?? 1;
  return days === 0 ? '执行当天入院' : days === 1 ? '明日入院' : `执行后 ${days} 天入院`;
}

export function nextScheduleExecution(schedule: ScheduleDraft, reference = new Date()): Date | undefined {
  const time = schedule.type === 'call' ? schedule.pushTime ?? '08:00' : schedule.time ?? '17:00';
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return undefined;
  const date = new Date(reference);
  if (schedule.repeat === 'once') {
    const value = schedule.executionDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!value) return undefined;
    date.setFullYear(Number(value[1]), Number(value[2]) - 1, Number(value[3]));
    if (date.getMonth() !== Number(value[2]) - 1 || date.getDate() !== Number(value[3])) return undefined;
  }
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (schedule.repeat === 'once') return date > reference ? date : undefined;
  if (date <= reference) date.setDate(date.getDate() + 1);
  if (schedule.repeat === 'weekdays') {
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  }
  return date;
}

export function scheduleNextRunLabel(schedule: ScheduleDraft, reference = new Date()) {
  if (!schedule.enabled) return '已暂停';
  const date = nextScheduleExecution(schedule, reference);
  if (!date) return '执行时间已过';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
