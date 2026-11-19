(() => {
  const panel = document.querySelector('main.page > .panel');
  const tabs = panel?.querySelector(':scope > .tabs');
  if (!panel || !tabs) return;

  const params = new URLSearchParams(location.search);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const personText = document.getElementById('person-name')?.textContent || '';
  const participantId = params.get('id') || personText.match(/（([^）]+)）/)?.[1] || 'S001';
  const participantName = window.demoParticipantIdentity.name(participantId, params.get('name') || personText.split('（')[0] || '参与者');
  const participantStatus = params.get('status') || document.getElementById('person-status')?.textContent || '已入组';

  params.set('project', params.get('project') || 'CT-2026-001');
  const crfView = document.getElementById('data-entry-workspace');
  document.getElementById('visit-one-workspace')?.remove();
  if (crfView) crfView.setAttribute('aria-label', '访视数据（CRF）');

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

  let allTasksController;
  taskView.classList.add('profile-task-management', 'profile-flat-task-management');
  function renderAllTaskManagement() {
    allTasksController?.destroy();
    const allParams = new URLSearchParams(params); allParams.delete('visitId');
    allTasksController = window.createParticipantTasks({container:taskView,participantId,participantName,params:allParams,compact:true});
    allTasksController.select('execute','all');
  }
  const store = window.clinicalVisitStore;
  const directory = window.clinicalParticipantDirectory.create();
  const today = params.get('referenceDate') || directory.source.today;
  const boundProtocol = window.visitProtocols.get(params.get('project') || 'CT-2026-001', window.visitProtocols.bind(params.get('project'), participantId));
  const displayVisitNames = store.overviewNames(params.get('project'),participantId) || boundProtocol?.visits || [];
  const visitOrder = name => { const normalize = value => value.match(/C\d+D\d+/i)?.[0]?.toUpperCase() || (/筛选/.test(value)?'screen':value.replace(/[\s（）()]/g,'')); const index = displayVisitNames.findIndex(value => normalize(value) === normalize(name)); return index < 0 ? 999 : index; };
  const journeys = store.directoryVisits(directory, today)
    .filter(visit => visit.projectId === (params.get('project') || 'CT-2026-001') && visit.participantId === participantId)
    .sort((a, b) => visitOrder(a.name) - visitOrder(b.name) || a.plannedDate.localeCompare(b.plannedDate));
  let selectedVisitId = journeys.find(v => v.id === params.get('visitId') || v.aliasVisitIds?.includes(params.get('visitId')))?.id || journeys.find(v => ['activated', 'partial'].includes(store.status(v)))?.id || journeys[0]?.id;
  let scopedController, followController;
  let crfCollectionFilter = '', crfEntryFilter = '', crfQuery = '';
  let crfPage = 1;
  const crfPageSize = 5;
  let visitTaskView = 'collection';
  journeyView.className = 'participant-detail-view participant-overview';
  journeyView.setAttribute('aria-label', '访视总览');
  journeyView.innerHTML = `<aside class="profile-cycle-nav"><div class="profile-section-heading"><h3>访视周期</h3><span>${journeys.length} 次</span></div><div data-profile-cycles></div></aside>
    <div class="profile-visit-content"><section class="profile-info-section profile-visit-card"><div class="profile-card-heading"><h3>基本信息</h3></div><div class="profile-info-body" data-profile-summary></div></section>
      <section class="profile-crf-section profile-visit-card"><div class="profile-card-heading"><h3>访视数据</h3><span data-profile-crf-count hidden></span>
        </div><div class="profile-crf-filters" role="group" aria-label="CRF表单筛选"><select data-crf-collection aria-label="采集进度"><option value="">采集进度</option><option value="pending">待完成</option><option value="done">已完成</option><option value="inactive">未开始</option></select><select data-crf-entry aria-label="录入状态"><option value="">录入状态</option><option value="pending">未完成</option><option value="done">已完成</option></select><input type="search" data-crf-search aria-label="搜索表单名称" placeholder="搜索表单名称"><button type="button" data-crf-reset>重置</button></div>
        <div class="profile-crf-table-wrap"><table class="profile-crf-table"><thead><tr><th>CRF 表单</th><th>采集进度</th><th>录入状态</th><th>操作</th></tr></thead><tbody data-profile-crf-rows></tbody></table></div><nav class="directory-pagination profile-crf-pagination" aria-label="CRF列表分页" data-crf-pagination></nav>
      </section>
      <section class="profile-task-management profile-visit-card"><div class="profile-card-heading"><h3>任务管理</h3><div class="profile-task-switch" role="tablist" aria-label="任务管理类型"><button type="button" id="profile-collection-tab" role="tab" data-profile-task-view="collection" aria-selected="true" aria-controls="profile-collection-panel">采集任务 <span data-profile-task-count></span></button><button type="button" id="profile-followup-tab" role="tab" data-profile-task-view="followup" aria-selected="false" aria-controls="profile-followup-panel" tabindex="-1">跟进任务 <span data-profile-follow-count></span></button></div></div>
        <div id="profile-collection-panel" role="tabpanel" aria-labelledby="profile-collection-tab" data-profile-task-panel="collection"><div data-profile-tasks></div></div>
        <div id="profile-followup-panel" class="profile-followups" role="tabpanel" aria-labelledby="profile-followup-tab" data-profile-task-panel="followup" hidden><div data-profile-follows></div></div>
      </section>
    </div>`;
  const cycleNav = journeyView.querySelector('[data-profile-cycles]');
  const visitContent = journeyView.querySelector('.profile-visit-content');
  function scrollToVisitSection(selector) {
    const target=visitContent.querySelector(selector);
    visitContent.scrollTo({top:Math.max(0,visitContent.scrollTop+target.getBoundingClientRect().top-visitContent.getBoundingClientRect().top-16),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function relatedTasks(visit) {
    return window.loadParticipantTasks(params.get('project'), participantId).filter(task => window.participantTaskBelongsToVisit(task, visit));
  }
  const normalizeCycle = name => String(name || '').match(/C\d+D\d+/i)?.[0]?.toUpperCase() || (/筛选/.test(name) ? 'screen' : String(name).replace(/[\s（）()]/g, ''));
  function crfCycle(visit) {
    const index = (window.participantCrfCatalog?.visits || []).findIndex(group => normalizeCycle(group[0]) === normalizeCycle(visit.name));
    return index >= 0 ? index : Number.isInteger(visit.visitIndex) ? visit.visitIndex : 0;
  }
  function visitCrfs(visit) {
    const cycle = crfCycle(visit), catalog = window.participantCrfCatalog;
    const names = catalog?.visits[cycle]?.[1].map(row => row[0]) || store.executionItems(visit);
    const online = relatedTasks(visit).filter(task => task.kind === 'execute');
    return names.map(name => {
      const record = catalog?.read(cycle, name) || {};
      const linked = online.filter(task => [task.formName, task.name].some(value => String(value || '').replace(/表单|表|\s/g, '') === name.replace(/表单|表|\s/g, '')));
      const done = store.status(visit) === 'completed' || (visit.completedItems || []).includes(name) || record.state === '已完成' || linked.some(task => task.state === 'done');
      const filled = (record.values || []).slice(0, 4).filter(value => value != null && String(value).trim() !== '').length;
      const entryProgress = record.state === '已完成' ? 100 : Math.round(filled / 4 * 100);
      return {name, cycle, done, record, linked, entryProgress, dataState: record.state || ((record.values || []).some(Boolean) ? '草稿' : '待录入')};
    });
  }
  function renderCycleNav() {
    cycleNav.innerHTML = journeys.map(original => {
      const visit = store.apply(original), state = store.status(visit), crfs = visitCrfs(visit);
      const completed = crfs.filter(crf=>crf.done).length;
      const associated = relatedTasks(visit);
      const processed = associated.filter(task => task.kind==='draft' ? ['issued','none'].includes(task.state) : ['done','none'].includes(task.state)).length;
      return `<button type="button" class="profile-cycle" data-profile-cycle="${escape(visit.id)}" aria-pressed="${selectedVisitId === visit.id}">
        <span class="profile-cycle-top"><span class="profile-status ${state}">${store.statusLabels[state]}</span><span>${escape(visit.plannedDate.slice(5).replace('-', '/'))}</span></span>
        <strong>${escape(visit.name)}</strong><small class="profile-cycle-progress"><span>CRF ${completed}/${crfs.length}</span><span>关联任务 ${processed}/${associated.length}</span></small>
      </button>`;
    }).join('');
  }
  function resetCrfFilters(){
    crfCollectionFilter='';crfEntryFilter='';crfQuery='';crfPage=1;
    journeyView.querySelector('[data-crf-collection]').value='';
    journeyView.querySelector('[data-crf-entry]').value='';
    journeyView.querySelector('[data-crf-search]').value='';
  }
  journeyView.querySelector('.profile-crf-filters').addEventListener('change',event=>{
    if(event.target.matches('[data-crf-collection]'))crfCollectionFilter=event.target.value;
    if(event.target.matches('[data-crf-entry]'))crfEntryFilter=event.target.value;
    crfPage=1;renderCrfRows();
  });
  journeyView.querySelector('[data-crf-search]').addEventListener('input',event=>{crfQuery=event.target.value.trim().toLowerCase();crfPage=1;renderCrfRows();});
  function collectionDetails(visit,crf){
    const details=[];
    if(visit.appointmentDate)details.push(['预约时间',visit.appointmentDate]);
    const handling=visit.partialHandling;
    if(!crf.done&&handling&&(!visit.incompleteItems?.length||visit.incompleteItems.includes(crf.name))){
      if(handling.type==='execute'){details.push(['后续执行',handling.nextPlannedAt||visit.nextExecutionAt||'']);if(handling.reason)details.push(['原因',handling.reason]);}
      else if(handling.type==='followup'){details.push(['持续跟进',handling.followupAt||'']);if(handling.content)details.push(['跟进内容',handling.content]);}
      else if(handling.type==='none'){details.push(['无需处理',handling.reason||'']);}
    }
    if(!crf.done&&visit.appointmentWaiver)details.push(['预约无需处理',visit.appointmentWaiver.reason||'']);
    return details.length?`<div class="profile-collection-details">${details.map(([label,value])=>`<div><span>${label}：</span><span>${escape(String(value).replace('T',' '))}</span></div>`).join('')}</div>`:'';
  }
  function renderCrfRows() {
    const original = journeys.find(v=>v.id===selectedVisitId);
    if (!original) return;
    const visit = store.apply(original), crfs = visitCrfs(visit), ongoing = ['activated','partial'].includes(store.status(visit));
    journeyView.querySelector('[data-profile-crf-count]').textContent = `共 ${crfs.length} 项`;
    // Reserve the tallest CRF tab, capped at one five-row page.
    journeyView.querySelector('.profile-crf-section').style.setProperty('--profile-list-body-height', `${Math.max(180, Math.min(5, crfs.length) * 51)}px`);
    const filtered=crfs.filter(crf=>{
      const collection=crf.done?'done':store.status(visit)==='inactive'?'inactive':'pending';
      const entry=crf.record.state==='已完成'?'done':'pending';
      return (!crfCollectionFilter||collection===crfCollectionFilter)&&(!crfEntryFilter||entry===crfEntryFilter)&&(!crfQuery||crf.name.toLowerCase().includes(crfQuery));
    });
    const pages = Math.max(1, Math.ceil(filtered.length / crfPageSize));
    crfPage = Math.min(crfPage, pages);
    const rows = filtered.slice((crfPage - 1) * crfPageSize, crfPage * crfPageSize);
    journeyView.querySelector('[data-crf-pagination]').innerHTML = `<span class="directory-page-total" aria-live="polite">共 ${filtered.length} 条</span><span class="profile-fixed-page-size">5 条/页</span><div class="directory-page-buttons"><button type="button" data-crf-page="${crfPage-1}" aria-label="CRF上一页" ${crfPage===1?'disabled':''}>‹</button>${Array.from({length:pages},(_,i)=>`<button type="button" data-crf-page="${i+1}" ${i+1===crfPage?'aria-current="page"':''}>${i+1}</button>`).join('')}<button type="button" data-crf-page="${crfPage+1}" aria-label="CRF下一页" ${crfPage===pages?'disabled':''}>›</button></div>`;
    journeyView.querySelector('[data-profile-crf-rows]').innerHTML=rows.map(crf=>`<tr><td>${escape(crf.name)}</td><td><span class="profile-crf-state ${crf.done?'is-done':''}">${crf.done?'已完成':store.status(visit)==='inactive'?'未开始':'待完成'}</span>${collectionDetails(visit,crf)}</td><td><span class="profile-crf-state ${crf.record.state==='已完成'?'is-done':''}">${crf.record.state==='已完成'?'已完成':'未完成'}</span></td><td><div class="profile-row-actions"><button type="button" data-profile-crf="${escape(crf.name)}">录入数据</button></div></td></tr>`).join('')||'<tr><td colspan="4" class="profile-empty"><div class="profile-list-empty"><img src="shared-assets/empty-list.png" width="174" height="133" alt=""><span>暂无匹配的 CRF 表单</span></div></td></tr>';
  }
  function progressRing(target,label,done,total){
    const percentage=total?Math.round(done/total*100):0;
    return `<button type="button" class="profile-progress-summary" data-profile-scroll="${target}" aria-label="${label}：已完成 ${done} / ${total}，查看${target==='tasks'?'任务管理':'访视数据'}"><div class="profile-completion-ring" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}" aria-valuetext="已完成 ${done} / ${total}"><img src="figma-participant-assets/visit-progress-track.svg" width="93" height="93" alt=""><svg viewBox="0 0 93 93" aria-hidden="true"><circle cx="46.5" cy="46.5" r="42.5" fill="none" stroke="var(--brand-primary)" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="${percentage} 100" transform="rotate(-90 46.5 46.5)"${done?'':' visibility="hidden"'}/></svg><div><strong>${done}<small> / ${total}</small></strong><span>${label}</span></div></div></button>`;
  }
  function renderVisitSummary() {
    const original = journeys.find(v => v.id === selectedVisitId);
    if (!original) {journeyView.querySelector('[data-profile-summary]').innerHTML = '<p class="profile-empty">暂无访视周期</p>';return;}
    const visit = store.apply(original), state = store.status(visit), ongoing = ['activated','partial'].includes(state);
    const crfs = visitCrfs(visit), completed=crfs.filter(crf=>crf.record.state==='已完成').length;
    const tasks=relatedTasks(visit),executionTasks=tasks.filter(task=>task.kind==='execute'),executed=executionTasks.filter(task=>task.state==='done').length;
    const period=store.windowStatus(visit,today), days=window.workbenchTaskPolicy.dayDifference(visit.windowEnd,today);
    const periodLabel={upcoming:'未到窗口',window:'窗口期内',overdue:`已超窗 ${days} 天`}[period];
    const action=(key,label,primary=false)=>`<button type="button" data-profile-action="${key}" class="${primary?'is-primary':key==='terminate'?'danger':''}">${label}</button>`;
    const secondary=ongoing?[...(visit.appointmentDate?[action('book','调整预约')]:[]),action('followup','添加跟进'),action('terminate','终止访视')]:[];
    const primary=ongoing?action(visit.appointmentDate?'execute':'book',visit.appointmentDate?'执行访视':'预约访视',true):state==='inactive'?action('activate','激活访视',true):'';
    journeyView.querySelector('[data-profile-summary]').innerHTML=`
      <header class="profile-visit-title"><div><h2>${escape(visit.name)}</h2><span class="profile-version">${escape(visit.protocolVersion)}</span><span class="profile-status ${state}">${store.statusLabels[state]}</span></div><div class="profile-visit-actions">${primary}${secondary.length?`<details class="profile-visit-more"><summary>更多 ⋯</summary><div>${secondary.join('')}</div></details>`:''}</div></header>
      <div class="profile-visit-overview"><div class="profile-progress-summaries">${progressRing('collection','采集进度',crfs.filter(crf=>crf.done).length,crfs.length)}${progressRing('crf','录入进度',completed,crfs.length)}${progressRing('tasks','任务执行',executed,executionTasks.length)}</div><dl class="profile-visit-facts"><div><dt>计划日期</dt><dd>${escape(visit.plannedDate)}</dd></div><div class="profile-fact-window"><dt>允许访视窗口 ${periodLabel?`<span class="profile-window ${period}">${periodLabel}</span>`:''}</dt><dd>${visit.noWindow?'暂无窗口':`${escape(visit.windowStart)} ～ ${escape(visit.windowEnd)}`}</dd></div><div><dt>预约日期</dt><dd>${escape(visit.appointmentDate||'未预约')}</dd></div><div><dt>实际访视日期</dt><dd>${escape(visit.actualDate||'未记录')}</dd></div></dl></div>

      ${visit.terminationReason?`<p class="profile-visit-note">终止原因：${escape(visit.terminationReason)}</p>`:''}`;
    const maxTaskRows = Math.max(0, ...['draft','execute','follow'].map(kind => tasks.filter(task => task.kind === kind).length));
    journeyView.querySelector('.profile-task-management').style.setProperty('--profile-list-body-height', `${Math.max(200, Math.min(5, maxTaskRows) * 80)}px`);
    journeyView.querySelector('[data-profile-task-count]').textContent=`${tasks.filter(t=>t.kind!=='follow').length}`;
    journeyView.querySelector('[data-profile-follow-count]').textContent=`${tasks.filter(t=>t.kind==='follow').length}`;
    renderCrfRows();
  }
  function renderJourneys() {
    renderCycleNav();
    renderVisitSummary();
    scopedController?.destroy();
    followController?.destroy();
    const visit = journeys.find(v => v.id === selectedVisitId);
    const container = journeyView.querySelector('[data-profile-tasks]');
    container.replaceChildren();
    if (visit) {
      scopedController = window.createParticipantTasks({
        container, participantId, participantName, params, visitScope: store.apply(visit), compact: true, kinds: ['execute','draft'],
        onChange: () => { renderCycleNav(); renderVisitSummary(); }
      });
      const tasks = scopedController.getTasks();
      const initial = tasks.find(t => t.kind === 'execute' && t.state === 'pending') || tasks.find(t => t.state === 'draft') || tasks[0];
      if (initial) scopedController.select(initial.kind, 'all');
      followController = window.createParticipantTasks({container:journeyView.querySelector('[data-profile-follows]'),participantId,participantName,params,visitScope:store.apply(visit),compact:true,kinds:['follow'],onChange:()=>{renderVisitSummary();}});
      followController.select('follow','all');
    }
  }
  function switchTaskView(next, focus = false) {
    visitTaskView = next === 'followup' ? 'followup' : 'collection';
    journeyView.querySelectorAll('[data-profile-task-view]').forEach(button => {
      const selected = button.dataset.profileTaskView === visitTaskView;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
    journeyView.querySelectorAll('[data-profile-task-panel]').forEach(panel => { panel.hidden = panel.dataset.profileTaskPanel !== visitTaskView; });
  }
  journeyView.querySelector('.profile-task-switch').addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    switchTaskView(event.key === 'Home' ? 'collection' : event.key === 'End' ? 'followup' : visitTaskView === 'collection' ? 'followup' : 'collection', true);
  });
  journeyView.addEventListener('click', event => {
    const statistic=event.target.closest('[data-profile-scroll]');
    if(statistic){
      if(statistic.dataset.profileScroll==='tasks'){
        switchTaskView('collection');scopedController?.select('execute','all');
      }
      scrollToVisitSection(statistic.dataset.profileScroll==='tasks'?'.profile-task-management':'.profile-crf-section');return;
    }
    const pageButton = event.target.closest('[data-crf-page]');
    if (pageButton) { if (!pageButton.disabled) { crfPage = Number(pageButton.dataset.crfPage); renderCrfRows(); journeyView.querySelector('.profile-crf-table-wrap').scrollTop = 0; } return; }

    const taskTab = event.target.closest('[data-profile-task-view]');
    if (taskTab) { switchTaskView(taskTab.dataset.profileTaskView); return; }

    const cycle = event.target.closest('[data-profile-cycle]');
    if (cycle) {
      selectedVisitId = cycle.dataset.profileCycle;
      resetCrfFilters();
      const url = new URL(location.href);
      url.searchParams.set('visitId', selectedVisitId);
      history.replaceState(null, '', url);
      renderJourneys();
      journeyView.querySelector('.profile-visit-content').scrollTop = 0;
      return;
    }
    const visit = journeys.find(v => v.id === selectedVisitId);
    if (!visit) return;
    const crfButton=event.target.closest('[data-profile-crf]');
    if(crfButton){window.openDataEntry?.(crfCycle(visit),crfButton.dataset.profileCrf);return;}
    if(event.target.closest('[data-crf-reset]')){resetCrfFilters();renderCrfRows();return;}
    const button = event.target.closest('[data-profile-action]');
    if (!button) return;
    const key = button.dataset.profileAction;
    const item = {...store.apply(visit), participant: participantName, participantStatus, trial: directory.projectCatalog[params.get('project')]};
    button.closest('details')?.removeAttribute('open');
    if (key === 'activate') {window.openParticipantAction?.('activate',directory.participants.find(p=>p.id===participantId&&p.study===params.get('project')),visit.id);return;}
    if (key === 'execute') window.workbenchTaskDialogs.executeVisit(item);
    else window.workbenchTaskDialogs.appointment(item, key);
  });
  window.workbenchTaskDialogs.setRefresh(()=>{});
  window.addEventListener('crf-state-change',()=>{if(!journeyView.hidden){renderCycleNav();renderVisitSummary();}});
  window.addEventListener('workbench-tasks-changed', () => {
    if (!journeyView.hidden) renderJourneys();
    if (!taskView.hidden) renderAllTaskManagement();
  });

  const definitions = [
    { key: 'journey', label: '访视总览', view: journeyView, url: 'participant-visits' },
    { key: 'crf', label: '访视数据', view: crfView, url: 'data-entry' },
    { key: 'tasks', label: '任务管理', view: taskView, url: 'participant-tasks' }
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
    [...panel.children].forEach(child => { if (child !== tabs && child !== moduleHeading && !child.classList.contains('profile-identity-bar')) child.hidden = child !== target.view; });
    tabs.querySelectorAll('[data-participant-detail-tab]').forEach(button => {
      const active = button.dataset.participantDetailTab === target.key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (target.key === 'journey') renderJourneys();
    if (target.key === 'tasks') renderAllTaskManagement();
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
    const enrollmentDate = directory.participants.find(p=>p.study===params.get('project')&&p.id===participantId)?.enrollmentDate || [...(originalMeta?.querySelectorAll('b') || [])][1]?.textContent.trim() || '—';
    const backImage = back.querySelector('img')?.cloneNode(true);
    back.className = 'participant-header-back';
    back.setAttribute('aria-label', '返回参与者列表');
    back.title = '返回参与者列表';
    back.href='participants.html?'+new URLSearchParams({project:params.get('project')||'CT-2026-001',view:'participants'});
    back.replaceChildren(backImage || document.createTextNode('‹'));

    info.className = 'participant-header-info';
    const personMain = info.querySelector('.person-main');
    const currentPerson = directory.participants.find(p=>p.study===params.get('project')&&p.id===participantId);
    const displayName = currentPerson?.name || participantName;
    const sexAge = currentPerson?.sex ? `${currentPerson.sex} / ${currentPerson.age}岁` : info.querySelector('.sex-age')?.textContent || '—';
    const stateClass = {'已入组':'enrolled','筛选中':'screening','随访中':'screening','研究结束':'ended','筛选失败':'ended'}[participantStatus] || '';
    info.setAttribute('aria-label', `${displayName} · ${sexAge}`);
    info.innerHTML = `<img class="profile-person-portrait" src="figma-participant-assets/person.svg" width="44" height="44" alt=""><div class="profile-person-content"><div class="profile-person-title"><h1 class="person-name" id="person-name">${escape(displayName)}</h1><span class="profile-person-id" aria-label="参与者编号 ${escape(participantId)}">${escape(participantId)}</span><span class="status ${stateClass}" id="person-status">${escape(participantStatus)}</span></div><div class="profile-person-meta"><span><span class="profile-meta-label">入组时间：</span>${escape(enrollmentDate)}</span><i aria-hidden="true">｜</i><span class="profile-person-project" title="${escape(studyName)}"><span class="profile-meta-label">项目名称：</span>${escape(studyName)}</span><span class="participant-profile-version">${escape(window.visitProtocols.bind(params.get('project'), participantId))}</span></div></div>`;
    actions.classList.add('participant-header-actions');
    actions.querySelector('#open-plan')?.remove();
    const contact = document.createElement('button');
    contact.type = 'button';
    contact.className = 'top-btn';
    contact.textContent = '联系参与者';
    const contactNotice = document.createElement('div');
    contactNotice.className = 'participant-contact-notice';
    contactNotice.setAttribute('role', 'status');
    contactNotice.hidden = true;
    document.body.append(contactNotice);
    let contactTimer;
    contact.addEventListener('click', () => {
      contactNotice.textContent = `正在联系${displayName}`;
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
    summary.classList.add('profile-identity-bar');
    panel.prepend(summary);
    tabs.setAttribute('aria-orientation', 'horizontal');
    document.querySelector('main.page').classList.add('participant-overview-layout');

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
      : requested === 'data-entry' ? 'crf' : 'journey';
  setupParticipantHeader();
  activate(initial, false);
})();
