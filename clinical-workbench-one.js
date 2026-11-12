(() => {
  const taskSets = {
    draft: [
      ['S003', 'C1D1用药后呕吐症状采集', 'C1D1（第1周期第1天）', '表单填写', '单次填写', '提前2天/延后2天', '王*', '已入组', 'SUN真实世界研究', '2026-10-25'],
      ['S006', '筛选期生命体征采集', '筛选访视', '院内采集', '单次采集', '提前1天/延后1天', '周**', '筛选中', '恒星肺癌观察研究', '2026-10-27'],
      ['S008', '安全性随访问卷', '安全性访视', '患者填写', '单次填写', '提前2天/延后2天', '陈**', '已入组', 'SUN真实世界研究', '2026-10-28'],
      ['S012', '预筛选症状评估', '预筛选访视', '电话采集', '单次采集', '当天', '赵*', '筛选中', '启航症状管理研究', '2026-10-30']
    ],
    sent: [
      ['S001', '第一周期不良反应问卷', 'C1D1（第1周期第1天）', '表单填写', '每周期', '提前2天/延后2天', '张**', '已入组', 'SUN真实世界研究', '2026-10-25'],
      ['S004', '治疗期间生命体征采集', '第15天访视', '院内采集', '每周期', '提前1天/延后1天', '陈**', '已入组', '恒星肺癌观察研究', '2026-10-26'],
      ['S009', '安全性事件确认', '安全性访视', '电话采集', '单次采集', '当天', '刘*', '已入组', '启航症状管理研究', '2026-10-27']
    ],
    none: [
      ['S002', '筛选失败记录确认', '筛选访视', '系统记录', '单次采集', '当天', '李**', '筛选失败', 'SUN真实世界研究', '2026-10-24'],
      ['S013', '终止访视原因记录', '终止访视', '系统记录', '单次采集', '当天', '吴**', '已终止', '恒星肺癌观察研究', '2026-10-22']
    ]
  };
  const executionTasks = [
    { participantId: 'S003', participant: '王*', participantStatus: '已入组', trial: 'SUN真实世界研究', packageId: 'TP-20261025-003', task: 'C1D1用药后呕吐症状采集', visit: 'C1D1', visitFull: 'C1D1（第1周期第1天）', sequence: '第1次', relativeDay: '第5天', plannedAt: '2026-10-29 18:00', window: '10/29 08:00～18:00', status: '待执行', scope: 'today', method: '表单填写', formName: '用药后呕吐症状采集表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '指定天数', baselineDate: '2026-10-25', windowRule: '提前0天/延后2天', progress: '0/2' },
    { participantId: 'S003', participant: '王*', participantStatus: '已入组', trial: 'SUN真实世界研究', packageId: 'TP-20261025-003', task: 'C1D1用药后呕吐症状采集', visit: 'C1D1', visitFull: 'C1D1（第1周期第1天）', sequence: '第2次', relativeDay: '第8天', plannedAt: '2026-11-01 18:00', window: '11/01 08:00～18:00', status: '未开始', scope: 'upcoming', method: '表单填写', formName: '用药后呕吐症状采集表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '指定天数', baselineDate: '2026-10-25', windowRule: '提前0天/延后2天', progress: '0/2' },
    { participantId: 'S006', participant: '周**', participantStatus: '已入组', trial: '恒星肺癌观察研究', packageId: 'TP-20261027-006', task: '筛选期生命体征采集', visit: '筛选访视', visitFull: '筛选访视', sequence: '第1次', relativeDay: '第1天', plannedAt: '2026-10-27 09:00', window: '10/27 08:00～18:00', status: '待执行', scope: 'today', method: '表单填写', formName: '生命体征记录表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '单次采集', baselineDate: '2026-10-27', windowRule: '提前1天/延后1天', progress: '0/1' },
    { participantId: 'S008', participant: '陈**', participantStatus: '已入组', trial: 'SUN真实世界研究', packageId: 'TP-20261028-008', task: '安全性检查报告上传', visit: '安全性访视', visitFull: '安全性访视', sequence: '第1次', relativeDay: '第5天', plannedAt: '2026-10-28 20:00', window: '10/28 08:00～18:00', status: '已逾期', scope: 'overdue', method: '上传文件', formName: '', fillMode: '个案可填', canCaseExecute: true, executionType: 'upload', cycle: '单次采集', baselineDate: '2026-10-24', windowRule: '提前1天/延后1天', progress: '0/1' },
    { participantId: 'S010', participant: '孙**', participantStatus: '已入组', trial: '启航症状管理研究', packageId: 'TP-20261029-010', task: '治疗体验问卷', visit: '第15天访视', visitFull: '第15天访视', sequence: '第1次', relativeDay: '第15天', plannedAt: '2026-10-29 10:00', window: '10/29 08:00～18:00', status: '待执行', scope: 'today', method: '表单填写', formName: '治疗体验问卷', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '每周期', baselineDate: '2026-10-15', windowRule: '提前0天/延后1天', progress: '0/1' },
    { participantId: 'S012', participant: '赵*', participantStatus: '筛选中', trial: '启航症状管理研究', packageId: 'TP-20261030-012', task: '预筛选症状评估', visit: '预筛选访视', visitFull: '预筛选访视', sequence: '第1次', relativeDay: '第1天', plannedAt: '2026-10-30 10:00', window: '10/30 08:00～20:00', status: '未开始', scope: 'upcoming', method: '表单填写', formName: '预筛选症状评估表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '单次采集', baselineDate: '2026-10-30', windowRule: '当天', progress: '0/1' },
    { participantId: 'S004', participant: '陈**', participantStatus: '已入组', trial: '恒星肺癌观察研究', packageId: 'TP-20261026-004', task: '治疗期间生命体征采集', visit: '第15天访视', visitFull: '第15天访视', sequence: '第1次', relativeDay: '第15天', plannedAt: '2026-10-26 09:00', window: '10/26 08:00～18:00', status: '已完成', scope: 'completed', method: '表单填写', formName: '生命体征记录表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '每周期', baselineDate: '2026-10-12', windowRule: '提前1天/延后1天', progress: '1/1', result: '血压 118/76 mmHg，心率 72 次/分，体温 36.5℃', completedAt: '2026-10-26 09:18', operator: '研究护士 李敏' },
    { participantId: 'S014', participant: '钱**', participantStatus: '筛选失败', trial: 'SUN真实世界研究', packageId: 'TP-20261024-014', task: '筛选期症状问卷', visit: '筛选访视', visitFull: '筛选访视', sequence: '第1次', relativeDay: '第1天', plannedAt: '2026-10-24 09:00', window: '10/24 08:00～18:00', status: '无需处理', scope: 'none', method: '表单填写', formName: '筛选期症状问卷', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '单次采集', baselineDate: '2026-10-24', windowRule: '提前0天/延后1天', progress: '0/1', noProcessReason: '参与者筛选失败，任务无需继续执行。' }
  ];
  const followupTasks = [
    { participantId: 'S003', participant: '王*', date: '2026-10-29', type: '症状跟进', content: '跟进用药后呕吐症状，确认症状变化及用药情况。', record: '已电话联系，参与者反馈症状较前缓解，需再次确认恢复情况。', operatedAt: '2026-10-28 16:30', operator: '李敏' },
    { participantId: 'S006', participant: '周**', date: '2026-10-29', type: '访视跟进', content: '确认筛选访视到院安排，提醒携带检查报告。', record: '已发送到院提醒，等待参与者确认具体时间。', operatedAt: '2026-10-28 15:20', operator: '王芳' },
    { participantId: 'S008', participant: '陈**', date: '2026-10-30', type: '任务跟进', content: '跟进安全性检查报告上传，确认报告是否齐全。', record: '', operatedAt: '2026-10-29 09:10', operator: '李敏' },
    { participantId: 'S012', participant: '赵*', date: '2026-10-30', type: '电话随访', content: '电话确认预筛选症状评估情况及后续访视意向。', record: '', operatedAt: '2026-10-29 10:00', operator: '王芳' },
    { participantId: 'S003', participant: '王*', date: '2026-10-27', content: '确认用药后症状变化及恢复情况。', scope: 'completed', record: '已电话随访，参与者反馈症状已缓解，完成本次跟进。', createdAt: '2026-10-26 09:00', createdBy: '李敏', operatedAt: '2026-10-27 15:20', operator: '李敏' },
    { participantId: 'S006', participant: '周**', date: '2026-10-28', content: '确认原定筛选访视到院安排。', scope: 'none', noProcessReason: '访视预约已调整，原到院提醒无需继续跟进。', createdAt: '2026-10-26 10:30', createdBy: '王芳', operatedAt: '2026-10-27 16:10', operator: '王芳' }
  ];
  const processingTasks = [
    { participantId: 'S003', participant: '王*', participantStatus: '已入组', trial: 'SUN真实世界研究', visit: 'C1D1（第1周期第1天）', visitIndex: 1, plannedDate: '2026-10-25（±2）', actualDate: '2026-10-26', completeness: 13, scope: 'pending' },
    { participantId: 'S006', participant: '周**', participantStatus: '筛选中', trial: '恒星肺癌观察研究', visit: '筛选期', visitIndex: 0, plannedDate: '2026-10-27（±1）', actualDate: '2026-10-27', completeness: 40, scope: 'pending' },
    { participantId: 'S008', participant: '陈**', participantStatus: '已入组', trial: 'SUN真实世界研究', visit: 'C1D15（第1周期第15天）', visitIndex: 2, plannedDate: '2026-10-28（±2）', actualDate: '2026-10-29', completeness: 65, scope: 'pending' },
    { participantId: 'S012', participant: '赵*', participantStatus: '筛选中', trial: '启航症状管理研究', visit: '筛选期', visitIndex: 0, plannedDate: '2026-10-30（±1）', actualDate: '2026-10-30', completeness: 25, scope: 'pending' },
    { participantId: 'S002', participant: '李**', participantStatus: '筛选失败', trial: 'SUN真实世界研究', visit: '筛选期', visitIndex: 0, plannedDate: '2026-10-24（±1）', actualDate: '2026-10-24', completeness: 13, scope: 'none', noProcessReason: '参与者筛选失败，已确认现有访视资料，剩余资料无需继续处理。' }
  ];
  const followupParticipants = {
    S003: { status: '已入组', trial: 'SUN真实世界研究' },
    S006: { status: '筛选中', trial: '恒星肺癌观察研究' },
    S008: { status: '已入组', trial: 'SUN真实世界研究' },
    S012: { status: '筛选中', trial: '启航症状管理研究' }
  };
  followupTasks.forEach(task => {
    task.scope = task.scope || 'pending';
    task.participantStatus = followupParticipants[task.participantId].status;
    task.trial = followupParticipants[task.participantId].trial;
    task.history = [{ action: '新增跟进任务', at: task.createdAt || task.operatedAt, operator: task.createdBy || task.operator, scope: 'pending', date: task.date, content: task.content, record: '' }];
    if (task.scope !== 'pending') {
      task.history.unshift({ action: task.scope === 'completed' ? '标记已完成' : '标记无需处理', at: task.operatedAt, operator: task.operator, scope: task.scope, date: task.date, content: task.content, record: task.record || '', noProcessReason: task.noProcessReason || '' });
    }
  });
  const followupStorageKey = 'workbench-one-added-followups-v1';
  try {
    const saved = JSON.parse(localStorage.getItem(followupStorageKey));
    if (Array.isArray(saved)) followupTasks.push(...saved.filter(task => task?.local && task.id && task.participantId && task.trial && /^\d{4}-\d{2}-\d{2}$/.test(task.date) && typeof task.content === 'string' && task.content.trim() && task.content.length <= 500 && ['pending', 'completed', 'none'].includes(task.scope) && Array.isArray(task.history)));
  } catch { /* 存储不可用时仍可在当前页面添加跟进。 */ }
  const participantInitials = {
    S001: 'ZXX', S002: 'LXX', S003: 'WX', S004: 'CXX', S006: 'ZXX',
    S008: 'CXX', S009: 'LX', S010: 'SXX', S012: 'ZX', S013: 'WXX', S014: 'QXX'
  };
  const defaultVisitDates = {
    S001: '2026-10-25', S002: '2026-10-24', S003: '2026-10-25', S004: '2026-10-26', S006: '2026-10-27',
    S008: '2026-10-28', S009: '2026-10-27', S012: '2026-10-30', S013: '2026-10-22'
  };
  const templateTimes = {
    S001: ['08:00'], S002: ['09:00'], S003: ['08:00', '12:00'], S004: ['09:00'], S006: ['09:00'],
    S008: ['20:00'], S009: ['10:00'], S012: ['10:00'], S013: ['09:00']
  };
  const taskConfigs = {
    S003: { status: '已入组', formName: '用药后呕吐症状采集表', fillMode: '仅患者填写', description: '记录第1周期用药后呕吐发生情况、持续时间及严重程度。', baseline: '访视日期', overdue: false, autoMap: true },
    S006: { status: '已入组', formName: '', fillMode: '个案可填', description: '采集筛选期生命体征并完成相关记录。', baseline: '访视日期', overdue: true, autoMap: true },
    S008: { status: '已入组', formName: '安全性随访问卷', fillMode: '仅患者填写', description: '收集治疗期间安全性事件及相关症状。', baseline: '访视日期', overdue: true, autoMap: false },
    S012: { status: '筛选中', formName: '', fillMode: '个案可填', description: '通过电话完成预筛选症状评估。', baseline: '访视日期', overdue: false, autoMap: false }
  };
  const taskCounts = { draft: 7, sent: 5, none: 5 };
  const scheduleDrafts = {};
  const reasonRecords = {
    S002: '参与者筛选失败，不再进入后续访视，因此该任务无需发放。',
    S013: '参与者已提前终止研究，终止访视后的计划任务无需继续处理。'
  };
  const tableBody = document.querySelector('[data-wb1-table-body]');
  const taskTable = document.querySelector('.wb1-table');
  const tableCols = document.querySelector('[data-wb1-table-cols]');
  const tableHead = document.querySelector('[data-wb1-table-head]');
  const actionMenu = document.querySelector('[data-wb1-action-menu]');
  const participantSearch = document.querySelector('[data-wb1-participant]');
  const projectFilter = document.querySelector('[data-wb1-project]');
  const followupMask = document.querySelector('[data-wb1-followup-modal]');
  const followupForm = followupMask.querySelector('form');
  const followupDate = followupForm.elements.date;
  const followupContent = followupForm.elements.content;
  const followupError = followupMask.querySelector('[data-wb1-followup-error]');
  const issueMask = document.querySelector('[data-wb1-issue-modal]');
  const issueBody = document.querySelector('.wb1-issue-body');
  const issueClose = document.querySelector('[data-wb1-issue-close]');
  const issueTitle = document.querySelector('[data-wb1-issue-title]');
  const issueDateHelp = document.querySelector('[data-wb1-issue-date-help]');
  const issueDate = document.querySelector('[data-wb1-issue-date]');
  const issuePreview = document.querySelector('[data-wb1-issue-preview]');
  const issueCancel = document.querySelector('[data-wb1-issue-cancel]');
  const issueSave = document.querySelector('[data-wb1-issue-save]');
  const issueConfirm = document.querySelector('[data-wb1-issue-confirm]');
  const issueToast = document.querySelector('[data-wb1-toast]');
  const reasonMask = document.querySelector('[data-wb1-reason-modal]');
  const reasonTitle = document.querySelector('[data-wb1-reason-title]');
  const reasonSubject = document.querySelector('[data-wb1-reason-subject]');
  const reasonLabel = document.querySelector('[data-wb1-reason-label]');
  const reasonInput = document.querySelector('[data-wb1-reason-input]');
  const reasonCount = document.querySelector('[data-wb1-reason-count]');
  const reasonError = document.querySelector('[data-wb1-reason-error]');
  const reasonCancel = document.querySelector('[data-wb1-reason-cancel]');
  const reasonSubmit = document.querySelector('[data-wb1-reason-submit]');
  const executionMask = document.querySelector('[data-wb1-execution-modal]');
  const executionTitle = document.querySelector('[data-wb1-execution-title]');
  const executionSubject = document.querySelector('[data-wb1-execution-subject]');
  const executionBody = document.querySelector('[data-wb1-execution-body]');
  const executionPackage = document.querySelector('[data-wb1-execution-package]');
  const executionCancel = document.querySelector('[data-wb1-execution-cancel]');
  const executionSubmit = document.querySelector('[data-wb1-execution-submit]');
  const issueFields = {
    participant: document.querySelector('[data-wb1-issue-participant]'),
    id: document.querySelector('[data-wb1-issue-id]'),
    status: document.querySelector('[data-wb1-issue-status]'),
    task: document.querySelector('[data-wb1-issue-task]'),
    visit: document.querySelector('[data-wb1-issue-visit]'),
    method: document.querySelector('[data-wb1-issue-method]'),
    formName: document.querySelector('[data-wb1-issue-form-name]'),
    fillMode: document.querySelector('[data-wb1-issue-fill-mode]'),
    description: document.querySelector('[data-wb1-issue-description]'),
    cycle: document.querySelector('[data-wb1-issue-cycle]'),
    baseline: document.querySelector('[data-wb1-issue-baseline]'),
    templateTimes: document.querySelector('[data-wb1-issue-template-times]'),
    window: document.querySelector('[data-wb1-issue-window]'),
    overdue: document.querySelector('[data-wb1-issue-overdue]'),
    autoMap: document.querySelector('[data-wb1-issue-auto-map]'),
    count: document.querySelector('[data-wb1-issue-count]')
  };
  let activeSet = 'draft';
  let activeMode = 'issue';
  let executionFilter = 'all';
  let followupFilter = 'pending';
  let processingFilter = 'pending';
  let activeTask = null;
  let activeSchedule = null;
  let issueReadOnly = false;
  let reasonTask = null;
  let reasonContext = 'issue';
  let reasonExecutionTask = null;
  let currentExecutionTask = null;
  let executionModalMode = 'view';
  let toastTimer = null;
  let followupSource = null;
  let followupOpener = null;
  let actionMenuOpener = null;

  function taskFor(kind, index) {
    return ({ issue: taskSets[activeSet], execution: executionTasks, followup: followupTasks, processing: processingTasks })[kind]?.[index];
  }

  function actionEntries(kind, index) {
    const task = taskFor(kind, index);
    const button = (action, label) => kind === 'issue'
      ? `<button type="button" data-wb1-action="${action}" data-participant-id="${task[0]}">${label}</button>`
      : `<button type="button" data-wb1-${kind}-action="${action}" data-${kind}-index="${index}">${label}</button>`;
    let entries;
    if (kind === 'issue') entries = activeSet === 'draft' ? [['issue', '发放'], ['no-process', '无需处理'], ['contact', '联系参与者']] : activeSet === 'sent' ? [['view-task', '查看任务'], ['contact', '联系参与者']] : [['view-task', '查看任务'], ['view-record', '查看记录']];
    else if (kind === 'execution') entries = task.scope === 'none' ? [['view', '查看任务'], ['view-record', '查看记录']] : task.scope === 'completed' ? [['view', '查看任务'], ['contact', '联系参与者']] : [...(task.canCaseExecute ? [['execute', '去执行']] : []), ['remind', '发送提醒'], ['view', '查看任务'], ['no-process', '无需处理'], ['contact', '联系参与者']];
    else if (kind === 'followup') entries = task.scope === 'pending' ? [['complete', '标记已完成'], ['no-process', '无需处理'], ['contact', '联系参与者']] : [['view-record', '操作记录']];
    else entries = task.scope === 'pending' ? [['process', '去处理'], ['no-process', '无需处理']] : [['view-record', '查看记录']];
    return [...entries.map(([action, label]) => button(action, label)), `<button type="button" data-wb1-add-followup="${kind}" data-task-index="${index}">添加跟进</button>`];
  }

  function taskActions(kind, index) {
    const entries = actionEntries(kind, index);
    return entries.length <= 3 ? entries.join('') : entries.slice(0, 2).join('') + `<button type="button" data-wb1-more-action="${kind}" data-task-index="${index}" aria-haspopup="menu" aria-expanded="false">更多⌄</button>`;
  }

  function dateWindowMarkup(planned, window) {
    return `<div class="wb1-date-window"><span>${escapeMarkup(planned)}</span><small>${escapeMarkup(window)}</small></div>`;
  }

  function visitDateMarkup(date, before, after = before) {
    return dateWindowMarkup(date, `${shiftDate(date, -before)} ～ ${shiftDate(date, after)}`);
  }

  function plannedDateLabel(row) {
    const match = row[5].match(/提前(\d+)天\/延后(\d+)天/);
    return visitDateMarkup(row[9], Number(match?.[1] || 0), Number(match?.[2] || 0));
  }

  function processingDateMarkup(row) {
    const date = row.plannedDate.slice(0, 10);
    const days = Number(row.plannedDate.match(/±(\d+)/)?.[1] || 0);
    return visitDateMarkup(date, days);
  }

  function updateCounts() {
    document.querySelector('[data-wb1-tab="draft"]').textContent = `待发放（${taskCounts.draft}）`;
    document.querySelector('[data-wb1-tab="sent"]').textContent = `已发放（${taskCounts.sent}）`;
    document.querySelector('[data-wb1-tab="none"]').textContent = `无需处理（${taskCounts.none}）`;
    document.querySelector('.wb1-task-card strong').textContent = taskCounts.draft;
  }

  function renderRows() {
    closeActionMenu();
    const keyword = participantSearch.value.trim().toLowerCase();
    const matchesProject = trial => !projectFilter.value || trial === projectFilter.value;
    if (activeMode === 'processing') {
      const rows = processingTasks.filter(row => matchesProject(row.trial) && row.scope === processingFilter && `${row.participantId}${row.participant}${participantInitials[row.participantId] || ''}`.toLowerCase().includes(keyword));
      tableBody.innerHTML = rows.length ? rows.map(row => {
        const index = processingTasks.indexOf(row);
        const actions = taskActions('processing', index);
        return `<tr><td><div class="wb1-participant-cell"><strong>${row.participant}（${participantInitials[row.participantId] || '--'}）</strong><small><span>${row.participantId}</span><em>${row.participantStatus}</em></small></div></td><td>${row.trial}</td><td>${row.visit}</td><td>${processingDateMarkup(row)}</td><td>${row.actualDate}</td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
      }).join('') : '<tr><td class="wb1-empty" colspan="6">暂无匹配的数据处理任务</td></tr>';
      return;
    }
    if (activeMode === 'followup') {
      const rows = followupTasks.filter(row => matchesProject(row.trial) && row.scope === followupFilter && `${row.participantId}${row.participant}${participantInitials[row.participantId] || ''}`.toLowerCase().includes(keyword));
      tableBody.innerHTML = rows.length ? rows.map(row => {
        const index = followupTasks.indexOf(row);
        const actions = taskActions('followup', index);
        return `<tr><td><div class="wb1-participant-cell"><strong>${escapeMarkup(row.participant)}（${participantInitials[row.participantId] || '--'}）</strong><small><span>${escapeMarkup(row.participantId)}</span><em>${escapeMarkup(row.participantStatus)}</em></small></div></td><td>${escapeMarkup(row.trial)}</td><td>${escapeMarkup(row.date)}</td><td>${escapeMarkup(row.content)}</td><td>${{ pending: '待完成', completed: '已完成', none: '无需处理' }[row.scope]}</td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
      }).join('') : '<tr><td class="wb1-empty" colspan="6">暂无匹配的跟进任务</td></tr>';
      return;
    }
    if (activeMode === 'execution') {
      const rows = executionTasks.filter(row => {
        const matchesFilter = executionFilter === 'all' ? ['today', 'upcoming', 'overdue'].includes(row.scope) : row.scope === executionFilter;
        const matchesKeyword = `${row.participantId}${row.participant}${participantInitials[row.participantId] || ''}`.toLowerCase().includes(keyword);
        return matchesProject(row.trial) && matchesFilter && matchesKeyword;
      });
      tableBody.innerHTML = rows.length ? rows.map(row => {
        const taskIndex = executionTasks.indexOf(row);
        const statusClass = { upcoming: ' is-future', overdue: ' is-overdue', completed: ' is-completed', none: ' is-none' }[row.scope] || '';
        const actions = taskActions('execution', taskIndex);
        return `<tr><td><div class="wb1-participant-cell"><strong>${row.participant}（${participantInitials[row.participantId] || '--'}）</strong><small><span>${row.participantId}</span><em>${row.participantStatus}</em></small></div></td><td class="is-strong">${row.task}</td><td>${row.trial}</td><td>${row.visit}</td><td><div class="wb1-execution-node"><strong>${row.relativeDay}</strong><span>${row.sequence}</span></div></td><td>${dateWindowMarkup(row.plannedAt, row.window)}</td><td><span class="wb1-execution-status${statusClass}">${row.status}</span></td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
      }).join('') : '<tr><td class="wb1-empty" colspan="8">暂无匹配的执行任务</td></tr>';
      return;
    }
    const rows = taskSets[activeSet].filter(row => matchesProject(row[8]) && `${row[0]}${row[6]}${participantInitials[row[0]] || ''}`.toLowerCase().includes(keyword));
    tableBody.innerHTML = rows.length ? rows.map(row => `<tr><td><div class="wb1-participant-cell"><strong>${row[6]}（${participantInitials[row[0]] || '--'}）</strong><small><span>${row[0]}</span><em>${row[7]}</em></small></div></td><td class="is-strong">${row[1]}</td><td>${row[8]}</td><td>${row[2]}</td><td>${plannedDateLabel(row)}</td><td><div class="wb1-table-actions">${taskActions('issue', taskSets[activeSet].indexOf(row))}</div></td></tr>`).join('') : '<tr><td class="wb1-empty" colspan="6">暂无匹配任务</td></tr>';
  }

  function configureTaskList(mode) {
    const tabs = [...document.querySelectorAll('[data-wb1-tab]')];
    closeActionMenu();
    activeMode = mode;
    document.querySelector('.wb1-task-tools').hidden = false;
    taskTable.classList.toggle('is-followup', mode === 'followup');
    tabs.forEach((button, index) => button.setAttribute('aria-selected', String(index === 0)));
    if (mode === 'processing') {
      processingFilter = 'pending';
      tabs.forEach((button, index) => { button.hidden = index > 1; });
      refreshProcessingCounts();
      taskTable.style.minWidth = '650px';
      tableCols.innerHTML = '<col style="width:16%"><col style="width:18%"><col style="width:16%"><col style="width:23%"><col style="width:13%"><col style="width:14%">';
      tableHead.innerHTML = '<tr><th>参与者</th><th>参与试验</th><th>访视</th><th>计划日期/访视窗口</th><th>实际访视日期</th><th>操作</th></tr>';
    } else if (mode === 'followup') {
      followupFilter = 'pending';
      tabs.forEach((button, index) => { button.hidden = index > 2; });
      refreshFollowupCounts();
      taskTable.style.minWidth = '1080px';
      tableCols.innerHTML = '<col style="width:15%"><col style="width:16%"><col style="width:14%"><col style="width:25%"><col style="width:10%"><col style="width:20%">';
      tableHead.innerHTML = '<tr><th>参与者</th><th>参与试验</th><th>跟进日期</th><th>跟进内容</th><th>状态</th><th>操作</th></tr>';
    } else if (mode === 'execution') {
      executionFilter = 'all';
      const pendingCount = executionTasks.filter(row => ['today', 'upcoming', 'overdue'].includes(row.scope)).length;
      tabs[0].textContent = `全部待执行（${pendingCount}）`;
      tabs[1].textContent = `今日待执行（${executionTasks.filter(row => row.scope === 'today').length}）`;
      tabs[2].textContent = `已逾期（${executionTasks.filter(row => row.scope === 'overdue').length}）`;
      tabs[3].textContent = `已完成（${executionTasks.filter(row => row.scope === 'completed').length}）`;
      tabs[4].textContent = `无需处理（${executionTasks.filter(row => row.scope === 'none').length}）`;
      tabs.forEach(button => { button.hidden = false; });
      const executionSummary = document.querySelector('[data-wb1-summary="execution"] strong');
      if (executionSummary) executionSummary.textContent = pendingCount;
      taskTable.style.minWidth = '780px';
      tableCols.innerHTML = '<col style="width:14%"><col style="width:17%"><col style="width:13%"><col style="width:9%"><col style="width:8%"><col style="width:18%"><col style="width:8%"><col style="width:13%">';
      tableHead.innerHTML = '<tr><th>参与者</th><th>任务名称</th><th>参与试验</th><th>访视</th><th>执行节点</th><th>计划时间/执行窗口</th><th>状态</th><th>操作</th></tr>';
    } else {
      activeSet = 'draft';
      tabs.forEach((button, index) => { button.hidden = index > 2; });
      tabs[0].textContent = `待发放（${taskCounts.draft}）`;
      tabs[1].textContent = `已发放（${taskCounts.sent}）`;
      tabs[2].textContent = `无需处理（${taskCounts.none}）`;
      taskTable.style.minWidth = '700px';
      tableCols.innerHTML = '<col style="width:16%"><col style="width:20%"><col style="width:15%"><col style="width:12%"><col style="width:22%"><col style="width:15%">';
      tableHead.innerHTML = '<tr><th>参与者</th><th>任务名称</th><th>参与试验</th><th>访视</th><th>计划日期/访视窗口</th><th>操作</th></tr>';
    }
    renderRows();
  }

  function executionTaskToRow(task) {
    return [task.participantId, task.task, task.visitFull, task.method, task.cycle, task.windowRule, task.participant, task.participantStatus, task.trial, task.baselineDate];
  }

  function executionStatusClass(task) {
    return { upcoming: ' is-future', overdue: ' is-overdue', completed: ' is-completed', none: ' is-none' }[task.scope] || '';
  }

  function executionDetailMarkup(task) {
    return `<section class="wb1-execution-card"><h3>执行任务信息</h3><dl class="wb1-execution-detail"><div><dt>任务名称</dt><dd><button class="wb1-task-name-link" type="button" data-wb1-template-link>${task.task}</button></dd></div><div><dt>访视</dt><dd>${task.visitFull}</dd></div><div><dt>执行节点</dt><dd>${task.relativeDay}（${task.sequence}）</dd></div><div><dt>计划时间</dt><dd>${task.plannedAt}</dd></div><div class="is-wide"><dt>执行窗口</dt><dd>${task.window}</dd></div><div><dt>当前状态</dt><dd><span class="wb1-execution-status${executionStatusClass(task)}">${task.status}</span></dd></div><div><dt>采集方式</dt><dd>${task.method}${task.formName ? ` · ${task.formName}` : ''}</dd></div><div><dt>填写方式</dt><dd>${task.fillMode}</dd></div><div><dt>任务包进度</dt><dd>${task.progress}</dd></div><div><dt>基准日期</dt><dd>${task.baselineDate}</dd></div><div class="is-wide"><dt>所属任务包</dt><dd>${task.packageId}</dd></div></dl></section>`;
  }

  function openExecutionModal(task, mode) {
    currentExecutionTask = task;
    executionModalMode = mode;
    executionTitle.textContent = mode === 'execute' ? (task.executionType === 'upload' ? '上传文件' : `填写${task.formName || '任务表单'}`) : mode === 'result' ? '查看执行结果' : '查看任务';
    executionSubject.textContent = `${task.participant}（${participantInitials[task.participantId] || '--'}） ${task.participantId} · ${task.relativeDay}（${task.sequence}）`;
    executionPackage.hidden = mode !== 'view';
    executionPackage.textContent = '查看执行结果';
    executionSubmit.hidden = mode !== 'execute';
    executionCancel.textContent = mode === 'execute' ? '取消' : '关闭';
    if (mode === 'execute') {
      const actionContent = task.executionType === 'upload'
        ? `<form class="wb1-execution-form" data-wb1-execution-form><label class="is-full">上传文件<input name="file" type="file" required aria-label="上传任务文件"></label><label class="is-full">文件说明<textarea name="note" maxlength="500" placeholder="选填，说明文件内容"></textarea></label></form>`
        : `<form class="wb1-execution-form" data-wb1-execution-form><label>是否出现相关症状<select name="symptom" required><option value="">请选择</option><option>是</option><option>否</option></select></label><label>严重程度<select name="severity" required><option value="">请选择</option><option>轻度</option><option>中度</option><option>重度</option></select></label><label class="is-full">补充说明<textarea name="note" maxlength="500" placeholder="选填，补充本次执行情况"></textarea></label></form>`;
      executionBody.innerHTML = `<section class="wb1-execution-card"><h3>${task.executionType === 'upload' ? '上传任务文件' : `填写${task.formName || '任务表单'}`}</h3>${actionContent}</section>`;
    } else if (mode === 'result') {
      const result = task.result
        ? `<div class="wb1-execution-result"><strong>执行结果</strong>${task.result}${task.completedAt ? `<br>完成时间：${task.completedAt}` : ''}${task.operator ? `<br>执行人：${task.operator}` : ''}</div>`
        : '<div class="wb1-execution-result is-empty">任务尚未执行，暂时没有执行结果。</div>';
      executionBody.innerHTML = `<section class="wb1-execution-card"><h3>执行结果</h3>${result}</section>`;
    } else {
      executionBody.innerHTML = executionDetailMarkup(task);
    }
    executionMask.hidden = false;
    executionBody.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    document.querySelector('[data-wb1-execution-close]').focus();
  }

  function closeExecutionModal() {
    executionMask.hidden = true;
    document.body.style.overflow = '';
    currentExecutionTask = null;
    executionModalMode = 'view';
  }

  function refreshExecutionCounts() {
    const tabs = [...document.querySelectorAll('[data-wb1-tab]')];
    const pendingCount = executionTasks.filter(row => ['today', 'upcoming', 'overdue'].includes(row.scope)).length;
    tabs[0].textContent = `全部待执行（${pendingCount}）`;
    tabs[1].textContent = `今日待执行（${executionTasks.filter(row => row.scope === 'today').length}）`;
    tabs[2].textContent = `已逾期（${executionTasks.filter(row => row.scope === 'overdue').length}）`;
    tabs[3].textContent = `已完成（${executionTasks.filter(row => row.scope === 'completed').length}）`;
    tabs[4].textContent = `无需处理（${executionTasks.filter(row => row.scope === 'none').length}）`;
    const summary = document.querySelector('[data-wb1-summary="execution"] strong');
    if (summary) summary.textContent = pendingCount;
    document.querySelector('[data-wb1-summary="execution-overdue"] strong').textContent = executionTasks.filter(task => task.scope === 'overdue').length;
  }

  function parseWindow(value) {
    const match = value.match(/提前(\d+)天\/延后(\d+)天/);
    return match ? { before: Number(match[1]), after: Number(match[2]) } : { before: 0, after: 0 };
  }

  function shiftDate(value, amount) {
    if (!value) return '--';
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + amount);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function renderIssuePreview() {
    const windowRange = parseWindow(activeTask[5]);
    issuePreview.innerHTML = activeSchedule.times.map((time, index) => {
      const start = `${shiftDate(activeSchedule.date, -windowRange.before)} ${time}`;
      const end = `${shiftDate(activeSchedule.date, windowRange.after)} ${time}`;
      return `<tr><td>第${index + 1}次</td><td>${activeSchedule.date || '--'}</td><td><input type="time" value="${time}" data-wb1-issue-time="${index}" aria-label="第${index + 1}次采集时间"${issueReadOnly ? ' disabled' : ''}></td><td>${start} ～ ${end}</td><td><span class="wb1-issue-status">${issueReadOnly ? '已生成' : '待发放'}</span></td></tr>`;
    }).join('');
    issueFields.count.textContent = `共生成 ${activeSchedule.times.length} 个执行任务`;
  }

  function setConfigSwitch(element, enabled) {
    element.textContent = enabled ? '开启' : '关闭';
    element.classList.toggle('is-on', enabled);
  }

  function openIssueModal(row, readOnly = false) {
    activeTask = row;
    issueReadOnly = readOnly;
    const config = taskConfigs[row[0]] || { status: row[7], formName: row[3] === '表单填写' ? `${row[1]}表` : '', fillMode: row[3] === '表单填写' || row[3] === '患者填写' ? '仅患者填写' : '个案可填', description: `${row[1]}相关采集任务。`, baseline: '访视日期', overdue: false, autoMap: false };
    const saved = scheduleDrafts[row[0]];
    activeSchedule = {
      date: saved?.date || defaultVisitDates[row[0]] || row[9] || '2026-10-25',
      times: [...(saved?.times || templateTimes[row[0]] || ['09:00'])]
    };
    issueTitle.textContent = readOnly ? '查看任务' : '发放任务';
    issueDateHelp.textContent = readOnly ? '以下为任务发放时确认的基准日期及执行计划。' : '修改后，系统将立即重新计算下方尚未执行的任务。';
    issueMask.classList.toggle('is-readonly', readOnly);
    issueDate.disabled = readOnly;
    issueCancel.hidden = readOnly;
    issueSave.hidden = readOnly;
    issueConfirm.textContent = readOnly ? '关闭' : '确认发放';
    issueFields.participant.textContent = `${row[6]}（${participantInitials[row[0]] || '--'}）`;
    issueFields.id.textContent = row[0];
    issueFields.status.textContent = row[7] || config.status;
    issueFields.task.textContent = row[1];
    issueFields.visit.textContent = row[2];
    issueFields.method.textContent = row[3];
    issueFields.formName.hidden = !config.formName;
    issueFields.formName.textContent = config.formName ? `表单：${config.formName}` : '';
    issueFields.fillMode.textContent = config.fillMode;
    issueFields.description.textContent = config.description;
    issueFields.cycle.textContent = row[4];
    issueFields.baseline.textContent = config.baseline;
    issueFields.templateTimes.textContent = `${activeSchedule.times.length}个时段（${activeSchedule.times.join('、')}）`;
    issueFields.window.textContent = row[5];
    setConfigSwitch(issueFields.overdue, config.overdue);
    setConfigSwitch(issueFields.autoMap, config.autoMap);
    issueDate.value = activeSchedule.date;
    renderIssuePreview();
    issueMask.hidden = false;
    document.body.style.overflow = 'hidden';
    issueBody.scrollTop = 0;
    issueClose.focus();
  }

  function closeIssueModal() {
    issueMask.hidden = true;
    document.body.style.overflow = '';
    activeTask = null;
    activeSchedule = null;
    issueReadOnly = false;
  }

  function openReasonModal(row, readOnly = false, context = 'issue', executionTask = null) {
    reasonTask = row;
    reasonContext = context;
    reasonExecutionTask = executionTask;
    reasonTitle.textContent = readOnly ? '无需处理记录' : '无需处理';
    reasonSubject.textContent = `${row[6]}（${participantInitials[row[0]] || '--'}） ${row[0]} · ${row[1]}`;
    reasonLabel.innerHTML = readOnly ? '无需处理原因' : '无需处理原因 <em>*</em>';
    reasonInput.value = readOnly ? (context === 'execution' || context === 'processing' ? executionTask?.noProcessReason : reasonRecords[row[0]]) || '暂无原因记录。' : '';
    reasonInput.readOnly = readOnly;
    reasonInput.required = !readOnly;
    reasonInput.placeholder = readOnly ? '' : '请填写无需处理原因，最多500字符';
    reasonCount.textContent = reasonInput.value.length;
    reasonError.textContent = '';
    reasonCancel.hidden = readOnly;
    reasonSubmit.textContent = readOnly ? '关闭' : '确认无需处理';
    reasonSubmit.dataset.readonly = String(readOnly);
    reasonMask.hidden = false;
    document.body.style.overflow = 'hidden';
    if (readOnly) reasonSubmit.focus();
    else reasonInput.focus();
  }

  function closeReasonModal() {
    reasonMask.hidden = true;
    document.body.style.overflow = '';
    reasonTask = null;
    reasonContext = 'issue';
    reasonExecutionTask = null;
  }

  function refreshProcessingCounts() {
    const pendingCount = processingTasks.filter(task => task.scope === 'pending').length;
    document.querySelector('[data-wb1-tab="draft"]').textContent = `待完成（${pendingCount}）`;
    document.querySelector('[data-wb1-tab="sent"]').textContent = `无需处理（${processingTasks.filter(task => task.scope === 'none').length}）`;
    document.querySelector('[data-wb1-summary="processing"] strong').textContent = pendingCount;
  }

  function refreshFollowupCounts() {
    const tabs = [...document.querySelectorAll('[data-wb1-tab]')];
    if (activeMode === 'followup') ['pending', 'completed', 'none'].forEach((scope, index) => {
      const label = { pending: '待完成', completed: '已完成', none: '无需处理' }[scope];
      tabs[index].textContent = `${label}（${followupTasks.filter(task => task.scope === scope).length}）`;
    });
    document.querySelector('[data-wb1-summary="followup"] strong').textContent = new Set(followupTasks.filter(task => task.scope === 'pending').map(task => task.participantId)).size;
  }

  function saveAddedFollowups() {
    try { localStorage.setItem(followupStorageKey, JSON.stringify(followupTasks.filter(task => task.local))); } catch { /* 当前页面仍保留跟进任务。 */ }
  }

  function openAddFollowup(kind, index, trigger) {
    const task = taskFor(kind, index);
    if (!task) return;
    followupSource = kind === 'issue' ? { participantId: task[0], participant: task[6], participantStatus: task[7], trial: task[8], visit: task[2], sourceTask: task[1] }
      : { participantId: task.participantId, participant: task.participant, participantStatus: task.participantStatus, trial: task.trial, visit: task.visitFull || task.visit || '', sourceTask: task.task || task.content || task.visit };
    followupOpener = trigger;
    closeActionMenu();
    followupForm.reset();
    followupDate.value = new Date().toLocaleDateString('sv-SE');
    followupError.textContent = '';
    followupMask.querySelector('[data-wb1-followup-count]').textContent = '0';
    followupMask.querySelector('[data-wb1-followup-subject]').textContent = `${followupSource.participant}（${followupSource.participantId}） · ${followupSource.trial}`;
    followupMask.hidden = false;
    document.body.style.overflow = 'hidden';
    followupDate.focus();
  }

  function closeAddFollowup() {
    followupMask.hidden = true;
    document.body.style.overflow = '';
    followupSource = null;
    (followupOpener?.isConnected ? followupOpener : document.querySelector('[data-wb1-tab][aria-selected="true"]'))?.focus({ preventScroll: true });
  }

  followupForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!followupSource || !followupForm.reportValidity()) return;
    const content = followupContent.value.trim();
    if (!content || followupContent.value.length > 500) {
      followupError.textContent = !content ? '请填写跟进内容' : '跟进内容最多500字符';
      followupContent.focus(); return;
    }
    const at = new Date().toLocaleString('sv-SE').slice(0, 16);
    followupTasks.push({ ...followupSource, id: `local-followup-${crypto.randomUUID()}`, local: true, scope: 'pending', date: followupDate.value, content,
      record: '', createdAt: at, createdBy: '当前个案', operatedAt: at, operator: '当前个案',
      history: [{ action: '新增跟进任务', at, operator: '当前个案', scope: 'pending', date: followupDate.value, content, record: '' }] });
    saveAddedFollowups();
    closeAddFollowup();
    refreshFollowupCounts(); renderRows();
    showToast('跟进任务已添加，可在待跟进参与者中查看');
  });
  followupContent.addEventListener('input', () => {
    followupMask.querySelector('[data-wb1-followup-count]').textContent = followupContent.value.length;
    followupError.textContent = '';
  });
  followupMask.addEventListener('click', event => { if (event.target === followupMask || event.target.closest('[data-wb1-followup-close]')) closeAddFollowup(); });

  function openFollowupRecordModal(task, action) {
    const isComplete = action === 'complete';
    const label = isComplete ? '跟进记录' : '无需处理原因';
    reasonTask = task;
    reasonContext = isComplete ? 'followup-complete' : 'followup-none';
    reasonTitle.textContent = isComplete ? '标记已完成' : '无需处理';
    reasonSubject.textContent = `${task.participant}（${participantInitials[task.participantId] || '--'}） ${task.participantId} · ${task.content}`;
    reasonLabel.innerHTML = `${label} <em>*</em>`;
    reasonInput.value = '';
    reasonInput.readOnly = false;
    reasonInput.required = true;
    reasonInput.placeholder = `请填写${label}，最多500字符`;
    reasonCount.textContent = reasonInput.value.length;
    reasonError.textContent = '';
    reasonCancel.hidden = false;
    reasonSubmit.textContent = isComplete ? '确认完成' : '确认无需处理';
    reasonSubmit.dataset.readonly = 'false';
    reasonMask.hidden = false;
    document.body.style.overflow = 'hidden';
    reasonInput.focus();
  }

  function escapeMarkup(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function openFollowupHistory(task) {
    currentExecutionTask = null;
    executionModalMode = 'followup-history';
    executionTitle.textContent = '操作记录';
    executionSubject.textContent = `${task.participant}（${participantInitials[task.participantId] || '--'}） ${task.participantId}`;
    executionPackage.hidden = true;
    executionSubmit.hidden = true;
    executionCancel.textContent = '关闭';
    const participant = `${task.participant}（${participantInitials[task.participantId] || '--'}） ${task.participantId} · ${task.participantStatus}`;
    executionBody.innerHTML = `<ol class="wb1-followup-history">${task.history.map(entry => {
      const fields = [
        ['所属参与者', participant],
        ['跟进日期', entry.date.replaceAll('-', '/')],
        ['任务状态', { pending: '待完成', completed: '已完成', none: '无需处理' }[entry.scope]],
        ['任务内容', entry.content]
      ];
      if (entry.scope === 'completed') fields.push(['跟进记录', entry.record]);
      if (entry.scope === 'none') fields.push(['无需处理原因', entry.noProcessReason]);
      return `<li><p class="wb1-followup-history-event">${escapeMarkup(entry.operator)} 于 ${escapeMarkup(entry.at)} ${escapeMarkup(entry.action)}</p><dl>${fields.map(([label, value]) => `<div><dt>${label}：</dt><dd>${escapeMarkup(value)}</dd></div>`).join('')}</dl></li>`;
    }).join('')}</ol>`;
    executionMask.hidden = false;
    executionBody.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    document.querySelector('[data-wb1-execution-close]').focus();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    issueToast.textContent = message;
    issueToast.hidden = false;
    toastTimer = setTimeout(() => { issueToast.hidden = true; }, 2600);
  }

  function saveSchedule() {
    scheduleDrafts[activeTask[0]] = { date: activeSchedule.date, times: [...activeSchedule.times] };
  }

  function hasValidSchedule() {
    if (activeSchedule.date) return true;
    issueDate.focus();
    showToast('请先选择访视日期');
    return false;
  }

  function closeActionMenu() {
    actionMenu.hidden = true;
    document.querySelectorAll('[data-wb1-more-action][aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }

  function openActionMenu(button) {
    const menuActions = actionEntries(button.dataset.wb1MoreAction, Number(button.dataset.taskIndex)).slice(2);
    actionMenu.innerHTML = menuActions.join('');
    actionMenu.setAttribute('role', 'menu');
    actionMenu.querySelectorAll('button').forEach(item => item.setAttribute('role', 'menuitem'));
    actionMenuOpener = button;
    actionMenu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    positionActionMenu();
    actionMenu.querySelector('button')?.focus({ preventScroll: true });
  }

  function positionActionMenu() {
    if (actionMenu.hidden || !actionMenuOpener?.isConnected) return;
    const button = actionMenuOpener;
    const rect = button.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) { closeActionMenu(); return; }
    const menuWidth = 132;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const preferredTop = rect.bottom + 6;
    const top = preferredTop + actionMenu.offsetHeight > window.innerHeight - 12 ? rect.top - actionMenu.offsetHeight - 6 : preferredTop;
    actionMenu.style.left = `${left}px`;
    actionMenu.style.top = `${Math.max(12, top)}px`;
  }

  function handleExecutionAction(button) {
    const task = executionTasks[Number(button.dataset.executionIndex)];
    if (!task) return;
    closeActionMenu();
    if (button.dataset.wb1ExecutionAction === 'execute' && task.canCaseExecute && !['completed', 'none'].includes(task.scope)) openExecutionModal(task, 'execute');
    if (button.dataset.wb1ExecutionAction === 'view') openExecutionModal(task, 'view');
    if (button.dataset.wb1ExecutionAction === 'remind') showToast(`已向${task.participant}发送任务提醒`);
    if (button.dataset.wb1ExecutionAction === 'no-process') openReasonModal(executionTaskToRow(task), false, 'execution', task);
    if (button.dataset.wb1ExecutionAction === 'view-record') openReasonModal(executionTaskToRow(task), true, 'execution', task);
    if (button.dataset.wb1ExecutionAction === 'contact') showToast(`正在联系${task.participant}`);
  }

  document.querySelectorAll('[data-wb1-tab]').forEach(button => {
    button.addEventListener('click', () => {
      closeActionMenu();
      if (activeMode === 'execution') {
        executionFilter = { draft: 'all', sent: 'today', none: 'overdue', completed: 'completed', 'execution-none': 'none' }[button.dataset.wb1Tab];
      } else if (activeMode === 'followup') {
        followupFilter = { draft: 'pending', sent: 'completed', none: 'none' }[button.dataset.wb1Tab];
      } else if (activeMode === 'processing') {
        processingFilter = { draft: 'pending', sent: 'none' }[button.dataset.wb1Tab];
      } else {
        activeSet = button.dataset.wb1Tab;
      }
      document.querySelectorAll('[data-wb1-tab]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
      renderRows();
    });
  });
  document.querySelectorAll('[data-wb1-summary]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-wb1-summary]').forEach(item => {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      const target = button.dataset.wb1Summary;
      configureTaskList(target === 'execution-overdue' ? 'execution' : target);
      if (target === 'execution-overdue') {
        executionFilter = 'overdue';
        const overdueTab = document.querySelector('[data-wb1-tab="none"]');
        document.querySelectorAll('[data-wb1-tab]').forEach(item => item.setAttribute('aria-selected', String(item === overdueTab)));
        renderRows();
      }
    });
  });
  function handleTaskAction(target) {
    const addButton = target.closest('[data-wb1-add-followup]');
    if (addButton) {
      openAddFollowup(addButton.dataset.wb1AddFollowup, Number(addButton.dataset.taskIndex), actionMenu.contains(addButton) ? actionMenuOpener : addButton);
      return;
    }
    const processingButton = target.closest('[data-wb1-processing-action]');
    if (processingButton) {
      closeActionMenu();
      const task = processingTasks[Number(processingButton.dataset.processingIndex)];
      if (!task) return;
      const action = processingButton.dataset.wb1ProcessingAction;
      if (action === 'process' && task.scope === 'pending') {
        location.href = `项目参与者详情-Figma.html?${new URLSearchParams({ name: task.participant, id: task.participantId, status: task.participantStatus, tab: 'data-entry', visitIndex: String(task.visitIndex) })}`;
      } else if ((action === 'no-process' && task.scope === 'pending') || (action === 'view-record' && task.scope === 'none')) {
        openReasonModal([task.participantId, task.visit, '', '', '', '', task.participant], action === 'view-record', 'processing', task);
        reasonTask = task;
      }
      return;
    }
    const followupButton = target.closest('[data-wb1-followup-action]');
    if (followupButton) {
      closeActionMenu();
      const task = followupTasks[Number(followupButton.dataset.followupIndex)];
      if (!task) return;
      const action = followupButton.dataset.wb1FollowupAction;
      if (action === 'contact') showToast(`正在联系${task.participant}`);
      else if (action === 'view-record') openFollowupHistory(task);
      else if (task.scope === 'pending') openFollowupRecordModal(task, action);
      return;
    }
    const moreButton = target.closest('[data-wb1-more-action]');
    if (moreButton) {
      if (moreButton.getAttribute('aria-expanded') === 'true') closeActionMenu();
      else {
        closeActionMenu();
        openActionMenu(moreButton);
      }
      return;
    }
    const executionButton = target.closest('[data-wb1-execution-action]');
    if (executionButton) {
      handleExecutionAction(executionButton);
      return;
    }
    const button = target.closest('[data-wb1-action]');
    if (!button) return;
    closeActionMenu();
    const source = button.dataset.wb1Action === 'no-process' || button.dataset.wb1Action === 'issue' ? taskSets.draft : taskSets[activeSet];
    const row = source.find(item => item[0] === button.dataset.participantId);
    if (!row) return;
    if (button.dataset.wb1Action === 'issue') openIssueModal(row);
    if (button.dataset.wb1Action === 'no-process') openReasonModal(row);
    if (button.dataset.wb1Action === 'view-task') openIssueModal(row, true);
    if (button.dataset.wb1Action === 'view-record') openReasonModal(row, true);
    if (button.dataset.wb1Action === 'contact') showToast(`正在联系${row[6]}`);
  }
  tableBody.addEventListener('click', event => handleTaskAction(event.target));
  issueDate.addEventListener('input', () => {
    activeSchedule.date = issueDate.value;
    renderIssuePreview();
  });
  issuePreview.addEventListener('change', event => {
    const input = event.target.closest('[data-wb1-issue-time]');
    if (!input) return;
    activeSchedule.times[Number(input.dataset.wb1IssueTime)] = input.value;
    renderIssuePreview();
  });
  issueSave.addEventListener('click', () => {
    if (!hasValidSchedule()) return;
    saveSchedule();
    closeIssueModal();
    showToast('发放配置已保存，可稍后继续处理');
  });
  issueConfirm.addEventListener('click', () => {
    if (issueReadOnly) {
      closeIssueModal();
      return;
    }
    if (!hasValidSchedule()) return;
    saveSchedule();
    const issuedId = activeTask[0];
    const generatedCount = activeSchedule.times.length;
    const index = taskSets.draft.findIndex(row => row[0] === issuedId);
    if (index >= 0) taskSets.sent.push(taskSets.draft.splice(index, 1)[0]);
    taskCounts.draft -= 1;
    taskCounts.sent += 1;
    updateCounts();
    closeIssueModal();
    renderRows();
    showToast(`任务已发放，已生成 ${generatedCount} 个执行任务`);
  });
  reasonInput.addEventListener('input', () => {
    reasonCount.textContent = reasonInput.value.length;
    if (reasonInput.value.trim()) reasonError.textContent = '';
  });
  reasonSubmit.addEventListener('click', () => {
    if (reasonSubmit.dataset.readonly === 'true') {
      closeReasonModal();
      return;
    }
    const reason = reasonInput.value.trim();
    const isFollowup = reasonContext.startsWith('followup-');
    const recordLabel = reasonContext === 'followup-complete' ? '跟进记录' : '无需处理原因';
    if (!reason) {
      reasonError.textContent = `请填写${recordLabel}`;
      reasonInput.focus();
      return;
    }
    if (reasonInput.value.length > 500) {
      reasonError.textContent = `${recordLabel}最多500字符`;
      reasonInput.focus();
      return;
    }
    if (reasonContext === 'processing') {
      if (!reasonTask || reasonTask.scope !== 'pending') return;
      reasonTask.noProcessReason = reason;
      reasonTask.scope = 'none';
      closeReasonModal();
      refreshProcessingCounts();
      renderRows();
      showToast('数据处理任务已记录为无需处理');
      return;
    }
    if (isFollowup) {
      if (!reasonTask || reasonTask.scope !== 'pending') return;
      const completed = reasonContext === 'followup-complete';
      if (completed) reasonTask.record = reason;
      else reasonTask.noProcessReason = reason;
      reasonTask.scope = completed ? 'completed' : 'none';
      const now = new Date();
      reasonTask.operatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      reasonTask.operator = '当前个案';
      reasonTask.history.unshift({ action: completed ? '标记已完成' : '标记无需处理', at: reasonTask.operatedAt, operator: reasonTask.operator, scope: reasonTask.scope, date: reasonTask.date, content: reasonTask.content, record: completed ? reason : '', noProcessReason: completed ? '' : reason });
      saveAddedFollowups();
      closeReasonModal();
      refreshFollowupCounts();
      renderRows();
      showToast(completed ? '跟进记录已保存，已标记完成' : '跟进任务已记录为无需处理');
      return;
    }
    if (reasonContext === 'execution') {
      reasonExecutionTask.noProcessReason = reason;
      reasonExecutionTask.status = '无需处理';
      reasonExecutionTask.scope = 'none';
      closeReasonModal();
      refreshExecutionCounts();
      renderRows();
      showToast('执行任务已记录为无需处理');
      return;
    }
    reasonRecords[reasonTask[0]] = reason;
    const index = taskSets.draft.findIndex(row => row[0] === reasonTask[0]);
    if (index >= 0) taskSets.none.push(taskSets.draft.splice(index, 1)[0]);
    taskCounts.draft -= 1;
    taskCounts.none += 1;
    updateCounts();
    closeReasonModal();
    renderRows();
    showToast('已记录为无需处理');
  });
  executionPackage.addEventListener('click', () => {
    const task = currentExecutionTask;
    openExecutionModal(task, 'result');
  });
  executionBody.addEventListener('click', event => {
    if (!event.target.closest('[data-wb1-template-link]') || !currentExecutionTask) return;
    const task = currentExecutionTask;
    closeExecutionModal();
    openIssueModal(executionTaskToRow(task), true);
  });
  actionMenu.addEventListener('click', event => handleTaskAction(event.target));
  executionSubmit.addEventListener('click', () => {
    if (executionModalMode !== 'execute' || !currentExecutionTask) return;
    const form = executionBody.querySelector('[data-wb1-execution-form]');
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    if (currentExecutionTask.executionType === 'upload') {
      const file = form.querySelector('input[type="file"]').files[0];
      currentExecutionTask.result = `已上传文件：${file.name}${formData.get('note') ? `；说明：${formData.get('note')}` : ''}`;
    } else {
      currentExecutionTask.result = `相关症状：${formData.get('symptom')}；严重程度：${formData.get('severity')}${formData.get('note') ? `；补充说明：${formData.get('note')}` : ''}`;
    }
    currentExecutionTask.status = '已完成';
    currentExecutionTask.scope = 'completed';
    currentExecutionTask.completedAt = '2026-10-29 18:12';
    currentExecutionTask.operator = '当前个案';
    const packageTasks = executionTasks.filter(task => task.packageId === currentExecutionTask.packageId);
    const completedCount = packageTasks.filter(task => task.scope === 'completed').length;
    packageTasks.forEach(task => { task.progress = `${completedCount}/${packageTasks.length}`; });
    closeExecutionModal();
    refreshExecutionCounts();
    renderRows();
    showToast('任务执行完成，结果已保存');
  });
  document.querySelectorAll('[data-wb1-issue-close],[data-wb1-issue-cancel]').forEach(button => button.addEventListener('click', closeIssueModal));
  document.querySelectorAll('[data-wb1-execution-close],[data-wb1-execution-cancel]').forEach(button => button.addEventListener('click', closeExecutionModal));
  document.querySelectorAll('[data-wb1-reason-close],[data-wb1-reason-cancel]').forEach(button => button.addEventListener('click', closeReasonModal));
  issueMask.addEventListener('click', event => { if (event.target === issueMask) closeIssueModal(); });
  executionMask.addEventListener('click', event => { if (event.target === executionMask) closeExecutionModal(); });
  reasonMask.addEventListener('click', event => { if (event.target === reasonMask) closeReasonModal(); });
  document.addEventListener('keydown', event => {
    if (!followupMask.hidden) {
      if (event.key === 'Escape') { event.preventDefault(); closeAddFollowup(); }
      if (event.key === 'Tab') {
        const controls = [...followupMask.querySelectorAll('button, input, textarea')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (!actionMenu.hidden) {
      if (event.key === 'Escape') { event.preventDefault(); closeActionMenu(); actionMenuOpener?.focus({ preventScroll: true }); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const buttons = [...actionMenu.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
        buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus({ preventScroll: true });
        return;
      }
      if (event.key === 'Tab') closeActionMenu();
    }
    if (event.key !== 'Escape') return;
    if (!reasonMask.hidden) closeReasonModal();
    else if (!executionMask.hidden) closeExecutionModal();
    else if (!issueMask.hidden) closeIssueModal();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-wb1-action-menu]') && !event.target.closest('[data-wb1-more-action]')) closeActionMenu();
  });
  window.addEventListener('resize', closeActionMenu);
  window.addEventListener('scroll', positionActionMenu, true);
  projectFilter.addEventListener('change', renderRows);
  participantSearch.addEventListener('input', renderRows);
  document.querySelector('[data-wb1-all-visits]').addEventListener('click', () => {
    const params = new URLSearchParams({ view: 'visits' });
    const projectNames = ['SUN真实世界研究', '恒星肺癌观察研究', '启航症状管理研究'];
    const projectIds = ['CT-2026-001', 'HX-LC-II-06', 'HX-GI-III-01'];
    const project = projectIds[projectNames.indexOf(document.querySelector('[data-wb1-project]').value)];
    if (project) params.set('project', project);
    const center = document.querySelector('[data-wb1-center]').value;
    if (center) params.set('hospital', center);
    const keyword = participantSearch.value.trim();
    if (keyword) params.set('q', keyword);
    location.href = `项目参与者-Figma.html?${params}`;
  });
  updateCounts();
  refreshFollowupCounts();
  configureTaskList('issue');
})();
