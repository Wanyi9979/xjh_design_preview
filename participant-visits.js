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
    <div class="table-wrap"><table class="visit-table"><colgroup><col style="width:150px"><col style="width:180px"><col style="width:160px"><col style="width:85px"><col style="width:235px"><col style="width:115px"><col style="width:115px"><col style="width:95px"><col style="width:80px"></colgroup><thead><tr><th>参与者</th><th>参与试验</th><th>访视</th><th>访视状态</th><th>计划日期 / 访视窗口</th><th>预约日期</th><th>实际访视日期</th><th>关联任务</th><th>操作</th></tr></thead><tbody data-visit-rows></tbody></table></div>`;
  const progressFilter = document.getElementById('visit-progress-filter');
  const appointmentFilter = document.getElementById('visit-appointment-filter');
  const windowFilter = document.getElementById('visit-time-window-filter');
  const startFilter = document.getElementById('visit-start-filter');
  const endFilter = document.getElementById('visit-end-filter');
  const dateRangeFilter = document.getElementById('visit-date-range');
  const filters = document.querySelector('.filters');
  const visitRows = panel.querySelector('[data-visit-rows]');
  const context = panel.querySelector('[data-visit-context]');
  let section = 'participants';
  let calendarOnly = params.get('source') === 'calendar';
  let pendingOnly = params.get('pending') === '1';
  let calendarWindow = '';
  let department = params.get('department') || '';
  let group = params.get('group') || '';
  let activeVisit = null;
  let mode = '';
  let trigger = null;
  let toastTimer;
  const progress = visit => store.status(visit);
  const windowState = visit => store.windowStatus(visit, today);
  const isPending = visit => progress(visit) === 'activated';
  const dateFor = visit => visit.actualDate || visit.appointmentDate || visit.plannedDate;
  const detailURL = visit => `项目参与者详情-Figma.html?${new URLSearchParams({ project: visit.projectId, name: visit.person.name, id: visit.participantId, status: visit.person.status, tab: 'data-entry', visitIndex: String(visit.visitIndex || 0) })}`;
  const taskURL = visit => `项目参与者详情-Figma.html?${new URLSearchParams({ project: visit.projectId, name: visit.person.name, id: visit.participantId, status: visit.person.status, tab: 'participant-tasks' })}`;
  function associatedTasks(visit) {
    return window.loadParticipantTasks(visit.projectId, visit.participantId).filter(task => window.participantTaskBelongsToVisit(task, visit));
  }
  function taskProgressMarkup(visit, index) {
    const tasks = associatedTasks(visit);
    if (!tasks.length) return '<span class="visit-task-empty">0</span>';
    return `<button class="visit-task-progress" type="button" data-visit-action="detail" data-visit-index="${index}" aria-label="查看${escape(visit.person.name)}${escape(visit.name)}的${tasks.length}条关联任务">${tasks.length}</button>`;
  }
  function syncURL() {
    const url = new URL(location.href);
    const values = { view: section, display: '', project: projectFilter.value, hospital: hospitalFilter.value, participantStatus: statusFilter.value, q: search.value.trim(), progress: section === 'visits' ? progressFilter.value : '', appointment: section === 'visits' ? appointmentFilter.value : '', window: section === 'visits' ? windowFilter.value : '', calendarWindow, start: section === 'visits' ? startFilter.value : '', end: section === 'visits' ? endFilter.value : '', source: calendarOnly ? 'calendar' : '', pending: pendingOnly ? '1' : '', department, group, referenceDate: calendarOnly ? today : '' };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    history.replaceState(null, '', url);
  }
  function renderVisits() {
    const query = search.value.trim().toLowerCase();
    const invalidRange = startFilter.value && endFilter.value && startFilter.value > endFilter.value;
    const visible = visits.filter(visit => {
      const person = visit.person;
      return !invalidRange && progress(visit) !== 'inactive' && (!calendarOnly || visit.calendar) && (!pendingOnly || isPending(visit)) &&
        (!projectFilter.value || visit.projectId === projectFilter.value) && (!hospitalFilter.value || (visit.hospital || person.hospital) === hospitalFilter.value) &&
        (!department || visit.department === department) && (!group || visit.group === group) &&
        (!statusFilter.value || person.status === statusFilter.value) && (!query || `${person.name}${person.initials}${person.id}`.toLowerCase().includes(query)) &&
        (!progressFilter.value || progress(visit) === progressFilter.value) && (!calendarWindow || windowState(visit) === calendarWindow) &&
        (!appointmentFilter.value || store.appointmentStatus(visit) === appointmentFilter.value) &&
        (!windowFilter.value || (windowFilter.value === 'soon' ? isPending(visit) && (visit.appointmentDate || visit.plannedDate) === offset(today, 7) : isPending(visit) && windowState(visit) === windowFilter.value)) &&
        (!startFilter.value || dateFor(visit) >= startFilter.value) && (!endFilter.value || dateFor(visit) <= endFilter.value);
    }).sort((a, b) => dateFor(a).localeCompare(dateFor(b)) || a.participantId.localeCompare(b.participantId));
    visitRows.innerHTML = visible.length ? visible.map(visit => {
      const index = visits.indexOf(visit), state = progress(visit), period = windowState(visit);
      const button = (action, label) => `<button type="button" data-visit-action="${action}" data-visit-index="${index}">${label}</button>`;
      return `<tr>
        <td><div class="visit-person"><a class="participant-link name" href="${escape(detailURL(visit))}">${escape(visit.person.name)}（${escape(visit.person.initials)}）</a><small>${escape(visit.participantId)}<em>${escape(visit.person.status)}</em></small></div></td>
        <td><div class="visit-study">${escape(projectCatalog[visit.projectId] || visit.projectId)}</div></td>
        <td>${escape(visit.name)}</td><td><span class="visit-progress ${state}">${store.statusLabels[state]}</span></td><td><div class="visit-plan"><div class="visit-plan-date">${escape(visit.plannedDate)}${period ? `<span class="visit-window ${period}">${{ upcoming: '未到窗口', window: '窗口期内', overdue: '已超窗' }[period]}</span>` : ''}</div><small>${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}</small></div></td>
        <td>${escape(visit.appointmentDate || (store.appointmentStatus(visit) === 'cancelled' ? '取消预约' : '未预约'))}</td><td>${escape(visit.actualDate || '—')}</td>
        <td>${taskProgressMarkup(visit, index)}</td>
        <td><div class="visit-row-actions">${button('manage', '访视管理')}</div></td></tr>`;
    }).join('') : `<tr><td class="visit-empty" colspan="9">${invalidRange ? '开始日期不能晚于结束日期，请调整筛选范围' : '暂无匹配访视，可调整或重置筛选条件'}</td></tr>`;
    context.hidden = !(calendarOnly || pendingOnly || calendarWindow || department || group);
    context.innerHTML = `${calendarOnly ? '<span>来自访视日历</span>' : ''}${pendingOnly ? '<span>仅待访视</span>' : ''}${calendarWindow ? '<span>即将访视</span>' : ''}${calendarOnly && (startFilter.value || endFilter.value) ? `<span>${escape(startFilter.value || '不限')} ～ ${escape(endFilter.value || '不限')}</span>` : ''}${department || group ? `<span>${escape([department, group].filter(Boolean).join(' / '))}</span>` : ''}${!context.hidden ? '<button type="button" data-clear-visit-scope>清除带入条件</button>' : ''}`;
    document.getElementById('count').textContent = `共 ${visible.length} 次访视`;
    syncURL();
  }
  function setSection(next, refresh = true) {
    section = next === 'visits' ? 'visits' : 'participants';
    document.querySelectorAll('[data-management-section]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.managementSection === section)));
    document.getElementById('participant-view').hidden = section !== 'participants';
    hospitalFilter.querySelector('option').textContent = '全部中心';
    hospitalFilter.setAttribute('aria-label', '研究中心筛选');
    panel.hidden = section !== 'visits';
    visitFilter.hidden = section === 'visits';
    visitWindowFilter.hidden = section === 'visits';
    progressFilter.hidden = section !== 'visits';
    appointmentFilter.hidden = section !== 'visits';
    windowFilter.hidden = section !== 'visits';
    dateRangeFilter.hidden = section !== 'visits';
    filters.classList.toggle('visit-mode', section === 'visits');
    if (refresh) { render(); syncURL(); }
  }
  function reset() {
    progressFilter.value = ''; appointmentFilter.value = ''; windowFilter.value = ''; startFilter.value = ''; endFilter.value = '';
    calendarOnly = false; pendingOnly = false; calendarWindow = ''; department = ''; group = '';
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
    detailMask.querySelector('[data-visit-detail-person]').textContent = `${visit.person.name}（${visit.person.initials}） ${visit.participantId} · ${visit.person.status}`;
    detailMask.querySelector('[data-visit-detail-body]').innerHTML = `
      <section class="visit-detail-section visit-detail-summary"><dl class="visit-detail-meta">
        <div><dt>计划日期</dt><dd>${escape(visit.plannedDate)}</dd></div>
        <div><dt>访视窗口</dt><dd>${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}</dd></div>
        <div><dt>预约日期</dt><dd>${escape(visit.appointmentDate || (store.appointmentStatus(visit) === 'cancelled' ? '取消预约' : '未预约'))}</dd></div>
        ${visit.actualDate ? `<div><dt>实际访视日期</dt><dd>${escape(visit.actualDate)}</dd></div>` : ''}
      </dl>${state === 'terminated' ? `<p class="visit-termination-info">终止原因：${escape(visit.terminationReason || '暂无原因记录')}</p>` : ''}</section>
      <section class="visit-detail-section visit-detail-tasks"><div class="visit-detail-section-head"><h3>关联任务</h3><a href="${escape(taskURL(visit))}">查看参与者全部任务 →</a></div><div class="participant-task-view visit-scoped-tasks"></div></section>`;
    taskController = window.createParticipantTasks({ container: detailMask.querySelector('.visit-scoped-tasks'), participantId: visit.participantId, participantName: visit.person.name, params: new URLSearchParams({ project: visit.projectId }), visitScope: visit, onChange: renderVisits });
    const initial = tasks.find(task => task.kind === 'execute' && task.state === 'pending') || tasks.find(task => task.state === 'draft') || tasks[0];
    if (initial) taskController.select(initial.kind, initial.state);
    detailMask.hidden = false;
    detailMask.classList.add('open');
    document.body.style.overflow = 'hidden';
    detailDrawer.focus();
  }
  function closeVisitDetail() {
    if (detailMask.hidden) return;
    detailMask.classList.remove('open');
    detailMask.hidden = true;
    taskController?.destroy(); taskController = null;
    document.body.style.overflow = '';
    if (detailTrigger?.isConnected) detailTrigger.focus();
    else panel.querySelector(`[data-visit-action="detail"][data-visit-index="${detailTrigger?.dataset.visitIndex}"]`)?.focus();
    detailTrigger = null;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'visit-dialog';
  dialog.setAttribute('aria-labelledby', 'visit-operation-title');
  dialog.innerHTML = `<header><h2 id="visit-operation-title"></h2><button class="visit-dialog-close" type="button" data-close-visit-dialog aria-label="关闭">×</button></header><div class="visit-dialog-body"><p class="visit-dialog-subject"></p><div class="visit-dialog-content"></div></div><footer><button type="button" data-close-visit-dialog>取消</button><button type="button" class="primary" data-save-visit-dialog>保存</button></footer>`;
  document.body.append(dialog);
  const saveButton = dialog.querySelector('[data-save-visit-dialog]');
  let operationMode = '';
  function openDialog(visit, action, button) {
    const state = progress(visit);
    const operations = isPending(visit)
      ? [['appointment', visit.appointmentDate ? '调整预约' : '访视预约'], ...(visit.appointmentDate ? [['cancel', '取消预约']] : []), ['actual', '记录实际访视日期'], ['terminate', '终止访视']]
      : state === 'completed' ? [['actual', '修改实际访视日期']] : [];
    if (action === 'manage') action = operations[0]?.[0] || 'manage';
    if (action !== 'history') operationMode = action;
    activeVisit = visit; mode = action; trigger = button;
    dialog.querySelector('h2').textContent = action === 'history' ? '访视操作记录' : '访视管理';
    dialog.querySelector('.visit-dialog-subject').textContent = `${visit.person.name}（${visit.person.initials}） ${visit.participantId} · ${visit.name}`;
    saveButton.hidden = ['manage', 'history'].includes(action);
    dialog.querySelector('footer [data-close-visit-dialog]').textContent = action === 'history' ? '返回' : ['manage'].includes(action) ? '关闭' : '取消';
    saveButton.textContent = action === 'terminate' ? '确认终止访视' : action === 'cancel' ? '确认取消预约' : '保存';
    saveButton.classList.toggle('danger', action === 'terminate');
    const records = [...visit.appointmentHistory, ...visit.actualHistory, ...(visit.terminationHistory || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const content = dialog.querySelector('.visit-dialog-content');
    const tabs = dialog.querySelector('.visit-manage-tabs') || document.createElement('div');
    tabs.className = 'visit-manage-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '访视操作');
    tabs.hidden = action === 'history' || !operations.length;
    tabs.innerHTML = operations.map(([value, label]) => `<button type="button" role="tab" data-manage-action="${value}" class="${value === 'terminate' ? 'danger' : ''}" aria-selected="${action === value}" aria-controls="visit-operation-panel" tabindex="${action === value ? '0' : '-1'}" id="visit-operation-${value}"><span>${label}</span></button>`).join('');
    dialog.querySelector('.visit-dialog-body').prepend(tabs);
    content.id = 'visit-operation-panel';
    if (operations.some(([value]) => value === action)) {
      content.setAttribute('role', 'tabpanel');
      content.setAttribute('aria-labelledby', `visit-operation-${action}`);
    } else {
      content.removeAttribute('role'); content.removeAttribute('aria-labelledby');
    }
    const historyButton = dialog.querySelector('.visit-history-link') || document.createElement('button');
    historyButton.type = 'button'; historyButton.className = 'visit-history-link'; historyButton.dataset.manageAction = 'history'; historyButton.textContent = '查看记录'; historyButton.hidden = action === 'history';
    dialog.querySelector('footer').prepend(historyButton);
    const summary = `<div class="visit-dialog-plan">访视状态：${store.statusLabels[state]}<br>计划日期：${escape(visit.plannedDate)}<br>访视窗口：${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}${visit.appointmentDate ? `<br>预约日期：${escape(visit.appointmentDate)}` : ''}${visit.actualDate ? `<br>实际访视日期：${escape(visit.actualDate)}` : ''}</div>`;
    if (action === 'manage') {
      content.innerHTML = summary + (state === 'terminated' ? `<div class="visit-termination-info">终止时间：${escape(visit.terminatedAt || '暂无记录')}<br>终止原因：${escape(visit.terminationReason || '暂无原因记录')}</div>` : '');
    } else if (action === 'terminate') {
      const tasks = associatedTasks(visit);
      const drafts = tasks.filter(task => task.kind === 'draft' && task.state === 'draft').length;
      const pending = tasks.filter(task => task.kind === 'execute' && task.state === 'pending').length;
      content.innerHTML = `<div class="visit-termination-warning">确认终止本次访视？<p>将停止 ${drafts} 个待发放任务和 ${pending} 条待执行任务，并保留处理原因。已完成任务与其他访视不受影响。</p></div><label><span class="visit-reason-heading"><span>终止原因（必填）</span><span><span data-visit-reason-count>0</span>/500</span></span><textarea data-visit-reason required maxlength="500" placeholder="请填写终止原因，最多500字符"></textarea></label><p class="visit-dialog-error" role="alert"></p>`;
    } else if (action === 'history') {
      content.innerHTML = records.length ? records.map(record => `<article class="visit-history-item"><div>${escape(record.action || (record.type === 'actual' ? '记录实际访视日期' : record.to ? '预约日期调整' : '取消预约'))}</div><small>${escape(record.at)} · ${escape(record.operator || '个案')}</small><div>${escape(record.from || '未设置')} → ${escape(record.to || '已取消')}</div><p>${escape(record.reason || '未填写备注')}</p></article>`).join('') : '<p class="visit-dialog-help">暂无日期操作记录</p>';
    } else {
      content.innerHTML = `${summary}${action !== 'cancel' ? `<label>${action === 'actual' ? '实际访视日期' : '预约访视日期'} <span style="color:#e05252">*</span><input type="date" data-visit-date required ${action === 'actual' ? `max="${today}"` : ''} value="${escape(action === 'actual' ? visit.actualDate : visit.appointmentDate || visit.plannedDate)}"></label>` : ''}<label><span class="visit-reason-heading"><span>${action === 'cancel' ? '取消原因（必填）' : '备注 / 调整原因（超窗或修改实际日期时必填）'}</span><span><span data-visit-reason-count>0</span>/500</span></span><textarea data-visit-reason maxlength="500" ${action === 'cancel' || action === 'actual' && visit.actualDate ? 'required' : ''} placeholder="请填写原因或备注，最多500字符"></textarea></label><p class="visit-dialog-help">${action === 'actual' ? '保存实际访视日期后，访视状态为已完成；关联任务和访视资料可继续处理。' : '预约安排独立于方案计划，调整预约不会改变计划日期及访视窗口。'}</p><p class="visit-dialog-error" role="alert"></p>`;
    }
    if (!dialog.open) dialog.showModal();
    (tabs.querySelector('[aria-selected="true"]') || dialog.querySelector('.visit-dialog-close')).focus();
  }
  function closeDialog() { dialog.close(); if (trigger?.isConnected) trigger.focus(); activeVisit = null; }
  function toast(message) {
    document.querySelector('.visit-toast')?.remove(); clearTimeout(toastTimer);
    const el = document.createElement('div'); el.className = 'visit-toast'; el.setAttribute('role', 'status'); el.textContent = message; document.body.append(el);
    toastTimer = setTimeout(() => el.remove(), 3000);
  }
  saveButton.addEventListener('click', () => {
    if (!activeVisit || ['history', 'manage'].includes(mode)) return;
    const dateInput = dialog.querySelector('[data-visit-date]');
    const reasonInput = dialog.querySelector('[data-visit-reason]');
    const reason = reasonInput.value.trim();
    const next = ['cancel', 'terminate'].includes(mode) ? '' : dateInput.value;
    const error = dialog.querySelector('.visit-dialog-error');
    const fail = (message, input) => { error.textContent = message; input?.focus(); };
    if (mode === 'terminate') {
      if (!isPending(activeVisit)) { fail('当前访视已结束，不能终止'); return; }
      if (!reason) { fail('请填写终止原因', reasonInput); return; }
      if (reasonInput.value.length > 500) { fail('原因最多500字符', reasonInput); return; }
      const at = new Date().toLocaleString('sv-SE');
      const affected = associatedTasks(activeVisit).filter(task => ['draft', 'pending'].includes(task.state));
      const previousState = store.statusLabels[progress(activeVisit)];
      activeVisit.state = '已终止'; activeVisit.terminationReason = reason; activeVisit.terminatedAt = at;
      activeVisit.terminationHistory ||= [];
      activeVisit.terminationHistory.push({ type: 'termination', action: '终止访视', from: previousState, to: '已终止', reason, operator: '当前个案', at, taskKeys: affected.map(task => task.key) });
      store.save(activeVisit);
      const taskKey = `participant-tasks-v3:${activeVisit.projectId}:${activeVisit.participantId}`;
      try { sessionStorage.setItem(taskKey, JSON.stringify(window.loadParticipantTasks(activeVisit.projectId, activeVisit.participantId).map(task => affected.some(item => item.key === task.key) ? { ...task, state: 'none', noProcessReason: reason, processedAt: at, terminatedByVisit: true } : task))); } catch { /* 访视存储仍可约束其他入口。 */ }
      const visit = activeVisit, button = trigger;
      renderVisits(); toast('访视已终止，相关未处理任务已停止'); openDialog(visit, 'manage', button); return;
    }
    if (activeVisit.state === '已终止') { fail('已终止访视不能修改日期'); return; }
    if (mode !== 'cancel' && !day(next)) { fail('请选择有效的访视日期', dateInput); return; }
    if (mode === 'actual' && next > today) { fail('实际访视日期不能晚于当前日期', dateInput); return; }
    const outside = next && (next < activeVisit.windowStart || next > activeVisit.windowEnd);
    if ((mode === 'cancel' || outside || mode === 'actual' && activeVisit.actualDate) && !reason) { fail(mode === 'cancel' ? '请填写取消原因' : '请填写调整原因', reasonInput); return; }
    if (reasonInput.value.length > 500) { fail('原因最多500字符', reasonInput); return; }
    const field = mode === 'actual' ? 'actualDate' : 'appointmentDate';
    const previous = activeVisit[field] || '';
    if (previous === next) { fail('日期未发生变化', dateInput); return; }
    activeVisit[field] = next;
    activeVisit[mode === 'actual' ? 'actualHistory' : 'appointmentHistory'].push({ type: mode === 'actual' ? 'actual' : 'appointment', action: mode === 'cancel' ? '取消预约' : mode === 'actual' ? previous ? '修改实际访视日期' : '记录实际访视日期' : previous ? '调整预约' : '预约访视', from: previous, to: next, reason, operator: '当前个案', at: new Date().toLocaleString('sv-SE') });
    store.save(activeVisit);
    closeDialog(); renderVisits(); toast(mode === 'actual' ? '实际访视日期已保存' : mode === 'cancel' ? '预约已取消' : '访视预约已保存');
  });
  dialog.addEventListener('input', event => { if (event.target.matches('[data-visit-reason]')) dialog.querySelector('[data-visit-reason-count]').textContent = event.target.value.length; });
  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-manage-action]');
    if (action) { openDialog(activeVisit, action.dataset.manageAction, trigger); return; }
    if (event.target.closest('footer [data-close-visit-dialog]') && mode === 'history') { openDialog(activeVisit, operationMode, trigger); return; }
    if (event.target.closest('[data-close-visit-dialog]') || event.target === dialog) closeDialog();
  });
  dialog.addEventListener('keydown', event => {
    if (!event.target.matches('.visit-manage-tabs [role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...dialog.querySelectorAll('.visit-manage-tabs [role="tab"]')];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(event.target) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    openDialog(activeVisit, tabs[index].dataset.manageAction, trigger);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  panel.addEventListener('click', event => {
    if (event.target.closest('[data-clear-visit-scope]')) { calendarOnly = false; pendingOnly = false; calendarWindow = ''; department = ''; group = ''; startFilter.value = ''; endFilter.value = ''; renderVisits(); return; }
    const button = event.target.closest('[data-visit-action]');
    if (!button) return;
    const visit = visits[Number(button.dataset.visitIndex)];
    if (!visit) return;
    if (button.dataset.visitAction === 'detail') openVisitDetail(visit, button);
    else openDialog(visit, button.dataset.visitAction, button);
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
  [progressFilter, startFilter, endFilter].forEach(input => input.addEventListener('change', renderVisits));
  windowFilter.addEventListener('change', () => { calendarWindow = ''; renderVisits(); });
  appointmentFilter.addEventListener('change', renderVisits);
  document.querySelectorAll('[data-management-section]').forEach(button => button.addEventListener('click', () => setSection(button.dataset.managementSection)));
  // 医院或项目发生变化后，清除从日历带来的更细组织条件。
  [projectFilter, hospitalFilter].forEach(input => input.addEventListener('change', () => { department = ''; group = ''; if (section === 'visits') renderVisits(); }));
  window.participantVisits = { isActive: () => section === 'visits', render: renderVisits, setSection, reset, syncURL };
  function restoreLocation() {
    const p = new URLSearchParams(location.search);
    projectFilter.value = projectCatalog[p.get('project')] ? p.get('project') : '';
    hospitalFilter.value = hospitals.has(p.get('hospital')) ? p.get('hospital') : '';
    statusFilter.value = p.get('participantStatus') || ''; search.value = p.get('q') || '';
    progressFilter.value = p.get('progress') || '';
    appointmentFilter.value = ['booked', 'unbooked', 'cancelled'].includes(p.get('appointment')) ? p.get('appointment') : '';
    windowFilter.value = ['soon', 'upcoming', 'window', 'overdue'].includes(p.get('window')) ? p.get('window') : '';
    startFilter.value = day(p.get('start')) ? p.get('start') : ''; endFilter.value = day(p.get('end')) ? p.get('end') : '';
    calendarOnly = p.get('source') === 'calendar'; pendingOnly = p.get('pending') === '1'; department = p.get('department') || ''; group = p.get('group') || '';
    calendarWindow = p.get('calendarWindow') === 'upcoming' || p.get('window') === 'upcoming' ? 'upcoming' : '';
    setSection(p.get('view') === 'visits' ? 'visits' : 'participants');
  }
  window.addEventListener('popstate', restoreLocation);
  restoreLocation();
})();
