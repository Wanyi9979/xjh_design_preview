(() => {
  if (new URLSearchParams(location.search).has('planEmbed')) return;
  const store = window.clinicalVisitStore;
  const params = new URLSearchParams(location.search);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const day = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
  };
  const offset = (value, days) => {
    const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const { source, sourcePeople } = participantDirectory;
  const today = day(params.get('referenceDate')) ? params.get('referenceDate') : source.today;
  const visitNameFilter=document.createElement('select');visitNameFilter.id='visit-name-filter';visitNameFilter.className='control select protocol-filter';visitNameFilter.setAttribute('aria-label','访视筛选');visitNameFilter.innerHTML='<option value="">全部访视</option>';protocolFilter.before(visitNameFilter);visitNameFilter.value=params.get('visitName')||'';
  projectFilter.innerHTML = '<option value="">全部项目</option>' + Object.entries(projectCatalog).map(([id, name]) => `<option value="${escape(id)}">${escape(id)} ${escape(name)}</option>`).join('');
  const visits = store.directoryVisits(participantDirectory, today).map(visit => {
    const person = sourcePeople.find(p => p.study === visit.projectId && p.id === visit.participantId);
    const participant = person || participants.find(p => p.study === visit.projectId && p.id === visit.participantId);
    return { appointmentHistory: [], actualHistory: [], ...store.apply(visit), person: participant,
      hospital: visit.hospital || participant?.hospital || '未分配', department: visit.department || participant?.department || '未分配', group: visit.group || participant?.group || '未分配' };
  }).filter(visit => visit.person && !visit.removed);
  const hospitals = new Set([...participants.map(p => p.hospital), ...visits.map(v => v.hospital || v.person.hospital)].filter(Boolean));
  hospitalFilter.innerHTML = '<option value="">全部中心</option>' + [...hospitals].map(h => `<option>${escape(h)}</option>`).join('');
  const panel = document.getElementById('visit-view');
  panel.innerHTML = `
    <div class="visit-filter-context" data-visit-context role="status"></div>
    <div class="table-wrap" data-visit-list><table class="visit-table"><colgroup><col style="width:150px"><col style="width:180px"><col style="width:160px"><col style="width:105px"><col style="width:85px"><col style="width:235px"><col style="width:115px"><col style="width:115px"><col style="width:95px"><col style="width:80px"></colgroup><thead><tr><th>参与者</th><th>参与试验</th><th>访视</th><th>访视版本</th><th>访视状态</th><th>计划日期 / 访视窗口</th><th>预约日期</th><th>实际访视日期</th><th>关联任务</th><th>操作</th></tr></thead><tbody data-visit-rows></tbody></table></div>`;
  const progressFilter = document.getElementById('visit-progress-filter');
  const appointmentFilter = document.getElementById('visit-appointment-filter');
  const windowFilter = document.getElementById('visit-time-window-filter');
  const startFilter = document.getElementById('visit-start-filter');
  const endFilter = document.getElementById('visit-end-filter');
  const dateRangeFilter = document.getElementById('visit-date-range');
  const filters = document.querySelector('.filters');
  const quickFilters=document.createElement('div');quickFilters.className='visit-appointment-quick-filters';quickFilters.setAttribute('role','group');quickFilters.setAttribute('aria-label','预约日期快捷筛选');
  quickFilters.innerHTML='<label><input type="checkbox" data-visit-quick-today>今日访视</label><label><input type="checkbox" data-visit-quick-missed>预约未访视</label>';
  filters.querySelector('#reset').before(quickFilters);
  const quickToday=quickFilters.querySelector('[data-visit-quick-today]'),quickMissed=quickFilters.querySelector('[data-visit-quick-missed]');
  quickFilters.addEventListener('change',()=>{renderVisits();});

  const visitRows = panel.querySelector('[data-visit-rows]');
  const context = panel.querySelector('[data-visit-context]');
  const list = panel.querySelector('[data-visit-list]');
  let section = 'participants';
  let calendarOnly = params.get('source') === 'calendar';
  let pendingOnly = params.get('pending') === '1';
  let appointmentOverdue=params.get('appointmentOverdue')==='1';
  let calendarWindow = '';
  let visitId = '';
  let visitProject = '';
  let department = params.get('department') || '';
  let group = params.get('group') || '';
  const progress = visit => store.status(visit);
  const windowState = visit => store.windowStatus(visit, today);
  const isPending = visit => ['activated','partial'].includes(progress(visit));
  const dateFor = visit => visit.appointmentDate || visit.plannedDate;
  function matchesWindow(visit) {
    const filter = windowFilter.value;
    if (!filter) return true;
    if(filter==='none')return windowState(visit)==='none';
    if (!isPending(visit)||windowState(visit)==='none') return false;
    if (filter === 'soon') return Boolean(visit.windowStart)&&visit.windowStart>today&&visit.windowStart<=offset(today,7);
    if (filter === 'last-day') return visit.windowEnd === today;
    return windowState(visit) === filter;
  }
  const detailURL = visit => `participant.html?${new URLSearchParams({ project: visit.projectId, name: visit.person.name, id: visit.participantId, status: visit.person.status, ...(params.get('from')==='workbench'?{from:'workbench'}:{}), tab: 'participant-visits', visitId: visit.id })}`;
  const taskURL = visit => `participant.html?${new URLSearchParams({ project: visit.projectId, name: visit.person.name, id: visit.participantId, status: visit.person.status, tab: 'participant-tasks', ...(params.get('from')==='workbench'?{from:'workbench'}:{}) })}`;
  function associatedTasks(visit) {
    return window.loadParticipantTasks(visit.projectId, visit.participantId).filter(task => window.participantTaskBelongsToVisit(task, visit));
  }
  function taskProgressMarkup(visit, index) {
    const tasks = associatedTasks(visit);
    if (!tasks.length) return '<span class="visit-task-empty">0</span>';
    if (!isPending(visit)) return `<span class="visit-task-empty">${tasks.length}</span>`;
    return `<button class="visit-task-progress" type="button" data-visit-action="tasks" data-visit-index="${index}" aria-label="查看${escape(visit.person.name)}${escape(visit.name)}的${tasks.length}条关联任务">${tasks.length}</button>`;
  }
  function syncURL() {
    const url = new URL(location.href);
    const values = { view: section, display:'', calendarDate:'', project: projectFilter.value, protocol: protocolFilter.value, hospital: hospitalFilter.value, participantStatus: statusFilter.value, q: search.value.trim(), visitName:section==='visits'?visitNameFilter.value:'', progress: section === 'visits' ? progressFilter.value : '', appointment: section === 'visits' ? appointmentFilter.value : '', window: section === 'visits' ? windowFilter.value : '', calendarWindow, visitId: section === 'visits' ? visitId : '', visitProject: section === 'visits' && visitId ? visitProject : '', start: section === 'visits' ? startFilter.value : '', end: section === 'visits' ? endFilter.value : '', source: calendarOnly ? 'calendar' : '', pending: pendingOnly ? '1' : '', todayVisits:quickToday.checked?'1':'', missedAppointments:quickMissed.checked?'1':'', department, group, appointmentOverdue:appointmentOverdue?'1':'', referenceDate: calendarOnly||appointmentOverdue ? today : '' };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    history.replaceState(null, '', url);
  }
  const rowMenu = document.createElement('div');
  rowMenu.className = 'visit-row-menu';
  rowMenu.hidden = true;
  rowMenu.setAttribute('role', 'menu');
  rowMenu.setAttribute('aria-label', '访视操作');
  document.body.append(rowMenu);
  let menuTrigger;

  function actionsFor(visit) {
    if (!isPending(visit)) return [['summary', '查看详情']];
    if (!visit.appointmentDate) return [['book','访视预约'],['terminate','访视终止'],['followup','添加跟进'],['contact','联系参与者'],...(associatedTasks(visit).length?[['tasks','任务处理']]:[])];
    return [
      ['execute', '访视执行'],
      ['book', '调整预约'],
      ['followup', '添加跟进'],
      ['contact', '联系参与者'],
      ...(associatedTasks(visit).length ? [['tasks', '任务处理']] : []),
      ['terminate', '访视终止']
    ];
  }

  function actionButton(visit, action, label) {
    return `<button type="button" data-visit-action="${action}" data-visit-index="${visits.indexOf(visit)}">${label}</button>`;
  }

  function moreButton(visit, firstAction, className = '') {
    return `<button type="button" class="${className}" data-visit-more="${visits.indexOf(visit)}" data-first-action="${firstAction}" aria-haspopup="menu" aria-expanded="false" aria-label="${escape(visit.participantId)} 更多操作" title="更多操作"><img src="figma-workbench-assets/calendar-more.svg" width="14" height="14" alt=""></button>`;
  }

  function rowActions(visit) {
    const actions = actionsFor(visit);
    return actions.slice(0, 2).map(([key, label]) => actionButton(visit, key, label)).join('') + (actions.length > 2 ? moreButton(visit, 2) : '');
  }

  function directAction(visit, action, button) {
    if (!actionsFor(visit).some(([key]) => key === action)) return;
    const dialogs = window.workbenchTaskDialogs;
    const item = {...visit, participant: visit.person.name, participantStatus: visit.person.status, trial: projectCatalog[visit.projectId] || '', referenceDate: today};
    if (action === 'summary') location.href = 'participant.html?' + new URLSearchParams({project:visit.projectId,id:visit.participantId,name:visit.person.name,status:visit.person.status,tab:'participant-visits',visitId:visit.id,...(params.get('from')==='workbench'?{from:'workbench'}:{})});
    else if (action === 'tasks') location.href = taskURL(visit);
    else if (action === 'execute') dialogs.executeVisit(item);
    else if (action === 'contact') {
      document.querySelector('.visit-toast')?.remove();
      const toast = document.createElement('div');
      toast.className = 'visit-toast';toast.setAttribute('role', 'status');
      toast.textContent = `联系参与者：${visit.person.name}（演示）`;
      document.body.append(toast);setTimeout(() => toast.remove(), 3000);
    }
    else dialogs.appointment(item, action);
  }

  function closeMenu(restoreFocus = false) {
    rowMenu.hidden = true;
    menuTrigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuTrigger?.focus({ preventScroll: true });
    menuTrigger = null;
  }

  panel.addEventListener('click', event => {
    const completion = event.target.closest('[data-visit-completion]');
    if (completion) {const visit=visits[Number(completion.dataset.visitCompletion)];if(visit)showCompletionPopover(visit,completion);return;}
    const target = event.target.closest('[data-visit-more]');
    if (!target) return;
    if (target === menuTrigger) { closeMenu(true); return; }
    closeMenu();
    const visit = visits[Number(target.dataset.visitMore)];
    const actions = actionsFor(visit).slice(Number(target.dataset.firstAction));
    rowMenu.innerHTML = actions.map(([key, label]) => `<button role="menuitem" type="button" data-row-menu="${key}" class="${key === 'terminate' ? 'danger' : ''}">${label}</button>`).join('');
    menuTrigger = target;
    target.setAttribute('aria-expanded', 'true');
    rowMenu.hidden = false;
    const rect = target.getBoundingClientRect();
    rowMenu.style.left = Math.max(8, Math.min(rect.right - rowMenu.offsetWidth, innerWidth - rowMenu.offsetWidth - 8)) + 'px';
    rowMenu.style.top = Math.max(8, Math.min(rect.bottom + 4, innerHeight - rowMenu.offsetHeight - 8)) + 'px';
    rowMenu.querySelector('button')?.focus({ preventScroll: true });
  });
  rowMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-row-menu]');
    if (!button || !menuTrigger) return;
    const trigger = menuTrigger;
    closeMenu(true);
    directAction(visits[Number(trigger.dataset.visitMore)], button.dataset.rowMenu, trigger);
  });
  document.addEventListener('click', event => {
    if (!rowMenu.contains(event.target) && !event.target.closest('[data-visit-more]')) closeMenu();
  });
  rowMenu.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    if (event.key === 'Tab') closeMenu(true);
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const items = [...rowMenu.querySelectorAll('button')];
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(items.indexOf(document.activeElement) + step + items.length) % items.length]?.focus();
  });
  const completionPopover = document.createElement('div');
  completionPopover.className = 'visit-completion-popover';
  completionPopover.id = 'visit-completion-popover';
  completionPopover.setAttribute('popover', 'auto');
  completionPopover.setAttribute('role', 'dialog');
  completionPopover.setAttribute('aria-label', '访视项完成情况');
  document.body.append(completionPopover);
  let completionTrigger = null;
  function closeCompletionPopover() {
    if (completionPopover.matches(':popover-open')) completionPopover.hidePopover();
    completionTrigger?.setAttribute('aria-expanded', 'false');
    completionTrigger = null;
  }
  completionPopover.addEventListener('toggle', event => {
    if (event.newState === 'closed') completionTrigger?.setAttribute('aria-expanded', 'false');
  });
  function showCompletionPopover(visit, trigger) {
    if (completionPopover.matches(':popover-open') && completionTrigger === trigger) {closeCompletionPopover();return;}
    closeCompletionPopover();
    const record = store.apply(visit), items = store.executionItems(record);
    const completed = new Set(record.completedItems || []);
    completionPopover.innerHTML = `<h3>访视项完成情况 <small>${items.filter(name => completed.has(name)).length}/${items.length}</small></h3><ul>${items.map(name => `<li><span>${escape(name)}</span><span class="${completed.has(name)?'is-done':'is-pending'}">${completed.has(name)?'已完成':'未完成'}</span></li>`).join('')}</ul>`;
    completionTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    completionPopover.showPopover();
    const rect = trigger.getBoundingClientRect(), height = completionPopover.offsetHeight;
    completionPopover.style.left = Math.max(12, Math.min(rect.left + rect.width / 2 - completionPopover.offsetWidth / 2, innerWidth - completionPopover.offsetWidth - 12)) + 'px';
    completionPopover.style.top = (rect.bottom + height + 8 <= innerHeight - 12 ? rect.bottom + 8 : Math.max(12, rect.top - height - 8)) + 'px';
  }
  window.addEventListener('resize', closeCompletionPopover);
  document.addEventListener('scroll', event => {if (!completionPopover.contains(event.target)) closeCompletionPopover();}, true);
  function renderVisits() {
    const selectedName=visitNameFilter.value||params.get('visitName')||'';const names=[...new Set(visits.filter(v=>(!projectFilter.value||v.projectId===projectFilter.value)&&(!protocolFilter.value||v.protocolVersion===protocolFilter.value)).map(v=>v.name))];visitNameFilter.innerHTML='<option value="">全部访视</option>'+names.map(name=>`<option value="${escape(name)}">${escape(name)}</option>`).join('');visitNameFilter.value=names.includes(selectedName)?selectedName:'';params.delete('visitName');
    closeCompletionPopover();
    closeMenu();
    updateProtocolFilter(visits.filter(visit => progress(visit) !== 'inactive'));
    const query = search.value.trim().toLowerCase();
    const invalidRange = startFilter.value && endFilter.value && startFilter.value > endFilter.value;
    const visible = visits.filter(visit => {
      const person = visit.person;
      const appointment=String(visit.appointmentDate||'').slice(0,10);
      const quickMatch=(!quickToday.checked&&!quickMissed.checked)||(isPending(visit)&&((quickToday.checked&&appointment===today)||(quickMissed.checked&&Boolean(appointment)&&appointment<today)));
      return quickMatch && (!appointmentOverdue||store.overdueUnhandled(store.apply(visit),today)) && (!visitNameFilter.value||visit.name===visitNameFilter.value) && !invalidRange && (!visitId || (visit.id === visitId && (!visitProject || visit.projectId === visitProject))) && progress(visit) !== 'inactive' && (!calendarOnly || visit.calendar) && (!pendingOnly || isPending(visit)) &&
        (!projectFilter.value || visit.projectId === projectFilter.value) && (!protocolFilter.value || visit.protocolVersion === protocolFilter.value) && (!hospitalFilter.value || (visit.hospital || person.hospital) === hospitalFilter.value) &&
        (!department || visit.department === department) && (!group || visit.group === group) &&
        (!statusFilter.value || person.status === statusFilter.value) && (!query || `${person.name}${person.initials}${person.id}`.toLowerCase().includes(query)) &&
        (!progressFilter.value || progress(visit) === progressFilter.value) && (!calendarWindow || windowState(visit) === calendarWindow) &&
        (!appointmentFilter.value || store.appointmentStatus(visit) === appointmentFilter.value) &&
        matchesWindow(visit) &&
        (!startFilter.value || dateFor(visit) >= startFilter.value) && (!endFilter.value || dateFor(visit) <= endFilter.value);
    }).sort((a, b) => (b.plannedDate || '').localeCompare(a.plannedDate || '') || a.participantId.localeCompare(b.participantId));
      const pageRows = window.directoryPagination.slice(visible,'visits',renderVisits,'次访视');
      visitRows.innerHTML = pageRows.length ? pageRows.map(visit => {
        const index = visits.indexOf(visit), state = progress(visit), period = windowState(visit);
        return `<tr>
          <td><div class="visit-person"><a class="participant-link name" href="${escape(detailURL(visit))}">${escape(visit.person.name)}</a><small>${escape(visit.participantId)}<em class="status ${{'已入组':'enrolled','筛选中':'screening','筛选失败':'failed','随访中':'following','研究结束':'ended','已终止':'ended','终止':'ended'}[visit.person.status]||'ended'}">${escape(visit.person.status)}</em></small></div></td>
          <td><div class="visit-study">${escape(projectCatalog[visit.projectId] || visit.projectId)}</div></td>
          <td><div class="visit-name-with-window"><span>${escape(visit.name)}</span>${period ? `<span class="visit-window ${period}">${{ upcoming: '未到窗口', window: '窗口期内', overdue: '已超窗', none:'暂无窗口' }[period]}</span>` : ''}</div></td><td><span class="protocol-tag">${escape(visit.protocolVersion)}</span></td><td>${state === 'partial' ? `<button type="button" class="visit-progress ${state} visit-completion-trigger" data-visit-completion="${index}" aria-expanded="false" aria-controls="visit-completion-popover" aria-label="部分完成，查看访视项完成情况">${store.statusLabels[state]}</button>` : `<span class="visit-progress ${state}">${store.statusLabels[state]}</span>`}</td><td><div class="visit-plan"><div class="visit-plan-date">${escape(visit.plannedDate)}</div><small>${visit.noWindow?'暂无窗口':`${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}`}</small></div></td>
          <td>${escape(visit.appointmentDate || '未预约')}</td><td>${escape(visit.actualDate || '—')}</td>
          <td>${taskProgressMarkup(visit, index)}</td>
          <td><div class="visit-row-actions">${rowActions(visit)}</div></td></tr>`;
      }).join('') : `<tr><td class="visit-empty" colspan="10">${invalidRange ? '开始日期不能晚于结束日期，请调整筛选范围' : '暂无匹配访视，可调整或重置筛选条件'}</td></tr>`;
    context.hidden = !(appointmentOverdue || visitId || calendarOnly || pendingOnly || calendarWindow || department || group);
    context.innerHTML = `${appointmentOverdue?'<span>今日之前未执行或调整的访视</span>':''}${visitId ? '<span>从工作台打开的访视</span>' : ''}${calendarOnly ? '<span>来自访视日历</span>' : ''}${pendingOnly ? '<span>仅待访视</span>' : ''}${calendarWindow ? '<span>即将访视</span>' : ''}${calendarOnly && (startFilter.value || endFilter.value) ? `<span>${escape(startFilter.value || '不限')} ～ ${escape(endFilter.value || '不限')}</span>` : ''}${department || group ? `<span>${escape([department, group].filter(Boolean).join(' / '))}</span>` : ''}${!context.hidden ? '<button type="button" data-clear-visit-scope>清除带入条件</button>' : ''}`;
    syncURL();
  }
  function setSection(next, refresh = true) {
    section = next === 'visits' ? 'visits' : 'participants';
    visitNameFilter.hidden=section!=='visits';
    document.querySelectorAll('[data-management-section]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.managementSection === section)));
    document.getElementById('participant-view').hidden = section !== 'participants';
    hospitalFilter.querySelector('option').textContent = '全部中心';
    hospitalFilter.setAttribute('aria-label', '研究中心筛选');
    panel.hidden = section !== 'visits';
    visitFilter.hidden = section === 'visits';
    if (section === 'visits') dateRangeFilter.after(search);
    else visitFilter.after(search);
    progressFilter.hidden = section !== 'visits';
    appointmentFilter.hidden = section !== 'visits';
    windowFilter.hidden = section !== 'visits';
    dateRangeFilter.hidden = section !== 'visits';
    quickFilters.hidden=section!=='visits';
    filters.classList.toggle('visit-mode', section === 'visits');
    if (refresh) { render(); syncURL(); }
  }
  visitNameFilter.addEventListener('change',renderVisits);
  function reset() {
    quickToday.checked=false;quickMissed.checked=false;
    visitNameFilter.value='';params.delete('visitName');
    protocolFilter.value = ''; progressFilter.value = ''; appointmentFilter.value = ''; windowFilter.value = ''; startFilter.value = ''; endFilter.value = '';
    calendarOnly = false; pendingOnly = false; appointmentOverdue=false; calendarWindow = ''; visitId = ''; visitProject = ''; department = ''; group = '';
    syncURL();
  }
  const detailMask = document.createElement('div');
  detailMask.className = 'visit-detail-mask';
  detailMask.hidden = true;
  detailMask.innerHTML = `<section class="visit-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="visit-detail-title" tabindex="-1"><header><div><h2 id="visit-detail-title"></h2><p data-visit-detail-person></p></div><button type="button" data-close-visit-detail aria-label="关闭访视详情">×</button></header><div class="visit-detail-body" data-visit-detail-body></div></section>`;
  document.body.append(detailMask);
  const detailDrawer = detailMask.querySelector('.visit-detail-drawer');
  let detailTrigger = null;
  let taskController = null;
  function openVisitDetail(visit, button) {
    const tasks = associatedTasks(visit);
    const state = progress(visit);
    taskController?.destroy();
    detailTrigger = button;
    detailMask.querySelector('h2').innerHTML = `${escape(visit.name)} <span class="visit-progress ${state}">${store.statusLabels[state]}</span>`;
    detailMask.querySelector('[data-visit-detail-person]').textContent = `${visit.person.name} ${visit.participantId} · ${visit.person.status}`;
    detailMask.querySelector('[data-visit-detail-body]').innerHTML = `
      <section class="visit-detail-section visit-detail-summary"><dl class="visit-detail-meta">
        <div><dt>访视版本</dt><dd>${escape(visit.protocolVersion)}</dd></div><div><dt>计划日期</dt><dd>${escape(visit.plannedDate)}</dd></div>
        <div><dt>访视窗口</dt><dd>${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}</dd></div>
        <div><dt>预约日期</dt><dd>${escape(visit.appointmentDate || '未预约')}</dd></div>
        ${visit.actualDate ? `<div><dt>实际访视日期</dt><dd>${escape(visit.actualDate)}</dd></div>` : ''}
      </dl>${state === 'terminated' ? `<p class="visit-termination-info">终止原因：${escape(visit.terminationReason || '暂无原因记录')}</p>` : ''}</section>
      <section class="visit-detail-section visit-detail-tasks"><div class="visit-detail-section-head"><h3>关联任务</h3><a href="${escape(taskURL(visit))}">查看参与者全部任务 →</a></div><div class="participant-task-view visit-scoped-tasks"></div></section>`;
    taskController = window.createParticipantTasks({ container: detailMask.querySelector('.visit-scoped-tasks'), participantId: visit.participantId, participantName: visit.person.name, params: new URLSearchParams({ project: visit.projectId }), visitScope: visit, onChange: renderVisits });
    const initial = tasks.find(task => task.kind === 'execute' && task.state === 'pending') || tasks.find(task => task.state === 'draft') || tasks[0];
    if (initial) taskController.select(initial.kind, initial.state);
    detailMask.hidden = false;
    detailMask.classList.add('open');
    document.body.style.overflow = 'hidden';
    window.focusDialogFrame(detailDrawer);
  }
  function closeVisitDetail() {
    if (detailMask.hidden) return;
    detailMask.classList.remove('open');
    detailMask.hidden = true;
    taskController?.destroy(); taskController = null;
    document.body.style.overflow = '';
    if (detailTrigger?.isConnected) detailTrigger.focus();
    else visitNameFilter.focus();
    detailTrigger = null;
  }
  panel.addEventListener('click', event => {
    if (event.target.closest('[data-clear-visit-scope]')) { calendarOnly = false; pendingOnly = false; appointmentOverdue=false; calendarWindow = ''; visitId = ''; visitProject = ''; department = ''; group = ''; startFilter.value = ''; endFilter.value = ''; renderVisits(); return; }
    const button = event.target.closest('[data-visit-action]');
    if (!button) return;
    const visit = visits[Number(button.dataset.visitIndex)];
    if (!visit) return;
    directAction(visit, button.dataset.visitAction, button);
  });
  detailMask.addEventListener('click', event => { if (event.target === detailMask || event.target.closest('[data-close-visit-detail]')) closeVisitDetail(); });
  detailMask.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeVisitDetail(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...detailDrawer.querySelectorAll('button, a[href], input, select, textarea')].filter(control => control.getClientRects().length && !control.disabled);
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  progressFilter.addEventListener('change', renderVisits);
  [startFilter, endFilter].forEach(input => input.addEventListener('change', () => {
    renderVisits();
  }));
  windowFilter.addEventListener('change', () => { calendarWindow = ''; renderVisits(); });
  appointmentFilter.addEventListener('change', renderVisits);
  document.querySelectorAll('[data-management-section]').forEach(button => button.addEventListener('click', () => setSection(button.dataset.managementSection)));
  // 医院或项目发生变化后，清除从日历带来的更细组织条件。
  [projectFilter, hospitalFilter].forEach(input => input.addEventListener('change', () => { department = ''; group = ''; if (section === 'visits') renderVisits(); }));
  window.participantVisits = { isActive: () => section === 'visits', render: renderVisits, setSection, reset, syncURL, clearContext:()=>{appointmentOverdue=false;calendarOnly=false;calendarWindow='';visitId='';visitProject='';department='';group='';} };
  function restoreLocation() {
    const p = new URLSearchParams(location.search);
    quickToday.checked=p.get('todayVisits')==='1';quickMissed.checked=p.get('missedAppointments')==='1';
    params.set('visitName',p.get('visitName')||'');visitNameFilter.value=p.get('visitName')||'';
    projectFilter.value = projectCatalog[p.get('project')] ? p.get('project') : '';
    hospitalFilter.value = hospitals.has(p.get('hospital')) ? p.get('hospital') : '';
    updateProtocolFilter(p.get('view') === 'visits' ? visits.filter(visit => progress(visit) !== 'inactive') : participants, p.get('protocol') || '');
    statusFilter.value = p.get('participantStatus') || ''; search.value = p.get('q') || '';
    progressFilter.value = ['activated','partial','completed','terminated'].includes(p.get('progress')) ? p.get('progress') : '';
    appointmentFilter.value = ['booked', 'unbooked'].includes(p.get('appointment')) ? p.get('appointment') : '';
    windowFilter.value = ['soon', 'upcoming', 'window', 'overdue', 'last-day', 'none'].includes(p.get('window')) ? p.get('window') : '';
    startFilter.value = day(p.get('start')) ? p.get('start') : ''; endFilter.value = day(p.get('end')) ? p.get('end') : '';
    appointmentOverdue=p.get('appointmentOverdue')==='1';
    calendarOnly = p.get('source') === 'calendar'; pendingOnly = p.get('pending') === '1'; department = p.get('department') || ''; group = p.get('group') || '';
    calendarWindow = p.get('calendarWindow') === 'upcoming' || p.get('window') === 'upcoming' ? 'upcoming' : '';
    visitId = p.get('visitId') || '';
    visitProject = p.get('visitProject') || '';
    setSection(p.get('view') === 'visits' ? 'visits' : 'participants');
  }
  window.addEventListener('popstate', restoreLocation);
  window.workbenchTaskDialogs?.setRefresh(()=>{visits.forEach(v=>Object.assign(v,store.apply(v)));renderVisits();});
  restoreLocation();
})();
