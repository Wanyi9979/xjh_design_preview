export type TaskType = 'knowledge' | 'call' | 'admission' | 'summary' | 'explain' | 'communication' | 'product';
export type BriefType = 'call' | 'admission' | 'summary';
export type DetailKind = 'patient' | 'admission' | 'followup';
export type BusinessPage = 'workbench' | 'patients' | 'admissions' | 'followups';
export type DetailTarget = { kind: DetailKind; patientId: string; tab?: string };
export type RecordLink = DetailTarget & { label: string };
export type QueryContext = { patientId: string; date?: string; template?: BriefTemplate; treatmentGroups?: string[]; patientIds?: string[]; departments?: string[] };
export type ChatMessage = { id: string; role: 'user' | 'ai'; content: string; task?: TaskType; context?: QueryContext; links?: RecordLink[]; sections?: AnswerSection[]; sources?: SourceRecord[]; recommendations?: string[]; evidence?: 'demo' | 'unavailable' | 'input'; edited?: boolean; updatedAt?: string; feedback?: string; feedbackReason?: string; feedbackReasons?: string[] };
export type Conversation = {
  key: string;
  title: string;
  group: string;
  messages: ChatMessage[];
  source?: 'manual' | 'automatic';
  updatedLabel?: string;
  automationId?: string;
};

