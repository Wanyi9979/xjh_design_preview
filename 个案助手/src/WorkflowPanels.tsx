import { useState } from 'react';
import { Alert, App as AntApp, Button, Checkbox, Collapse, Drawer, Empty, Input, Modal, Radio, Select, Space, Tag, Tooltip } from 'antd';
import { ArrowDownOutlined, ArrowRightOutlined, ArrowUpOutlined, CheckOutlined, CloseOutlined, CopyOutlined, DislikeFilled, DislikeOutlined, DownloadOutlined, EyeOutlined, LikeFilled, LikeOutlined, LinkOutlined, ShareAltOutlined } from '@ant-design/icons';
import { getFollowUpQuestions, type FollowUpQuestion } from './followUpQuestions';
import { briefTemplateFields, defaultTemplate, encodeSharePayload, exportAnswer, isBriefTask, patientDisplayLabel, scopedPatients, scopeLabel, tasks, validBriefContext, type AnswerSection, type BriefTemplate, type BriefType, type ChatMessage, type SharePayload, type SourceRecord } from './assistantData';

export function AnswerContent({ item, onPatientDetail }: { item: ChatMessage; onPatientDetail?: (patientId: string) => void }) {
  const admissionPatients = item.task === 'admission' && item.context && !item.edited ? scopedPatients('admission', item.context) : [];
  const patientSectionTitles = new Set(admissionPatients.map(patientDisplayLabel));
  return <article className="structured-answer">
    {item.edited && <div className="evidence-line"><Tag>已编辑</Tag></div>}
    {item.task === 'admission' && item.context && !item.edited && <AdmissionMarkdownBrief patients={admissionPatients} sections={item.sections ?? []} onPatientDetail={onPatientDetail} />}
    {item.sections && !item.edited ? item.sections.filter(section => !patientSectionTitles.has(section.title) && !(admissionPatients.length && section.title === '简报概览')).map(section => <section className="answer-section" key={section.title}><h4>{section.title}</h4><p>{section.body}</p></section>) : <p>{item.content}</p>}
    {item.evidence === 'input' && <p className="muted-note">当前基于规则整理，未调用 AI 服务；请结合原始内容使用。</p>}
    {item.edited && <p className="muted-note">引用对应编辑前的生成依据；新增内容需另行核对。</p>}
    {item.updatedAt && <p className="muted-note">本次会话更新于 {item.updatedAt}</p>}
  </article>;
}

function AdmissionMarkdownBrief({ patients, sections, onPatientDetail }: { patients: ReturnType<typeof scopedPatients>; sections: AnswerSection[]; onPatientDetail?: (patientId: string) => void }) {
  const sortedPatients = [...patients].sort((a, b) => `${a.treatmentGroup || '在治治疗组待确认'}${a.name}`.localeCompare(`${b.treatmentGroup || '在治治疗组待确认'}${b.name}`, 'zh-CN'));
  const compactTitles = new Set(['治疗阶段', '本次来院目的']);
  return <div className="admission-markdown">
    <h3>{tasks.admission.label}</h3>
    {sections.find(section => section.title === '简报概览') && <section className="admission-markdown-overview"><h4>简报概览</h4><p>{sections.find(section => section.title === '简报概览')!.body}</p></section>}
    {!patients.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="所选日期暂无入院患者" />}
    <div className="admission-markdown-patients">
      {sortedPatients.map((patient, index) => {
        const section = sections.find(section => section.patientId === patient.id || section.title === patientDisplayLabel(patient));
        const fields = (section?.fields ?? []).filter(field => !['患者信息', '风险与缺失', '待确认问题'].includes(field.title));
        const compactFields = fields.filter(field => compactTitles.has(field.title) && field.body.trim() && !/^暂无/.test(field.body.trim()));
        const renderField = (field: { title: string; body: string }) => <p key={field.title}><strong>{field.title}：</strong>{field.body}</p>;
        return <section className="admission-markdown-patient" key={patient.id} aria-label={`${patient.name}的入院简报`}>
          <div className="admission-markdown-patient-heading"><h4><span>{index + 1}. </span>{onPatientDetail ? <Button type="link" className="admission-markdown-patient-name" onClick={() => onPatientDetail(patient.id)}>{patient.name}</Button> : patient.name}</h4></div>
          <p>{patient.sex} · {patient.age} 岁 · {patient.cancerType}</p>
          <p>{patient.department} / {patient.treatmentGroup || '治疗组待确认'}</p>
          {compactFields.length > 0 && <div>{compactFields.map(renderField)}</div>}
        </section>;
      })}
    </div>
  </div>;
}

