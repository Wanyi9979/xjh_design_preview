(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = value => JSON.parse(JSON.stringify(value));
  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  const icons = {
    tasks: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/>'),
    questions: icon('<path d="M14 2H5v20h14V7Z M14 2v5h5 M8 11h8M8 15h8M8 18h5"/>'),
    mapping: icon('<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0M13 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-5 0"/>'),
    search: icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>')
  };
  // Stable demo IDs mirror the existing mapping catalog; the last two are diary/upload fixtures.
  const catalog = [
    ['Q_001','生命体征记录表'],['Q_002','健康状况调查表'],['Q_003','人口学资料调查表'],
    ['Q_004','ECOG 体能状态问卷'],['Q_005','血常规检查记录表'],['Q_006','血生化检查记录表'],
    ['Q_007','合并用药记录表'],['Q_008','不良事件随访问卷'],['Q_009','治疗情况调查表'],
    ['Q_010','生活质量问卷'],['Q_011','女性生育状态调查表'],['Q_012','后续治疗随访问卷'],
    ['Q_013','用药日记卡','电子日记卡'],['Q_014','检查报告上传表','上传表单']
  ].map(([id,name,type]) => ({id,name,type:type || '问卷',revision:id === 'Q_010' ? '2' : '1'}));
  const groups = [{id:'experimental',name:'试验组'},{id:'control',name:'对照组'}];
  const modeNames = {visit:'按访视',periodic:'周期采集',ondemand:'按需填写'};
  const versions = ['V2.0','V1.1','V1.0'];
  const visits = Object.keys(visitCrfData);
  let project = 'SYX-ML46252', version = 'V2.0', state, readFailed = false;
  let pageNumber = 1, pageSize = 10, currentTab = 'tasks', editorId = null, editorSnapshot = '', readonly = false;
  let pendingConfirm = null, selectedQuestions = new Set();
  const key = (p=project,v=version) => `ai-edc:visit-tasks:v1:${encodeURIComponent(p)}:${encodeURIComponent(v)}`;
  const projectCatalog = (p=project) => p === 'SYX-ML46252' ? catalog : [];
  const baseConfig = () => ({name:'',questionId:'',questionRevision:'',groupMode:'all',groups:[],mode:'visit',visits:[],openOffset:-3,closeOffset:0,start:'治疗开始',end:'治疗结束',frequency:'daily',weekday:'1',time:'20:00',instructions:''});
  function initial(p,v) {
    const questions = projectCatalog(p).map(q => ({id:q.id,revision:q.revision}));
    const seed = (id,overrides,published=true) => {
      const config = {...baseConfig(),...overrides};
      const q = catalog.find(q => q.id === config.questionId);
      config.questionRevision = q?.revision || '';
      return {id,published:published ? config : null,draft:published ? null : config};
    };
    return {schema:1,project:p,version:v,questions,tasks:p === 'SYX-ML46252' && v === 'V2.0' ? [
      seed('task-baseline',{name:'基线健康评估',questionId:'Q_002',visits:[visits[0]]}),
      seed('task-quality',{name:'生活质量评估',questionId:'Q_010',visits:[visits[1],visits[3],visits[6]],openOffset:0}),
      seed('task-diary',{name:'每日用药日记',questionId:'Q_013',groupMode:'selected',groups:['experimental'],mode:'periodic'}),
      seed('task-treatment',{name:'常规治疗记录',questionId:'Q_009',groupMode:'selected',groups:['control'],mode:'periodic',frequency:'weekly'},false),
      seed('task-upload',{name:'院外报告上传',questionId:'Q_014',mode:'ondemand',start:'入组',end:'研究结束'},false)
    ] : []};
  }
  function read(p=project,v=version) {
    const raw = localStorage.getItem(key(p,v));
    if (!raw) return initial(p,v);
    const data = JSON.parse(raw);
    if (data.schema !== 1 || data.project !== p || data.version !== v || !Array.isArray(data.questions) || !Array.isArray(data.tasks)) throw Error('Invalid task store');
    const allowed = projectCatalog(p);
    if (data.questions.some(q => !allowed.some(a => a.id === q.id && a.revision === q.revision))) throw Error('Invalid question reference');
    if (data.tasks.some(t => !t.id || (!t.draft && !t.published) || [t.draft,t.published].filter(Boolean).some(c => typeof c.name !== 'string' || !Array.isArray(c.groups) || !Array.isArray(c.visits) || !modeNames[c.mode]))) throw Error('Invalid task');
    return data;
  }
  function commit(next) {
    if (readFailed) { showToast('配置读取异常，请刷新重试，原数据未覆盖'); return false; }
    try {
      localStorage.setItem(key(),JSON.stringify(next));
      state = next; updateSummary(); return true;
    } catch { showToast('保存失败：浏览器存储不可用，当前修改已保留'); return false; }
  }
  const configOf = task => task.draft || task.published;
  const statusOf = task => task.draft ? (task.published ? 'pending' : 'draft') : 'published';
  const statusName = task => ({pending:'待发布',draft:'草稿',published:'已发布'}[statusOf(task)]);
  const groupName = id => groups.find(g => g.id === id)?.name || id;
  const questionOf = config => catalog.find(q => q.id === config.questionId && q.revision === config.questionRevision);
  const offsetText = n => Number(n) === 0 ? '访视当天' : `访视${n < 0 ? '前' : '后'}${Math.abs(n)}天`;
  const scopeText = c => c.mode === 'visit' ? (c.visits.join('、') || '待选择访视') : `${c.start}至${c.end}`;
  function scheduleText(c) {
    if (c.mode === 'visit') return `${offsetText(c.openOffset)}开放\n${offsetText(c.closeOffset)}截止`;
    if (c.mode === 'ondemand') return '开放期间按需填写';
    return `${c.frequency === 'daily' ? '每天1次' : `每周${['日','一','二','三','四','五','六'][Number(c.weekday)]}1次`}\n当天${c.time}前完成`;
  }

  const root = document.createElement('section'); root.id = 'visit-task-workspace'; root.hidden = true;
  root.setAttribute('aria-label','版本采集配置');
  root.innerHTML = `<nav class="vt-nav" aria-label="版本功能"><div class="vt-nav-caption"><span>版本功能</span><span id="vt-version-label">V2.0</span></div>
    ${[['tasks','访视任务'],['questions','问卷管理'],['mapping','映射配置']].map(([id,name]) => `<button type="button" data-vt-tab="${id}">${icons[id]}${name}</button>`).join('')}</nav>
    <div class="vt-main">
      <section id="vt-task-panel"><div class="vt-heading"><h2>访视任务</h2><button class="btn primary" id="vt-add">＋ 新增任务</button></div>
        <div class="vt-toolbar"><div class="search">${icons.search}<input id="vt-search" aria-label="搜索任务名称" placeholder="搜索任务名称" /></div>
          <select id="vt-group" aria-label="适用分组"><option value="">适用分组：全部</option><option value="all">仅全部组任务</option>${groups.map(g=>`<option value="${g.id}">${g.name}（含全部组任务）</option>`).join('')}</select>
          <select id="vt-mode" aria-label="执行方式"><option value="">执行方式：全部</option>${Object.entries(modeNames).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select>
          <select id="vt-status" aria-label="任务状态"><option value="">状态：全部</option><option value="published">已发布</option><option value="draft">草稿</option><option value="pending">待发布</option></select></div>
        <div class="vt-card"><div class="vt-scroll"><table class="vt-table" aria-label="访视任务列表"><thead><tr>${['任务名称','采集内容','适用分组','执行方式','执行范围','采集安排','状态','操作'].map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody id="vt-task-body"></tbody></table></div>
          <div class="vt-empty" id="vt-empty" hidden><strong id="vt-empty-title"></strong><span id="vt-empty-description"></span><br><button class="btn link" id="vt-clear">清除筛选</button></div>
          <div class="vt-pagination"><span id="vt-total"></span><div class="vt-pages"><select id="vt-page-size" aria-label="每页条数"><option value="10">10 条/页</option><option value="20">20 条/页</option><option value="50">50 条/页</option></select><button id="vt-prev" aria-label="上一页">‹</button><button class="current" id="vt-page" aria-label="当前页">1</button><button id="vt-next" aria-label="下一页">›</button></div></div></div></section>
      <section id="vt-question-panel" hidden><div class="vt-heading"><h2>问卷管理</h2><button class="btn primary" id="vt-associate">＋ 关联问卷</button></div><div class="vt-toolbar"><div class="search">${icons.search}<input id="vt-question-search" placeholder="搜索问卷名称或 ID" aria-label="搜索版本问卷" /></div></div>
        <div class="vt-card"><div class="vt-scroll"><table class="vt-table vt-question-table" aria-label="版本问卷列表"><thead><tr><th>问卷名称</th><th>问卷 ID</th><th>类型</th><th>内容版本</th><th>关联任务</th><th>操作</th></tr></thead><tbody id="vt-questions-body"></tbody></table></div><div class="vt-empty" id="vt-questions-empty" hidden>暂无符合条件的问卷</div><div class="vt-pagination" id="vt-questions-total"></div></div></section>
      <section id="vt-map-panel" hidden><div class="vt-heading"><h2>映射配置</h2></div></section>
    </div>`;
  $('tab-visits').append(root);
  $('vt-map-panel').append($('visit-data-sources'));
  const opts = values => values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  const dialog = document.createElement('dialog'); dialog.id='vt-editor'; dialog.className='vt-dialog'; dialog.setAttribute('aria-labelledby','vt-editor-title');
  dialog.innerHTML = `<div class="vt-dialog-head"><h2 id="vt-editor-title">新增任务</h2><button type="button" data-vt-close aria-label="关闭任务配置">×</button></div>
    <form id="vt-form" class="vt-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-error" role="alert" hidden></p><p class="vt-hint" id="vt-edit-hint" hidden style="margin-bottom:18px">修改后可保存为草稿，重新发布前仍保留原已发布配置。</p>
    <fieldset id="vt-fields"><div class="vt-section"><h3>基本信息</h3><div class="vt-grid">
      <div class="vt-field full"><label class="vt-required" for="vt-name">任务名称</label><input id="vt-name" maxlength="50" placeholder="请输入任务名称" required /></div>
      <div class="vt-field full"><label class="vt-required" for="vt-question">采集内容</label><select id="vt-question"><option value="">请选择当前版本已关联的问卷、日记卡或上传表单</option></select><small id="vt-question-info">从「问卷管理」中选择，内容版本随任务固定。</small></div>
      <div class="vt-field full"><span class="vt-label vt-required">适用分组</span><div class="vt-choice-row"><label><input type="radio" name="vt-group-mode" value="all" checked />全部组</label><label><input type="radio" name="vt-group-mode" value="selected" />指定分组</label></div><div class="vt-checks" id="vt-group-options" hidden>${groups.map(g=>`<label><input type="checkbox" name="vt-groups" value="${g.id}" />${g.name}</label>`).join('')}</div></div>
      <div class="vt-field full"><label for="vt-instructions">患者端说明</label><textarea id="vt-instructions" maxlength="300" placeholder="选填，说明填写要求或上传资料要求"></textarea></div>
    </div></div>
    <div class="vt-section"><h3>执行规则</h3><div class="vt-mode-options">${Object.entries(modeNames).map(([v,n])=>`<label><input type="radio" name="vt-execution" value="${v}" ${v==='visit'?'checked':''} />${n}</label>`).join('')}</div>
      <div class="vt-rule" id="vt-visit-rule"><div class="vt-grid"><div class="vt-field full"><span class="vt-label vt-required">适用访视</span><div class="vt-checks">${visits.map(v=>`<label><input type="checkbox" name="vt-visits" value="${esc(v)}" />${esc(v)}</label>`).join('')}</div></div>
        <div class="vt-field"><label class="vt-required" for="vt-open">开放时间（相对计划访视日）</label><input id="vt-open" type="number" min="-365" max="365" value="-3" step="1" /><small>负数为访视前，0 为当天，正数为访视后。</small></div>
        <div class="vt-field"><label class="vt-required" for="vt-close">截止时间（相对计划访视日）</label><input id="vt-close" type="number" min="-365" max="365" value="0" step="1" /><small>截止日 23:59 结束填写。</small></div></div></div>
      <div class="vt-rule" id="vt-period-rule" hidden><div class="vt-grid">
        <div class="vt-field"><label class="vt-required" for="vt-start">开始条件</label><select id="vt-start">${opts(['入组','治疗开始'])}</select></div>
        <div class="vt-field"><label class="vt-required" for="vt-end">结束条件</label><select id="vt-end">${opts(['治疗结束','研究结束'])}</select></div>
        <div class="vt-field" id="vt-frequency-field"><label for="vt-frequency">采集频率</label><select id="vt-frequency"><option value="daily">每天 1 次</option><option value="weekly">每周 1 次</option></select></div>
        <div class="vt-field" id="vt-weekday-field" hidden><label for="vt-weekday">填写日</label><select id="vt-weekday">${[1,2,3,4,5,6,0].map(n=>`<option value="${n}">周${['日','一','二','三','四','五','六'][n]}</option>`).join('')}</select></div>
        <div class="vt-field" id="vt-time-field"><label class="vt-required" for="vt-time">当次截止时间</label><input id="vt-time" type="time" value="20:00" /><small>填写日 00:00 开放，当天截止。</small></div>
        <p class="vt-hint full" id="vt-ondemand-hint" hidden>开放期间患者可按需填写或上传，可多次提交，不绑定具体访视。</p>
      </div></div><div class="vt-preview" id="vt-rule-preview" aria-live="polite"></div>
    </div></fieldset></div><div class="vt-dialog-footer"><button type="button" class="btn" data-vt-close>取消</button><button type="button" class="btn" id="vt-save-draft">保存草稿</button><button type="submit" class="btn primary" id="vt-publish">发布</button></div></form>`;
  document.body.append(dialog);
  const confirmDialog = document.createElement('dialog'); confirmDialog.id='vt-confirm'; confirmDialog.className='vt-dialog vt-small-dialog'; confirmDialog.setAttribute('aria-labelledby','vt-confirm-title');
  confirmDialog.innerHTML='<div class="vt-dialog-head"><h2 id="vt-confirm-title"></h2><button type="button" id="vt-confirm-close" aria-label="关闭确认">×</button></div><div class="vt-dialog-body"><p id="vt-confirm-copy"></p></div><div class="vt-dialog-footer"><button class="btn" id="vt-confirm-cancel">取消</button><button class="btn primary" id="vt-confirm-ok">确定</button></div>';
  document.body.append(confirmDialog);
  const picker = document.createElement('dialog'); picker.id='vt-picker'; picker.className='vt-dialog'; picker.setAttribute('aria-labelledby','vt-picker-title');
  picker.innerHTML=`<div class="vt-dialog-head"><h2 id="vt-picker-title">关联项目问卷</h2><button type="button" id="vt-picker-close" aria-label="关闭问卷选择">×</button></div><div class="vt-dialog-body"><div class="vt-toolbar"><div class="search">${icons.search}<input id="vt-picker-search" placeholder="搜索问卷名称或 ID" aria-label="搜索可关联问卷" /></div></div><div class="vt-card"><table class="vt-table vt-picker-table"><thead><tr><th></th><th>问卷名称</th><th>问卷 ID</th><th>类型</th><th>内容版本</th></tr></thead><tbody id="vt-picker-body"></tbody></table></div></div><div class="vt-dialog-footer"><button class="btn" id="vt-picker-cancel">取消</button><button class="btn primary" id="vt-picker-ok">确认关联</button></div>`;
  document.body.append(picker);

  function confirm(title,text,action,label='确定') {
    $('vt-confirm-title').textContent=title; $('vt-confirm-copy').textContent=text; $('vt-confirm-ok').textContent=label;
    pendingConfirm=action; confirmDialog.showModal();
  }
  $('vt-confirm-ok').onclick=()=>{ const action=pendingConfirm; pendingConfirm=null; confirmDialog.close(); action?.(); };
  const cancelConfirm=()=>{pendingConfirm=null;confirmDialog.close();};
  $('vt-confirm-close').onclick=cancelConfirm; $('vt-confirm-cancel').onclick=cancelConfirm;
  confirmDialog.addEventListener('cancel',()=>{pendingConfirm=null;});
  function filteredTasks() {
    const search=$('vt-search').value.trim().toLowerCase(), group=$('vt-group').value, mode=$('vt-mode').value, status=$('vt-status').value;
    return state.tasks.filter(task=>{const c=configOf(task);return c.name.toLowerCase().includes(search) && (!mode||c.mode===mode) && (!status||statusOf(task)===status) && (!group || (group==='all' ? c.groupMode==='all' : c.groupMode==='all'||c.groups.includes(group)));});
  }
  function renderTasks() {
    const filtered=filteredTasks(); const count=Math.max(1,Math.ceil(filtered.length/pageSize)); pageNumber=Math.min(pageNumber,count);
    $('vt-task-body').innerHTML=filtered.slice((pageNumber-1)*pageSize,pageNumber*pageSize).map(task=>{
      const c=configOf(task), q=questionOf(c);
      return `<tr data-task-id="${esc(task.id)}"><td><span class="vt-task-name">${esc(c.name)}</span></td><td>${q?`${esc(q.name)}<small>${esc(q.type)} · 第${esc(c.questionRevision)}版</small>`:'<small>待选择采集内容</small>'}</td><td>${c.groupMode==='all'?'<span class="vt-pill">全部组</span>':c.groups.map(g=>`<span class="vt-pill group">${esc(groupName(g))}</span>`).join('')||'<small>待选择分组</small>'}</td><td><span class="vt-pill ${esc(c.mode)}">${modeNames[c.mode]}</span></td><td title="${esc(scopeText(c))}">${c.mode==='visit'&&c.visits.length>2?`${esc(c.visits.slice(0,2).join('、'))}<small>等 ${c.visits.length} 个访视</small>`:esc(scopeText(c))}</td><td>${esc(scheduleText(c)).replace(/\n/g,'<br>')}</td><td><span class="vt-state ${task.draft?'draft':''}">${statusName(task)}</span>${task.published&&task.draft?'<small>原配置仍生效</small>':''}</td><td><div class="vt-actions">${task.published?'<button data-vt-action="view">查看</button>':''}<button data-vt-action="edit">编辑</button>${!task.published?'<button data-vt-action="delete">删除</button>':''}${task.published&&task.draft?'<button data-vt-action="discard">撤销草稿</button>':''}</div></td></tr>`;
    }).join('');
    $('vt-empty').hidden=filtered.length>0;
    const filteredOut=state.tasks.length>0;
    $('vt-empty-title').textContent=readFailed?'无法读取本地任务配置':filteredOut?'未找到符合条件的任务':'暂无访视任务';
    $('vt-empty-description').textContent=readFailed?'请刷新后重试，原数据未覆盖。':filteredOut?'请调整搜索内容或筛选条件。':'点击「新增任务」，配置本版本的采集安排。';
    $('vt-clear').hidden=!filteredOut||readFailed;
    $('vt-total').textContent=`共 ${filtered.length} 条`; $('vt-page').textContent=String(pageNumber);
    $('vt-prev').disabled=pageNumber<=1; $('vt-next').disabled=pageNumber>=count; $('vt-add').disabled=readFailed;
  }
  function renderQuestions() {
    const term=$('vt-question-search').value.trim().toLowerCase();
    const questions=getQuestions().filter(q=>`${q.name} ${q.id}`.toLowerCase().includes(term));
    $('vt-questions-body').innerHTML=questions.map(q=>{
      const uses=state.tasks.filter(t=>[t.draft,t.published].some(c=>c?.questionId===q.id)).length;
      return `<tr><td><strong>${esc(q.name)}</strong></td><td>${esc(q.id)}</td><td>${esc(q.type)}</td><td>第${esc(q.revision)}版</td><td>${uses} 个任务</td><td><div class="vt-actions"><button data-vt-unlink="${esc(q.id)}">移除</button></div></td></tr>`;
    }).join('');
    $('vt-questions-empty').hidden=questions.length>0; $('vt-questions-total').textContent=`共 ${questions.length} 份问卷`;
    $('vt-associate').disabled=readFailed;
  }
  function getQuestions(p=project,v=version) {
    let data;
    try {data=p===project&&v===version&&state?state:read(p,v);} catch {return [];}
    return projectCatalog(p).filter(q=>data.questions.some(r=>r.id===q.id&&r.revision===q.revision));
  }
  function setTab(tab) {
    currentTab=tab;
    document.querySelectorAll('[data-vt-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.vtTab===tab);b.setAttribute('aria-current',b.dataset.vtTab===tab?'page':'false');});
    $('vt-task-panel').hidden=tab!=='tasks'; $('vt-question-panel').hidden=tab!=='questions'; $('vt-map-panel').hidden=tab!=='mapping';
    if(tab!=='mapping') $('visit-data-sources').hidden=true;
    if(tab==='tasks') renderTasks(); if(tab==='questions') renderQuestions();
    const url=new URL(location.href); url.searchParams.set('page',tab==='mapping'?'data-sources':tab==='questions'?'questionnaires':'visit-tasks');url.searchParams.set('version',version);url.searchParams.set('project',project);
    history.replaceState(null,'',url);
  }
  function load(targetVersion) {
    project=$('view-detail').dataset.projectId||'SYX-ML46252'; version=versions.includes(targetVersion)?targetVersion:'V2.0';
    readFailed=false;
    try {state=read();} catch {state={...initial(project,version),tasks:[],questions:[]};readFailed=true;showToast('无法读取本地配置，请刷新重试');}
    ['visit-version-list','visit-version-detail','visit-template-config'].forEach(id=>$(id).hidden=true);
    root.hidden=false; $('vt-version-label').textContent=version; pageNumber=1;
  }
  function open(targetVersion,tab='tasks') {
    load(targetVersion); ['vt-search','vt-group','vt-mode','vt-status'].forEach(id=>$(id).value='');
    if(tab==='mapping') window.DataSources.open(version); else setTab(tab);
  }
  root.querySelector('.vt-nav').addEventListener('click',event=>{
    const button=event.target.closest('[data-vt-tab]'); if(!button||button.dataset.vtTab===currentTab)return;
    const action=()=>{if(button.dataset.vtTab==='mapping')window.DataSources.open(version);else setTab(button.dataset.vtTab);};
    if(currentTab==='mapping')window.DataSources.requestLeave(action);else action();
  });
  ['vt-search','vt-group','vt-mode','vt-status'].forEach(id=>$(id).addEventListener(id==='vt-search'?'input':'change',()=>{pageNumber=1;renderTasks();}));
  $('vt-clear').onclick=()=>{['vt-search','vt-group','vt-mode','vt-status'].forEach(id=>$(id).value='');pageNumber=1;renderTasks();};
  $('vt-prev').onclick=()=>{pageNumber--;renderTasks();}; $('vt-next').onclick=()=>{pageNumber++;renderTasks();};
  $('vt-page-size').onchange=()=>{pageSize=Number($('vt-page-size').value);pageNumber=1;renderTasks();};

  function readForm() {
    const get=id=>$(id).value;
    const q=getQuestions().find(q=>q.id===get('vt-question'));
    return {name:get('vt-name').trim(),questionId:get('vt-question'),questionRevision:q?.revision||'',groupMode:document.querySelector('[name=vt-group-mode]:checked').value,
      groups:[...document.querySelectorAll('[name=vt-groups]:checked')].map(n=>n.value),mode:document.querySelector('[name=vt-execution]:checked').value,
      visits:[...document.querySelectorAll('[name=vt-visits]:checked')].map(n=>n.value),openOffset:get('vt-open')===''?null:Number(get('vt-open')),closeOffset:get('vt-close')===''?null:Number(get('vt-close')),
      start:get('vt-start'),end:get('vt-end'),frequency:get('vt-frequency'),weekday:get('vt-weekday'),time:get('vt-time'),instructions:get('vt-instructions').trim()};
  }
  function updateEditor() {
    const c=readForm();
    $('vt-group-options').hidden=c.groupMode!=='selected';
    $('vt-visit-rule').hidden=c.mode!=='visit'; $('vt-period-rule').hidden=c.mode==='visit';
    ['vt-frequency-field','vt-time-field'].forEach(id=>$(id).hidden=c.mode!=='periodic');
    $('vt-weekday-field').hidden=c.mode!=='periodic'||c.frequency!=='weekly'; $('vt-ondemand-hint').hidden=c.mode!=='ondemand';
    const q=questionOf(c); $('vt-question-info').textContent=q?`${q.id} · ${q.type} · 第${q.revision}版`:'从「问卷管理」中选择，内容版本随任务固定。';
    $('vt-rule-preview').textContent=`${c.groupMode==='all'?'全部组':c.groups.map(groupName).join('、')||'未选择分组'} · ${scopeText(c)} · ${scheduleText(c).replace('\n','，')}`;
  }
  function openEditor(task=null,view=false) {
    readonly=view;editorId=task?.id||null;
    const c=copy(task?(view?task.published:configOf(task)):baseConfig());
    $('vt-form').reset(); $('vt-fields').disabled=view;
    $('vt-question').innerHTML='<option value="">请选择采集内容</option>'+getQuestions().map(q=>`<option value="${esc(q.id)}">${esc(q.name)} · 第${esc(q.revision)}版</option>`).join('');
    const fields={name:'vt-name',questionId:'vt-question',instructions:'vt-instructions',openOffset:'vt-open',closeOffset:'vt-close',start:'vt-start',end:'vt-end',frequency:'vt-frequency',weekday:'vt-weekday',time:'vt-time'};
    Object.entries(fields).forEach(([k,id])=>$(id).value=c[k]??'');
    document.querySelectorAll('[name=vt-group-mode]').forEach(n=>n.checked=n.value===c.groupMode);
    document.querySelectorAll('[name=vt-execution]').forEach(n=>n.checked=n.value===c.mode);
    document.querySelectorAll('[name=vt-groups]').forEach(n=>n.checked=c.groups.includes(n.value));
    document.querySelectorAll('[name=vt-visits]').forEach(n=>n.checked=c.visits.includes(n.value));
    $('vt-editor-title').textContent=view?'查看已发布任务':task?'编辑任务':'新增任务';
    $('vt-edit-hint').hidden=!task?.published||view; $('vt-error').hidden=true;
    $('vt-save-draft').hidden=view; $('vt-publish').hidden=view;
    $('vt-editor').querySelector('.vt-dialog-footer [data-vt-close]').textContent=view?'关闭':'取消';
    updateEditor(); editorSnapshot=JSON.stringify(readForm()); dialog.showModal();
    if(!view)$('vt-name').focus();
  }
  const editorDirty=()=>dialog.open&&!readonly&&JSON.stringify(readForm())!==editorSnapshot;
  function closeEditor() {
    if(editorDirty())confirm('放弃未保存的修改？','本次修改尚未保存，关闭后将丢失。',()=>dialog.close(),'放弃修改');else dialog.close();
  }
  dialog.querySelectorAll('[data-vt-close]').forEach(b=>b.onclick=closeEditor);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  $('vt-form').addEventListener('input',updateEditor); $('vt-form').addEventListener('change',updateEditor);
  $('vt-add').onclick=()=>openEditor();
  function validate(c,publish) {
    if(!c.name)return '请输入任务名称';
    if(state.tasks.some(t=>t.id!==editorId&&configOf(t).name===c.name))return '当前版本已存在同名任务，请修改任务名称';
    if(!publish)return '';
    if(!getQuestions().some(q=>q.id===c.questionId&&q.revision===c.questionRevision))return '请选择当前版本已关联的采集内容';
    if(c.groupMode==='selected'&&!c.groups.length)return '请至少选择一个适用分组';
    if(c.mode==='visit') {
      if(!c.visits.length)return '请至少选择一个适用访视';
      if([c.openOffset,c.closeOffset].some(n=>!Number.isInteger(n)||n < -365||n > 365))return '开放与截止时间须为 -365 至 365 之间的整数';
      if(c.openOffset>c.closeOffset)return '截止时间不能早于开放时间';
    }
    if(c.mode==='periodic'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time))return '请设置有效的当次截止时间';
    return '';
  }
  function save(publish) {
    const c=readForm(),error=validate(c,publish);
    if(error){$('vt-error').textContent=error;$('vt-error').hidden=false;$('vt-error').scrollIntoView({block:'nearest'});return;}
    const apply=()=>{
      const next=copy(state),index=next.tasks.findIndex(t=>t.id===editorId);
      const task=index>=0?next.tasks[index]:{id:crypto.randomUUID(),published:null,draft:null};
      // Draft writes never replace the published snapshot.
      if(publish){task.published=c;task.draft=null;task.publishedAt=new Date().toISOString();}else task.draft=c;
      if(index<0)next.tasks.unshift(task);
      if(commit(next)){dialog.close();pageNumber=1;renderTasks();showToast(publish?'任务配置已发布（本地原型）':'任务草稿已保存');}
    };
    if(publish)confirm('发布任务配置？',`将发布「${c.name}」，适用于${c.groupMode==='all'?'全部组':c.groups.map(groupName).join('、')}。发布后保留本次问卷版本和执行规则。`,apply,'发布');else apply();
  }
  $('vt-save-draft').onclick=()=>save(false);
  $('vt-form').addEventListener('submit',event=>{event.preventDefault();save(true);});
  $('vt-task-body').addEventListener('click',event=>{
    const button=event.target.closest('[data-vt-action]');if(!button)return;
    const task=state.tasks.find(t=>t.id===button.closest('[data-task-id]').dataset.taskId);if(!task)return;
    const action=button.dataset.vtAction;
    if(action==='edit'||action==='view'){openEditor(task,action==='view');return;}
    if(action==='delete'&&!task.published)confirm('删除任务草稿？',`确定删除「${configOf(task).name}」？`,()=>{const next=copy(state);next.tasks=next.tasks.filter(t=>t.id!==task.id);if(commit(next)){renderTasks();showToast('草稿已删除');}},'删除');
    if(action==='discard'&&task.published)confirm('撤销任务草稿？','撤销后恢复显示原已发布配置。',()=>{const next=copy(state);next.tasks.find(t=>t.id===task.id).draft=null;if(commit(next)){renderTasks();showToast('已撤销草稿');}},'撤销草稿');
  });
  function mappingUses(id) {
    try {
      const raw=localStorage.getItem(`ai-edc:data-sources:v1:${encodeURIComponent(project)}:${encodeURIComponent(version)}`);
      if(!raw)return project==='SYX-ML46252'&&version==='V2.0'&&['Q_001','Q_002','Q_003'].includes(id);
      const d=JSON.parse(raw);return [d.mappings,d.draft,d.published].filter(Boolean).some(m=>Object.values(m).some(ids=>Array.isArray(ids)&&ids.includes(id)));
    } catch {return true;}
  }
  $('vt-question-search').oninput=renderQuestions;
  $('vt-questions-body').addEventListener('click',event=>{
    const b=event.target.closest('[data-vt-unlink]');if(!b)return;const id=b.dataset.vtUnlink;
    if(state.tasks.some(t=>[t.draft,t.published].some(c=>c?.questionId===id))||mappingUses(id)){showToast('该问卷已被任务或映射配置引用，暂不能移除');return;}
    confirm('移除问卷关联？','仅移除当前版本的引用，项目问卷库中的表单会保留。',()=>{const next=copy(state);next.questions=next.questions.filter(q=>q.id!==id);if(commit(next)){renderQuestions();showToast('已移除关联');}},'移除');
  });
  function renderPicker() {
    const term=$('vt-picker-search').value.trim().toLowerCase();
    const list=projectCatalog().filter(q=>`${q.id} ${q.name}`.toLowerCase().includes(term));
    $('vt-picker-body').innerHTML=list.map(q=>{const linked=state.questions.some(r=>r.id===q.id);return `<tr><td><input type="checkbox" data-vt-pick="${q.id}" aria-label="${esc(q.name)}" ${linked?'checked disabled':selectedQuestions.has(q.id)?'checked':''} /></td><td>${esc(q.name)}${linked?'<small>已关联</small>':''}</td><td>${q.id}</td><td>${q.type}</td><td>第${q.revision}版</td></tr>`;}).join('')||'<tr><td colspan="5" style="text-align:center;padding:40px">暂无可关联的项目问卷</td></tr>';
    $('vt-picker-ok').disabled=selectedQuestions.size===0;
  }
  $('vt-associate').onclick=()=>{selectedQuestions.clear();$('vt-picker-search').value='';renderPicker();picker.showModal();};
  $('vt-picker-search').oninput=renderPicker;
  $('vt-picker-body').onchange=event=>{const id=event.target.dataset.vtPick;if(!id)return;event.target.checked?selectedQuestions.add(id):selectedQuestions.delete(id);$('vt-picker-ok').disabled=selectedQuestions.size===0;};
  $('vt-picker-close').onclick=$('vt-picker-cancel').onclick=()=>picker.close();
  $('vt-picker-ok').onclick=()=>{const next=copy(state);projectCatalog().filter(q=>selectedQuestions.has(q.id)&&!next.questions.some(r=>r.id===q.id)).forEach(q=>next.questions.push({id:q.id,revision:q.revision}));if(commit(next)){picker.close();renderQuestions();showToast('问卷已关联到当前版本');}};
  function updateSummary() {
    document.querySelectorAll('.version-template-summary').forEach(cell=>{try{const data=read($('view-detail').dataset.projectId||'SYX-ML46252',cell.closest('tr').dataset.version);cell.textContent=`${data.tasks.length} 个任务`;}catch{cell.textContent='读取异常';}});
  }
  window.VisitTasks = {open,getQuestions,updateSummary,onMappingOpen(targetVersion){load(targetVersion);setTab('mapping');}};
  document.querySelectorAll('.configure-visit-tasks').forEach(b=>b.addEventListener('click',()=>open(b.dataset.version)));
  document.addEventListener('click',event=>{
    if(event.target.closest('.tab, .nav-item[data-view], #back-trials, .open-detail')){
      const url=new URL(location.href);['page','version','project'].forEach(k=>url.searchParams.delete(k));history.replaceState(null,'',url);
    }
  });
  window.addEventListener('beforeunload',event=>{if(editorDirty()){event.preventDefault();event.returnValue='';}});
  updateSummary();
  const params=new URLSearchParams(location.search), requested=params.get('page');
  if(['visit-tasks','questionnaires','data-sources'].includes(requested)) {
    const p=params.get('project')||'SYX-ML46252';
    const row=[...document.querySelectorAll('#trial-table tbody tr')].find(r=>r.cells[0].textContent.trim()===p);
    if(row){$('view-detail').dataset.projectId=p;document.querySelector('#view-detail .detail-title').textContent=row.cells[1].textContent.trim();document.querySelector('#view-detail .detail-meta').textContent=`项目编号 ${p}    最近同步时间 ${row.cells[2].textContent.trim()}`;}
    showView('detail');activateTab('visits');open(params.get('version')||'V2.0',requested==='data-sources'?'mapping':requested==='questionnaires'?'questions':'tasks');
  }
})();
