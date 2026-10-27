import { writeFileSync } from 'node:fs';
import { demoKnowledge } from '../src/assistantData.ts';
const escape = text => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[value]));
for (const source of demoKnowledge) writeFileSync(`public${source.url}`, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(source.title)}</title><link rel="stylesheet" href="/knowledge/document.css"><main><p>CARES · 本地示例资料 · 非医学指南</p><h1>${escape(source.title)}</h1><p>${escape(source.path)}</p><p>${escape(source.updated)}</p><article>${escape(source.text)}</article><footer>此文件为交互原型中的流程说明，不是临床知识库或医疗建议。正式知识库来源待接入：个案管理中心库 → 个案管理培训资料 → 细分癌种课件。</footer></main></html>`);
