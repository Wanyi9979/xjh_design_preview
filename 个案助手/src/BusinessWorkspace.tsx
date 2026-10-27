import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Dropdown, Empty, Input, Segmented, Select, Table, Tag } from 'antd';
import { AppstoreOutlined, ArrowLeftOutlined, BellOutlined, CalendarOutlined, CarryOutOutlined, CheckOutlined, ClockCircleOutlined, DownOutlined, EditOutlined, ExperimentOutlined, HomeOutlined, MessageOutlined, NotificationOutlined, ScheduleOutlined, SearchOutlined, SolutionOutlined, SyncOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { preparation, type BriefType, type TaskType, demoPatients, getPatient, pageLabels, type BusinessPage, type DetailTarget, type Patient } from './assistantData';

export function PatientDetail({ target, onBack, onBrief }: {
  target: DetailTarget; onBack: () => void;
  onBrief: (patientId?: string, task?: BriefType) => void;
}) {
  const patient = getPatient(target.patientId);
  const [activeTab, setActiveTab] = useState('plan');
  useEffect(() => setActiveTab(target.tab ?? 'plan'), [target.patientId, target.tab]);
  if (!patient) return <Empty description="未找到患者" />;
  const planRows = [
    { date: '2026/08/12', type: '营养评估', content: '营养评估问卷', status: '已失效' },
    { date: '2026/08/12', type: '患者随访', content: '个性提醒测试', status: '已失效' },
    { date: '2026/08/18', type: '提醒计划', content: 'coc1.9.3－提醒计划', status: '已完成' },
    { date: '2026/08/18', type: '复查计划', content: '血常规 coc1.9.3－复查计划－检验', status: '无需跟踪' },
    { date: '2026/08/18', type: '复查计划', content: 'coc1.9.3－复查计划－检查计划CT', status: '无需跟踪' },
    { date: '2026/08/18', type: '患者随访', content: '不良反应问卷2', status: '已失效' },
    { date: '2026/08/18', type: '到院计划', content: '住院', status: '已终止' },
    { date: '2026/08/18', type: '到院计划', content: '日间', status: '已终止' },
    { date: '2026/08/18', type: '到院计划', content: '门诊', status: '已终止' },
    { date: '2026/08/18', type: '到院计划', content: '自定义', status: '已终止' },
    { date: '2026/08/18', type: '营养评估', content: '营养评估问卷', status: '已填写' },
  ];
  const tabs = [
    ['plan', '计划历史'], ['nutrition', '营养评估'], ['followup', '患者随访'], ['consult', '医患咨询'], ['records', '病历', '8'], ['labs', '检验'], ['checks', '检查'], ['meds', '用药'], ['track', '跟进'], ['test', '测试'],
  ];
  return <section className="patient-platform-page" aria-label={`患者平台：${patient.name}`}>
    <header className="platform-topbar">
      <Button className="platform-back" icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
      <div className="platform-actions">
        {['服务记录', '状态管理', '上传病历', '编辑', '联系患者'].map(label => <Button key={label}>{label}</Button>)}
        <Button type="primary">计划管理</Button>
      </div>
    </header>
    <section className="patient-platform-summary">
      <div className="patient-platform-identity">
        <h1>{patient.name}</h1><Tag color="cyan">我的患者 <span aria-hidden="true">ⓘ</span></Tag><Tag color="purple">{patient.admission ? '住院管理中' : '随访中'} <span aria-hidden="true">ⓘ</span></Tag>
        <strong>{patient.sex} / {patient.age}岁</strong><strong>{patient.department}</strong><span className="platform-doctor">王医生</span><Button type="text" icon={<EditOutlined />}>点击添加备注</Button>
      </div>
      <Button className="platform-expand">展开 <DownOutlined /></Button>
      <div className="platform-summary-tools"><Button type="text">＋</Button><Button type="text">b</Button></div>
    </section>
    <nav className="platform-tabs" aria-label="患者业务模块">{tabs.map(([key, label, count]) => <button type="button" key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}{count && <Badge count={count} size="small" />}</button>)}</nav>
    <section className="platform-content">
      {activeTab === 'plan' ? <>
        <div className="plan-toolbar"><Input placeholder="开始日期     →     结束日期" prefix={<CalendarOutlined />} /><Select placeholder="模板来源" options={[{ value: 'all', label: '模板来源' }]} /><Select placeholder="计划类型" options={[{ value: 'all', label: '计划类型' }]} /><Select placeholder="计划状态" options={[{ value: 'all', label: '计划状态' }]} /><Button>重置</Button><Button icon={<AppstoreOutlined />}>全平台数据</Button><span className="plan-view-toggle">▣　▤</span></div>
        <Table className="platform-plan-table" rowKey={(row) => `${row.date}-${row.content}`} pagination={false} dataSource={planRows} columns={[{ title: 'T', dataIndex: 't', width: 70, render: () => <span className="timeline-dot">08.18</span> }, { title: 'T+n', width: 70, render: () => <strong>T+0</strong> }, { title: '计划日期', dataIndex: 'date', width: 120 }, { title: '计划类型', dataIndex: 'type', width: 150, render: value => <span className="plan-type">◷　{value}</span> }, { title: '计划内容', dataIndex: 'content' }, { title: '提醒/预约设置', width: 170, render: () => '不提前提醒' }, { title: '状态', dataIndex: 'status', width: 130, render: value => <span className="plan-status">● {value}</span> }, { title: '操作', width: 74, render: () => <Button type="link">详情</Button> }]} />
      </> : <div className="platform-placeholder"><h2>{tabs.find(([key]) => key === activeTab)?.[1]}</h2><p>该患者的{tabs.find(([key]) => key === activeTab)?.[1]}记录将在这里展示。</p><Button type="primary" onClick={() => onBrief(patient.id, activeTab === 'nutrition' ? 'summary' : 'call')}>让 CARES 生成相关简报</Button></div>}
    </section>
  </section>;
}
export function BusinessWorkspace({ page, onDetail, onBrief, onNavigate, onAssistant, onSettings }: { page: BusinessPage; onDetail: (target: DetailTarget) => void; onBrief: (patientId?: string, task?: BriefType) => void; onNavigate: (page: BusinessPage) => void; onAssistant: (task: TaskType) => void; onSettings: () => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stage, setStage] = useState('all');
  const [period, setPeriod] = useState('all');
  const [patientStatusTab, setPatientStatusTab] = useState('all');
  const patientStatusTabs = ['待制定计划', '住院管理中', '离院管理中', '随访中', '暂缓治疗', '已脱落', '转院/转科', '未实名', '转退销记录'];
  const matchesPatientStatus = (patient: Patient, tab: string) => {
    if (tab === 'all') return true;
    if (tab === '随访中') return patient.careStatus.includes('随访');
    return patient.careStatus === tab;
  };
  const patients = demoPatients.filter(patient => (page !== 'admissions' || patient.admission) && (page !== 'followups' || !patient.admission) && (page !== 'patients' || matchesPatientStatus(patient, patientStatusTab)) && `${patient.name}${patient.id}`.includes(search.trim()) && (status === 'all' || patient.status === status) && (stage === 'all' || patient.stage === stage) && (period === 'all' || (period === 'am' ? patient.time < '12:00' : patient.time >= '12:00')));
  const detailFor = (patient: Patient): DetailTarget => ({ patientId: patient.id, kind: page === 'admissions' ? 'admission' : page === 'followups' ? 'followup' : 'patient' });
  if (page === 'workbench') return <WorkbenchDashboard onNavigate={onNavigate} />;
  return <div className="business-page">
    <div className="page-heading"><div><h1>{pageLabels[page]}</h1><p>{dayjs().format('YYYY年MM月DD日')} · 个案管理</p></div><Button onClick={onSettings}>模板与推送</Button></div>
    {page === 'patients' ? <nav className="patient-status-tabs" aria-label="患者管理状态">{[{ key: 'all', label: '全部' }, ...patientStatusTabs.map(label => ({ key: label, label: `${label} ${demoPatients.filter(patient => matchesPatientStatus(patient, label)).length}` }))].map(tab => <button type="button" role="tab" aria-selected={patientStatusTab === tab.key} className={patientStatusTab === tab.key ? 'patient-status-tab active' : 'patient-status-tab'} key={tab.key} onClick={() => setPatientStatusTab(tab.key)}>{tab.label}</button>)}</nav> : <div className="quick-tasks" aria-label="个案助手任务"><Button icon={<MessageOutlined />} onClick={() => onAssistant('knowledge')}>医学知识速查</Button><Button type="primary" icon={<CalendarOutlined />} onClick={() => onBrief(undefined, 'admission')}>入院简报</Button></div>}
    {page === 'admissions' && <Alert className="admission-intro" type="info" showIcon title={`${dayjs().add(1, 'day').format('MM月DD日')} · 明日入院准备`} description="按计划患者核对资料完整度、报告复核和入院前沟通。已上传不等于已复核，暂无记录不等于无异常。" />}
    <section className="patient-list-section">
      <div className="list-toolbar"><Input aria-label="搜索工作台患者" prefix={<SearchOutlined />} placeholder="搜索姓名或患者编号" value={search} onChange={event => setSearch(event.target.value)} allowClear /><Select aria-label="筛选任务状态" value={status} onChange={setStatus} options={[{ label: '全部状态', value: 'all' }, ...['待复核', '待补充', '待联系'].map(value => ({ value, label: value }))]} /><Select aria-label="筛选管案阶段" value={stage} onChange={setStage} options={['all', '入院准备中', '随访中'].map(value => ({ value, label: value === 'all' ? '全部阶段' : value }))} /><Select aria-label="筛选计划时间" value={period} onChange={setPeriod} options={[{ value: 'all', label: '全部时段' }, { value: 'am', label: '上午' }, { value: 'pm', label: '下午' }]} /><span>共 {patients.length} 位患者</span></div>
      <Table<Patient> className="patient-table" rowKey="id" dataSource={patients} pagination={false} scroll={{ x: 640 }} columns={[
        { title: '患者', dataIndex: 'name', width: 150, render: (_, patient) => <button className="patient-name" onClick={() => onDetail(detailFor(patient))}><strong>{patient.name}<span>{patient.sex} · {patient.age} 岁</span></strong><small>{patient.id}</small></button> },
        { title: '管案阶段', dataIndex: 'stage', responsive: ['lg'], width: 136, render: (_, patient) => <Tag color={patient.admission ? 'blue' : 'green'}>{patient.stage}</Tag> },
        { title: page === 'admissions' ? '优先核对事项' : '当前待办', dataIndex: 'task', width: 200, render: (_, patient) => <div>{patient.task}{page === 'admissions' && <p className="muted-note">{preparation(patient).blocker}</p>}</div> }, { title: '计划时间', dataIndex: 'time', responsive: ['md'], width: 104, sorter: (a, b) => a.time.localeCompare(b.time) },
        { title: '状态', dataIndex: 'status', width: 100, render: value => <span className="status-label"><i />{value}</span> },
        { title: '操作', key: 'actions', width: 156, render: (_, patient) => <div className="table-actions"><Button type="link" onClick={() => onDetail(detailFor(patient))}>详情</Button><Dropdown menu={{ items: [{ key: 'call', label: '呼叫前简报' }, ...(patient.admission ? [{ key: 'admission', label: '入院准备总结' }] : []), { key: 'summary', label: '患者情况总结' }], onClick: ({ key }) => onBrief(patient.id, key as BriefType) }} trigger={['click']}><Button type="text" aria-label={`${patient.name}的简报操作`}>简报</Button></Dropdown></div> },
      ]} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的患者" /> }} />
      <div className="list-footer"><TeamOutlined /> 当前授权患者<span>共 {patients.length} 条</span></div>
    </section>
    <div className="mobile-patients">{patients.length ? patients.map(patient => <article key={patient.id}><div><strong>{patient.name} · {patient.id}</strong><Tag color="orange">{patient.status}</Tag></div><p>{patient.task}</p><p className="muted-note">{page === 'admissions' ? preparation(patient).blocker : patient.note}</p><Button onClick={() => onDetail(detailFor(patient))}>查看详情</Button><Button type="primary" onClick={() => onBrief(patient.id, page === 'admissions' ? 'admission' : 'call')}>{page === 'admissions' ? '入院准备总结' : '呼叫前简报'}</Button></article>) : <Empty description="没有匹配的患者" />}</div>
    <p className="workbench-footnote">当前显示已授权患者及其管案任务</p>
  </div>;
}

