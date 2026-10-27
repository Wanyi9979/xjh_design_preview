import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoReply, demoKnowledge, detectIntent, productHelp, type ChatMessage, type TaskType } from '../src/assistantData.ts';
import { getFollowUpQuestions } from '../src/followUpQuestions.ts';

const answer = (task?: TaskType, content = '当前回答'): ChatMessage => ({ id: 'test', role: 'ai', task, content });

test('completed answers in every task offer a compact, non-duplicated question list', () => {
  for (const task of [undefined, 'knowledge', 'product', 'call', 'admission', 'summary', 'explain', 'communication'] as const) {
    const questions = getFollowUpQuestions(answer(task));
    assert.ok(questions.length >= 2 && questions.length <= 3);
    assert.equal(new Set(questions.map(question => question.label)).size, questions.length);
    assert.ok(questions.every(question => question.prompt.trim()));
  }
  assert.deepEqual(getFollowUpQuestions({ ...answer(), role: 'user' }), []);
  assert.deepEqual(getFollowUpQuestions(answer(undefined, '')), []);
});

test('workflow and product suggestions do not repeat the question just answered', () => {
  for (const guide of productHelp) {
    const item = { ...answer('product'), ...buildDemoReply('product', undefined, guide.question) };
    const suggestions = getFollowUpQuestions(item, guide.question);
    assert.equal(suggestions.length, 2);
    assert.ok(suggestions.every(question => question.task === 'product' && question.prompt !== guide.question));
  }
  for (const source of demoKnowledge) {
    const suggestions = getFollowUpQuestions(answer('knowledge'), source.title);
    assert.equal(suggestions.length, 2);
    assert.ok(suggestions.every(question => question.task === 'knowledge' && question.prompt !== source.title));
  }
});

test('existing fallback recommendations remain supported and capped at three', () => {
  const item = { ...answer('knowledge'), ...buildDemoReply('knowledge', undefined, '未匹配的问题') };
  assert.deepEqual(getFollowUpQuestions(item).map(question => question.label), demoKnowledge.map(source => source.title));
  assert.equal(getFollowUpQuestions({ ...item, recommendations: ['问题一', '问题一', '问题二', '问题三', '问题四'] }).length, 3);
});

test('explanation and communication suggestions carry original content as editable plain-text prompts', () => {
  const content = '通俗解释草稿：患者复查时间为2026-10-20，询问如何生成简报。';
  for (const task of ['summary', 'explain', 'communication'] as const) {
    for (const question of getFollowUpQuestions(answer(task, content)).filter(question => question.task === 'explain' || question.task === 'communication')) {
      assert.ok(question.prompt.includes(content));
      assert.equal(detectIntent(question.prompt), question.task);
    }
  }
});
