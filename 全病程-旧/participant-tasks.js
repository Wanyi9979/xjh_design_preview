// 具体访视优先使用稳定标识或源任务索引，避免把同名的多次访视混在一起。
window.participantTaskBelongsToVisit = (task, visit) => {
  if (task.kind === 'follow' || task.ambiguousVisit) return false;
  if (task.visitId) return task.visitId === visit.id;
  if (task.kind === 'execute' && Number.isInteger(task.sourceIndex) && (visit.sourceTaskIndices || [visit.sourceTaskIndex]).includes(task.sourceIndex)) return true;
  return task.visit === visit.name && task.date === visit.plannedDate;
};
window.loadParticipantTasks = (project, participantId) => {
  const source = window.clinicalTasks || {};
  const date = value => String(value || '').replaceAll('/', '-').slice(0, 10);
  const storageKey = `participant-tasks-v3:${project}:${participantId}`;
  const read = key => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
  const belongs = row => row.id === participantId && (row.projectId || 'CT-2026-001') === project && !row.removed;
  const ignored = row => ['无需处理', '已终止', '已作废', '无需执行'].includes(row.state) || /无需跟踪/.test(row.result || '');
  let tasks = ['draft', 'execute', 'follow'].flatMap(kind => (source[kind] || []).flatMap((row, index) => {
    if (!belongs(row)) return [];
    return [{ key: `${kind}-${index}`, kind, sourceIndex: index, visitId: row.visitId || '', name: row.content || (kind === 'follow' ? '参与者跟进' : '访视任务'), visit: row.cycle || '',
      date: date(kind === 'follow' ? row.followDate || row.date || row.sent : row.plannedAt || row.planDate || row.date), window: row.window || '—',
      plannedAt: row.plannedAt || row.planDate || row.date || '', relativeDay: row.relativeDay || '', sequence: row.sequence || '',
      method: row.method || (/上传|文件|报告/.test(row.content) ? '上传文件' : '表单填写'),
      executionType: row.executionType || (/上传|文件|报告/.test(row.content) ? 'upload' : 'form'), formName: row.formName || row.content || '任务表单',
      canCaseExecute: row.canCaseExecute !== false, fillMode: row.fillMode || (row.canCaseExecute === false ? '仅患者填写' : '个案可填'),
      config: row.config || null, packageId: row.packageId || '', result: row.result || '', noProcessReason: row.noProcessReason || row.skipReason || '',
      operator: row.operator || '', completedAt: row.completedAt || row.executedAt || '',
      state: ignored(row) ? 'none' : kind === 'draft' ? row.state === '已发放' || row.issued ? 'issued' : 'draft' : kind === 'follow' ? row.handled ? 'done' : 'pending' : ['已执行', '已完成'].includes(row.state) ? 'done' : 'pending',
      children: kind === 'draft' ? String(row.content || '访视执行任务').split(/[、，]/).map(name => name.trim()).filter(Boolean) : [],
      parentKey: row.parentKey || '', overdue: Boolean(row.overdue), note: row.note || row.result || '',
      processedAt: row.executedAt || row.handledAt || row.terminatedAt || '' }];
  }));
  const saved = read(storageKey);
  if (Array.isArray(saved)) {
    const savedByKey = new Map(saved.filter(row => row && typeof row.key === 'string').map(row => [row.key, row]));
    tasks = tasks.map(row => savedByKey.has(row.key) ? { ...row, ...savedByKey.get(row.key) } : row);
    tasks.push(...saved.filter(row => row && row.local && ['draft', 'execute', 'follow'].includes(row.kind)));
  }
  // 已终止访视是持久约束；新页面和其他入口也不能再次发放或执行其任务。
  const visitStore = window.clinicalVisitStore;
  const knownVisits = (visitStore?.calendar()?.visits || visitStore?.fromTasks(source, [{ id: 'CT-2026-001' }]).visits || [])
    .filter(visit => visit.projectId === project && visit.participantId === participantId);
  // 先绑定访视身份，再修改发放日期；计划变动后仍属于原访视。
  tasks.filter(task => task.kind !== 'follow' && !task.visitId && !task.local).forEach(task => {
    const original = source[task.kind]?.[task.sourceIndex];
    const originalDate = date(original?.plannedAt || original?.planDate || original?.date || task.date);
    const indexed = task.kind === 'execute' ? knownVisits.filter(visit => (visit.sourceTaskIndices || [visit.sourceTaskIndex]).includes(task.sourceIndex)) : [];
    const candidates = indexed.length ? indexed : knownVisits.filter(visit => task.visit === visit.name && originalDate === visit.plannedDate);
    if (candidates.length === 1) task.visitId = candidates[0].id;
    task.ambiguousVisit = candidates.length > 1;
  });
  tasks.filter(task => task.local && task.parentKey && !task.visitId).forEach(task => { task.visitId = tasks.find(parent => parent.key === task.parentKey)?.visitId || ''; });
  const terminated = [...(visitStore?.terminatedVisits() || []), ...knownVisits]
    .filter(visit => visit.projectId === project && visit.participantId === participantId)
    .map(visit => visitStore.apply(visit)).filter(visit => visitStore.status(visit) === 'terminated');
  tasks.forEach(task => {
    const visit = terminated.find(visit => window.participantTaskBelongsToVisit(task, visit));
    if (!visit || !['draft', 'pending'].includes(task.state)) return;
    task.state = 'none'; task.noProcessReason = visit.terminationReason || '访视已终止'; task.processedAt = visit.terminatedAt || ''; task.terminatedByVisit = true;
  });
  return tasks;
};
// 参与者详情和访视任务抽屉共用操作与会话状态。
window.createParticipantTasks = ({ container, participantId, participantName, params, onChange, visitScope = null }) => {
  const source = window.clinicalTasks || {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date = value => String(value || '').replaceAll('/', '-').slice(0, 10);
  const today = source.today || date(new Date().toLocaleDateString('sv-SE'));
  const project = params.get('project') || 'CT-2026-001';
  const storageKey = `participant-tasks-v3:${project}:${participantId}`;
  const viewKey = `${storageKey}:view${visitScope ? `:${visitScope.id}` : ''}`;
  const read = key => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* 页面内仍可处理。 */ } };
  const lifetime = new AbortController();
  let tasks = window.loadParticipantTasks(project, participantId);
  const inScope = task => !visitScope || window.participantTaskBelongsToVisit(task, visitScope);
  const categories = [
    { key: 'draft', label: '待发放访视任务', scopes: [['draft', '待发放'], ['issued', '已发放'], ['none', '无需处理']] },
    { key: 'execute', label: '待执行访视任务', scopes: [['pending', '全部待执行'], ['today', '今日待执行'], ['overdue', '已逾期'], ['done', '已完成'], ['none', '无需处理']] },
    { key: 'follow', label: '参与者跟进', scopes: [['pending', '待完成'], ['done', '已完成'], ['none', '无需处理']] }
  ].filter(item => !visitScope || item.key !== 'follow');
  const previous = read(viewKey);
  let category = categories.some(item => item.key === previous?.category) ? previous.category : 'draft';
  let scope = categories.find(item => item.key === category).scopes.some(([key]) => key === previous?.scope) ? previous.scope : categories.find(item => item.key === category).scopes[0][0];
  let visit = '', query = '', activeTask = null, opener = null, drawerMode = '', schedule = null, returnTask = null;
  let selectedVisit = null;
  const visitMatches = task => selectedVisit ? window.participantTaskBelongsToVisit(task, selectedVisit) : !visit || (task.visit || '__none__') === visit;
  function rememberVisit() {
    if (visitScope) return;
    const url = new URL(location.href);
    if (selectedVisit) url.searchParams.set('visitId', selectedVisit.id);
    else url.searchParams.delete('visitId');
    history.replaceState(null, '', url);
  }
  const isOverdue = task => task.kind === 'execute' && task.state === 'pending' && (task.overdue || Boolean(task.date && task.date < today));
  const matches = (task, key) => key === 'today' ? task.state === 'pending' && !isOverdue(task) && task.date === today : key === 'overdue' ? isOverdue(task) : task.state === key;
  const stateLabel = task => task.state === 'none' ? '无需处理' : task.state === 'done' ? '已完成' : task.kind === 'draft' ? task.state === 'issued' ? '已发放' : '待发放' : task.kind === 'follow' ? '待完成' : isOverdue(task) ? '已逾期' : task.date > today ? '未开始' : '待执行';
  const actionable = task => task.kind === 'draft' ? task.state === 'draft' : task.state === 'pending';
  const stateMarkup = task => `<span class="participant-task-state ${isOverdue(task) ? 'overdue' : ['done', 'issued'].includes(task.state) ? 'done' : task.state === 'none' ? '' : 'pending'}">${stateLabel(task)}</span>`;
  const remember = () => write(viewKey, { category, scope });
  container.innerHTML = `<div class="participant-task-categories" role="tablist" aria-label="任务分类"></div>
    <div class="participant-task-controls">
    <div class="participant-task-scopes" role="tablist" aria-label="分类内任务状态"></div>
    <div class="participant-detail-toolbar participant-task-filters">
      <select data-task-visit aria-label="所属访视"></select>
      <input type="search" data-task-search aria-label="搜索任务" placeholder="搜索任务名称或跟进内容">
      <button type="button" data-task-reset>重置</button>
      <button type="button" data-task-add hidden>新增跟进任务</button>
    </div></div>
    <div class="participant-task-notice" role="status" hidden></div>
    <div class="participant-detail-table-wrap"><table class="participant-detail-table participant-task-table"><colgroup><col style="width:29%"><col style="width:21%"><col style="width:25%"><col style="width:11%"><col style="width:14%"></colgroup><thead></thead><tbody></tbody></table></div>`;
  container.querySelector('[data-task-visit]').hidden = Boolean(visitScope);
  if (visitScope) container.querySelector('[data-task-search]').placeholder = '搜索任务名称';
  const drawer = document.createElement('dialog');
  drawer.className = 'participant-task-drawer';
  drawer.setAttribute('aria-labelledby', 'participant-task-drawer-title');
  document.body.append(drawer);
  const menu = document.createElement('div');
  menu.className = 'participant-task-action-menu'; menu.hidden = true;
  menu.setAttribute('role', 'menu'); document.body.append(menu);
  let menuOpener = null;
  function closeMenu() {
    menu.hidden = true;
    menuOpener?.setAttribute('aria-expanded', 'false');
  }
  function positionMenu() {
    if (menu.hidden || !menuOpener?.isConnected) return;
    const rect = menuOpener.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) { closeMenu(); return; }
    menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, rect.bottom + menu.offsetHeight + 8 < innerHeight ? rect.bottom + 4 : rect.top - menu.offsetHeight - 4)}px`;
  }
  const actionButton = (task, action, label) => `<button class="participant-detail-action" type="button" data-task-action="${action}" data-task-key="${esc(task.key)}">${label}</button>`;
  function actionsMarkup(task) {
    if (task.kind === 'follow') return `<button class="participant-detail-action" type="button" data-task-open="${esc(task.key)}">${actionable(task) ? '去跟进' : '查看详情'}</button>`;
    if (task.state === 'none') return actionButton(task, 'view', '查看任务') + actionButton(task, 'record', '查看记录');
    if (task.kind === 'draft') return task.state === 'draft' ? actionButton(task, 'issue', '发放') + actionButton(task, 'ignore', '无需处理') + actionButton(task, 'contact', '联系参与者') : actionButton(task, 'view', '查看任务') + actionButton(task, 'contact', '联系参与者');
    if (task.state === 'done') return actionButton(task, 'view', '查看任务') + actionButton(task, 'contact', '联系参与者');
    return (task.canCaseExecute !== false ? actionButton(task, 'execute', '去执行') : '') + actionButton(task, 'remind', '发送提醒') + `<button class="participant-detail-action" type="button" data-task-more="${esc(task.key)}" aria-haspopup="menu" aria-expanded="false">更多⌄</button>`;
  }
  function render() {
    closeMenu();
    const scopedTasks = tasks.filter(task => inScope(task) && visitMatches(task));
    const config = categories.find(item => item.key === category);
    container.querySelector('.participant-task-categories').innerHTML = categories.map(item => `<button type="button" role="tab" aria-controls="participant-task-list" data-task-category="${item.key}" aria-selected="${category === item.key}">${item.label}<span>${scopedTasks.filter(task => task.kind === item.key && actionable(task)).length}</span></button>`).join('');
    container.querySelector('.participant-task-scopes').innerHTML = config.scopes.map(([key, label]) => `<button type="button" role="tab" data-task-scope="${key}" aria-controls="participant-task-list" aria-selected="${scope === key}">${label}<span>${scopedTasks.filter(task => task.kind === category && matches(task, key)).length}</span></button>`).join('');
    const visits = [...new Set(tasks.filter(task => task.kind === category).map(task => task.visit))];
    const select = container.querySelector('[data-task-visit]');
    select.innerHTML = '<option value="">全部访视</option>' + visits.map(value => `<option value="${esc(value || '__none__')}">${esc(value || '无关联访视')}</option>`).join('');
    if (selectedVisit) select.insertAdjacentHTML('beforeend', `<option value="${esc(visit)}">${esc(selectedVisit.name)} · ${esc(selectedVisit.plannedDate)}</option>`);
    select.value = visit;
    select.title = selectedVisit ? `${selectedVisit.name} · ${selectedVisit.plannedDate}` : select.selectedOptions[0]?.textContent || '';
    const rows = scopedTasks.filter(task => task.kind === category && matches(task, scope) && (!query || task.name.toLowerCase().includes(query))).sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
    const table = container.querySelector('table');
    table.id = 'participant-task-list';
    table.setAttribute('aria-label', `${config.label} · ${config.scopes.find(([key]) => key === scope)[1]}`);
    const headings = category === 'draft' ? ['任务名称', '访视', '计划日期 / 访视窗口', ...(scope === 'draft' ? ['子任务数量'] : []), '操作'] : category === 'execute' ? ['任务名称', '访视', '执行节点', '计划时间 / 执行窗口', '状态', '操作'] : ['跟进内容', '关联访视', '计划跟进时间', '状态', '操作'];
    const widths = category === 'execute' ? [22, 15, 10, 22, 9, 22] : category === 'draft' ? scope === 'draft' ? [26, 18, 25, 9, 22] : [31, 20, 27, 22] : [29, 21, 25, 11, 14];
    table.querySelector('colgroup').innerHTML = widths.map(width => `<col style="width:${width}%">`).join('');
    table.querySelector('thead').innerHTML = '<tr>' + headings.map(label => `<th>${label}</th>`).join('') + '</tr>';
    table.querySelector('tbody').innerHTML = rows.map(task => `<tr data-task-row="${esc(task.key)}"><td>${esc(task.name)}</td><td>${esc(task.visit || '—')}</td>${category === 'execute' ? `<td>${esc(task.relativeDay || '—')}${task.sequence ? `<small>${esc(task.sequence)}</small>` : ''}</td>` : ''}<td>${esc((category === 'execute' ? task.plannedAt : task.date) || task.date || '—')}${category === 'follow' ? '' : `<small>${esc(task.window)}</small>`}</td>${category === 'draft' ? scope === 'draft' ? `<td>${(task.config?.times?.length || 1) * task.children.length} 项</td>` : '' : `<td>${stateMarkup(task)}</td>`}<td><div class="participant-task-row-actions">${actionsMarkup(task)}</div></td></tr>`).join('') || `<tr><td class="participant-detail-empty" colspan="${headings.length}">暂无匹配任务</td></tr>`;
    if (visitScope) {
      table.querySelector('colgroup').children[1]?.remove();
      table.querySelector('thead tr').children[1]?.remove();
      table.querySelectorAll('tbody tr[data-task-row]').forEach(row => row.children[1].remove());
      const empty = table.querySelector('.participant-detail-empty');
      if (empty) empty.colSpan = headings.length - 1;
    }
    container.querySelector('[data-task-add]').hidden = category !== 'follow';
    onChange?.();
  }
  function select(nextCategory, nextScope) {
    closeMenu();
    category = nextCategory;
    scope = nextScope || categories.find(item => item.key === category).scopes[0][0];
    query = '';
    container.querySelector('[data-task-search]').value = '';
    container.querySelector('.participant-task-notice').hidden = true;
    remember(); render();
  }
  function filterVisit(record) {
    selectedVisit = record;
    visit = record ? `visit:${record.id}` : '';
    query = '';
    container.querySelector('[data-task-search]').value = '';
    const matching = tasks.filter(task => inScope(task) && visitMatches(task));
    const first = matching.find(task => task.kind === 'execute' && task.state === 'pending') || matching.find(task => task.state === 'draft') || matching[0];
    if (first) { category = first.kind; scope = first.state; }
    rememberVisit(); remember(); render();
  }
  const stamp = () => new Date().toLocaleString('sv-SE');
  function persist(message, showGenerated = false) {
    const latest = read(storageKey);
    // 访视抽屉只写回自己的任务，保留同一参与者其他访视的修改。
    if (visitScope && Array.isArray(latest)) {
      const own = new Map(tasks.filter(inScope).map(task => [task.key, task]));
      tasks = latest.map(task => own.has(task.key) ? own.get(task.key) : task);
      own.forEach(task => { if (!tasks.some(item => item.key === task.key)) tasks.push(task); });
    }
    write(storageKey, tasks);
    render();
    notify(message, showGenerated ? activeTask : null);
  }
  function notify(message, issuedTask = null) {
    const notice = container.querySelector('.participant-task-notice');
    notice.hidden = false;
    notice.replaceChildren(document.createTextNode(message));
    if (issuedTask?.kind === 'draft' && issuedTask.state === 'issued') {
      const issuedVisit = issuedTask.visit;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'participant-detail-action'; button.textContent = '查看已生成任务';
      button.addEventListener('click', () => { select('execute', 'pending'); if (!selectedVisit) visit = issuedVisit || '__none__'; render(); });
      notice.append(button);
    }
  }
  function close() { drawer.close(); (opener?.isConnected ? opener : container.querySelector('[data-task-scope][aria-selected="true"]'))?.focus({ preventScroll: true }); }
  const field = (label, value) => `<div class="participant-task-field"><span>${label}</span><div>${esc(value || '—')}</div></div>`;
  function shiftDate(value, days) {
    const valueDate = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(valueDate.getTime())) return '—';
    valueDate.setDate(valueDate.getDate() + days);
    return `${valueDate.getFullYear()}-${String(valueDate.getMonth() + 1).padStart(2, '0')}-${String(valueDate.getDate()).padStart(2, '0')}`;
  }
  function scheduleFor(task) {
    const config = task.config || {};
    const rule = String(config.windowRule || task.window).match(/提前(\d+)天\s*\/\s*延后(\d+)天/);
    const dates = String(task.window).match(/\d{4}[-/]\d{2}[-/]\d{2}/g);
    const distance = (a, b) => Math.round((new Date(`${date(a)}T12:00:00`) - new Date(`${date(b)}T12:00:00`)) / 86400000);
    return { date: config.date || task.date || today, times: [...(config.times?.length ? config.times : [String(task.plannedAt || '').match(/\d{2}:\d{2}/)?.[0] || '09:00'])],
      before: config.before ?? (rule ? Number(rule[1]) : dates ? Math.max(0, distance(task.date, dates[0])) : 0),
      after: config.after ?? (rule ? Number(rule[2]) : dates ? Math.max(0, distance(dates[1], task.date)) : 0) };
  }
  const scheduleWindow = (value, time = '') => `${shiftDate(value.date, -value.before)}${time ? ` ${time}` : ''} ～ ${shiftDate(value.date, value.after)}${time ? ` ${time}` : ''}`;
  const packageChildren = task => tasks.filter(item => item.kind === 'execute' && item.parentKey === task.key);
  function renderPreview() {
    const readOnly = drawerMode !== 'issue';
    const names = activeTask.children?.length ? activeTask.children : [activeTask.name];
    const status = activeTask.state === 'none' ? '未生成' : activeTask.state === 'issued' || activeTask.kind === 'execute' ? '已生成' : '待发放';
    drawer.querySelector('[data-issue-preview]').innerHTML = schedule.times.flatMap((time, timeIndex) => names.map((name, childIndex) => `<tr><td>${esc(name)}<small>第${timeIndex + 1}次</small></td><td>${esc(schedule.date || '—')}</td><td>${childIndex === 0 ? `<input name="time-${timeIndex}" type="time" required value="${esc(time)}" data-issue-time="${timeIndex}" aria-label="第${timeIndex + 1}次采集时间"${readOnly ? ' disabled' : ''}>` : esc(time)}</td><td>${esc(scheduleWindow(schedule, time))}</td><td>${status}</td></tr>`)).join('');
    drawer.querySelector('[data-issue-count]').textContent = `${status === '已生成' ? '共生成' : '预计生成'} ${names.length * schedule.times.length} 个执行任务${status === '未生成' ? '（无需处理，未发放）' : ''}`;
  }
  function open(task, trigger, mode = task?.kind === 'follow' || !task ? 'follow' : 'view', backTask = null) {
    closeMenu(); activeTask = task; opener = trigger; drawerMode = mode; returnTask = backTask;
    const canHandle = task && actionable(task);
    let title = '查看任务', content = '', extra = '', submit = '';
    if (mode === 'issue' || mode === 'package' || (mode === 'view' && task.kind === 'draft')) {
      const readOnly = mode !== 'issue';
      schedule = scheduleFor(task);
      title = readOnly ? '查看任务' : '发放任务';
      const config = task.config || {};
      content = `<section class="participant-task-card"><h3>任务信息</h3><div class="participant-task-field-grid">${field('任务名称', task.name)}${field('访视', task.visit)}${field('采集方式', task.method)}${field('表单', task.formName)}${field('填写方式', task.fillMode)}${field('当前状态', stateLabel(task))}</div>${field('任务说明', config.description || `${task.name}相关采集任务。`)}</section>
        <section class="participant-task-card"><h3>采集配置</h3><div class="participant-task-field-grid">${field('采集周期', config.cycle || '—')}${field('基准日期', config.baseline || '访视日期')}${field('采集时间', schedule.times.join('、'))}${field('时间窗口', `提前${schedule.before}天/延后${schedule.after}天`)}${field('允许逾期', config.overdue ? '开启' : '关闭')}${field('自动映射CRF', config.autoMap ? '开启' : '关闭')}</div></section>
        <section class="participant-task-card"><h3>执行计划</h3><label>访视日期（基准日期）<input name="baselineDate" type="date" required value="${esc(schedule.date)}"${readOnly ? ' disabled' : ''}></label><p class="participant-task-help">${readOnly ? task.state === 'none' ? '任务无需处理，以下计划尚未发放。' : '以下为已保存的基准日期及执行计划。' : '修改日期或采集时间后，将重新计算下方执行任务。'}</p><p data-issue-count></p><div class="participant-task-preview-wrap"><table class="participant-task-plan"><thead><tr><th>任务 / 执行节点</th><th>计划日期</th><th>采集时间</th><th>执行窗口</th><th>状态</th></tr></thead><tbody data-issue-preview></tbody></table></div></section>`;
      if (!readOnly) { extra = '<button type="button" data-drawer-save>保存暂不发放</button>'; submit = '确认发放'; }
    } else if (mode === 'ignore' || mode === 'record') {
      const readOnly = mode === 'record';
      title = readOnly ? '无需处理记录' : '无需处理';
      const reason = readOnly ? task.noProcessReason || task.note || '暂无原因记录。' : '';
      content = `${field('任务名称', task.name)}${field('访视', task.visit)}<label>无需处理原因${readOnly ? '' : ' *'}<textarea name="reason" maxlength="500"${readOnly ? ' readonly' : ' required'} placeholder="请填写无需处理原因，最多500字符">${esc(reason)}</textarea></label><div class="participant-task-reason-count"><span data-reason-count>${reason.length}</span> / 500</div>${readOnly ? field('处理时间', task.processedAt) : ''}`;
      if (!readOnly) submit = '确认无需处理';
    } else if (mode === 'execute') {
      title = task.executionType === 'upload' ? '上传文件' : `填写${task.formName || '任务表单'}`;
      content = `${field('任务名称', task.name)}${field('访视', task.visit)}${task.executionType === 'upload' ? '<label>上传文件 *<input name="file" type="file" required aria-label="上传任务文件"></label><label>文件说明<textarea name="note" maxlength="500" placeholder="选填，说明文件内容"></textarea></label>' : '<label>是否出现相关症状 *<select name="symptom" required><option value="">请选择</option><option>是</option><option>否</option></select></label><label>严重程度 *<select name="severity" required><option value="">请选择</option><option>轻度</option><option>中度</option><option>重度</option></select></label><label>补充说明<textarea name="note" maxlength="500" placeholder="选填，补充本次执行情况"></textarea></label>'}`;
      submit = '提交任务';
    } else if (mode === 'result') {
      title = '查看执行结果';
      content = task.result ? `${field('执行结果', task.result)}${field('完成时间', task.completedAt)}${field('执行人', task.operator)}` : `<p class="participant-task-help">${task.state === 'done' ? '暂无执行结果记录。' : '任务尚未执行，暂时没有执行结果。'}</p>`;
      extra = '<button type="button" data-drawer-view>返回任务详情</button>';
    } else if (mode === 'view') {
      const parent = tasks.find(item => item.key === task.parentKey && item.kind === 'draft');
      const children = parent ? packageChildren(parent) : [];
      content = `<section class="participant-task-card"><h3>执行任务信息</h3><div class="participant-task-field"><span>任务名称</span><div><button type="button" class="participant-detail-action participant-task-template-link" data-drawer-package>${esc(task.name)}</button></div></div><div class="participant-task-field-grid">${field('访视', task.visit)}${field('执行节点', `${task.relativeDay || '—'}${task.sequence ? `（${task.sequence}）` : ''}`)}${field('计划时间', task.plannedAt || task.date)}${field('执行窗口', task.window)}${field('当前状态', stateLabel(task))}${field('采集方式', task.method)}${field('表单', task.formName)}${field('填写方式', task.fillMode)}${field('任务包进度', children.length ? `${children.filter(child => child.state === 'done').length} / ${children.length} 已完成` : '—')}${field('基准日期', parent?.config?.date || task.config?.date || task.date)}</div>${field('所属任务包', parent?.packageId || task.packageId)}</section>`;
      extra = '<button type="button" data-drawer-result>查看执行结果</button>';
    } else {
      title = !task ? '新增跟进任务' : canHandle ? '处理跟进任务' : '跟进详情';
      content = !task ? `<label>跟进内容<textarea name="content" required maxlength="1000" placeholder="请输入需要跟进的事项"></textarea></label><label>计划跟进日期<input name="date" type="date" required value="${today}"></label><label>关联访视<select name="visit"><option value="">不关联访视</option>${[...new Set(tasks.map(item => item.visit).filter(Boolean))].map(value => `<option>${esc(value)}</option>`).join('')}</select></label>` : `${field('跟进内容', task.name)}${field('关联访视', task.visit)}${field('计划跟进时间', task.date)}${field('当前状态', stateLabel(task))}${canHandle ? `<label>跟进记录<textarea name="note" required maxlength="2000" placeholder="请输入跟进情况和处理结果">${esc(task.note)}</textarea></label>` : field('处理记录', task.noProcessReason || task.note)}${task.processedAt ? field('处理时间', task.processedAt) : ''}`;
      if (canHandle) extra = '<button type="button" data-drawer-ignore>无需处理</button>';
      if (canHandle || !task) submit = task ? '完成跟进' : '保存跟进任务';
    }
    if (returnTask) extra += '<button type="button" data-drawer-back>返回执行任务</button>';
    drawer.classList.toggle('is-wide', ['issue', 'package', 'view'].includes(mode));
    drawer.innerHTML = `<form><header><div><h2 id="participant-task-drawer-title">${esc(title)}</h2><p>${esc(participantName)}（${esc(participantId)}）</p></div><button type="button" data-drawer-close aria-label="关闭任务抽屉">×</button></header><div class="participant-task-drawer-body">${content}<p class="participant-task-validation" role="alert" hidden></p></div><footer><button type="button" data-drawer-close>${submit ? '取消' : '关闭'}</button>${extra}${submit ? `<button class="primary" type="submit">${submit}</button>` : ''}</footer></form>`;
    if (drawer.querySelector('[data-issue-preview]')) renderPreview();
    if (!drawer.open) drawer.showModal();
    drawer.querySelector('.participant-task-drawer-body').scrollTop = 0;
    (mode === 'ignore' ? drawer.querySelector('[name="reason"]') : drawer.querySelector('[data-drawer-close]')).focus();
  }
  function saveSchedule() {
    const form = drawer.querySelector('form');
    if (!form.reportValidity()) return false;
    if (visitScope) activeTask.visitId = visitScope.id;
    activeTask.config = { ...activeTask.config, ...schedule, times: [...schedule.times] };
    activeTask.date = schedule.date;
    activeTask.window = scheduleWindow(schedule);
    return true;
  }
  drawer.addEventListener('click', event => {
    if (event.target.closest('[data-drawer-close]')) close();
    if (event.target.closest('[data-drawer-ignore]')) open(activeTask, opener, 'ignore');
    if (event.target.closest('[data-drawer-save]') && drawerMode === 'issue' && activeTask?.state === 'draft' && saveSchedule()) { persist('执行计划已保存，任务暂未发放。'); close(); }
    if (event.target.closest('[data-drawer-result]')) open(activeTask, opener, 'result');
    if (event.target.closest('[data-drawer-view]')) open(activeTask, opener, 'view');
    if (event.target.closest('[data-drawer-back]')) open(returnTask, opener, 'view');
    if (event.target.closest('[data-drawer-package]')) open(tasks.find(item => item.key === activeTask.parentKey && item.kind === 'draft') || activeTask, opener, 'package', activeTask);
  });
  drawer.addEventListener('input', event => {
    if (event.target.name === 'reason') {
      event.target.setCustomValidity('');
      drawer.querySelector('[data-reason-count]').textContent = event.target.value.length;
    }
    if (drawerMode !== 'issue') return;
    if (event.target.name === 'baselineDate') { schedule.date = event.target.value; renderPreview(); }
    if (event.target.hasAttribute('data-issue-time')) {
      const index = Number(event.target.dataset.issueTime);
      schedule.times[index] = event.target.value;
      // 保持时间输入的焦点，同时更新同一时段的所有子任务及窗口。
      drawer.querySelectorAll('[data-issue-preview] tr').forEach((row, rowIndex) => {
        if (Math.floor(rowIndex / (activeTask.children.length || 1)) === index) {
          if (!row.cells[2].querySelector('input')) row.cells[2].textContent = schedule.times[index];
          row.cells[3].textContent = scheduleWindow(schedule, schedule.times[index]);
        }
      });
    }
  });
  drawer.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (drawerMode === 'follow' && !activeTask) {
      if (!String(data.get('content')).trim()) return;
      tasks.push({ key: `local-follow-${Date.now()}`, local: true, kind: 'follow', name: String(data.get('content')).trim(), date: data.get('date'), visit: data.get('visit'), state: 'pending', children: [], note: '', window: '—' });
      select('follow', 'pending'); persist('跟进任务已添加。'); close(); return;
    }
    if (!activeTask || !actionable(activeTask)) return;
    if (drawerMode === 'ignore') {
      const reason = String(data.get('reason') || '').trim();
      if (!reason) { const input = form.elements.reason; input.setCustomValidity('请填写无需处理原因'); input.reportValidity(); return; }
      activeTask.state = 'none'; activeTask.noProcessReason = reason; activeTask.processedAt = stamp();
      persist('任务已标记为无需处理。');
    } else if (drawerMode === 'issue' && activeTask.kind === 'draft') {
      if (!saveSchedule()) return;
      activeTask.packageId ||= `PKG-${participantId}-${activeTask.key}`;
      schedule.times.forEach((time, timeIndex) => activeTask.children.forEach((name, childIndex) => tasks.push({ key: `local-${activeTask.key}-${timeIndex}-${childIndex}`, local: true, kind: 'execute', name,
        visit: activeTask.visit, visitId: visitScope?.id || activeTask.visitId || '', date: schedule.date, plannedAt: `${schedule.date} ${time}`, window: scheduleWindow(schedule, time), state: 'pending',
        relativeDay: '访视当日', sequence: `第${timeIndex + 1}次`, parentKey: activeTask.key, packageId: activeTask.packageId,
        method: activeTask.method, executionType: activeTask.executionType, formName: name, canCaseExecute: activeTask.canCaseExecute, fillMode: activeTask.fillMode,
        config: { ...activeTask.config }, children: [], note: '', result: '' })));
      activeTask.state = 'issued'; activeTask.processedAt = stamp();
      persist(`已发放，生成 ${packageChildren(activeTask).length} 条子执行任务。`, true);
    } else if (drawerMode === 'execute' && activeTask.kind === 'execute' && activeTask.canCaseExecute !== false) {
      const note = String(data.get('note') || '').trim();
      const file = data.get('file');
      activeTask.result = activeTask.executionType === 'upload' ? `已上传文件：${file.name}${note ? `；${note}` : ''}` : `是否出现相关症状：${data.get('symptom')}；严重程度：${data.get('severity')}${note ? `；补充说明：${note}` : ''}`;
      activeTask.state = 'done'; activeTask.completedAt = stamp(); activeTask.processedAt = activeTask.completedAt; activeTask.operator = '个案管理师';
      persist('任务提交成功，状态已更新为已完成。');
    } else if (drawerMode === 'follow' && activeTask.kind === 'follow') {
      const note = String(data.get('note') || '').trim();
      if (!note) { const error = drawer.querySelector('.participant-task-validation'); error.hidden = false; error.textContent = '请填写处理记录。'; return; }
      activeTask.state = 'done'; activeTask.note = note; activeTask.processedAt = stamp();
      persist('跟进已完成。');
    } else return;
    close();
  });
  container.addEventListener('click', event => {
    const categoryButton = event.target.closest('[data-task-category]');
    const scopeButton = event.target.closest('[data-task-scope]');
    const action = event.target.closest('[data-task-open]');
    if (categoryButton) select(categoryButton.dataset.taskCategory);
    if (scopeButton) { scope = scopeButton.dataset.taskScope; container.querySelector('.participant-task-notice').hidden = true; remember(); render(); }
    if (action) open(tasks.find(task => task.key === action.dataset.taskOpen), action);
    const taskAction = event.target.closest('[data-task-action]');
    if (taskAction) handleAction(taskAction);
    const more = event.target.closest('[data-task-more]');
    if (more) {
      const wasOpen = !menu.hidden && menuOpener === more;
      closeMenu();
      if (!wasOpen) {
        const task = tasks.find(item => item.key === more.dataset.taskMore);
        menu.innerHTML = ['view', 'ignore', 'contact'].map((value, index) => actionButton(task, value, ['查看任务', '无需处理', '联系参与者'][index])).join('');
        menu.querySelectorAll('button').forEach(button => button.setAttribute('role', 'menuitem'));
        menuOpener = more; more.setAttribute('aria-expanded', 'true'); menu.hidden = false;
        positionMenu();
        menu.querySelector('button').focus({ preventScroll: true });
      }
    }
    if (event.target.closest('[data-task-add]')) open(null, event.target);
    if (event.target.closest('[data-task-reset]')) { selectedVisit = null; visit = ''; query = ''; rememberVisit(); container.querySelector('[data-task-search]').value = ''; render(); }
  });
  function handleAction(button) {
    const task = tasks.find(item => item.key === button.dataset.taskKey);
    if (!task || !inScope(task)) return;
    const trigger = menu.contains(button) ? menuOpener : button;
    closeMenu();
    const action = button.dataset.taskAction;
    if (action === 'contact') notify(`正在联系${participantName}`);
    else if (action === 'remind') notify(`已向${participantName}发送任务提醒`);
    else if (action === 'issue' && task.kind === 'draft' && task.state === 'draft') open(task, trigger, 'issue');
    else if (action === 'execute' && task.kind === 'execute' && actionable(task) && task.canCaseExecute !== false) open(task, trigger, 'execute');
    else if (action === 'ignore' && actionable(task)) open(task, trigger, 'ignore');
    else if (action === 'record' && task.state === 'none') open(task, trigger, 'record');
    else if (action === 'view') open(task, trigger, 'view');
  }
  menu.addEventListener('click', event => { const button = event.target.closest('[data-task-action]'); if (button) handleAction(button); });
  document.addEventListener('click', event => { if (!menu.hidden && !menu.contains(event.target) && event.target !== menuOpener) closeMenu(); }, { signal: lifetime.signal });
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); menuOpener?.focus(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const buttons = [...menu.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
    if (event.key === 'Tab') closeMenu();
  }, { signal: lifetime.signal });
  document.addEventListener('scroll', positionMenu, { capture: true, signal: lifetime.signal });
  window.addEventListener('resize', closeMenu, { signal: lifetime.signal });
  container.querySelector('[data-task-visit]').addEventListener('change', event => { visit = event.target.value; if (visit !== `visit:${selectedVisit?.id}`) selectedVisit = null; rememberVisit(); render(); });
  container.querySelector('[data-task-search]').addEventListener('input', event => { query = event.target.value.trim().toLowerCase(); render(); });
  container.addEventListener('keydown', event => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...tab.parentElement.querySelectorAll('button')];
    const index = buttons.indexOf(tab);
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    const attribute = tab.hasAttribute('data-task-category') ? 'data-task-category' : 'data-task-scope';
    const value = buttons[target].getAttribute(attribute);
    buttons[target].click(); container.querySelector(`[${attribute}="${value}"]`).focus();
  });
  const directory = !visitScope && params.get('visitId') ? window.clinicalParticipantDirectory?.create() : null;
  const initialVisit = directory && window.clinicalVisitStore.directoryVisits(directory).find(record => record.projectId === project && record.participantId === participantId && record.id === params.get('visitId'));
  if (initialVisit) filterVisit(initialVisit); else render();
  return { select, filterVisit, getTasks: () => tasks.filter(inScope), destroy: () => { lifetime.abort(); drawer.close(); drawer.remove(); menu.remove(); }, count: key => tasks.filter(task => inScope(task) && task.kind === 'execute' && (key === 'overdue' ? isOverdue(task) : task.state === 'pending')).length };
};
