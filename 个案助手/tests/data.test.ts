import assert from 'node:assert/strict';
import test from 'node:test';
import { briefTypes, buildDemoReply, makeInitialConversations, scopedPatients, tasks, validBriefContext } from '../src/assistantData.ts';

test('three agreed brief types and no obsolete reaction mode', () => {
  assert.deepEqual(briefTypes.map(type => tasks[type].label), ['呼叫前简报', '入院简报', '患者情况总结简报']);
});
test('single-patient admission brief and links respect the selected patient', () => {
  const answer = buildDemoReply('admission', { patientId: 'DEMO-002', date: '2026年09月19日' });
  assert.match(answer.content, /简报概览/);
  assert.match(answer.content, /2026年09月19日 · 1 位患者 · 1 个治疗组/);
  assert.doesNotMatch(answer.content, /DEMO-001|DEMO-003/);
  assert.deepEqual(answer.links?.map(link => link.patientId), ['DEMO-002']);
});
test('tomorrow admission only includes eligible patients', () => {
  assert.equal(scopedPatients('admission', { patientId: 'all' }).length, 2);
  assert.equal(validBriefContext('admission', { patientId: 'DEMO-003', date: '2026年09月19日' }), false);
});
test('admission card details preserve template order and patient-specific content', () => {
  const answer = buildDemoReply('admission', { patientId: 'all', date: '2026年09月22日', template: { fields: ['血生化', '患者信息'], length: 'standard', focus: '' } });
  const cards = answer.sections?.filter(section => section.patientId) ?? [];
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.deepEqual(card.fields?.map(field => field.title), ['血生化', '患者信息', '风险与缺失', '待确认问题']);
    assert.equal(card.body, card.fields?.map(field => `${field.title}\n${field.body}`).join('\n\n'));
    assert.match(card.body, new RegExp(card.patientId!));
    assert.doesNotMatch(card.body, new RegExp(card.patientId === 'DEMO-001' ? 'DEMO-002' : 'DEMO-001'));
  }
});
test('admission treatment stage keeps only the cycle label', () => {
  const answer = buildDemoReply('admission', { patientId: 'DEMO-001', date: '2026年09月22日' });
  const treatmentStage = answer.sections?.find(section => section.patientId === 'DEMO-001')?.fields?.find(field => field.title === '治疗阶段');
  assert.equal(treatmentStage?.body, '新辅（第9周期）');
});
test('patient briefs require a concrete patient and do not silently default', () => {
  for (const task of ['call', 'summary'] as const) {
    assert.equal(validBriefContext(task, { patientId: '' }), false);
    assert.equal(validBriefContext(task, { patientId: 'all' }), false);
    assert.equal(validBriefContext(task, { patientId: 'DEMO-001' }), true);
    assert.match(buildDemoReply(task).content, /尚未选择/);
  }
});
test('removing a task gives ordinary chat without patient context', () => {
  const answer = buildDemoReply(undefined);
  assert.equal(answer.links, undefined);
  assert.doesNotMatch(answer.content, /DEMO-/);
});
test('each patient brief links only to that patient', () => {
  for (const task of ['call', 'summary'] as const) {
    const answer = buildDemoReply(task, { patientId: 'DEMO-003' });
    assert.ok(answer.links?.every(link => link.patientId === 'DEMO-003'));
    assert.match(answer.content, /李某/);
  }
});
test('histories and links retain explicit task context', () => {
  const histories = makeInitialConversations('2026年09月19日');
  assert.equal(new Set(histories.map(chat => chat.key)).size, histories.length);
  for (const chat of histories) {
    assert.equal(chat.messages[0].role, 'user');
    assert.equal(chat.messages[1].role, 'ai');
    assert.equal(chat.messages[1].role, 'ai');
  }
});
