(() => {
  const panel = document.querySelector('main.page > .panel');
  const tabs = panel?.querySelector(':scope > .tabs');
  if (!panel || !tabs) return;

  const params = new URLSearchParams(location.search);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const personText = document.getElementById('person-name')?.textContent || '';
  const participantId = params.get('id') || personText.match(/（([^）]+)）/)?.[1] || 'S001';
  const participantName = params.get('name') || personText.split('（')[0] || '参与者';
  const participantStatus = params.get('status') || document.getElementById('person-status')?.textContent || '已入组';

  const crfView = document.getElementById('data-entry-workspace');
  document.getElementById('visit-one-workspace')?.remove();
  if (crfView) crfView.setAttribute('aria-label', '研究数据（CRF）');

  const taskView = document.createElement('section');
  taskView.id = 'participant-task-view';
  taskView.className = 'participant-detail-view participant-task-view';
  taskView.hidden = true;
  taskView.setAttribute('aria-label', '访视任务');

  const journeyView = document.createElement('section');
  journeyView.id = 'participant-journey-view';
  journeyView.className = 'participant-detail-view participant-journey-view';
  journeyView.hidden = true;
  journeyView.setAttribute('aria-label', '访视历程');

  panel.append(taskView, journeyView);

  const taskController = window.createParticipantTasks({ container: taskView, participantId, participantName, params });
  const store = window.clinicalVisitStore;
  const directory = window.clinicalParticipantDirectory.create();
  const today = params.get('referenceDate') || directory.source.today;
  const boundProtocol = window.visitProtocols.get(params.get('project') || 'CT-2026-001', window.visitProtocols.bind(params.get('project'), participantId));
  const visitOrder = name => { const normalize = value => value.replace(/[\s（）()]/g,''); const index = (boundProtocol?.visits || []).findIndex(value => normalize(value) === normalize(name)); return index < 0 ? 999 : index; };
  const journeys = store.directoryVisits(directory, today)
    .filter(visit => visit.projectId === (params.get('project') || 'CT-2026-001') && visit.participantId === participantId)
    .sort((a, b) => visitOrder(a.name) - visitOrder(b.name) || a.plannedDate.localeCompare(b.plannedDate));
  let journeyState = '';
  let journeyStart = '';
  let journeyEnd = '';
  let journeyExpanded = false;
  journeyView.innerHTML = `
    <div class="participant-detail-toolbar"><select data-journey-state aria-label="访视状态"><option value="">全部访视状态</option>${Object.entries(store.statusLabels).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select><input type="date" data-journey-start aria-label="访视开始日期"><span>至</span><input type="date" data-journey-end aria-label="访视结束日期"><button type="button" data-journey-reset>重置</button><span class="participant-detail-count" data-journey-count></span></div>
    <ol class="participant-visit-timeline" data-journey-rows aria-label="访视流程时间轴"></ol>`;
  const journeyStateClass = state => state === 'completed' ? 'done' : state === 'terminated' ? 'terminated' : state === 'activated' ? 'active' : 'inactive';
  function renderJourneys() {
    const invalid = journeyStart && journeyEnd && journeyStart > journeyEnd;
    const matched = journeys.map(visit => store.apply(visit)).filter(visit => !invalid && (!journeyState || store.status(visit) === journeyState) && (!journeyStart || visit.plannedDate >= journeyStart) && (!journeyEnd || visit.plannedDate <= journeyEnd));
    journeyView.querySelector('[data-journey-count]').textContent = invalid ? '请调整日期范围' : `共 ${matched.length} 次访视`;
    journeyView.querySelector('[data-journey-rows]').innerHTML = matched.length ? matched.map(visit => {
      const state = store.status(visit), inactive = state === 'inactive';
      const period = inactive || state === 'completed' || state === 'terminated' ? '' : store.windowStatus(visit,today);
      const count = taskController.getTasks().filter(task => window.participantTaskBelongsToVisit(task,visit)).length;
      const appointment = visit.appointmentDate || (store.appointmentStatus(visit) === 'cancelled' ? '取消预约' : '未预约');
      return `<li class="visit-timeline-node ${journeyStateClass(state)}"><div class="visit-timeline-date"><span>${inactive?'预计日期':'计划日期'}</span><strong>${escape(visit.plannedDate)}</strong></div><span class="visit-timeline-dot" aria-hidden="true">${state==='completed'?'✓':''}</span><article class="visit-timeline-card"><header><div class="visit-timeline-title"><h3>${escape(visit.name)}</h3><span class="protocol-tag">${escape(visit.protocolVersion)}</span></div><span class="participant-journey-state ${journeyStateClass(state)}">${escape(store.statusLabels[state])}</span></header><div class="visit-timeline-window"><span>${inactive?'预计窗口':'访视窗口'}：${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}</span>${period?`<span class="participant-journey-window ${period}">${{upcoming:'未到窗口',window:'窗口期内',overdue:'已超窗'}[period]}</span>`:''}</div><dl><div><dt>预约日期</dt><dd>${escape(inactive?'—':appointment)}</dd></div><div><dt>实际访视日期</dt><dd>${escape(inactive?'—':visit.actualDate||'未记录')}</dd></div><div><dt>关联任务</dt><dd>${count?`<button class="participant-detail-action" type="button" data-journey-tasks="${escape(visit.id)}" aria-label="查看${escape(visit.name)}的${count}条关联任务">${count} 条任务 ›</button>`:'0 条任务'}</dd></div><div><dt>CRF进度</dt><dd>${escape(inactive?'—':visit.dataProgress||'—')}</dd></div></dl></article></li>`;
    }).join('') : `<li class="participant-detail-empty">${invalid?'开始日期不能晚于结束日期':'暂无匹配访视'}</li>`;
  }
  journeyView.addEventListener('click', event => {
    const taskLink = event.target.closest('[data-journey-tasks]');
    if (taskLink) {
      const visit = journeys.find(visit => visit.id === taskLink.dataset.journeyTasks);
      if (visit) { taskController.filterVisit(visit); activate('tasks'); }
    }
    if (event.target.closest('[data-journey-more]') && !['研究结束', '筛选失败'].includes(participantStatus)) { journeyExpanded = !journeyExpanded; renderJourneys(); }
    if (event.target.closest('[data-journey-reset]')) {
      journeyState = ''; journeyStart = ''; journeyEnd = ''; journeyExpanded = false;
      journeyView.querySelector('[data-journey-state]').value = '';
      journeyView.querySelector('[data-journey-start]').value = '';
      journeyView.querySelector('[data-journey-end]').value = '';
      renderJourneys();
    }
  });
  journeyView.querySelector('[data-journey-state]').addEventListener('change', event => { journeyState = event.target.value; renderJourneys(); });
  journeyView.querySelector('[data-journey-start]').addEventListener('change', event => { journeyStart = event.target.value; renderJourneys(); });
  journeyView.querySelector('[data-journey-end]').addEventListener('change', event => { journeyEnd = event.target.value; renderJourneys(); });
  renderJourneys();

  const definitions = [
    { key: 'crf', label: '研究数据（CRF）', view: crfView, url: 'data-entry' },
    { key: 'tasks', label: '访视任务', view: taskView, url: 'participant-tasks' },
    { key: 'journey', label: '访视历程', view: journeyView, url: 'participant-visits' }
  ].filter(item => item.view);
  tabs.className = 'tabs participant-detail-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '参与者详情模块');
  tabs.innerHTML = definitions.map((item, index) => `<button class="tab" type="button" role="tab" data-participant-detail-tab="${item.key}" aria-selected="${index === 0}">${item.label}</button>`).join('');

  const moduleHeading = document.createElement('header');
  moduleHeading.className = 'participant-module-heading';
  const moduleTitle = document.createElement('h2');
  moduleHeading.append(moduleTitle);
  panel.prepend(moduleHeading);

  function activate(key, updateURL = true) {
    const target = definitions.find(item => item.key === key) || definitions[0];
    moduleTitle.textContent = target.label;
    [...panel.children].forEach(child => { if (child !== tabs && child !== moduleHeading) child.hidden = child !== target.view; });
    tabs.querySelectorAll('[data-participant-detail-tab]').forEach(button => {
      const active = button.dataset.participantDetailTab === target.key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (target.key === 'journey') renderJourneys();
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.set('tab', target.url);
      history.replaceState(null, '', url);
    }
  }
  function setupParticipantHeader() {
    const topbar = document.querySelector('main.page > .topbar');
    const summary = document.querySelector('main.page > .summary');
    const info = summary?.firstElementChild;
    const back = topbar?.querySelector('.back');
    const actions = topbar?.querySelector('.top-actions');
    if (!topbar || !summary || !info || !back || !actions) return;
    const originalMeta = info.querySelector('.meta');
    const studyName = directory.projectCatalog[params.get('project')] || '未分配项目';
    const enrollmentDate = [...(originalMeta?.querySelectorAll('b') || [])][1]?.textContent.trim() || '—';
    const backImage = back.querySelector('img')?.cloneNode(true);
    back.className = 'participant-header-back';
    back.setAttribute('aria-label', '返回参与者列表');
    back.title = '返回参与者列表';
    back.href='participants.html?'+new URLSearchParams({project:params.get('project')||'CT-2026-001',view:'participants'});
    back.replaceChildren(backImage || document.createTextNode('‹'));

    info.className = 'participant-header-info';
    const personMain = info.querySelector('.person-main');
    const maskedName = /[*＊]/.test(participantName) ? participantName : [...participantName][0] + '*'.repeat(Math.max(1, [...participantName].length - 1));
    const surnameInitial = { 张: 'Z', 李: 'L', 王: 'W', 赵: 'Z', 陈: 'C', 周: 'Z', 刘: 'L', 孙: 'S', 吴: 'W', 林: 'L', 陶: 'T', 钱: 'Q' }[participantName[0]];
    const initials = params.get('initials') || (/^[A-Za-z]+$/.test(participantName) ? participantName.toUpperCase() : surnameInitial ? surnameInitial + 'X'.repeat([...maskedName].length - 1) : '—');
    const sexAge = info.querySelector('.sex-age')?.textContent || '—';
    info.innerHTML = `<div class="participant-profile-identity"><span class="participant-profile-avatar" aria-hidden="true">${escape(maskedName[0])}</span><div><h1 class="person-name" id="person-name">${escape(maskedName)}<small>（${escape(initials)}）</small></h1><span class="participant-profile-demographics"><span class="sex-age">${escape(sexAge)}</span><span aria-hidden="true"> / </span><span class="participant-profile-id" aria-label="参与者编号 ${escape(participantId)}">${escape(participantId)}</span></span></div></div><span class="status" id="person-status">${escape(participantStatus)}</span><dl class="participant-profile-fields"><div class="profile-project"><dt>参与项目</dt><dd>${escape(studyName)}</dd></div><div><dt>入组日期</dt><dd>${escape(enrollmentDate)}</dd></div><div><dt>访视版本</dt><dd><span class="participant-profile-version">${escape(window.visitProtocols.bind(params.get('project'), participantId))}</span></dd></div></dl>`;
    actions.classList.add('participant-header-actions');
    actions.querySelector('#open-plan')?.remove();
    const contact = document.createElement('button');
    contact.type = 'button';
    contact.className = 'top-btn';
    contact.textContent = '联系患者';
    const contactNotice = document.createElement('div');
    contactNotice.className = 'participant-contact-notice';
    contactNotice.setAttribute('role', 'status');
    contactNotice.hidden = true;
    document.body.append(contactNotice);
    let contactTimer;
    contact.addEventListener('click', () => {
      contactNotice.textContent = `正在联系${maskedName}`;
      contactNotice.hidden = false;
      clearTimeout(contactTimer);
      contactTimer = setTimeout(() => { contactNotice.hidden = true; }, 3000);
    });
    actions.prepend(contact);
    const main = document.createElement('div');
    main.className = 'participant-header-main';
    main.append(info, actions);
    summary.className = 'summary participant-header';
    summary.replaceChildren(main);
    topbar.remove();
    const sidebar = document.createElement('aside');
    sidebar.className = 'participant-profile-sidebar';
    sidebar.setAttribute('aria-label','参与者信息与模块导航');
    summary.before(sidebar);
    sidebar.append(summary,tabs);
    tabs.setAttribute('aria-orientation','vertical');
    document.querySelector('main.page').classList.add('participant-profile-layout');
  }
  tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-participant-detail-tab]');
    if (button) activate(button.dataset.participantDetailTab);
  });
  tabs.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...tabs.querySelectorAll('[data-participant-detail-tab]')];
    const current = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    activate(buttons[next].dataset.participantDetailTab);
  });

  const requested = params.get('tab');
  const initial = requested === 'participant-tasks' ? 'tasks'
      : requested === 'participant-visits' ? 'journey' : 'crf';
  setupParticipantHeader();
  activate(initial, false);
})();