export const tasks = {
  explain: { label: '通俗解释', placeholder: '粘贴已确认的专业内容，转换为患者能理解的表达…', question: '' },
  communication: { label: '沟通策略', placeholder: '描述沟通目标，例如：患者不想化疗，怎么开口？', question: '' },
  knowledge: { label: '医学知识速查', placeholder: '输入你想了解的医学知识…', question: '' },
  product: { label: '产品功能解答', placeholder: '描述你想了解的产品功能或操作…', question: '' },
  call: { label: '呼叫前简报', placeholder: '补充本次呼叫需要关注的事项…', question: '帮我生成呼叫前简报' },
  admission: { label: '入院简报', placeholder: '修改入院日期或补充需要核对的事项…', question: '汇总【入院时间：明日】计划入院患者的准备情况。' },
  summary: { label: '患者情况总结简报', placeholder: '补充希望总结的患者情况…', question: '帮我生成患者情况总结简报' },
} satisfies Record<TaskType, { label: string; placeholder: string; question: string }>;
export const briefTypes: BriefType[] = ['call', 'admission', 'summary'];
export const draftTaskPrompts = {
  explain: '请用通俗易懂的语言解释以下内容，保留关键数值、时间和注意事项：\n',
  communication: '请帮我制定沟通策略，给出开场方式、沟通重点和参考话术。沟通目标或情境如下：\n',
};
export function resolveAdmissionDate(text: string, reference = new Date()): string | undefined {
  const match = text.match(/【\s*入院时间\s*[:：]\s*([^】]*)】/);
  if (!match && /入院时间/.test(text)) return undefined;
  const value = match ? match[1].replace(/\s/g, '') : '明日';
  const date = new Date(reference);
  date.setHours(12, 0, 0, 0);
  const offsets: Record<string, number> = { 今日: 0, 今天: 0, 明日: 1, 明天: 1, 后天: 2 };
  if (Object.hasOwn(offsets, value)) {
    date.setDate(date.getDate() + offsets[value]);
  } else {
    const fullDate = value.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
    const shortDate = value.match(/^(\d{1,2})[-/.月](\d{1,2})日?$/);
    if (!fullDate && !shortDate) return undefined;
    const year = fullDate ? Number(fullDate[1]) : date.getFullYear();
    const month = Number(fullDate ? fullDate[2] : shortDate![1]);
    const day = Number(fullDate ? fullDate[3] : shortDate![2]);
    date.setFullYear(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  }
  return `${String(date.getFullYear()).padStart(4, '0')}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
}
export const detailLabels: Record<DetailKind, string> = { patient: '患者详情', admission: '入院准备', followup: '随访记录' };
export const pageLabels: Record<BusinessPage, string> = { workbench: '工作台', patients: '患者管理', admissions: '入院管理', followups: '随访管理' };

export const demoPatients = [
  { id: 'DEMO-001', name: '陈某', sex: '男', age: 63, cancerType: '乳腺癌', stage: '入院准备中', department: '肿瘤内科', treatmentGroup: '王医生组', careStatus: '住院管理中', admissionTime: '', bed: '待定', task: '入院前信息核对', time: '09:30', status: '待复核', admission: true, note: '检查资料已上传，待管案人员核对原始报告。', communication: '已联系患者，入院时间和携带资料待再次确认。' },
  { id: 'DEMO-002', name: '吴某', sex: '男', age: 61, cancerType: '肺癌', stage: '入院准备中', department: '肿瘤内科', treatmentGroup: '陈医生组', careStatus: '离院管理中', admissionTime: '', bed: '待定', task: '补充入院检查资料', time: '10:00', status: '待补充', admission: true, note: '部分检查资料尚未上传，待确认报告获取情况。', communication: '患者已收到资料清单，待补充上传后复核。' },
  { id: 'DEMO-003', name: '李某', sex: '女', age: 58, cancerType: '结直肠癌', stage: '随访中', department: '肿瘤内科', treatmentGroup: '王医生组', careStatus: '治疗完成随访中', admissionTime: '', bed: '—', task: '完成本次随访沟通', time: '14:00', status: '待联系', admission: false, note: '本次随访待完成，需补充近况与沟通记录。', communication: '上次沟通已归档，本次随访待联系。' },
];
export type Patient = (typeof demoPatients)[number];
export const getPatient = (id: string) => demoPatients.find(patient => patient.id === id);
export const patientDisplayLabel = (patient?: Patient) => patient ? `${patient.name} · ${patient.sex} · ${patient.age} 岁` : '未知患者';
export function scopedPatients(task: TaskType, context: QueryContext) {
  const eligible = task === 'admission' ? demoPatients.filter(patient => patient.admission) : demoPatients;
  if (context.patientId !== 'all') return eligible.filter(patient => patient.id === context.patientId);
  if (context.patientIds?.length) return eligible.filter(patient => context.patientIds?.includes(patient.id));
  if (context.departments?.length) return eligible.filter(patient => context.departments?.includes(patient.department));
  if (context.treatmentGroups?.length) return eligible.filter(patient => context.treatmentGroups?.includes(patient.treatmentGroup));
  return eligible;
}
export function validBriefContext(task: BriefType, context: QueryContext) {
  if (task === 'admission') return Boolean(context.date) && scopedPatients(task, context).length > 0;
  if (context.patientId === 'all' && !context.patientIds?.length && !context.departments?.length && !context.treatmentGroups?.length) return false;
  return scopedPatients(task, context).length > 0;
}
export function scopeLabel(context?: QueryContext) {
  if (!context) return '';
  if (context.patientId !== 'all') return patientDisplayLabel(getPatient(context.patientId));
  if (context.patientIds?.length) return `已选${context.patientIds.length}位患者`;
  if (context.departments?.length) return `${context.departments.join('、')}的患者`;
  return context.treatmentGroups?.length ? `${context.treatmentGroups.join('、')}的计划入院患者` : '全部计划入院患者';
}

export type AnswerSection = { title: string; body: string; patientId?: string; fields?: { title: string; body: string }[] };
export type SourceRecord = { id: string; title: string; path: string; updated: string; text: string; url?: string; target?: DetailTarget };
export type BriefTemplate = { fields: string[]; length: 'short' | 'standard'; focus: string };
export const briefTemplateFields: Record<BriefType, string[]> = {
  call: ['一、患者基本信息', '二、历史不良反应记录', '三、近期待执行计划'],
  admission: ['治疗阶段', '上次治疗时间', '治疗方案', '本次来院目的', '血常规', '血生化', '凝血', '甲功', '心肌酶', '肿瘤标志物', '非血液不良反应'],
  summary: ['患者信息', '诊断信息', '治疗史', '既往病史与合并症', '历史不良反应', '近期检验与检查情况'],
};
export const templateFields = briefTemplateFields.admission;
export const defaultTemplate: BriefTemplate = { fields: [...templateFields], length: 'standard', focus: '' };
export const getDefaultTemplate = (task: BriefType): BriefTemplate => ({ fields: [...briefTemplateFields[task]], length: 'standard', focus: '' });
export const isBriefTask = (task?: TaskType): task is BriefType => Boolean(task && briefTypes.includes(task as BriefType));
export function detectIntent(text: string): TaskType | undefined {
  if (text.startsWith(draftTaskPrompts.communication.trimEnd())) return 'communication';
  if (text.startsWith(draftTaskPrompts.explain.trimEnd())) return 'explain';
  if (/产品功能|如何生成简报|如何查看任务记录|如何分享简报|任务中心.*怎么|怎么.*任务中心/.test(text)) return 'product';
  if (/通俗|听得懂|看得懂|大白话|解释.*报告|报告.*解释/.test(text)) return 'explain';
  if (/怎么开口|不想化疗|拒绝|沟通|话术|劝说/.test(text)) return 'communication';
  if (/入院|住院准备/.test(text)) return 'admission';
  if (/呼叫|通话前|电话前/.test(text)) return 'call';
  if (/患者.*总结|总结.*患者/.test(text)) return 'summary';
  if (/升白|血象|医学|化疗|营养|副作用|多久|如何|什么/.test(text)) return 'knowledge';
}
export function preparation(patient: Patient) {
  const uploaded = patient.id === 'DEMO-001';
  return {
    checks: [
      { label: '患者基本信息', status: '已登记', done: true, detail: `${patient.sex}，${patient.age} 岁，${patient.department}` },
      { label: '检查报告资料', status: uploaded ? '已上传 · 待复核' : '待补充', done: false, detail: patient.note },
      { label: '入院前沟通', status: '待确认', done: false, detail: patient.communication },
    ],
    blocker: uploaded ? '原始报告尚未复核；入院时间与携带资料待确认。' : '未查到完整检查资料；需确认报告获取情况并补充。',
    labs: uploaded ? '资料已上传；具体项目、数值、参考范围及报告日期暂无可核对记录。' : '未查询到完整报告；不等于检查未完成。',
  };
}
export function patientSources(patient: Patient): SourceRecord[] {
  return [
    { id: `${patient.id}-base`, title: `${patient.name} · 基本信息与计划`, path: `患者记录 / ${patient.id} / 基本信息`, updated: '当前记录 · 无原始更新时间', text: `${patient.sex}，${patient.age} 岁；${patient.department}；${patient.stage}。当前待办：${patient.task}。计划处理时间：${patient.time}（非入院时间）。`, target: { kind: 'patient', patientId: patient.id, tab: 'plan' } },
    { id: `${patient.id}-report`, title: `${patient.name} · 资料核对记录`, path: `患者记录 / ${patient.id} / 资料核对`, updated: '当前记录 · 无原始更新时间', text: patient.note, target: { kind: 'patient', patientId: patient.id, tab: 'records' } },
    { id: `${patient.id}-contact`, title: `${patient.name} · 沟通记录`, path: `患者记录 / ${patient.id} / 沟通`, updated: '当前记录 · 无原始更新时间', text: patient.communication, target: { kind: 'patient', patientId: patient.id, tab: 'followup' } },
  ];
}
export const demoKnowledge: SourceRecord[] = [
  { id: 'admission-check', title: '入院准备需要核对哪些资料？', path: '本地流程资料 / 入院资料核对', updated: '流程资料 · 非医学指南', url: '/knowledge/admission-check.html', text: '核对有效入院计划、治疗计划、最近一次院前复查要求、检验检查报告、随访及咨询记录。缺失信息单独列为待核实事项。报告已上传不等于已复核，未查询到记录不等于未发生。' },
  { id: 'brief-check', title: '如何核对简报中的缺失信息？', path: '本地流程资料 / 简报核对', updated: '流程资料 · 非医学指南', url: '/knowledge/brief-check.html', text: '逐项核对简报与原始记录；记录来源、时间及缺失项目。没有记录时显示暂无资料，不补写诊断、治疗周期或检验结果。编辑后重新确认简报。' },
  { id: 'talk-check', title: '患者沟通前需要准备哪些信息？', path: '本地流程资料 / 沟通准备', updated: '流程资料 · 非医学指南', url: '/knowledge/talk-check.html', text: '明确本次沟通目标，查看最近沟通及未完成事项。先了解患者主要顾虑，再核对其理解和待确认问题。使用已确认的信息，不承诺疗效或代替医生作出治疗决定。' },
];
export const productHelp = [
  { question: '如何生成简报？', keywords: /简报|患者范围|选择患者/, answer: '点击输入框上方的“简报”，选择呼叫前简报、入院简报或患者情况总结简报，再在输入框左下角选择患者范围。入院简报会填入含“【入院时间：明日】”的提示词，可以将“明日”改为具体日期，例如“2026-10-20”。补充关注事项后点击发送，生成后可点击“查看简报详情”。' },
  { question: '如何查看任务记录？', keywords: /任务记录|任务中心|定时任务|历史/, answer: '点击助手顶部的时钟图标打开“任务中心”。在“任务记录”中可以搜索任务、按最近任务或患者查看记录，并点击记录继续查看对话；在“定时任务”中可以查看和设置自动生成简报的任务。点击顶部的新建任务图标可开始新任务。' },
  { question: '如何分享简报？', keywords: /分享|复制链接|二维码/, answer: '生成入院简报后，点击回答下方的“分享简报”，或简报详情顶部的分享图标。在弹窗中可以复制链接或下载二维码图片，接收者通过链接或扫码查看简报。涉及患者隐私，请妥善保管分享链接。' },
];
export function editAnswer(answer: ChatMessage, content: string, time: string): ChatMessage {
  return { ...answer, content, sections: undefined, edited: true, updatedAt: time };
}
export function exportAnswer(answer: ChatMessage) {
  return `${answer.edited ? '含人工编辑内容，引用仅对应原始生成依据\n' : ''}${answer.content}\n\n来源\n${answer.sources?.map(source => `${source.title} | ${source.path} | ${source.updated}\n${source.text}`).join('\n\n') || '无可用引用'}`;
}

export type SharePayload = { title: string; task: BriefType; patientLabel: string; date?: string; content: string; sections?: AnswerSection[]; createdAt: string; edited?: boolean };
export function encodeSharePayload(payload: SharePayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export function decodeSharePayload(encoded: string): SharePayload | undefined {
  try {
    const padded = encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharePayload;
  } catch { return undefined; }
}

function briefBodies(task: BriefType, patient: Patient) {
  const common = `${patient.name}，${patient.age} 岁，${patient.sex}，病案号：${patient.id}。`;
  if (task === 'call') return [
    ['一、患者基本信息', `患者姓名：${patient.name}，年龄：${patient.age} 岁，性别：${patient.sex}，与患者关系（患者信息）：暂无可核对资料。\n既往病史：癌种：暂无可核对资料；${patient.note}\n目前为治疗阶段（病程概要）：${patient.stage}。\n既往重要合并症（病程概要）：暂无可核对资料。\n治疗方案：暂无可核对资料。`],
    ['二、历史不良反应记录', '复查计划、随访计划及咨询记录：暂无历史不良反应的结构化记录。\n不良事件名称、发生时间、既往跟进处置动作及当前状态：暂无可核对资料。\n回溯一个周期（从上一次创建计划）。'],
    ['三、近期待执行计划', `查询范围：当前时间前后7天。\n1. 复查计划：${patient.id === 'DEMO-001' ? '资料已上传，待复核' : '待补充'}。\n2. 随访计划：${patient.communication}。\n3. 下次来院时间：${patient.time}（工作台计划时间，非入院时间）。`],
  ];
  if (task === 'admission') {
    const reportStatus = patient.id === 'DEMO-001' ? '已上传，待复核' : '未上传';
    const reportDate = '2026年09月28日';
    const reportData: Record<string, string> = {
      血常规: '白细胞 6.20×10⁹/L（正常）；血红蛋白 108 g/L（偏低）；血小板 185×10⁹/L（正常）',
      血生化: '丙氨酸氨基转移酶 32 U/L（正常）；肌酐 71 μmol/L（正常）；白蛋白 36 g/L（偏低）',
      凝血: '凝血酶原时间 12.8 s（正常）；D-二聚体 0.82 mg/L FEU（偏高）',
      甲功: '促甲状腺激素 2.16 mIU/L（正常）；游离甲状腺素 15.2 pmol/L（正常）',
      心肌酶: '肌酸激酶同工酶 18 U/L（正常）；肌钙蛋白I 0.012 ng/mL（正常）',
      肿瘤标志物: '癌胚抗原 8.6 ng/mL（偏高）；糖类抗原19-9 24.1 U/mL（正常）',
    };
    const reportBody = (name: string) => reportData[name] && patient.id === 'DEMO-001'
      ? `检查日期：${reportDate}\n${reportData[name]}`
      : `状态：${reportStatus}。\n最近一次${name}指标：暂无可核对数据。`;
    return [
      ['患者信息', `${common}\n入院科室：${patient.department}。`],
      ['治疗阶段', '新辅（第9周期）'],
      ['上次治疗时间', '暂无可核对资料。'],
      ['治疗方案', '暂无可核对资料。'],
      ['本次来院目的', `${patient.task}。`],
      ['血常规', reportBody('血常规')],
      ['血生化', reportBody('血生化')],
      ['凝血', reportBody('凝血')],
      ['甲功', reportBody('甲功')],
      ['心肌酶', reportBody('心肌酶')],
      ['肿瘤标志物', reportBody('肿瘤标志物')],
      ['非血液不良反应', '回溯范围：上个周期及本周期，最多向前追溯42天。\n不良事件名称、发生时间、处置及当前状态：暂无结构化记录。'],
    ];
  }
  return [
    ['患者信息', `${common}\n与患者关系：暂无可核对资料；联系电话：暂无资料；入组时间：暂无资料。`],
    ['诊断信息', '癌种、确诊时间、病理类型/分期、分子分型/关键检测及转移情况：暂无可核对资料。'],
    ['治疗史', `手术、化疗、放疗、靶向、内分泌及其他治疗：暂无可核对资料。\n当前阶段：${patient.stage}。`],
    ['既往病史与合并症', `既往重要合并症：暂无可核对资料。\n当前待办：${patient.note}`],
    ['历史不良反应', '暂无历史不良反应的结构化记录；未查询到记录不等于未发生。'],
    ['近期检验与检查情况', `复查计划：${patient.task}，当前状态：${patient.status}。\n最近一次检查时间：暂无资料。\n异常指标与处理：${patient.communication}`],
  ];
}
export function buildDemoReply(task: TaskType | undefined, context?: QueryContext, question = ''): Pick<ChatMessage, 'content' | 'links' | 'sections' | 'sources' | 'recommendations' | 'evidence'> {
  if (!task) return { content: '我可以协助医学知识速查、简报、通俗解释、沟通策略和产品功能解答。请选择任务或描述具体目标。当前未连接真实业务系统或 AI 服务。', evidence: 'unavailable' };
  if (task === 'product') {
    const guide = productHelp.find(item => question.trim() === item.question)
      ?? [...productHelp].reverse().find(item => item.keywords.test(question));
    return guide ? { content: guide.answer, evidence: 'demo' } : {
      content: '请描述你想了解的功能或操作。你可以先查看以下常用操作说明；其他问题目前尚未接入产品帮助知识库。',
      recommendations: productHelp.map(item => item.question), evidence: 'unavailable',
    };
  }
  if (task === 'knowledge') {
    const source = demoKnowledge.find(source => question.trim() === source.title);
    return source ? { content: source.text, sources: [source], evidence: 'demo' } : {
      content: '未检索到可引用的知识。正式医学知识库尚未接入，目前只能查看以下管案流程资料。\n\n通用 AI 服务也尚未接入，暂不能继续生成医学答案；不会展示虚构的文献或来源。',
      evidence: 'unavailable', recommendations: demoKnowledge.map(source => source.title),
    };
  }
  if (task === 'communication') {
    const concern = /不想化疗|拒绝/.test(question) ? '对继续治疗的顾虑' : '当前最在意的问题';
    const sections = [
      { title: '开场方式建议', body: `“我想先听听您${concern}，方便和我说说吗？我们可以一起整理，再向主管医生确认。”` },
      { title: '沟通重点与分层话术', body: '先倾听：“最让您担心的是什么？”\n再澄清：“我理解您在意的是这些方面，对吗？”\n再协商：“哪些问题需要请医生进一步解释？我们一起列出来。”\n避免施压、替患者做决定或承诺疗效。' },
      { title: '需向患者确认的问题', body: '1. 您目前最主要的顾虑和沟通目标是什么？\n2. 您对现有信息有哪些不理解的地方？\n3. 是否愿意与主管医生进一步沟通？是否希望家属参与？' },
    ];
    return { sections, content: `沟通策略草稿（规则整理）\n沟通目标：${question}\n\n${sections.map(s => `${s.title}\n${s.body}`).join('\n\n')}\n\n未调用 AI，使用前请结合实际情况调整。`, evidence: 'input' };
  }
  if (task === 'explain') {
    // Preserve every number and qualifier: this demo only expands a short explicit vocabulary.
    const original = (question.startsWith(draftTaskPrompts.explain.trimEnd())
      ? question.slice(draftTaskPrompts.explain.trimEnd().length)
      : question.replace(/^.*?(?:通俗解释[:：]|用通俗的话解释[:：])/, '')).trim();
    const glossary: [string, string][] = [['复查', '再次检查'], ['遵医嘱', '按照医生的安排'], ['随访', '后续定期联系、了解您的情况'], ['预后', '病情今后可能的发展情况']];
    let plain = original;
    for (const [word, definition] of glossary) plain = plain.replaceAll(word, `${word}（${definition}）`);
    const sections = [{ title: '原始内容', body: original || '请粘贴已确认的专业内容。' }, { title: '患者版草稿', body: plain || '暂无待解释内容。' }, { title: '需保留的信息', body: '原文中的数值、时间、否定表述和风险提示均保留。当前仅解释少量术语；不解读未确认的诊断或治疗建议。' }];
    return { sections, content: `通俗化解释（术语展开）\n\n${sections.map(s => `${s.title}\n${s.body}`).join('\n\n')}`, evidence: 'input' };
  }
  if (!context || !validBriefContext(task, context)) return { content: '尚未选择有效的患者或查询范围，请确认后重新生成。', evidence: 'unavailable' };
  const patients = scopedPatients(task, context);
  const template = context.template ?? getDefaultTemplate(task);
  const sections: AnswerSection[] = [];
  if (task === 'admission') {
    const groups = new Set(patients.map(patient => patient.treatmentGroup || '在治治疗组待确认'));
    sections.push({ title: '简报概览', body: `${context.date || '日期待确认'} · ${patients.length} 位患者 · ${groups.size} 个治疗组` });
  }
  if (template.focus.trim()) sections.push({ title: '本次重点关注', body: `${template.focus.trim()}\n以下仅整理已有记录，未检索到的内容列为待核实。` });
  for (const patient of patients) {
    const bodies: Record<string, string> = Object.fromEntries(briefBodies(task, patient));
    const aliases: Record<string, string> = { '基本情况': '患者信息', '治疗信息': '治疗与来院目的', '近期记录': '近期执行计划', '检验检查': '近期检验与检查情况' };
    const requestedFields = template.fields.length ? template.fields : briefTemplateFields[task];
    const fields = [...new Set(requestedFields)]
      .map(field => aliases[field] ?? field)
      .filter(field => field in bodies && !['风险与缺失', '待确认问题'].includes(field));
    const patientFields = fields.map(field => ({ title: field, body: template.length === 'short' ? bodies[field].split('\n')[0] : bodies[field] }));
    sections.push({ title: patientDisplayLabel(patient), patientId: patient.id, fields: patientFields, body: patientFields.map(field => `${field.title}\n${field.body}`).join('\n\n') });
  }
  const heading = `${tasks[task].label}\n${context.date ? context.date + ' · ' : ''}${scopeLabel(context)}`;
  return { sections, content: `${heading}\n\n${sections.map(section => `${section.title}\n${section.body}`).join('\n\n')}\n\n以上内容基于当前可用记录，未查询到记录不等于未发生。`, evidence: 'demo', sources: patients.flatMap(patientSources), links: patients.map(patient => ({ kind: 'patient', patientId: patient.id, label: `${patient.name} · 查看患者详情` })) };
}

export function makeInitialConversations(tomorrow: string): Conversation[] {
  const rows: { key: string; title: string; task: TaskType; group: string; context?: QueryContext; source?: 'manual' | 'automatic'; updatedLabel: string; automationId?: string }[] = [
    { key: 'demo-1', title: '陈某的呼叫前简报', task: 'call', group: '今天', context: { patientId: 'DEMO-001' }, source: 'automatic', updatedLabel: '09:30', automationId: 'auto-call' },
    { key: 'demo-2', title: '明日入院准备情况', task: 'admission', group: '今天', context: { patientId: 'all', date: tomorrow }, source: 'automatic', updatedLabel: '08:00', automationId: 'auto-admission' },
    { key: 'demo-3', title: '李某的患者情况总结', task: 'summary', group: '昨天', context: { patientId: 'DEMO-003' }, source: 'manual', updatedLabel: '16:20' },
    { key: 'demo-4', title: '随访沟通的知识查询', task: 'knowledge', group: '昨天', source: 'manual', updatedLabel: '11:05' },
  ];
  return rows.map(row => ({ key: row.key, title: row.title, group: row.group, source: row.source, updatedLabel: row.updatedLabel, automationId: row.automationId, messages: [
    { id: `${row.key}-q`, role: 'user', content: row.title, task: row.task, context: row.context },
    { id: `${row.key}-a`, role: 'ai', task: row.task, context: row.context, ...buildDemoReply(row.task, row.context) },
  ] }));
}
