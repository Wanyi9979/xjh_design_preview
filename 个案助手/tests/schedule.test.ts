import assert from 'node:assert/strict';
import test from 'node:test';
import { admissionDateRuleLabel, nextScheduleExecution, scheduleAdmissionDate, scheduleNextRunLabel, type ScheduleDraft } from '../src/scheduleData.ts';

const rule: ScheduleDraft = { type: 'admission', name: '入院简报', enabled: true, scope: ['all'], time: '17:00', repeat: 'daily' };

test('admission date is relative to each execution, not the task creation date', () => {
  assert.equal(scheduleAdmissionDate(rule, new Date(2026, 9, 14)), '2026年10月15日');
  assert.equal(scheduleAdmissionDate(rule, new Date(2026, 9, 15)), '2026年10月16日');
  assert.equal(scheduleAdmissionDate({ ...rule, admissionDays: 0 }, new Date(2026, 9, 14)), '2026年10月14日');
  assert.equal(scheduleAdmissionDate({ ...rule, admissionDays: 3 }, new Date(2026, 11, 30)), '2027年01月02日');
  assert.equal(scheduleAdmissionDate({ ...rule, admissionDays: -1 }), undefined);
});

test('fixed admission date is independent from the execution date', () => {
  const fixed = { ...rule, admissionDateMode: 'fixed' as const, admissionDate: '2026-10-20', repeat: 'once' as const, executionDate: '2026-10-18' };
  assert.equal(scheduleAdmissionDate(fixed, new Date(2026, 9, 18)), '2026年10月20日');
  assert.equal(scheduleAdmissionDate({ ...fixed, admissionDate: '2026-02-29' }), undefined);
  assert.equal(admissionDateRuleLabel(fixed), '入院日期 2026-10-20');
});

test('next run moves past elapsed times and skips weekends for workday rules', () => {
  assert.equal(scheduleNextRunLabel(rule, new Date(2026, 9, 14, 18)), '2026-10-15 17:00');
  assert.equal(scheduleNextRunLabel({ ...rule, repeat: 'weekdays' }, new Date(2026, 9, 16, 18)), '2026-10-19 17:00');
  assert.equal(scheduleNextRunLabel({ ...rule, enabled: false }), '已暂停');
});

test('one-off tasks do not silently roll an expired execution into the following day', () => {
  const once = { ...rule, repeat: 'once' as const, executionDate: '2026-10-18' };
  assert.equal(scheduleNextRunLabel(once, new Date(2026, 9, 18, 16)), '2026-10-18 17:00');
  assert.equal(nextScheduleExecution(once, new Date(2026, 9, 18, 18)), undefined);
  assert.equal(nextScheduleExecution({ ...once, executionDate: '2026-02-29' }, new Date(2026, 0, 1)), undefined);
  assert.equal(nextScheduleExecution({ ...rule, time: '25:00' }), undefined);
});