export function AnswerActions({ item, previousQuestion, loading, onUpdate, onEvent, onRecommend, onPreview, onSource }: {
  item: ChatMessage; previousQuestion?: string; loading?: boolean; onUpdate: (changes: Partial<ChatMessage>) => void; onEvent: (action: string) => void; onRecommend: (question: FollowUpQuestion) => void; onPreview?: () => void; onSource?: (source: SourceRecord) => void;
}) {
  const [source, setSource] = useState<SourceRecord>();
  const [pendingFeedback, setPendingFeedback] = useState<string>();
  const [reason, setReason] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const { message } = AntApp.useApp();
  const followUpQuestions = getFollowUpQuestions(item, previousQuestion);
  const currentFeedback = item.feedback === '有用' ? '有帮助' : item.feedback === '无用' || item.feedback === '答案有误' ? '需改进' : item.feedback;
  const closeFeedback = () => { setPendingFeedback(undefined); setReason(''); setSelectedReasons([]); };
  const [shareOpen, setShareOpen] = useState(false);
  const [answerCopied, setAnswerCopied] = useState(false);
  const generatedBrief = isBriefTask(item.task) && Boolean(item.context && validBriefContext(item.task, item.context));
  const sharePayload: SharePayload | undefined = item.task === 'admission' ? { title: tasks.admission.label, task: 'admission', patientLabel: scopeLabel(item.context) || '计划入院患者', date: item.context?.date, content: item.content, sections: item.sections, createdAt: item.updatedAt ?? new Date().toLocaleString('zh-CN'), edited: item.edited } : undefined;
  const openShare = () => {
    onEvent('生成简报分享链接');
    setShareOpen(true);
  };
  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(exportAnswer(item));
      setAnswerCopied(true);
      onEvent('复制文本');
      window.setTimeout(() => setAnswerCopied(false), 1600);
    } catch {
      setAnswerCopied(false);
    }
  };
  const feedbackButtons = [
    { value: '有帮助', label: '有帮助', icon: <LikeOutlined />, activeIcon: <LikeFilled /> },
    { value: '需改进', label: '需改进', icon: <DislikeOutlined />, activeIcon: <DislikeFilled /> },
  ];
  return <>
    {generatedBrief && item.task === 'admission' && <div className="answer-controls brief-action-controls"><Button type="primary" icon={<EyeOutlined />} onClick={onPreview}>查看简报详情</Button><Button icon={<ShareAltOutlined />} onClick={openShare}>分享简报</Button></div>}
    {!!item.sources?.length && <Collapse ghost className="source-collapse" items={[{ key: 'sources', label: `数据来源：已核对 ${item.sources.length} 份系统病历与计划`, children: <div className="source-list">{item.sources.map(record => { const [patientName, ...sourceParts] = record.title.split(' · '); const sourceTitle = sourceParts.length ? sourceParts.join(' · ') : record.title; return <Button type="link" className="source-record" key={record.id} onClick={() => record.target && onSource ? onSource(record) : setSource(record)}><span className="source-record-patient">{sourceParts.length ? patientName : ''}</span>{sourceParts.length > 0 && <span className="source-record-separator">·</span>}<span className="source-record-title">{sourceTitle}</span></Button>; })}</div> }]} />}
    <div className="answer-actions" aria-label="回答操作">
      <Tooltip title={answerCopied ? '已复制' : '复制文本'}><Button type="text" className="answer-icon-button" icon={answerCopied ? <CheckOutlined /> : <CopyOutlined />} aria-label={answerCopied ? '已复制文本' : '复制文本'} onClick={copyAnswer} /></Tooltip>
      {feedbackButtons.map(({ value, label, icon, activeIcon }) => {
        const selected = (pendingFeedback ?? currentFeedback) === value;
        return <Tooltip title={label} key={value}><Button type="text" className={`answer-icon-button${selected ? ' answer-icon-button-selected' : ''}`} icon={selected ? activeIcon : icon} aria-label={label} aria-pressed={selected} onClick={() => {
          if (selected) {
            if (pendingFeedback === value) {
              closeFeedback();
              return;
            }
            onUpdate({ feedback: undefined, feedbackReason: undefined, feedbackReasons: undefined });
            onEvent(`取消反馈：${value}`);
            closeFeedback();
            return;
          }
          if (value === '有帮助') {
            closeFeedback();
            onUpdate({ feedback: value, feedbackReason: undefined, feedbackReasons: undefined });
            onEvent(`反馈：${value}`);
            return;
          }
          setPendingFeedback(value);
          setReason(item.feedbackReason ?? '');
          setSelectedReasons(item.feedbackReasons ?? (item.feedback === '答案有误' ? ['内容不准确'] : []));
        }} /></Tooltip>;
      })}
    </div>
    {pendingFeedback && <section className="feedback-panel" aria-label="回答反馈"><div className="feedback-panel-heading"><div><strong>哪里需要改进？</strong><span>可多选，可不填</span></div><Button type="text" className="feedback-panel-close" aria-label="关闭反馈面板" icon={<CloseOutlined />} onClick={closeFeedback} /></div>
      <Checkbox.Group className="feedback-reasons" role="group" aria-label="反馈原因（可多选）" value={selectedReasons} onChange={values => setSelectedReasons(values as string[])} options={['内容不准确', '信息不完整', '没有回答我的问题', '表达不清楚', '建议不够具体']} />
      <label className="feedback-detail-label" htmlFor={`feedback-detail-${item.id}`}>补充说明（可选）</label><Input.TextArea id={`feedback-detail-${item.id}`} placeholder="还有哪些地方需要改进？" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} autoSize={{ minRows: 2, maxRows: 4 }} />
      <div className="feedback-panel-footer"><Button type="primary" size="small" onClick={() => {
        onUpdate({ feedback: '需改进', feedbackReason: reason.trim() || undefined, feedbackReasons: selectedReasons.length ? [...selectedReasons] : undefined });
        onEvent('反馈：需改进'); closeFeedback(); message.success('感谢反馈');
      }}>提交</Button></div></section>}
    {followUpQuestions.length > 0 && <section className="recommendations" aria-label="你可能想问"><div className="recommendations-heading">你可能想问</div>{followUpQuestions.map(question => <Button type="text" className="recommendation-question" key={question.label} disabled={loading} onClick={() => onRecommend(question)}><span>{question.label}</span><ArrowRightOutlined aria-hidden="true" /></Button>)}</section>}
    {sharePayload && <BriefShareModal payload={sharePayload} open={shareOpen} onClose={() => setShareOpen(false)} />}
    <Drawer title="引用来源" open={Boolean(source)} onClose={() => setSource(undefined)} size={480}>{source && <><Tag>原始资料</Tag><h3>{source.title}</h3><p className="muted-note">{source.path}<br />{source.updated}</p><p className="source-excerpt">{source.text}</p>{source.url && <Button href={source.url} target="_blank" rel="noreferrer">打开对应文件</Button>}<Alert type="info" title="仅用于核对当前记录，不属于正式医学知识库。" /></>}</Drawer>
  </>;
}

