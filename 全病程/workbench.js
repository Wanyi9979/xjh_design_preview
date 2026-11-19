(() => {
  const P = window.workbenchTaskPolicy;
  const D = window.workbenchTaskDialogs;
  const taskSets = window.researchDemo.taskSets;
  const executionTasks = window.researchDemo.executionTasks;
  const followupTasks = window.researchDemo.followupTasks;
  const processingTasks = window.researchDemo.processingTasks;
  const followupParticipants = {
    S003: { status: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究' },
    S006: { status: '筛选中', trial: '非小细胞肺癌 II 期研究' },
    S008: { status: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究' },
    S012: { status: '筛选中', trial: '消化道肿瘤 III 期研究' }
  };
  followupTasks.forEach(task => {
    task.scope = task.scope || 'pending';
    const fallback = followupParticipants[task.participantId];
    task.participantStatus ||= fallback?.status || '已入组';
    task.trial ||= fallback?.trial || ''; 
    task.history ||= [{ action: '新增跟进任务', at: task.createdAt || task.operatedAt, operator: task.createdBy || task.operator, scope: 'pending', date: task.date, content: task.content, record: '' }];
    if (task.scope !== 'pending' && task.history.length === 1) {
      task.history.unshift({ action: task.scope === 'completed' ? '标记已完成' : '标记无需处理', at: task.operatedAt, operator: task.operator, scope: task.scope, date: task.date, content: task.content, record: task.record || '', noProcessReason: task.noProcessReason || '' });
    }
  });
  const followupStorageKey = 'journey-v2-followups-unused';
  function participantNameLink(name, id, trial, status, projectId) {
    const project = projectId || (trial === '乳腺癌 III 期临床研究' ? 'HX-BC-III-02' : window.researchProjectId(trial));
    const query = new URLSearchParams({ project, id, name, status: status || '', from: 'workbench', tab: 'participant-visits' });
    return `<a class="wb1-participant-link" href="participant.html?${escapeMarkup(query.toString())}">${escapeMarkup(name)}</a>`;
  }
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
  const taskCounts = Object.fromEntries(Object.entries(taskSets).map(([key, rows]) => [key, rows.length]));
  const scheduleDrafts = window.researchDemo.scheduleDrafts ||= {};
  const reasonRecords = {
    S002: '参与者筛选失败，不再进入后续访视，因此该任务无需发放。',
    S013: '参与者已提前终止研究，终止访视后的计划任务无需继续处理。'
  };
  const tableBody = document.querySelector('[data-wb1-table-body]');
  const taskTable = document.querySelector('.wb1-table');
  const todayPanel = document.querySelector('[data-wb-today]');
  const todayTabs = [...document.querySelectorAll('[data-today-tab]')];
  const todayRows = todayPanel.querySelector('[data-wb-today-rows]');
  const todayTable = todayPanel.querySelector('table');
  const missedVisitNotice=document.createElement('div');missedVisitNotice.className='wb-missed-visit-notice';missedVisitNotice.setAttribute('role','status');missedVisitNotice.hidden=true;todayTable.closest('.wb1-table-wrap')?.before(missedVisitNotice);if(!missedVisitNotice.isConnected)todayPanel.prepend(missedVisitNotice);
  let todayCategory = 'visits';
  let todayVisits = [];
  const attentionPanel = document.querySelector('[data-wb-attention]');
  const tableCols = document.querySelector('[data-wb1-table-cols]');
  const tableHead = document.querySelector('[data-wb1-table-head]');
  const executionSwitch = document.querySelector('.wb1-execution-switch');
  const executionRanges = [...executionSwitch.querySelectorAll('[data-execution-range]')];
  const executionRangeLabels = { all: '全部', today: '今日', overdue: '逾期' };
  const matchesExecutionScope = (row, scope) => scope === 'all' ? P.due(row) : row.scope === scope;
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
  const issueDateLabel = document.querySelector('[data-wb1-issue-date-label]');
  const issueDateHelp = document.querySelector('[data-wb1-issue-date-help]');
  const issueDate = document.querySelector('[data-wb1-issue-date]');
  const issueAdjustment = document.querySelector('[data-wb1-issue-adjustment]');
  const issueAdjustmentReason = issueAdjustment.querySelector('textarea');
  const issueAdjustmentError = issueAdjustment.querySelector('[role="alert"]');
  const issuePreview = document.querySelector('[data-wb1-issue-preview]');
  const issueDetails = issueMask.querySelectorAll('[data-wb1-issue-details]');
  const adjustmentTask = issueMask.querySelector('[data-wb1-adjustment-task]');
  const adjustmentPreview = issueMask.querySelector('[data-wb1-adjustment-preview]');
  const adjustmentCount = adjustmentPreview.querySelector('[data-wb1-adjustment-count]');
  const adjustmentRows = adjustmentPreview.querySelector('[data-wb1-adjustment-rows]');
  const issueCancel = document.querySelector('[data-wb1-issue-cancel]');
  const issueSave = document.querySelector('[data-wb1-issue-save]');
  const issueConfirm = document.querySelector('[data-wb1-issue-confirm]');
  const issueResultsButton=document.createElement('button');issueResultsButton.type='button';issueResultsButton.dataset.issueResults='';issueResultsButton.textContent='查看执行结果';issueResultsButton.hidden=true;issueConfirm.before(issueResultsButton);
  const issueResults=document.createElement('div');issueResults.className='wb1-issue-body';issueResults.hidden=true;issueBody.after(issueResults);
  issueResultsButton.addEventListener('click',()=>{
    const show=issueResults.hidden;
    if(show){const rows=P.issuedExecutions(activeTask);const reason=window.researchDemo.packageSettings?.[P.packageKey(activeTask)]?.reason||reasonRecords[activeTask[0]]||'';issueResults.innerHTML=window.clinicalTaskResultsMarkup(rows,reason);}
    issueBody.hidden=show;issueResults.hidden=!show;issueResultsButton.textContent=show?'返回任务':'查看执行结果';
  });
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
  let appointmentTasks=[];
  let appointmentFilter='unbooked';
  let activeSet = 'draft';
  let activeMode = 'issue';
  let todayOnly = false;
  let executionFilter = 'all';
  let pendingExecutionFilter = 'all';
  let followupFilter = 'pending';
  let activeTask = null;
  let activeSchedule = null;
  let issueReadOnly = false;
  let adjustingIssued = false;
  let reasonTask = null;
  let reasonContext = 'issue';
  let reasonExecutionTask = null;
  let currentExecutionTask = null;
  let executionModalMode = 'view';
  let toastTimer = null;
  let followupSource = null;
  let followupOpener = null;
  let actionMenuOpener = null;

  const visitCompletion=document.createElement('div');visitCompletion.className='visit-completion-popover';visitCompletion.id='wb-visit-completion';visitCompletion.setAttribute('popover','auto');visitCompletion.setAttribute('role','dialog');visitCompletion.setAttribute('aria-label','访视项完成情况');document.body.append(visitCompletion);
  let completionTimer,completionOpener;
  function visitStatusMarkup(visit,source,index){const state=window.clinicalVisitStore.status(visit);return state==='partial'?`<button type="button" class="visit-progress partial visit-completion-trigger" data-wb-visit-completion="${source}" data-completion-index="${index}" aria-controls="wb-visit-completion" aria-expanded="false">部分完成</button>`:`<span class="visit-progress ${state}">${escapeMarkup(window.clinicalVisitStore.statusLabels[state])}</span>`;}
  function closeVisitCompletion(){clearTimeout(completionTimer);if(visitCompletion.matches(':popover-open'))visitCompletion.hidePopover();completionOpener?.setAttribute('aria-expanded','false');completionOpener=null;}
  function showVisitCompletion(trigger){clearTimeout(completionTimer);const visit=todayVisits[Number(trigger.dataset.completionIndex)];if(!visit)return;const record=window.clinicalVisitStore.apply(visit),items=window.clinicalVisitStore.executionItems(record),completed=new Set(record.completedItems||[]);completionOpener?.setAttribute('aria-expanded','false');completionOpener=trigger;trigger.setAttribute('aria-expanded','true');visitCompletion.innerHTML=`<h3>访视项完成情况 <small>${items.filter(name=>completed.has(name)).length}/${items.length}</small></h3><ul>${items.map(name=>`<li><span>${escapeMarkup(name)}</span><span class="${completed.has(name)?'is-done':'is-pending'}">${completed.has(name)?'已完成':'未完成'}</span></li>`).join('')}</ul>`;visitCompletion.showPopover();const rect=trigger.getBoundingClientRect();visitCompletion.style.left=Math.max(12,Math.min(rect.left,innerWidth-visitCompletion.offsetWidth-12))+'px';visitCompletion.style.top=(rect.bottom+visitCompletion.offsetHeight+8<innerHeight?rect.bottom+8:Math.max(12,rect.top-visitCompletion.offsetHeight-8))+'px';}
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-wb-visit-completion]');if(trigger)showVisitCompletion(trigger);});
  document.addEventListener('mouseover',event=>{const trigger=event.target.closest('[data-wb-visit-completion]');if(trigger)showVisitCompletion(trigger);});
  document.addEventListener('mouseout',event=>{if(event.target.closest('[data-wb-visit-completion]')&&!visitCompletion.contains(event.relatedTarget))completionTimer=setTimeout(closeVisitCompletion,180);});
  visitCompletion.addEventListener('mouseenter',()=>clearTimeout(completionTimer));visitCompletion.addEventListener('mouseleave',()=>completionTimer=setTimeout(closeVisitCompletion,180));
  visitCompletion.addEventListener('toggle',event=>{if(event.newState==='closed')completionOpener?.setAttribute('aria-expanded','false');});
  window.addEventListener('resize',closeVisitCompletion);document.addEventListener('scroll',event=>{if(!visitCompletion.contains(event.target))closeVisitCompletion();},true);
  function participantStatusTag(value) {
    const type = ({'已入组':'enrolled','筛选中':'screening','研究结束':'ended','筛选失败':'failed','随访中':'following','已终止':'ended'})[value] || 'ended';
    return `<em class="status ${type}">${escapeMarkup(value || '未标记')}</em>`;
  }

  function participantColumns(name, id, trial, status, projectId) {
    return `<td><div class="wb1-participant-cell">${participantNameLink(name, id, trial, status, projectId)}</div></td><td>${escapeMarkup(id)}</td>`;
  }

  function participantStatusColumn(value) {
    return `<td class="wb1-participant-status">${participantStatusTag(value)}</td>`;
  }

  function taskVisitMarkup(name, trial, participantId, protocolVersion, visitId) {
    if (!name || name === '—') return '—';
    const projectId = window.researchProjectId(trial);
    const version = visitId ? window.visitProtocols.stamp({id:visitId,projectId,participantId,protocolVersion}).protocolVersion : protocolVersion || window.visitProtocols.bind(projectId, participantId);
    return `<div class="wb1-task-visit"><span>${escapeMarkup(name)}</span><span class="protocol-tag" title="访视方案版本 ${escapeMarkup(version)}">${escapeMarkup(version)}</span></div>`;
  }

  function taskFor(kind, index) {
    return ({ issue: taskSets[activeSet], execution: executionTasks, followup: followupTasks, processing: processingTasks, appointment: appointmentTasks })[kind]?.[index];
  }

  function actionEntries(kind, index) {
    if (kind === 'visit') return todayVisitEntries(todayVisits[index], index);
    const task = taskFor(kind, index);
    const button = (action, label) => kind === 'issue'
      ? `<button type="button" data-wb1-action="${action}" data-task-index="${index}">${label}</button>`
      : `<button type="button" data-wb1-${kind}-action="${action}" data-${kind}-index="${index}">${label}</button>`;
    let entries;
    if (kind === 'issue') {
      entries = activeSet === 'draft'
        ? [['issue', '发放'], ['no-process', '无需处理'], ['contact', '联系参与者']]
        : [['view-task', '查看任务'], ...(activeSet === 'sent' && P.canAdjustIssued(task) ? [['adjust', '调整日期']] : []), ['contact', '联系参与者']];
    }
    else if(kind==='appointment') entries=[...(task.appointmentDate?[['execute','访视执行'],['book','调整预约']]:[['book','访视预约']]),['terminate','访视终止'],['contact','联系参与者']];
    else if (kind === 'execution') entries = task.scope === 'none' ? [['view', '查看任务'], ['contact', '联系参与者']] : task.scope === 'completed' ? [['view', '查看任务'], ['result', '查看执行结果'], ['contact', '联系参与者']] : [...(task.canCaseExecute ? [['execute', '去处理']] : []), ['no-process', '无需处理'], ['adjust', '调整日期'], ['contact', '联系参与者']];
    else if (kind === 'followup') entries = task.scope === 'pending' ? [['complete', '标记已完成'], ['no-process', '无需处理'], ['contact', '联系参与者']] : [['view-record', '操作记录']];
    else entries = [['process', '去处理'], ['no-process', '无需处理'], ['contact', '联系参与者']];
    return [...entries.map(([action, label]) => button(action, label)), ...(['followup','execution','issue'].includes(kind) ? [] : [`<button type="button" data-wb1-add-followup="${kind}" data-task-index="${index}">添加跟进</button>`])];
  }

  function taskActions(kind, index) {
    const entries = actionEntries(kind, index);
    return entries.length <= 3 ? entries.join('') : entries.slice(0, 2).join('') + `<button type="button" data-wb1-more-action="${kind}" data-task-index="${index}" aria-haspopup="menu" aria-expanded="false" aria-label="更多"><img src="figma-workbench-layout/more.svg" width="12" height="12" alt=""></button>`;
  }

  function dateWindowMarkup(planned, window) {
    return `<div class="wb1-date-window"><span>${escapeMarkup(planned)}</span><small>${escapeMarkup(window)}</small></div>`;
  }

  function visitDateMarkup(date, before, after = before) {
    return dateWindowMarkup(date, `${shiftDate(date, -before)} ～ ${shiftDate(date, after)}`);
  }

  function plannedDateLabel(row, date = row[9]) {
    const match = row[5].match(/提前(\d+)天\/延后(\d+)天/);
    return visitDateMarkup(date, Number(match?.[1] || 0), Number(match?.[2] || 0));
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

  function createTaskPagination(container, tableWrap) {
    let page = 1;
    let size = 5;
    let previousScope;
    function refresh(focusSelector) {
      renderRows();
      tableWrap.scrollTop = 0;
      container.querySelector(focusSelector)?.focus({ preventScroll: true });
    }
    container.addEventListener('click', event => {
      const button = event.target.closest('[data-task-page]');
      if (!button || button.disabled) return;
      page = Number(button.dataset.taskPage);
      refresh('[aria-current="page"]');
    });
    container.addEventListener('change', event => {
      if (!event.target.matches('select')) return;
      size = Number(event.target.value);
      page = 1;
      refresh('select');
    });

    return (rows, scope) => {
      if (scope !== previousScope) { page = 1; previousScope = scope; }
      const pageCount = Math.max(1, Math.ceil(rows.length / size));
      page = Math.min(Math.max(1, page), pageCount);
      const first = Math.max(1, Math.min(page - 2, pageCount - 4));
      const last = Math.min(pageCount, first + 4);
      const pageButton = n => `<button type="button" data-task-page="${n}" aria-label="第${n}页" ${page === n ? 'aria-current="page"' : ''}>${n}</button>`;
      let buttons = first > 1 ? pageButton(1) + (first > 2 ? '<span class="pagination-ellipsis">…</span>' : '') : '';
      for (let n = first; n <= last; n++) buttons += pageButton(n);
      if (last < pageCount) buttons += (last < pageCount - 1 ? '<span class="pagination-ellipsis">…</span>' : '') + pageButton(pageCount);
      container.innerHTML = `<span class="wb1-page-total" aria-live="polite">共 ${rows.length} 条</span><label class="wb1-page-size"><select aria-label="每页任务条数">${[5, 10, 20, 50].map(n => `<option value="${n}" ${n === size ? 'selected' : ''}>${n} 条/页</option>`).join('')}</select></label><div class="wb1-page-buttons"><button type="button" data-task-page="${page - 1}" aria-label="上一页" ${page === 1 ? 'disabled' : ''}>‹</button>${buttons}<button type="button" data-task-page="${page + 1}" aria-label="下一页" ${page === pageCount ? 'disabled' : ''}>›</button></div>`;
      return rows.slice((page - 1) * size, page * size);
    };
  }

  const paginateTasks = createTaskPagination(document.querySelector('[data-wb1-pagination]'), document.querySelector('.wb1-table-wrap'));
  const paginateToday = createTaskPagination(todayPanel.querySelector('[data-wb-today-pagination]'), todayPanel.querySelector('.wb-today-table-wrap'));
  function pageRows(rows) {
    const scope = JSON.stringify([window.workbenchListFilters?.state(), activeMode, activeSet, executionFilter, followupFilter, todayOnly, projectFilter.value, document.querySelector('[data-wb1-center]').value, participantSearch.value.trim().toLowerCase()]);
    return paginateTasks(rows, scope);
  }

  function isTodayTask(mode, task) {
    if (mode === 'execution') {
      return !P.closed(task) && task.scope !== 'overdue' &&
        (task.plannedAt.slice(0, 10) === P.today || P.range(task)[1].slice(0, 10) === P.today);
    }
    if (mode === 'followup') return task.scope === 'pending' && task.date === P.today;
    if (mode === 'appointment') return !task.appointmentDate && task.plannedDate === P.today;
    return task.plannedDate === P.today;
  }

  function todayVisitEntries(visit, index) {
    const store = window.clinicalVisitStore, state = store.status(visit);
    const actions = ['activated','partial'].includes(state)
      ? [['execute','访视执行'],['book','调整预约'],['followup','添加跟进'],['contact','联系参与者'],...(D.hasTasks(visit)?[['tasks','任务处理']]:[]),['terminate','访视终止']]
      : [['summary','查看详情']];
    return actions.map(([action,label])=>`<button type="button" data-today-visit="${index}" data-today-visit-action="${action}"${action==='terminate'?' class="danger"':''}>${label}</button>`);
  }

  function todayVisitRow(visit) {
    const store = window.clinicalVisitStore, state = store.status(visit);
    const buttons = taskActions('visit', todayVisits.indexOf(visit));
    return `<tr><td>${participantNameLink(visit.participant,visit.participantId,visit.trial,visit.participantStatus,visit.projectId)}</td><td>${escapeMarkup(visit.participantId)}</td><td>${escapeMarkup(visit.trial)}</td><td>${escapeMarkup(visit.name)}</td><td>${visitStatusMarkup(visit,'today',todayVisits.indexOf(visit))}</td><td>${dateWindowMarkup(visit.plannedDate,visit.windowStart+' ～ '+visit.windowEnd)}</td><td>${escapeMarkup(visit.appointmentDate)}</td><td><div class="wb1-table-actions">${buttons}</div></td></tr>`;
  }

  function renderOverview(visits, matchesTrial, center, centers) {
    const store = window.clinicalVisitStore;
    const inScope = task => matchesTrial(task.trial) && (!center || (task.hospital || centers.get(P.personKey(task))) === center);
    const pendingVisits = visits.filter(visit => ['activated', 'partial'].includes(store.status(visit)) && inScope(visit));
    const calendarURL = filters => {
      const params = new URLSearchParams({ view: 'visits', ...filters });
      if (projectFilter.value) params.set('project', window.researchProjectId(projectFilter.value));
      if (center) params.set('hospital', center);
      return `participants.html?${params}`;
    };
    const allVisitsLink = document.querySelector('[data-wb-all-visits]');
    if (allVisitsLink) allVisitsLink.href = calendarURL({});
    const executionDeadline = task => P.range(task)[1];
    const byExecutionDeadline = (a, b) => executionDeadline(a).localeCompare(executionDeadline(b));
    todayVisits = visits.filter(visit => visit.todayHandledDate !== P.today && inScope(visit) && ['activated','partial'].includes(store.status(visit)) && visit.appointmentDate?.slice(0, 10) === P.today).sort((a,b)=>a.appointmentDate.localeCompare(b.appointmentDate));
    const categories = { visits: todayVisits, execution: executionTasks, followup: followupTasks, appointment: appointmentTasks };
    const tasksByCategory = {};
    for (const tab of todayTabs) {
      const key = tab.dataset.todayTab;
      const tasks = key === 'visits' ? todayVisits : categories[key].filter(task => inScope(task) && isTodayTask(key, task));
      tasksByCategory[key] = tasks;
      updateOverviewTab(tab, key === todayCategory, todayPanel, tasks.length);
    }
    const missedVisits=visits.filter(visit=>inScope(visit)&&store.overdueUnhandled(visit,P.today));
    missedVisitNotice.hidden=todayCategory!=='visits'||!missedVisits.length;
    missedVisitNotice.innerHTML=missedVisits.length?`<span>有 <strong>${missedVisits.length}</strong> 次今日之前的访视尚未执行或调整，请及时处理。</span><a href="${escapeMarkup(calendarURL({appointmentOverdue:'1',referenceDate:P.today,from:'workbench'}))}">查看待处理访视 ›</a>`:'';
    const todayTasks = tasksByCategory[todayCategory];
    if (todayCategory === 'execution') todayTasks.sort(byExecutionDeadline);
    renderTaskColumns(todayTable, todayCategory === 'visits' ? [['参与试验',22],['访视',18],['访视状态',10],['计划日期 / 访视窗口',24],['预约日期',14]] : taskFields(todayCategory));
    const todayPage = paginateToday(todayTasks, JSON.stringify([todayCategory, projectFilter.value, center]));
    const participantStates = new Map(visits.map(visit => [P.personKey(visit), visit.participantStatus]));
    todayRows.innerHTML = todayPage.length ? todayPage.map(task =>
      todayCategory === 'visits' ? todayVisitRow(task) : sharedTaskRow(todayCategory, task, participantStates.get(P.personKey(task)) || task.participantStatus)
    ).join('') : `<tr><td colspan="${todayTable.querySelectorAll('thead th').length}" class="wb-today-empty">暂无待办</td></tr>`;

    const visitItem = (visit, group) => {
      const person = [visit.participantId, visit.participant].filter(Boolean).join(' · ');
      const href = calendarURL({ visitId: visit.id, visitProject: visit.projectId });
      const shortDate = date => String(date || '').slice(5).replace('-', '/');
      const days = P.dayDifference(visit.windowEnd, P.today);
      const overdue = days > 0;
      const urgency = group === 'unbooked' ? '据窗口结束 1 天' : overdue ? `已超窗 ${days} 天` : days === 0 ? '今日截止' : days === -1 ? '明天截止' : `${-days}天后截止`;
      return `<li class="wb-preview-item wb-attention-visit">
        <a class="wb-attention-row-link" href="${escapeMarkup(href)}" aria-label="查看 ${escapeMarkup(person)} 的${escapeMarkup(visit.name)}">
          <div class="wb-attention-identity">
            <strong title="${escapeMarkup(person)}">${escapeMarkup(visit.participantId)}<span>（${escapeMarkup(visit.participant)}）</span></strong>
            <span class="wb-attention-dates" title="计划日期 ${escapeMarkup(visit.plannedDate)}，访视窗口 ${escapeMarkup(visit.windowStart)} ～ ${escapeMarkup(visit.windowEnd)}">${escapeMarkup(shortDate(visit.plannedDate))}（${escapeMarkup(shortDate(visit.windowStart))}~${escapeMarkup(shortDate(visit.windowEnd))}）</span>
          </div>
          <div class="wb-attention-bottom"><span class="wb-attention-cycle" title="${escapeMarkup(visit.name)}">${escapeMarkup(visit.name)}</span><span class="wb-attention-deadline ${overdue && group !== 'unbooked' ? 'is-overdue' : ''}">${urgency}</span></div>
        </a>
      </li>`;
    };
    const attentionGroups = [
      { filter: 'overdue', label: '超窗待访视', visits: pendingVisits.filter(visit => store.windowStatus(visit, P.today) === 'overdue').sort((a,b)=>a.windowEnd.localeCompare(b.windowEnd)) },
      { filter: 'last-day', label: '即将超窗', visits: pendingVisits.filter(visit => visit.windowEnd === P.today) },
      { filter: 'unbooked', label: '访视需预约', visits: pendingVisits.filter(visit => !visit.appointmentDate && !visit.appointmentWaiver).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)) }
    ];
    const groups = attentionGroups.filter(group => group.visits.length).map(({ filter, label, visits }) =>
      `<section class="wb-preview-group" data-attention-group="${filter}">
        <div class="wb-preview-group-head"><h3>${filter === 'unbooked' ? '<img src="figma-attention-assets/appointment-calendar.svg" alt="" width="12" height="12">' : `<img src="figma-attention-assets/${filter === 'overdue' ? 'overdue-warning-current.svg' : 'due-clock-current.svg'}" alt="" width="12" height="12">`}${label}</h3>
          ${visits.length > 2 ? `<a href="${escapeMarkup(calendarURL(filter === 'unbooked' ? {appointment:'unbooked',pending:'1'} : { window: filter }))}" aria-label="查看全部 ${visits.length} 条${label}">查看全部 ${visits.length} <span aria-hidden="true">›</span></a>` : `<span class="wb-attention-count">共 ${visits.length} 条</span>`}
        </div>
        <ul>${visits.slice(0, 2).map(visit => visitItem(visit, filter)).join('')}</ul>
      </section>`).join('');
    attentionPanel.innerHTML = groups || '<p class="wb-preview-empty">暂无重点关注事项</p>';
  }

  function renderRows() {
    closeVisitCompletion();
    window.saveResearchDemo();
    const trialMatches = trial => !projectFilter.value || trial === projectFilter.value;
    const centerValue = document.querySelector("[data-wb1-center]").value;
    executionTasks.forEach(P.refresh);
    processingTasks.forEach(P.syncProcessing);
    const visitList = P.visits();
    const participantStatuses = new Map(visitList.map(visit => [P.personKey(visit), visit.participantStatus]));
    const participantState = row => participantStatuses.get(P.personKey(row)) || (Array.isArray(row) ? row[7] : row.participantStatus);
    appointmentTasks=visitList.filter(v=>['activated','partial'].includes(window.clinicalVisitStore.status(v))&&(v.appointmentDate||!v.appointmentWaiver)).map(v=>({...v,visit:v.name,plannedAt:v.plannedDate}));
    const centers = new Map(visitList.map(visit => [P.personKey(visit), visit.hospital]));
    const inCenter = (row, center) => !center || (row.hospital || centers.get(P.personKey(row))) === center;
    renderOverview(visitList, trialMatches, centerValue, centers);
    const dateMatches = row => !todayOnly || isTodayTask(activeMode, row);
    const countBy = (rows, predicate) => P.count(rows.filter(row=>trialMatches(row.trial) && inCenter(row, centerValue) && predicate(row)));
    document.querySelector('[data-wb1-summary=issue] strong').textContent=P.count(taskSets.draft.filter(row=>trialMatches(row[8])&&inCenter(row, centerValue)&&P.eligible(row,visitList)));
    document.querySelector('[data-wb1-summary=execution] strong').textContent=countBy(executionTasks,P.due);
    document.querySelector('[data-wb1-summary=execution-overdue] strong').textContent=countBy(executionTasks,row=>row.scope==='overdue');
    document.querySelector('[data-wb1-summary=processing] strong').textContent=countBy(processingTasks,row=>row.scope==='pending');
    document.querySelector('[data-wb1-summary=followup] strong').textContent=countBy(followupTasks,row=>row.scope==='pending');
    document.querySelector('[data-wb1-summary=appointment] strong').textContent=countBy(appointmentTasks,row=>!row.appointmentDate);
    document.querySelectorAll('[data-wb1-summary]').forEach(button=>button.title=button.querySelector('.wb1-stat-label').textContent+'：按参与者去重统计（人）');
    const list=window.workbenchListFilters?.state()||{project:projectFilter.value,center:centerValue};
    const localMatches = row => !window.workbenchListFilters || window.workbenchListFilters.matches(row, participantState(row));
    const matchesScope = row => {
      const trial = Array.isArray(row) ? row[8] : row.trial;
      return (!list.project || trial === list.project) && inCenter(row, list.center) && localMatches(row);
    };
    const matchesIssue = (row, scope) => matchesScope(row)
      && (scope !== 'draft' || P.eligible(row, visitList))
      && (scope !== 'sent' || !list.executionState || P.issuedExecuted(row) === (list.executionState === 'executed'));
    const tabs=[...document.querySelectorAll('[data-wb1-tab]')];
    if(activeMode==='issue') ['draft','sent','none'].forEach((scope,i)=>{tabs[i].textContent=({draft:'待发放',sent:'已发放',none:'无需处理'}[scope])+`（${taskSets[scope].filter(row=>matchesIssue(row, scope)).length}）`;});
    executionSwitch.hidden = activeMode !== 'execution' || !Object.hasOwn(executionRangeLabels, executionFilter);
    if (activeMode === 'execution') {
      const scopedTasks = executionTasks.filter(row => matchesScope(row) && dateMatches(row));
      const count = scope => scopedTasks.filter(row => matchesExecutionScope(row, scope)).length;
      tabs[0].textContent = `待执行（${count('all')}）`;
      tabs[3].textContent = `已完成（${count('completed')}）`;
      tabs[4].textContent = `无需处理（${count('none')}）`;
      executionRanges.forEach(button => {
        const { executionRange } = button.dataset;
        button.textContent = `${executionRangeLabels[executionRange]}（${count(executionRange)}）`;
        button.setAttribute('aria-pressed', String(executionRange === executionFilter));
      });
    }
    if(activeMode==='followup') ['pending','completed','none'].forEach((scope,i)=>{tabs[i].textContent=['待完成','已完成','无需处理'][i]+`（${followupTasks.filter(row=>matchesScope(row)&&dateMatches(row)&&row.scope===scope).length}）`;});
    tabs.forEach((tab,index)=>{if(tab.textContent.startsWith('无需处理'))tab.hidden=!(['issue','followup'].includes(activeMode)&&index===2||activeMode==='execution'&&index===4);});
    closeActionMenu();
    const keyword = participantSearch.value.trim().toLowerCase();
    if(activeMode==='appointment') {
      tabs.forEach((tab,i)=>{tab.hidden=i>1;if(i<2)tab.textContent=(i===0?'待预约':'已预约')+'（'+appointmentTasks.filter(row=>matchesScope(row)&&dateMatches(row)&&Boolean(row.appointmentDate)===(i===1)).length+'）';});
      const rows=appointmentTasks.filter(row=>Boolean(row.appointmentDate)===(appointmentFilter==='booked')&&dateMatches(row)&&matchesScope(row)&&`${row.participantId}${row.participant}`.toLowerCase().includes(keyword));
      if(!rows.length)pageRows(rows);
      tableBody.innerHTML=rows.length?pageRows(rows).map(row=>sharedTaskRow('appointment', row, participantState(row))).join(''):`<tr><td class="wb1-empty" colspan="${tableCols.children.length}">暂无${appointmentFilter==='booked'?'已预约':'待预约'}访视</td></tr>`;
      return;
    }
    if (activeMode === 'processing') {
      const rows = processingTasks.filter(row => row.scope === 'pending' && matchesScope(row) && `${row.participantId}${row.participant}`.toLowerCase().includes(keyword));
      if (!rows.length) pageRows(rows);
      tableBody.innerHTML = rows.length ? pageRows(rows).map(row => {
        const index = processingTasks.indexOf(row);
        const actions = taskActions('processing', index);
        const crfs=P.crfs(row),completed=crfs.filter(crf=>crf.state==='已完成').length,rate=crfs.length?Math.round(completed/crfs.length*100):0;
        return `<tr>${participantColumns(row.participant, row.participantId, row.trial, participantState(row), row.projectId)}<td>${row.trial}</td><td>${taskVisitMarkup(row.visit,row.trial,row.participantId,row.protocolVersion,row.visitId)}</td><td>${processingDateMarkup(row)}</td>${participantStatusColumn(participantState(row))}<td>${row.actualDate}</td><td><div class="wb1-data-completeness wb1-visit-completeness" title="已完成 ${completed}/${crfs.length} 个 CRF"><progress max="100" value="${rate}" aria-label="访视完成率 ${rate}%"></progress><span>${rate}%</span></div></td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
      }).join('') : `<tr><td class="wb1-empty" colspan="${tableCols.children.length}">暂无匹配的待处理任务</td></tr>`;
      return;
    }
    if (activeMode === 'followup') {
      const rows = followupTasks.filter(row => dateMatches(row) && matchesScope(row) && row.scope === followupFilter && `${row.participantId}${row.participant}`.toLowerCase().includes(keyword));
      if (!rows.length) pageRows(rows);
      tableBody.innerHTML = rows.length ? pageRows(rows).map(row => {
        return sharedTaskRow('followup', row, participantState(row));
      }).join('') : `<tr><td class="wb1-empty" colspan="${tableCols.children.length}">暂无匹配的跟进任务</td></tr>`;
      return;
    }
    if (activeMode === 'execution') {
      const rows = executionTasks.filter(row => {
        const matchesFilter = matchesExecutionScope(row, executionFilter);
        const matchesKeyword = `${row.participantId}${row.participant}`.toLowerCase().includes(keyword);
        return dateMatches(row) && matchesScope(row) && matchesFilter && matchesKeyword;
      });
      if (!rows.length) pageRows(rows);
      tableBody.innerHTML = rows.length ? pageRows(rows).map(row => {
        return sharedTaskRow('execution', row, participantState(row));
      }).join('') : `<tr><td class="wb1-empty" colspan="${tableCols.children.length}">暂无匹配的执行任务</td></tr>`;
      return;
    }
    const rows = taskSets[activeSet].filter(row => matchesIssue(row, activeSet) && `${row[0]}${row[6]}`.toLowerCase().includes(keyword));
    if (!rows.length) pageRows(rows);
    tableBody.innerHTML = rows.length ? pageRows(rows).map(row => {
      const sent = activeSet === 'sent';
      const executed = sent && P.issuedExecuted(row);
      const executionStatus = sent ? `<td><span class="wb1-execution-status${executed ? ' is-completed' : ''}">${executed ? '已执行' : '未执行'}</span></td>` : '';
      const date = sent ? scheduleDrafts[P.packageKey(row)]?.date || row[9] : row[9];
      return `<tr>${participantColumns(row[6], row[0], row[8], participantState(row), row.projectId)}<td class="is-strong">${escapeMarkup(row[1])}</td><td>${escapeMarkup(row[8])}</td><td>${taskVisitMarkup(row[2], row[8], row[0], row.protocolVersion, row.visitId)}</td><td>${plannedDateLabel(row, date)}</td>${participantStatusColumn(participantState(row))}${executionStatus}<td><div class="wb1-table-actions">${taskActions('issue', taskSets[activeSet].indexOf(row))}</div></td></tr>`;
    }).join('') : `<tr><td class="wb1-empty" colspan="${tableCols.children.length}">暂无匹配任务</td></tr>`;
  }

  function sharedTaskRow(kind, row, state) {
    const source = { execution: executionTasks, followup: followupTasks, appointment: appointmentTasks }[kind];
    const actions = taskActions(kind, source.indexOf(row));
    if (kind === 'appointment') return `<tr>${participantColumns(row.participant, row.participantId, row.trial, state, row.projectId)}<td>${escapeMarkup(row.trial)}</td><td>${escapeMarkup(row.name)}</td><td>${dateWindowMarkup(row.plannedDate,row.windowStart+' ～ '+row.windowEnd)}</td><td>${escapeMarkup(row.appointmentDate||'未预约')}</td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
    if (kind === 'followup') return `<tr>${participantColumns(row.participant, row.participantId, row.trial, state, row.projectId)}<td>${escapeMarkup(row.trial)}</td><td>${escapeMarkup(row.date)}</td><td>${escapeMarkup(row.content)}</td><td><span class="wb1-execution-status">${{ pending: '待完成', completed: '已完成', none: '无需处理' }[row.scope]}</span></td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
    const statusClass = executionStatusClass(row);
    return `<tr>${participantColumns(row.participant, row.participantId, row.trial, state, row.projectId)}<td class="is-strong">${row.task}</td><td>${row.trial}</td><td>${escapeMarkup(row.visit)}</td><td><div class="wb1-execution-node"><strong>${row.relativeDay}</strong><span>${row.sequence}</span></div></td><td>${dateWindowMarkup(row.plannedAt, row.window)}</td><td><span class="wb1-execution-status${statusClass}">${row.status}</span></td><td><div class="wb1-table-actions">${actions}</div></td></tr>`;
  }

  function taskFields(mode) {
    if (mode === 'appointment') return [['参与试验',20],['访视',16],['计划日期/访视窗口',22],['预约日期',12]];
    if (mode === 'followup') return [['参与试验',20],['计划跟进日期',14],['跟进内容',28],['状态',10]];
    return [
      ['任务名称', 10], ['参与试验', 9], ['访视', 7], ['执行节点', 6],
      ['计划时间/执行窗口', 20], ['状态', 8]
    ];
  }

  function setTaskColumns(fields) {
    renderTaskColumns(taskTable, fields);
  }

  function renderTaskColumns(table, fields) {
    const columns = [['参与者', 8], ['参与者编号', 11], ...fields, ['操作', 16]];
    table.querySelector('colgroup').innerHTML = columns.map(([, width]) => `<col style="width:${width}%">`).join('');
    table.querySelector('thead').innerHTML = `<tr>${columns.map(([label]) => `<th scope="col"${label === '参与者状态' ? ' class="wb1-participant-status"' : ''}>${label}</th>`).join('')}</tr>`;
  }

  function setIssueColumns() {
    const sent = activeSet === 'sent';
    setTaskColumns([
      ['任务名称', sent ? 12 : 15], ['参与试验', sent ? 11 : 13], ['访视', sent ? 9 : 11],
      ['计划日期/访视窗口', sent ? 14 : 15], ['参与者状态', 11],
      ...(sent ? [['执行状态', 8]] : [])
    ]);
  }

  function configureTaskList(mode, initialExecutionRange = 'all') {
    const tabs = [...document.querySelectorAll('[data-wb1-tab]')];
    closeActionMenu();
    activeMode = mode;
    todayOnly = ['execution', 'followup', 'appointment'].includes(mode) && new URLSearchParams(location.search).get('workDate') === 'today';
    document.querySelector('.wb1-task-tools').hidden = mode==='processing';
    taskTable.classList.toggle('is-followup', mode === 'followup');
    taskTable.classList.toggle('is-execution', mode === 'execution');
    window.workbenchListFilters?.setMode(mode);
    tabs.forEach((button, index) => button.setAttribute('aria-selected', String(index === 0)));
    if (mode === 'appointment') {
      appointmentFilter='unbooked';
      tabs.forEach((tab,i) => { tab.hidden = i>1; });
      setTaskColumns(taskFields('appointment'));
    } else if (mode === 'processing') {
      tabs.forEach(tab => { tab.hidden = true; });
      setTaskColumns([['参与试验', 16], ['访视', 12], ['计划日期/访视窗口', 15], ['参与者状态', 11], ['实际访视日期', 11], ['访视完成率', 14]]);
    } else if (mode === 'followup') {
      followupFilter = 'pending';
      tabs.forEach((button, index) => { button.hidden = index > 2; });
      refreshFollowupCounts();
      setTaskColumns(taskFields('followup'));
    } else if (mode === 'execution') {
      pendingExecutionFilter = executionFilter = initialExecutionRange;
      tabs.forEach(button => { button.hidden = !['draft', 'completed', 'execution-none'].includes(button.dataset.wb1Tab); });
      setTaskColumns(taskFields('execution'));
    } else {
      activeSet = 'draft';
      tabs.forEach((button, index) => { button.hidden = index > 2; });
      tabs[0].textContent = `待发放（${taskCounts.draft}）`;
      tabs[1].textContent = `已发放（${taskCounts.sent}）`;
      tabs[2].textContent = `无需处理（${taskCounts.none}）`;
      setIssueColumns();
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
    executionSubject.textContent = `${task.participant} ${task.participantId} · ${task.relativeDay}（${task.sequence}）`;
    executionPackage.hidden = mode !== 'view';
    executionPackage.textContent = '查看执行结果';
    executionSubmit.hidden = mode !== 'execute';
    executionCancel.textContent = mode === 'execute' ? '取消' : '关闭';
    if (mode === 'execute') {
      const actionContent = task.executionType === 'upload'
        ? `<form class="wb1-execution-form" data-wb1-execution-form>
            <label class="is-full">
              上传文件
              <span class="wb1-upload">
                <input name="file" type="file" multiple required aria-label="上传任务文件" aria-describedby="wb1-upload-filename">
                <img src="figma-clinical-assets/upload-cloud.png" alt="" width="32" height="32">
                <span id="wb1-upload-filename" class="wb1-upload-filename" aria-live="polite" hidden></span>
                <span class="wb1-upload-action">选择文件</span>
              </span>
            </label>
            <label class="is-full">文件说明<textarea name="note" maxlength="500" placeholder="选填，说明文件内容"></textarea></label>
          </form>`
        : `<form class="wb1-execution-form" data-wb1-execution-form><label>是否出现相关症状<select name="symptom" required><option value="">请选择</option><option>是</option><option>否</option></select></label><label>严重程度<select name="severity" required><option value="">请选择</option><option>轻度</option><option>中度</option><option>重度</option></select></label><label class="is-full">补充说明<textarea name="note" maxlength="500" placeholder="选填，补充本次执行情况"></textarea></label></form>`;
      const sectionHeading = task.executionType === 'upload' ? '' : `<h3>填写${task.formName || '任务表单'}</h3>`;
      executionBody.innerHTML = `<section class="wb1-execution-card">${sectionHeading}${actionContent}</section>`;
    } else if (mode === 'result') {
      executionBody.innerHTML = `<section class="wb1-execution-card">${window.clinicalExecutionResultMarkup(task)}</section>`;
    } else {
      executionBody.innerHTML = window.clinicalTaskDetailsMarkup({...task,name:task.task},{configuration:issueConfig(executionTaskToRow(task)),executions:[task]});
    }
    executionMask.hidden = false;
    executionBody.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    window.focusDialogFrame(executionMask);
  }

  function closeExecutionModal() {
    executionMask.hidden = true;
    document.body.style.overflow = '';
    currentExecutionTask = null;
    executionModalMode = 'view';
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
    if (adjustingIssued) {
      const { anchor, date, executions, times, offsets } = activeSchedule;
      const before = executions.length ? executions : P.schedule(activeTask, anchor, times, offsets);
      const days = date ? P.dayDifference(anchor, date) : 0;
      const after = !date ? [] : executions.length
        ? executions.map(task => days ? P.shiftExecutionPlan(task, days) : task)
        : P.schedule(activeTask, date, times, offsets);
      const planCell = plan => plan
        ? `<td><strong>${escapeMarkup(plan.plannedAt)}</strong><small>执行窗口 ${escapeMarkup(plan.window)}</small></td>`
        : '<td>—</td>';
      adjustmentRows.innerHTML = before.map((plan, index) =>
        `<tr><th scope="row">${escapeMarkup(plan.sequence || `第${index + 1}次`)}</th>${planCell(plan)}${planCell(after[index])}</tr>`
      ).join('');
      adjustmentCount.textContent = `共 ${before.length} 个未执行任务`;
      return;
    }
    const windowRange = parseWindow(activeTask[5]);
    issuePreview.innerHTML = activeSchedule.times.map((time, index) => {
      const task = activeSchedule.executions[index];
      if (task) {
        const days = activeSchedule.date ? P.dayDifference(activeSchedule.anchor, activeSchedule.date) : 0;
        const plan = P.shiftExecutionPlan(task, days);
        return `<tr><td>${escapeMarkup(task.sequence || `第${index + 1}次`)}</td><td>${escapeMarkup(plan.plannedAt.slice(0, 10))}</td><td>${escapeMarkup(time || '未指定时间')}</td><td>${escapeMarkup(plan.window)}</td><td><span class="wb1-issue-status">${escapeMarkup(task.status || '已生成')}</span></td></tr>`;
      }
      const day = shiftDate(activeSchedule.date, activeSchedule.offsets?.[index] || 0);
      const start = `${shiftDate(day, -windowRange.before)} ${time}`;
      const end = `${shiftDate(day, windowRange.after)} ${time}`;
      return `<tr><td>第${index + 1}次</td><td>${day || '--'}</td><td>${time ? `<input type="time" value="${time}" data-wb1-issue-time="${index}" aria-label="第${index + 1}次采集时间"${issueReadOnly ? ' disabled' : ''}>` : '未指定时间'}</td><td>${start} ～ ${end}</td><td><span class="wb1-issue-status">${issueReadOnly ? '已生成' : '待发放'}</span></td></tr>`;
    }).join('');
    issueFields.count.textContent = `共生成 ${activeSchedule.times.length} 个执行任务`;
  }

  function setConfigSwitch(element, enabled) {
    element.textContent = enabled ? '开启' : '关闭';
    element.classList.toggle('is-on', enabled);
  }

  function issueConfig(row) {
    return taskConfigs[row[0]] || { status: row[7], formName: row[3] === '表单填写' ? `${row[1]}表` : '', fillMode: row[3] === '表单填写' || row[3] === '患者填写' ? '仅患者填写' : '个案可填', description: `${row[1]}相关采集任务。`, baseline: '访视日期', overdue: false, autoMap: false };
  }

  function openIssueModal(row, readOnly = false, adjust = false) {
    activeTask = row;
    issueReadOnly = readOnly;
    adjustingIssued = adjust;
    const config = issueConfig(row);
    issueResults.hidden=true;issueBody.hidden=false;issueResultsButton.hidden=!readOnly;issueResultsButton.textContent='查看执行结果';
    const saved = scheduleDrafts[P.packageKey(row)];
    const issued = taskSets.sent.includes(row) ? P.issuedExecutions(row) : [];
    const executions = adjust ? issued.filter(task => !P.closed(task)) : issued;
    const date = saved?.date || row[9] || '';
    activeSchedule = {
      date, anchor: date, executions,
      offsets: saved?.offsets,
      times: executions.length ? executions.map(task => task.plannedAt.slice(11, 16)) : [...(saved?.times || templateTimes[row[0]] || [''])]
    };
    issueTitle.textContent = readOnly ? '查看任务' : adjust ? '调整日期' : '发放任务';
    const windowRule = row[5]?.replace(/\s*\/\s*/, '至');
    issueDateLabel.textContent = adjust ? '基准日期' : '访视日期（基准日期）';
    issueDateHelp.textContent = adjust
      ? `以${config.baseline}为基准${windowRule ? `，执行窗口为${windowRule}` : ''}。`
      : readOnly ? '以下为当前基准日期及执行计划。' : '修改后，系统将立即重新计算下方尚未执行的任务。';
    issueDetails.forEach(section => { section.hidden = adjust; });
    adjustmentTask.hidden = !adjust;
    adjustmentTask.textContent = adjust ? `${row[1]} · ${row[2]}` : '';
    adjustmentPreview.hidden = !adjust;
    issueMask.classList.toggle('is-readonly', readOnly);
    issueDate.disabled = readOnly;
    issueAdjustment.hidden = !adjust;
    issueAdjustmentReason.disabled = !adjust;
    issueAdjustmentReason.value = '';
    clearAdjustmentError();
    issueCancel.hidden = readOnly;
    issueSave.hidden = readOnly || adjust;
    issueConfirm.textContent = readOnly ? '关闭' : adjust ? '确认调整' : '确认发放';
    issueFields.participant.textContent = `${row[6]}`;
    issueFields.id.textContent = row[0];
    issueFields.status.textContent = row[7] || config.status;
    issueFields.task.innerHTML = window.clinicalTaskNameMarkup({name:row[1],method:row[3],formName:config.formName||row[1]+'表'});
    issueFields.visit.textContent = row[2];
    issueFields.method.textContent = window.clinicalTaskMethodLabel({method:row[3]});
    issueFields.formName.hidden = !config.formName;
    issueFields.formName.innerHTML = config.formName ? `表单：<button type="button" data-form-preview="${escapeMarkup(config.formName)}">${escapeMarkup(config.formName)}</button>` : '';
    issueFields.fillMode.textContent = config.fillMode;
    issueFields.description.textContent = config.description;
    issueFields.cycle.textContent = row[4];
    issueFields.baseline.textContent = config.baseline;
    issueFields.templateTimes.textContent = `${activeSchedule.times.length}个时段（${activeSchedule.times.filter(Boolean).join('、') || '未指定时间'}）`;
    issueFields.window.textContent = row[5];
    setConfigSwitch(issueFields.overdue, config.overdue);
    setConfigSwitch(issueFields.autoMap, config.autoMap);
    issueDate.value = activeSchedule.date;
    renderIssuePreview();
    issueMask.hidden = false;
    document.body.style.overflow = 'hidden';
    issueBody.scrollTop = 0;
    window.focusDialogFrame(issueMask);
  }

  function closeIssueModal() {
    issueMask.hidden = true;
    document.body.style.overflow = '';
    activeTask = null;
    activeSchedule = null;
    issueReadOnly = false;
    adjustingIssued = false;
  }

  function setReasonContext(task, followContent='') {
    let box=reasonMask.querySelector('[data-reason-context]');
    if(!box){box=document.createElement('div');box.dataset.reasonContext='';reasonMask.querySelector('.wb1-reason-body').prepend(box);}
    box.innerHTML=D.projectMarkup(task)+(followContent?`<div class="wb-task-context"><span>跟进内容</span><p>${escapeMarkup(followContent)}</p></div>`:'');
  }
  function openReasonModal(row, readOnly = false, context = 'issue', executionTask = null) {
    setReasonContext(executionTask || {projectId:P.project(row),trial:row[8]});
    reasonTask = row;
    reasonContext = context;
    reasonExecutionTask = executionTask;
    reasonTitle.textContent = readOnly ? '无需处理记录' : '无需处理';
    reasonSubject.textContent = `${row[6]} ${row[0]} · ${row[1]}`;
    reasonLabel.innerHTML = readOnly ? '无需处理原因' : '无需处理原因 <em>*</em>';
    reasonInput.value = readOnly ? (context === 'execution' || context === 'processing' ? executionTask?.noProcessReason : P.meta(row).reason || reasonRecords[row[0]]) || '暂无原因记录。' : '';
    reasonInput.readOnly = readOnly;
    reasonInput.required = !readOnly;
    reasonInput.placeholder = readOnly ? '' : '请填写无需处理原因，最多200字符';
    reasonCount.textContent = reasonInput.value.length;
    reasonError.textContent = '';
    reasonCancel.hidden = readOnly;
    reasonSubmit.textContent = readOnly ? '关闭' : '确认';
    reasonSubmit.dataset.readonly = String(readOnly);
    reasonMask.hidden = false;
    document.body.style.overflow = 'hidden';
    window.focusDialogFrame(reasonMask);
  }

  function closeReasonModal() {
    reasonMask.hidden = true;
    document.body.style.overflow = '';
    reasonTask = null;
    reasonContext = 'issue';
    reasonExecutionTask = null;
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
    const task=taskFor(kind,index);if(!task)return;
    const candidates=P.visits().filter(visit=>P.matchesVisit(task,visit));
    const visit=candidates.length===1?candidates[0]:null;
    const source=Array.isArray(task)?{participantId:task[0],participant:task[6],participantStatus:task[7],trial:task[8],name:task[2]}:{participantId:task.participantId,participant:task.participant,participantStatus:task.participantStatus,trial:task.trial,name:task.visitFull||task.visit||''};
    closeActionMenu();
    D.addFollowup({...source,projectId:P.project(task),id:visit?.id||task.visitId||'',name:visit?.name||source.name});
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
      followupError.textContent = !content ? '请填写跟进内容' : '跟进内容最多200字符';
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
    reasonSubject.textContent = `${task.participant} ${task.participantId}`;
    setReasonContext(task,task.content);
    reasonLabel.innerHTML = `${label} <em>*</em>`;
    reasonInput.value = '';
    reasonInput.readOnly = false;
    reasonInput.required = true;
    reasonInput.placeholder = `请填写${label}，最多200字符`;
    reasonCount.textContent = reasonInput.value.length;
    reasonError.textContent = '';
    reasonCancel.hidden = false;
    reasonSubmit.textContent = '确认';
    reasonSubmit.dataset.readonly = 'false';
    reasonMask.hidden = false;
    document.body.style.overflow = 'hidden';
    window.focusDialogFrame(reasonMask);
  }

  function escapeMarkup(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function openFollowupHistory(task) {
    currentExecutionTask = null;
    executionModalMode = 'followup-history';
    executionTitle.textContent = '操作记录';
    executionSubject.textContent = `${task.participant} ${task.participantId}`;
    executionPackage.hidden = true;
    executionSubmit.hidden = true;
    executionCancel.textContent = '关闭';
    const participant = `${task.participant} ${task.participantId} · ${task.participantStatus}`;
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
    window.focusDialogFrame(executionMask);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    issueToast.textContent = message;
    issueToast.hidden = false;
    toastTimer = setTimeout(() => { issueToast.hidden = true; }, 2600);
  }
  window.workbenchContactParticipant = participant => showToast(`联系参与者：${participant}（演示）`);

  function saveSchedule() {
    scheduleDrafts[P.packageKey(activeTask)] = { date: activeSchedule.date, times: [...activeSchedule.times], offsets: activeSchedule.offsets };
    window.saveResearchDemo();
  }

  function createExecutionTasks(row, schedule, packageId) {
    const config = issueConfig(row);
    return P.schedule(row, schedule.date, schedule.times, schedule.offsets).map(({ plannedAt, window: taskWindow }, index) => P.refresh({
      participantId: row[0], participant: row[6], participantStatus: row[7], trial: row[8], packageId,
      visitId: row.visitId, canonicalKey: `${packageId}:${index + 1}`, task: row[1], visit: row[2], visitFull: row[2],
      sequence: `第${index + 1}次`, relativeDay: '访视当日', plannedAt, window: taskWindow,
      method: row[3], formName: config.formName, fillMode: config.fillMode,
      canCaseExecute: !config.fillMode.includes('仅患者'), executionType: /上传|报告/.test(row[3]) ? 'upload' : 'form',
      cycle: row[4], allowOverdue: config.overdue, baselineDate: row[9], windowRule: row[5], progress: '0/1'
    }));
  }

  function confirmIssuedAdjustment() {
    if (!taskSets.sent.includes(activeTask) || !P.canAdjustIssued(activeTask)) {
      showToast('该任务已有执行记录或已关闭，无法调整日期');
      return;
    }
    const reason = issueAdjustmentReason.value.trim();
    if (!reason || reason.length > issueAdjustmentReason.maxLength) {
      issueAdjustmentError.textContent = '请填写 200 字以内的调整原因';
      issueAdjustmentReason.setAttribute('aria-invalid', 'true');
      issueAdjustmentReason.focus();
      return;
    }
    const days = P.dayDifference(activeSchedule.anchor, activeSchedule.date);
    if (!days) {
      showToast('请选择新的日期');
      return;
    }
    const tasks = P.issuedExecutions(activeTask);
    if (tasks.length) {
      const updates = tasks.filter(task => !P.closed(task)).map(task => ({ task, plan: P.shiftExecutionPlan(task, days) }));
      for (const { task, plan } of updates) {
        const before = { plannedAt: task.plannedAt, window: task.window };
        task.canonicalKey ||= `execute:${P.project(task)}:${task.participantId}:${task.task}:${task.plannedAt}`;
        Object.assign(task, plan);
        (task.adjustmentHistory ||= []).push({ before, after: plan, reason, at: P.now(), operator: '当前个案' });
        P.refresh(task);
      }
    } else {
      const meta = P.meta(activeTask);
      meta.packageId ||= 'PK-' + crypto.randomUUID();
      const previousPlan = P.schedule(activeTask, activeSchedule.anchor, activeSchedule.times, activeSchedule.offsets);
      const created = createExecutionTasks(activeTask, activeSchedule, meta.packageId);
      created.forEach((task, index) => {
        const { plannedAt, window: taskWindow } = previousPlan[index];
        task.adjustmentHistory = [{
          before: { plannedAt, window: taskWindow }, after: { plannedAt: task.plannedAt, window: task.window },
          reason, at: P.now(), operator: '当前个案'
        }];
      });
      executionTasks.push(...created);
    }
    saveSchedule();
    closeIssueModal();
    renderRows();
    showToast('日期已调整，任务将按新日期执行');
  }

  function hasValidSchedule() {
    if (activeSchedule.date && activeSchedule.times.every(time=>!time || /^\d{2}:\d{2}$/.test(time))) return true;
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
    if (button.dataset.wb1ExecutionAction === 'execute') { const block=P.executionBlock(task);if(block)showToast(block);else openExecutionModal(task,'execute'); }
    if (button.dataset.wb1ExecutionAction === 'adjust') D.adjust(task);
    if (button.dataset.wb1ExecutionAction === 'history') D.history(task);
    if (button.dataset.wb1ExecutionAction === 'view') openExecutionModal(task, 'view');
    if (button.dataset.wb1ExecutionAction === 'result' && task.scope === 'completed') openExecutionModal(task, 'result');
    if (button.dataset.wb1ExecutionAction === 'no-process') openReasonModal(executionTaskToRow(task), false, 'execution', task);
    if (button.dataset.wb1ExecutionAction === 'view-record') openReasonModal(executionTaskToRow(task), true, 'execution', task);
    if (button.dataset.wb1ExecutionAction === 'contact') showToast(`正在联系${task.participant}`);
  }

  executionSwitch.closest('.wb1-task-panel').addEventListener('workbench-list-filter-reset', () => {
    if (todayOnly) {
      todayOnly = false;
      const url = new URL(location.href);
      url.searchParams.delete('workDate');
      history.replaceState(null, '', url);
      document.querySelector('[data-today-scope]').hidden = true;
    }
    if (activeMode !== 'execution') return;
    pendingExecutionFilter = 'all';
    if (!executionSwitch.hidden) executionFilter = 'all';
  });
  executionSwitch.addEventListener('click', event => {
    const button = event.target.closest('[data-execution-range]');
    if (!button || executionSwitch.hidden) return;
    pendingExecutionFilter = executionFilter = button.dataset.executionRange;
    renderRows();
  });
  document.querySelectorAll('[data-wb1-tab]').forEach(button => {
    button.addEventListener('click', () => {
      closeActionMenu();
      if (activeMode === 'appointment') {
        appointmentFilter=button.dataset.wb1Tab==='draft'?'unbooked':'booked';
      } else if (activeMode === 'execution') {
        executionFilter = { draft: pendingExecutionFilter, completed: 'completed', 'execution-none': 'none' }[button.dataset.wb1Tab];
      } else if (activeMode === 'followup') {
        followupFilter = { draft: 'pending', sent: 'completed', none: 'none' }[button.dataset.wb1Tab];
      } else {
        activeSet = button.dataset.wb1Tab;
        window.workbenchListFilters?.setMode(activeMode, activeSet);
        setIssueColumns();
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

      configureTaskList(target === 'execution-overdue' ? 'execution' : target, target === 'execution-overdue' ? 'overdue' : 'all');
    });
  });
  function handleTaskAction(target) {
    const visitButton = target.closest('[data-today-visit-action]');
    if (visitButton) {
      const visit = todayVisits[Number(visitButton.dataset.todayVisit)];
      if (!visit) return;
      const action = visitButton.dataset.todayVisitAction;
      closeActionMenu();
      const item = {...visit, referenceDate:P.today};
      if (action === 'summary') D.visitDetail(item, true);
      else if (action === 'execute') D.executeVisit(item);
      else if (action === 'contact') window.workbenchContactParticipant(visit.participant);
      else D.appointment(item, action);
      return;
    }
    const appointmentButton=target.closest('[data-wb1-appointment-action]');if(appointmentButton){const task=appointmentTasks[Number(appointmentButton.dataset.appointmentIndex)];if(!task)return;closeActionMenu();const action=appointmentButton.dataset.wb1AppointmentAction;if(action==='contact')window.workbenchContactParticipant(task.participant);else if(action==='detail')D.visitDetail(task,true);else if(action==='execute')D.executeVisit(task);else D.appointment(task,action);return;}
    const addButton = target.closest('[data-wb1-add-followup]');
    if (addButton) {
      openAddFollowup(addButton.dataset.wb1AddFollowup, Number(addButton.dataset.taskIndex), actionMenu.contains(addButton) ? actionMenuOpener : addButton);
      return;
    }
    const processingButton = target.closest('[data-wb1-processing-action]');
    if (processingButton) {
      closeActionMenu();
      const task = processingTasks[Number(processingButton.dataset.processingIndex)];
      if (!task || task.scope !== 'pending') return;
      const action = processingButton.dataset.wb1ProcessingAction;
      if (action === 'contact') {
        window.workbenchContactParticipant(task.participant);
      } else if (action === 'process') {
        D.processing(task);
      } else if (action === 'no-process') {
        openReasonModal([task.participantId, task.visit, '', '', '', '', task.participant], false, 'processing', task);
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
    const row = source[Number(button.dataset.taskIndex)];
    if (!row) return;
    if (button.dataset.wb1Action === 'issue') openIssueModal(row);
    if (button.dataset.wb1Action === 'no-process') openReasonModal(row);
    if (button.dataset.wb1Action === 'adjust' && activeSet === 'sent' && P.canAdjustIssued(row)) openIssueModal(row, false, true);
    if (button.dataset.wb1Action === 'view-task') openIssueModal(row, true);
    if (button.dataset.wb1Action === 'view-record') openReasonModal(row, true);
    if (button.dataset.wb1Action === 'contact') showToast(`正在联系${row[6]}`);
  }
  tableBody.addEventListener('click', event => handleTaskAction(event.target));
  function updateOverviewTab(tab, selected, panel, count) {
    tab.querySelector('span').textContent = count;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) panel.setAttribute('aria-labelledby', tab.id);
  }

  function bindOverviewTabs(tabs, onSelect) {
    const tabList = tabs[0].parentElement;
    tabList.addEventListener('click', event => {
      const tab = event.target.closest('[role="tab"]');
      if (!tab || tab.getAttribute('aria-selected') === 'true') return;
      onSelect(tab);
      renderRows();
    });
    tabList.addEventListener('keydown', event => {
      const key = event.key;
      const current = tabs.indexOf(event.target);
      if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
      event.preventDefault();
      const step = key === 'ArrowLeft' ? -1 : 1;
      const index = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1
        : (current + step + tabs.length) % tabs.length;
      tabs[index].click();
      tabs[index].focus();
    });
  }

  bindOverviewTabs(todayTabs, tab => { todayCategory = tab.dataset.todayTab; });
  document.querySelector('[data-wb-overview]').addEventListener('click', event => {
    if (event.target.closest('.wb-overview-list')) handleTaskAction(event.target);
  });
  function clearAdjustmentError() {
    issueAdjustmentReason.removeAttribute('aria-invalid');
    issueAdjustmentError.textContent = '';
  }
  issueAdjustmentReason.addEventListener('input', clearAdjustmentError);
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
    if (issueReadOnly || adjustingIssued) return;
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
    if (adjustingIssued) {
      confirmIssuedAdjustment();
      return;
    }
    if (!taskSets.draft.includes(activeTask)) return;
    const tasks = createExecutionTasks(activeTask, activeSchedule, 'PK-' + crypto.randomUUID());
    P.meta(activeTask).packageId = tasks[0].packageId;
    executionTasks.push(...tasks);
    saveSchedule();
    const generatedCount = tasks.length;
    const index = taskSets.draft.indexOf(activeTask);
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
    if (reasonInput.value.length > 200) {
      reasonError.textContent = `${recordLabel}最多200字符`;
      reasonInput.focus();
      return;
    }
    if (reasonContext === 'processing') {
      if (!reasonTask || reasonTask.scope !== 'pending') return;
      reasonTask.noProcessReason = reason;
      reasonTask.scope = 'none';
      closeReasonModal();
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
      renderRows();
      showToast('执行任务已记录为无需处理');
      return;
    }
    P.meta(reasonTask).reason = reason;
    const index = taskSets.draft.indexOf(reasonTask);
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
  executionBody.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('.wb1-upload input')) return;
    const filename = input.files[0]?.name || '';
    const upload = input.parentElement;
    const filenameLabel = upload.querySelector('.wb1-upload-filename');
    filenameLabel.textContent = filename;
    filenameLabel.hidden = !filename;
    upload.querySelector('.wb1-upload-action').textContent = filename ? '更换文件' : '选择文件';
  });
  executionBody.addEventListener('click', event => {
    if (!event.target.closest('[data-wb1-template-link]') || !currentExecutionTask) return;
    const task = currentExecutionTask;
    closeExecutionModal();
    openIssueModal(executionTaskToRow(task), true);
  });
  actionMenu.addEventListener('click', event => handleTaskAction(event.target));
  executionSubmit.addEventListener('click', async () => {
    if (executionModalMode !== 'execute' || !currentExecutionTask) return;
    const block=P.executionBlock(currentExecutionTask);if(block){showToast(block);return;}
    const form = executionBody.querySelector('[data-wb1-execution-form]');
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    const submittedTask=currentExecutionTask;executionSubmit.disabled=true;
    try {const payload=await window.captureClinicalExecution(form);if(currentExecutionTask!==submittedTask||executionMask.hidden)return;Object.assign(submittedTask,payload);}
    catch(error){showToast(error.message);return;}finally{executionSubmit.disabled=false;}
    if (currentExecutionTask.executionType === 'upload') {
      const file = form.querySelector('input[type="file"]').files[0];
      currentExecutionTask.result = `已上传文件：${file.name}${formData.get('note') ? `；说明：${formData.get('note')}` : ''}`;
    } else {
      currentExecutionTask.result = `相关症状：${formData.get('symptom')}；严重程度：${formData.get('severity')}${formData.get('note') ? `；补充说明：${formData.get('note')}` : ''}`;
    }
    currentExecutionTask.status = '已完成';
    currentExecutionTask.scope = 'completed';
    currentExecutionTask.completedAt = new Date().toLocaleString('sv-SE');
    currentExecutionTask.operator = '当前个案';
    const packageTasks = executionTasks.filter(task => task.packageId === currentExecutionTask.packageId && P.personKey(task) === P.personKey(currentExecutionTask));
    const completedCount = packageTasks.filter(task => task.scope === 'completed').length;
    packageTasks.forEach(task => { task.progress = `${completedCount}/${packageTasks.length}`; });
    closeExecutionModal();
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
  window.addEventListener('workbench-list-filter-change',renderRows);
  projectFilter.addEventListener('change', renderRows);
  document.querySelector('[data-wb1-center]').addEventListener('change', renderRows);
  participantSearch.addEventListener('input', renderRows);
  D.setRefresh(renderRows);
  updateCounts();
  refreshFollowupCounts();
  configureTaskList('issue');
})();
