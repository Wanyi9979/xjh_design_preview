import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoReply, detectIntent, productHelp } from '../src/assistantData.ts';

test('product help answers operation questions without exposing selected patient records', () => {
  for (const guide of productHelp) {
    const answer = buildDemoReply('product', { patientId: 'DEMO-002' }, guide.question);
    assert.equal(answer.content, guide.answer);
    assert.equal(answer.links, undefined);
    assert.equal(answer.sources, undefined);
    assert.doesNotMatch(answer.content, /DEMO-|吴某|肺癌/);
    assert.equal(detectIntent(guide.question), 'product');
  }
});

test('unrecognized product questions offer supported guides rather than medical answers', () => {
  const answer = buildDemoReply('product', undefined, '怎么设置账户密码？');
  assert.equal(answer.evidence, 'unavailable');
  assert.deepEqual(answer.recommendations, productHelp.map(item => item.question));
  assert.equal(buildDemoReply('product', undefined, '简报的二维码怎么下载？').content, productHelp[2].answer);
  assert.equal(detectIntent('如何缓解化疗副作用'), 'knowledge');
});