export function BriefShareModal({ payload, open, onClose }: { payload: SharePayload; open: boolean; onClose: () => void }) {
  const [shareCopied, setShareCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodeSharePayload(payload)}`;
  const qrUrl = `https://quickchart.io/qr?size=240&text=${encodeURIComponent(shareUrl)}`;
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1600);
    } catch {
      setShareCopied(false);
    }
  };
  const downloadQr = async () => {
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('二维码下载失败');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = '入院简报二维码.png';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      window.open(qrUrl, '_blank', 'noopener,noreferrer');
    }
  };
  return <Modal title="分享简报" open={open} onCancel={onClose} footer={null} width={520}>
    <div className="share-dialog"><p>可通过复制链接或微信/企业微信扫码查看简报。涉及患者隐私，请妥善保管分享链接。</p><div className="share-url-row"><Input aria-label="简报分享链接" value={shareUrl} readOnly /><Button className="share-copy-action" icon={<LinkOutlined />} onClick={copyShareLink}>{shareCopied ? '已复制' : '复制链接'}</Button></div><div className="qr-preview"><a href={shareUrl} target="_blank" rel="noreferrer" aria-label="打开分享简报"><img src={qrUrl} alt="简报分享二维码，点击打开" /></a><div className="qr-preview-content"><strong>扫码查看简报</strong><p>二维码和链接都指向同一个分享页。请勿把包含真实患者信息的链接发送给未授权人员。</p><Button type="primary" ghost icon={<DownloadOutlined />} onClick={downloadQr}>下载二维码图片</Button></div></div></div>
  </Modal>;
}