type WorkbenchTask = { label: string; detail?: string; icon: ReactNode; tone: string };

const treatmentTasks: WorkbenchTask[] = [
  { label: '待制定治疗计划', icon: <CarryOutOutlined />, tone: 'mint' },
  { label: '预约待确认', icon: <ScheduleOutlined />, tone: 'purple' },
  { label: '今日待到院', icon: <HomeOutlined />, tone: 'teal' },
  { label: '逾期未安排/未到院', icon: <WarningOutlined />, tone: 'orange' },
];

const dailyTasks: WorkbenchTask[] = [
  { label: '检验预警', detail: 'IV级 0\nIII级 0', icon: <NotificationOutlined />, tone: 'red' },
  { label: '今日待复查', detail: '未提醒 0', icon: <ExperimentOutlined />, tone: 'mint' },
  { label: '逾期待复查', icon: <ExperimentOutlined />, tone: 'orange' },
  { label: '患者随访预警', detail: 'IV级 0\nIII级 0', icon: <NotificationOutlined />, tone: 'red' },
  { label: '今日待随访', detail: '未提醒 0', icon: <ScheduleOutlined />, tone: 'purple' },
  { label: '逾期未随访', icon: <ClockCircleOutlined />, tone: 'orange' },
  { label: '营养预警', icon: <NotificationOutlined />, tone: 'red' },
  { label: '待营养评估', detail: '未提醒 0', icon: <SolutionOutlined />, tone: 'blue' },
  { label: '待回复患者', icon: <MessageOutlined />, tone: 'blue' },
  { label: '待制定随访计划', icon: <CarryOutOutlined />, tone: 'mint' },
  { label: '随访个性提醒', icon: <BellOutlined />, tone: 'blue' },
  { label: '今日待完成', icon: <CheckOutlined />, tone: 'mint' },
  { label: '逾期待完成', icon: <CheckOutlined />, tone: 'red' },
  { label: '待跟进提醒计划', icon: <CarryOutOutlined />, tone: 'mint' },
];

