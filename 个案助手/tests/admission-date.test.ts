import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoReply, resolveAdmissionDate, tasks } from '../src/assistantData.ts';

const reference = new Date(2026, 9, 13, 23, 30);

test('admission defaults to tomorrow and handles relative dates across year boundaries', () => {
  assert.equal(resolveAdmissionDate(tasks.admission.question, reference), '2026年10月14日');
  assert.equal(resolveAdmissionDate('【入院时间：今日】', reference), '2026年10月13日');
  assert.equal(resolveAdmissionDate('【入院时间：后天】', reference), '2026年10月15日');
  assert.equal(resolveAdmissionDate(tasks.admission.question, new Date(2026, 11, 31)), '2027年01月01日');
});

test('editable admission dates accept calendar formats and propagate into the brief', () => {
  for (const value of ['2027-02-28', '2027/2/28', '2027年2月28日']) {
    const date = resolveAdmissionDate(`汇总【入院时间：${value}】计划入院患者的准备情况。`, reference);
    assert.equal(date, '2027年02月28日');
    const answer = buildDemoReply('admission', { patientId: 'DEMO-001', date });
    assert.match(answer.content, /2027年02月28日/);
    assert.match(answer.content, /入院简报/);
    assert.doesNotMatch(answer.content, /明日入院简报/);
  }
  assert.equal(resolveAdmissionDate('【入院时间：10月20日】', reference), '2026年10月20日');
  assert.equal(resolveAdmissionDate('【入院时间：2028-02-29】', reference), '2028年02月29日');
});

test('invalid or incomplete explicit dates never silently become tomorrow', () => {
  for (const text of ['【入院时间：】', '【入院时间：2026-02-29】', '【入院时间：2026-13-01】', '【入院时间：2026-04-31】', '【入院时间：下个月】', '【入院时间：2026-10-20']) {
    assert.equal(resolveAdmissionDate(text, reference), undefined);
  }
});