export function TemplateEditor({ value, onChange, task = 'admission' }: { value: BriefTemplate; onChange: (value: BriefTemplate) => void; task?: BriefType }) {
  const fields = briefTemplateFields[task];
  const move = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= value.fields.length) return;
    const fields = [...value.fields]; [fields[index], fields[index + direction]] = [fields[index + direction], fields[index]]; onChange({ ...value, fields });
  };
  return <div className="template-editor"><h4>简报模板字段</h4><Checkbox.Group aria-label="选择简报字段" value={value.fields} onChange={selected => onChange({ ...value, fields: [...selected as string[]] })} options={fields.map(field => ({ label: field, value: field }))} />
    <div className="field-order">{value.fields.map((field, index) => <div key={field}><span>{field}</span><Button type="text" aria-label={`上移${field}`} disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => move(index, -1)} /><Button type="text" aria-label={`下移${field}`} disabled={index === value.fields.length - 1} icon={<ArrowDownOutlined />} onClick={() => move(index, 1)} /></div>)}</div>
    <Radio.Group aria-label="简报篇幅" value={value.length} onChange={event => onChange({ ...value, length: event.target.value })} options={[{ label: '标准版', value: 'standard' }, { label: '精简版', value: 'short' }]} />
    <Input aria-label="重点关注" value={value.focus} maxLength={200} placeholder="优先关注的指标、症状或待办（可选）" onChange={event => onChange({ ...value, focus: event.target.value })} />
  </div>;
}

export function WorkflowSettings({ open, onClose, template, onTemplate, events }: { open: boolean; onClose: () => void; template: BriefTemplate; onTemplate: (value: BriefTemplate) => void; events: string[] }) {
  const [time, setTime] = useState('17:00');
  const [channel, setChannel] = useState('workbench');
  const [saved, setSaved] = useState(false);
  return <Drawer title="模板与推送" open={open} onClose={onClose} size={560}>
    <Alert type="info" title="设置仅对当前会话有效" description="尚未连接科室模板、推送通道和调度服务。" />
    <TemplateEditor value={template} onChange={onTemplate} /><Button onClick={() => onTemplate({ ...defaultTemplate, fields: [...defaultTemplate.fields] })}>恢复默认模板</Button>
    <section className="settings-section"><h3>每日入院简报</h3><label htmlFor="push-time">准备时间</label><Input id="push-time" type="time" value={time} onChange={event => { setTime(event.target.value); setSaved(false); }} /><label>接收位置</label><Select aria-label="推送接收位置" value={channel} onChange={value => { setChannel(value); setSaved(false); }} options={[{ value: 'workbench', label: '工作台消息' }, { value: 'wecom', label: '企业微信（待接入）' }]} /><p>流程：生成草稿 → 管案人员确认 → 推送</p><Space wrap><Button disabled={!time} onClick={() => setSaved(true)}>保存本次设置草稿</Button><Tag>{saved ? '设置草稿已保存 · 未启用' : '未启用自动推送'}</Tag></Space></section>
    <section className="settings-section"><h3>本次会话操作记录</h3>{events.length ? <ol className="audit-list">{events.map((event, index) => <li key={index}>{event}</li>)}</ol> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无操作记录" />}<p className="muted-note">仅记录本页面操作，刷新清空；不替代服务端审计。</p></section>
  </Drawer>;
}