function WorkbenchDashboard({ onNavigate }: { onNavigate: (page: BusinessPage) => void }) {
  const openTask = (task: WorkbenchTask) => {
    if (task.label.includes('到院')) onNavigate('admissions');
    if (task.label.includes('随访')) onNavigate('followups');
  };
  const renderTaskCard = (task: WorkbenchTask) => <button type="button" className="workbench-task-card" key={task.label} onClick={() => openTask(task)}>
    <span className="workbench-task-card-heading">{task.label}</span>
    <span className="workbench-task-card-footer"><span className="workbench-task-card-count">0</span>{task.detail && <span className="workbench-task-card-detail">{task.detail}</span>}<span className={`workbench-task-card-icon workbench-tone-${task.tone}`}>{task.icon}</span></span>
  </button>;
  return <div className="business-page workbench-dashboard">
    <header className="workbench-dashboard-header">
      <div className="workbench-dashboard-title"><h1>hi, 杨过</h1><Tag>天目SK测试科室一 / 天目SK治疗组四</Tag></div>
      <div className="workbench-dashboard-tools"><span className="workbench-update-time">数据更新时间：2026-09-30 10:56:00 <SyncOutlined /></span><Button className="workbench-owner-filter" icon={<CheckOutlined />}>只看我的患者</Button><Segmented className="workbench-view-toggle" options={['全部', '简版']} defaultValue="全部" /></div>
    </header>
    <section className="workbench-task-section" aria-labelledby="workbench-treatment-title"><h2 id="workbench-treatment-title">治疗任务</h2><div className="workbench-task-grid workbench-treatment-grid">{treatmentTasks.map(renderTaskCard)}</div></section>
    <section className="workbench-task-section" aria-labelledby="workbench-daily-title"><h2 id="workbench-daily-title">日常任务</h2><div className="workbench-task-grid">{dailyTasks.map(renderTaskCard)}</div></section>
  </div>;
}
