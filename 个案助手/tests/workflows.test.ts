import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { buildDemoReply, defaultTemplate, demoKnowledge, detectIntent, editAnswer, exportAnswer, type ChatMessage } from '../src/assistantData.ts';
test('unknown clinical questions never fabricate sources or AI output', () => {
  const answer = buildDemoReply('knowledge', undefined, '升白针后多久血象回升');
  assert.equal(answer.sources, undefined);
  assert.equal(answer.evidence, 'unavailable');
  assert.match(answer.content, /尚未接入/);
  assert.equal(answer.recommendations?.length, 3);
});
test('all demo citations open actual packaged files', () => {
  for (const source of demoKnowledge) {
    const answer = buildDemoReply('knowledge', undefined, source.title);
    assert.equal(answer.sources?.[0].text, answer.content);
    assert.ok(existsSync(`public${source.url}`));
  }
});
test('sparse templates keep risks and patient sources remain in scope', () => {
  const answer = buildDemoReply('admission', { patientId: 'DEMO-002', date: '2026年09月21日', template: { ...defaultTemplate, fields: ['基本情况'], length: 'short', focus: '报告时间' } });
  assert.match(answer.content, /风险与缺失/);
  assert.match(answer.content, /报告时间/);
  assert.doesNotMatch(answer.content, /陈某|李某/);
  assert.ok(answer.sources?.every(source => source.id.startsWith('DEMO-002')));
  assert.match(answer.content, /无法判断/);
});
test('edited output resets share state and exports the new text with provenance', () => {
  const item: ChatMessage = { id: 'x', role: 'ai', task: 'admission', content: 'old', shared: true, sections: [{ title: 'old', body: 'old' }] };
  const updated = editAnswer(item, '新草稿', '10:00');
  assert.equal(updated.shared, false);
  assert.equal(updated.sections, undefined);
  assert.match(exportAnswer(updated), /新草稿/);
  assert.doesNotMatch(exportAnswer(updated), /old/);
  assert.match(exportAnswer(updated), /未分享/);
});
test('plain-language demo retains values, negatives and risk warnings', () => {
  const original = '未排除风险，请遵医嘱于3天后复查。数值1.02，不可自行停药。';
  const answer = buildDemoReply('explain', undefined, `用通俗的话解释：${original}`);
  assert.equal(answer.sections?.[0].body, original);
  assert.match(answer.sections![1].body, /1.02/);
  assert.match(answer.sections![1].body, /不可自行停药/);
  assert.match(answer.sections![1].body, /未排除风险/);
});
test('communication and explanation route before clinical keywords', () => {
  assert.equal(detectIntent('患者不想化疗，怎么开口'), 'communication');
  assert.equal(detectIntent('用通俗的话解释报告'), 'explain');
  assert.equal(detectIntent('明日入院准备'), 'admission');
  assert.equal(buildDemoReply('communication', undefined, '患者不想化疗').sections?.length, 3);
});
