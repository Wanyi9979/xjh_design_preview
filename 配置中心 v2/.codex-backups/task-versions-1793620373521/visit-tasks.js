(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  const icons = {
    tasks: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/>'),
    questions: icon('<path d="M14 2H5v20h14V7Z M14 2v5h5M8 11h8M8 15h8M8 18h5"/>'),
    mapping: icon('<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0M13 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-5 0"/>'),
    search: icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>'),
    back: icon('<path d="m15 18-6-6 6-6"/>')
  };

  const catalog = [
    ['Q_001', '生命体征记录表'], ['Q_002', '健康状况调查表'], ['Q_003', '人口学资料调查表'],
    ['Q_004', 'ECOG 体能状态问卷'], ['Q_005', '血常规检查记录表'], ['Q_006', '血生化检查记录表'],
    ['Q_007', '合并用药记录表'], ['Q_008', '不良事件随访问卷'], ['Q_009', '治疗情况调查表'],
    ['Q_010', '生活质量问卷'], ['Q_011', '女性生育状态调查表'], ['Q_012', '后续治疗随访问卷'],
    ['Q_013', '用药日记卡', '电子日记卡'], ['Q_014', '检查报告上传表', '上传表单']
  ].map(([id, name, type]) => ({id, name, type: type || '问卷', revision: id === 'Q_010' ? '2' : '1'}));
  const groups = [{id: 'experimental', name: '试验组'}, {id: 'control', name: '对照组'}];
  const visitVersions = ['V2.0', 'V1.1', 'V1.0'];
  const visits = Object.keys(visitCrfData);
  const modeNames = {visit: '按访视', periodic: '周期采集', ondemand: '按需填写'};

  let project = 'SYX-ML46252';
  let mappingVisitVersion = 'V2.0';
  let state = null;
  let readFailed = false;
  let currentTab = 'tasks';
  let activeVersionId = null;
  let editingVersionId = null;
  let editingTaskId = null;
  let taskEditorSnapshot = '';
  let selectedQuestions = new Set();
  let confirmAction = null;

  const storageKey = (projectId = project) => `ai-edc:collection-config:v3:${encodeURIComponent(projectId)}`;
  const previousStorageKey = (projectId = project) => `ai-edc:collection-config:v2:${encodeURIComponent(projectId)}`;
  const legacyStorageKey = (projectId, visitVersion) => `ai-edc:visit-tasks:v1:${encodeURIComponent(projectId)}:${encodeURIComponent(visitVersion)}`;
  const projectCatalog = (projectId = project) => projectId === 'SYX-ML46252' ? catalog : [];
  const groupName = id => groups.find(group => group.id === id)?.name || id;
  const activeVersion = () => state?.versions.find(item => item.id === activeVersionId) || null;
  const linkedQuestions = () => projectCatalog().filter(question => state.questions.some(link => link.id === question.id && link.revision === question.revision));
  const questionOf = task => linkedQuestions().find(question => question.id === task.questionId && question.revision === task.questionRevision);
  const versionGroups = item => item.groupMode === 'all' || !item.groups.length ? '全部组' : item.groups.map(groupName).join('、');
  const nextVersionNumber = () => {
    const highest = state.versions.reduce((max, item) => Math.max(max, Number(String(item.version).match(/V(\d+)/)?.[1] || 0)), 0);
    return `V${highest + 1}.0`;
  };
  const blankTask = () => ({
    id: crypto.randomUUID(), name: '', questionId: '', questionRevision: '', groupMode: 'all', groups: [],
    mode: 'visit', visits: [], openOffset: -3, closeOffset: 0, start: '治疗开始', end: '治疗结束',
    frequency: 'daily', weekday: '1', time: '20:00', instructions: ''
  });

  function initialState(projectId) {
    return {schema: 3, project: projectId, questions: projectCatalog(projectId).map(({id, revision}) => ({id, revision})), versions: []};
  }

  function normalizeTask(task) {
    const normalized = {...blankTask(), ...copy(task)};
    normalized.id = task.id || crypto.randomUUID();
    delete normalized.taskRevision;
    delete normalized.visitVersion;
    return normalized;
  }

  function migrateFromV2(data, projectId) {
    const result = initialState(projectId);
    if (Array.isArray(data.questions) && data.questions.length) result.questions = copy(data.questions);
    const publishedTasks = [];
    const workingTasks = [];
    let hasDraft = false;
    for (const task of data.tasks || []) {
      if (task.published) publishedTasks.push(normalizeTask(task.published));
      if (task.draft) hasDraft = true;
      const current = task.draft || task.published;
      if (current) workingTasks.push(normalizeTask(current));
    }
    const mostUsedVisitVersion = tasks => {
      const counts = {};
      for (const task of data.tasks || []) {
        const current = task.draft || task.published;
        if (current?.visitVersion) counts[current.visitVersion] = (counts[current.visitVersion] || 0) + 1;
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'V2.0';
    };
    const visitVersion = mostUsedVisitVersion(workingTasks);
    if (publishedTasks.length) result.versions.push({
      id: crypto.randomUUID(), name: '初始采集任务配置', version: 'V1.0', description: '由原采集任务配置迁移',
      visitVersion, groupMode: 'all', groups: [], tasks: publishedTasks, status: 'published', publishedAt: new Date().toISOString()
    });
    if (hasDraft || (!publishedTasks.length && workingTasks.length)) result.versions.push({
      id: crypto.randomUUID(), name: hasDraft && publishedTasks.length ? '采集任务配置修订' : '初始采集任务配置',
      version: publishedTasks.length ? 'V2.0' : 'V1.0', description: '由原待发布任务迁移', visitVersion,
      groupMode: 'all', groups: [], tasks: workingTasks, status: 'draft', publishedAt: null
    });
    return result;
  }

  function migrateFromLegacy(projectId) {
    const synthetic = {questions: [], tasks: []};
    for (const visitVersion of visitVersions) {
      const raw = localStorage.getItem(legacyStorageKey(projectId, visitVersion));
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      for (const question of parsed.questions || []) {
        if (!synthetic.questions.some(item => item.id === question.id && item.revision === question.revision)) synthetic.questions.push(copy(question));
      }
      for (const task of parsed.tasks || []) {
        const withVersion = config => config ? {...copy(config), visitVersion} : null;
        synthetic.tasks.push({...copy(task), published: withVersion(task.published), draft: withVersion(task.draft)});
      }
    }
    return migrateFromV2({schema: 2, project: projectId, questions: synthetic.questions, tasks: synthetic.tasks}, projectId);
  }

  function validateState(data, projectId) {
    if (!data || data.schema !== 3 || data.project !== projectId || !Array.isArray(data.questions) || !Array.isArray(data.versions)) throw Error('Invalid collection config');
    const allowedQuestions = projectCatalog(projectId);
    if (data.questions.some(item => !allowedQuestions.some(question => question.id === item.id && question.revision === item.revision))) throw Error('Invalid question reference');
    const ids = new Set();
    for (const item of data.versions) {
      if (!item.id || ids.has(item.id) || !item.name || !/^V\d+\.\d+$/.test(item.version) || !visitVersions.includes(item.visitVersion)) throw Error('Invalid version');
      if (!['draft', 'published'].includes(item.status) || !Array.isArray(item.groups) || !Array.isArray(item.tasks)) throw Error('Invalid version state');
      ids.add(item.id);
      const taskIds = new Set();
      for (const task of item.tasks) {
        if (!task.id || taskIds.has(task.id) || typeof task.name !== 'string' || !Array.isArray(task.groups) || !Array.isArray(task.visits) || !modeNames[task.mode]) throw Error('Invalid task');
        taskIds.add(task.id);
      }
    }
    return data;
  }

  function readState(projectId = project) {
    const current = localStorage.getItem(storageKey(projectId));
    if (current) return validateState(JSON.parse(current), projectId);
    const previous = localStorage.getItem(previousStorageKey(projectId));
    const migrated = previous ? migrateFromV2(JSON.parse(previous), projectId) : migrateFromLegacy(projectId);
    return validateState(migrated, projectId);
  }

  function commit(next) {
    if (readFailed) {
      showToast('配置读取异常，请刷新后重试，原数据未覆盖');
      return false;
    }
    try {
      validateState(next, project);
      localStorage.setItem(storageKey(), JSON.stringify(next));
      state = next;
      return true;
    } catch (error) {
      showToast('保存失败：浏览器存储不可用，当前修改仍保留在页面');
      return false;
    }
  }

  const root = document.createElement('section');
  root.id = 'visit-task-workspace';
  root.hidden = true;
  root.setAttribute('aria-label', '项目采集配置');
  root.innerHTML = `
    <nav class="vt-nav" aria-label="采集配置功能">
      <div class="vt-nav-caption"><span>采集配置</span></div>
      ${[['tasks', '采集任务'], ['questions', '问卷管理'], ['mapping', '映射配置']].map(([id, name]) => `<button type="button" data-vt-tab="${id}">${icons[id]}${name}</button>`).join('')}
    </nav>
    <div class="vt-main">
      <section id="vt-version-panel">
        <div class="vt-heading"><div><h2>采集任务版本</h2><p>按访视版本和适用分组管理整套采集任务</p></div><button class="btn primary" id="vt-add-version">＋ 新增版本</button></div>
        <div class="vt-toolbar">
          <div class="search">${icons.search}<input id="vt-version-search" placeholder="搜索版本名称或版本说明" aria-label="搜索任务版本" /></div>
          <select id="vt-version-visit-filter" aria-label="筛选所属访视版本"><option value="">所属访视版本：全部</option>${visitVersions.map(item => `<option value="${item}">${item}</option>`).join('')}</select>
          <select id="vt-version-status-filter" aria-label="筛选版本状态"><option value="">状态：全部</option><option value="draft">草稿</option><option value="published">已发布</option></select>
        </div>
        <div class="vt-card">
          <div class="vt-scroll"><table class="vt-table vt-version-table" aria-label="采集任务版本列表"><thead><tr>${['版本名称', '版本', '版本说明', '所属访视版本', '适用分组', '任务数量', '状态', '发布时间', '操作'].map(item => `<th>${item}</th>`).join('')}</tr></thead><tbody id="vt-version-body"></tbody></table></div>
          <div class="vt-empty" id="vt-version-empty" hidden><strong>暂无采集任务版本</strong><span>点击「新增版本」创建第一套采集任务配置</span></div>
          <div class="vt-pagination"><span id="vt-version-total">共 0 个版本</span></div>
        </div>
      </section>
      <section id="vt-task-panel" hidden>
        <div class="vt-detail-head">
          <button class="vt-back-link" id="vt-back-versions">${icons.back}返回版本列表</button>
          <div class="vt-detail-title"><h2 id="vt-detail-name"></h2><div id="vt-detail-meta"></div></div>
          <div class="vt-detail-actions"><button class="btn" id="vt-publish-version">发布版本</button><button class="btn primary" id="vt-add-task">＋ 新增任务</button></div>
        </div>
        <div class="vt-toolbar"><div class="search">${icons.search}<input id="vt-task-search" placeholder="搜索任务名称" aria-label="搜索版本内任务" /></div><select id="vt-task-mode-filter"><option value="">执行方式：全部</option>${Object.entries(modeNames).map(([value, name]) => `<option value="${value}">${name}</option>`).join('')}</select></div>
        <div class="vt-card">
          <div class="vt-scroll"><table class="vt-table vt-task-table" aria-label="当前版本任务列表"><thead><tr>${['任务名称', '采集内容', '适用分组', '执行方式', '执行范围', '采集安排', '操作'].map(item => `<th>${item}</th>`).join('')}</tr></thead><tbody id="vt-task-body"></tbody></table></div>
          <div class="vt-empty" id="vt-task-empty" hidden><strong>当前版本暂无任务</strong><span>点击「新增任务」配置采集内容与执行规则</span></div>
          <div class="vt-pagination"><span id="vt-task-total">共 0 个任务</span></div>
        </div>
      </section>
      <section id="vt-question-panel" hidden>
        <div class="vt-heading"><h2>问卷管理</h2><button class="btn primary" id="vt-associate">＋ 关联问卷</button></div>
        <div class="vt-toolbar"><div class="search">${icons.search}<input id="vt-question-search" placeholder="搜索问卷名称或 ID" aria-label="搜索项目问卷" /></div></div>
        <div class="vt-card"><div class="vt-scroll"><table class="vt-table vt-question-table" aria-label="项目问卷列表"><thead><tr><th>问卷名称</th><th>问卷 ID</th><th>类型</th><th>内容版本</th><th>引用版本</th><th>操作</th></tr></thead><tbody id="vt-question-body"></tbody></table></div><div class="vt-empty" id="vt-question-empty" hidden>暂无符合条件的问卷</div><div class="vt-pagination" id="vt-question-total"></div></div>
      </section>
      <section id="vt-map-panel" hidden><div class="vt-heading"><h2>映射配置</h2><label class="vt-mapping-version">访视版本 <select id="vt-map-version">${visitVersions.map(item => `<option value="${item}">${item}</option>`).join('')}</select></label></div></section>
    </div>`;

  const collectionPanel = document.createElement('div');
  collectionPanel.id = 'tab-collection';
  collectionPanel.className = 'tab-panel';
  collectionPanel.hidden = true;
  document.querySelector('#view-detail .workspace-card').append(collectionPanel);
  collectionPanel.append(root);
  $('vt-map-panel').append($('visit-data-sources'));

  function createDialog(id, title, body, footer, className = '') {
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = `vt-dialog ${className}`.trim();
    dialog.setAttribute('aria-labelledby', `${id}-title`);
    dialog.innerHTML = `<div class="vt-dialog-head"><h2 id="${id}-title">${title}</h2><button type="button" data-close-dialog aria-label="关闭">×</button></div>${body}<div class="vt-dialog-footer">${footer}</div>`;
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => dialog.close()));
    return dialog;
  }

  const versionDialog = createDialog('vt-version-dialog', '新增采集任务版本', `
    <form id="vt-version-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-version-error" hidden></p><div class="vt-grid">
      <div class="vt-field"><label class="vt-required" for="vt-version-visit">所属访视版本</label><select id="vt-version-visit">${visitVersions.map(item => `<option value="${item}">${item}</option>`).join('')}</select></div>
      <div class="vt-field"><label class="vt-required" for="vt-version-number">版本</label><input id="vt-version-number" readonly /></div>
      <div class="vt-field full"><label class="vt-required" for="vt-version-name">版本名称</label><input id="vt-version-name" maxlength="50" placeholder="请输入版本名称" /></div>
      <div class="vt-field full"><label for="vt-version-description">版本说明</label><textarea id="vt-version-description" maxlength="300" placeholder="选填，说明本版本的配置目的或主要变化"></textarea></div>
      <div class="vt-field full"><span class="vt-label">适用分组</span><p class="vt-hint">不选择时默认为全部组。</p><div class="vt-checks">${groups.map(group => `<label><input type="checkbox" name="vt-version-groups" value="${group.id}" />${group.name}</label>`).join('')}</div></div>
    </div></div></form>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-create-version">创建版本</button>');

  const taskDialog = createDialog('vt-task-dialog', '新增任务', `
    <form id="vt-task-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-task-error" hidden></p>
      <div class="vt-section"><h3>基本信息</h3><div class="vt-grid">
        <div class="vt-field full"><label class="vt-required" for="vt-task-name">任务名称</label><input id="vt-task-name" maxlength="50" placeholder="请输入任务名称" /></div>
        <div class="vt-field full"><label class="vt-required" for="vt-task-question">采集内容</label><select id="vt-task-question"><option value="">请选择项目已关联的问卷、日记卡或上传表单</option></select><small id="vt-task-question-info">内容版本会随当前配置版本固定。</small></div>
        <div class="vt-field full"><span class="vt-label">适用分组</span><div class="vt-choice-row"><label><input type="radio" name="vt-task-group-mode" value="all" checked />版本内全部组</label><label><input type="radio" name="vt-task-group-mode" value="selected" />指定分组</label></div><div class="vt-checks" id="vt-task-groups" hidden>${groups.map(group => `<label><input type="checkbox" name="vt-task-groups" value="${group.id}" />${group.name}</label>`).join('')}</div></div>
        <div class="vt-field full"><label for="vt-task-instructions">患者端说明</label><textarea id="vt-task-instructions" maxlength="300" placeholder="选填"></textarea></div>
      </div></div>
      <div class="vt-section"><h3>执行规则</h3><div class="vt-mode-options">${Object.entries(modeNames).map(([value, name]) => `<label><input type="radio" name="vt-task-mode" value="${value}" ${value === 'visit' ? 'checked' : ''} />${name}</label>`).join('')}</div>
        <div class="vt-rule" id="vt-visit-rule"><div class="vt-grid"><div class="vt-field full"><span class="vt-label vt-required">适用访视</span><div class="vt-checks">${visits.map(item => `<label><input type="checkbox" name="vt-task-visits" value="${esc(item)}" />${esc(item)}</label>`).join('')}</div></div><div class="vt-field"><label for="vt-task-open">开放时间（相对计划访视日）</label><input id="vt-task-open" type="number" min="-365" max="365" value="-3" /></div><div class="vt-field"><label for="vt-task-close">截止时间（相对计划访视日）</label><input id="vt-task-close" type="number" min="-365" max="365" value="0" /></div></div></div>
        <div class="vt-rule" id="vt-period-rule" hidden><div class="vt-grid"><div class="vt-field"><label for="vt-task-start">开始条件</label><select id="vt-task-start"><option>入组</option><option selected>治疗开始</option></select></div><div class="vt-field"><label for="vt-task-end">结束条件</label><select id="vt-task-end"><option selected>治疗结束</option><option>研究结束</option></select></div><div class="vt-field" id="vt-task-frequency-field"><label for="vt-task-frequency">采集频率</label><select id="vt-task-frequency"><option value="daily">每天 1 次</option><option value="weekly">每周 1 次</option></select></div><div class="vt-field" id="vt-task-weekday-field" hidden><label for="vt-task-weekday">填写日</label><select id="vt-task-weekday">${[1,2,3,4,5,6,0].map(day => `<option value="${day}">周${['日','一','二','三','四','五','六'][day]}</option>`).join('')}</select></div><div class="vt-field" id="vt-task-time-field"><label for="vt-task-time">当次截止时间</label><input id="vt-task-time" type="time" value="20:00" /></div><p class="vt-hint full" id="vt-task-ondemand-hint" hidden>开放期间患者可按需填写或上传，可多次提交。</p></div></div>
        <div class="vt-preview" id="vt-task-preview"></div>
      </div>
    </div></form>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-save-task">保存任务</button>');

  const confirmDialog = createDialog('vt-confirm-dialog', '确认操作', '<div class="vt-dialog-body"><p id="vt-confirm-copy"></p></div>', '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-confirm-ok">确定</button>', 'vt-small-dialog');
  const pickerDialog = createDialog('vt-picker-dialog', '关联项目问卷', `<div class="vt-dialog-body"><div class="vt-toolbar"><div class="search">${icons.search}<input id="vt-picker-search" placeholder="搜索问卷名称或 ID" /></div></div><div class="vt-card"><table class="vt-table vt-picker-table"><thead><tr><th></th><th>问卷名称</th><th>问卷 ID</th><th>类型</th><th>内容版本</th></tr></thead><tbody id="vt-picker-body"></tbody></table></div></div>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-picker-ok">确认关联</button>');

  function ask(title, message, action, confirmLabel = '确定') {
    $(`${confirmDialog.id}-title`).textContent = title;
    $('vt-confirm-copy').textContent = message;
    $('vt-confirm-ok').textContent = confirmLabel;
    confirmAction = action;
    confirmDialog.showModal();
  }
  $('vt-confirm-ok').addEventListener('click', () => {
    const action = confirmAction;
    confirmAction = null;
    confirmDialog.close();
    action?.();
  });
  confirmDialog.addEventListener('close', () => { if (!confirmDialog.open) confirmAction = null; });

  function formatDate(value) {
    return value ? new Date(value).toLocaleString('zh-CN', {hour12: false}).replaceAll('/', '-') : '—';
  }
  function offsetText(number) {
    const value = Number(number);
    return value === 0 ? '访视当天' : `访视${value < 0 ? '前' : '后'}${Math.abs(value)}天`;
  }
  function taskScope(task) {
    return task.mode === 'visit' ? (task.visits.join('、') || '待选择访视') : `${task.start}至${task.end}`;
  }
  function taskSchedule(task) {
    if (task.mode === 'visit') return `${offsetText(task.openOffset)}开放\n${offsetText(task.closeOffset)}截止`;
    if (task.mode === 'ondemand') return '开放期间按需填写';
    const frequency = task.frequency === 'daily' ? '每天 1 次' : `每周${['日','一','二','三','四','五','六'][Number(task.weekday)]} 1 次`;
    return `${frequency}\n当天 ${task.time} 前完成`;
  }
  function taskGroups(task) {
    if (task.groupMode === 'all' || !task.groups.length) return '版本内全部组';
    return task.groups.map(groupName).join('、');
  }

  function renderVersions() {
    const term = $('vt-version-search').value.trim().toLowerCase();
    const visitFilter = $('vt-version-visit-filter').value;
    const statusFilter = $('vt-version-status-filter').value;
    const versions = state.versions.filter(item => `${item.name} ${item.description || ''} ${item.version}`.toLowerCase().includes(term)
      && (!visitFilter || item.visitVersion === visitFilter) && (!statusFilter || item.status === statusFilter));
    $('vt-version-body').innerHTML = versions.map(item => `<tr data-version-id="${esc(item.id)}">
      <td><strong>${esc(item.name)}</strong></td><td><span class="vt-pill version">${esc(item.version)}</span></td><td>${item.description ? esc(item.description) : '<span class="vt-muted">—</span>'}</td>
      <td><span class="vt-pill visit-version">${esc(item.visitVersion)}</span></td><td>${esc(versionGroups(item))}</td><td>${item.tasks.length}</td>
      <td><span class="vt-state ${item.status === 'draft' ? 'draft' : ''}">${item.status === 'draft' ? '草稿' : '已发布'}</span></td><td>${formatDate(item.publishedAt)}</td>
      <td><div class="vt-actions"><button data-version-action="open">${item.status === 'draft' ? '配置任务' : '查看任务'}</button>${item.status === 'draft' ? '<button data-version-action="edit">编辑版本</button><button data-version-action="publish">发布</button><button data-version-action="delete">删除</button>' : '<button data-version-action="copy">复制新建</button>'}</div></td>
    </tr>`).join('');
    $('vt-version-empty').hidden = versions.length > 0;
    $('vt-version-total').textContent = `共 ${versions.length} 个版本`;
  }

  function renderTasks() {
    const item = activeVersion();
    if (!item) return showVersionList();
    const term = $('vt-task-search').value.trim().toLowerCase();
    const mode = $('vt-task-mode-filter').value;
    const tasks = item.tasks.filter(task => task.name.toLowerCase().includes(term) && (!mode || task.mode === mode));
    $('vt-detail-name').textContent = `${item.name} · ${item.version}`;
    $('vt-detail-meta').innerHTML = `<span>所属访视版本：${esc(item.visitVersion)}</span><span>适用分组：${esc(versionGroups(item))}</span><span class="vt-state ${item.status === 'draft' ? 'draft' : ''}">${item.status === 'draft' ? '草稿' : '已发布'}</span>`;
    $('vt-add-task').hidden = item.status !== 'draft';
    $('vt-publish-version').hidden = item.status !== 'draft';
    $('vt-task-body').innerHTML = tasks.map(task => {
      const question = questionOf(task);
      return `<tr data-task-id="${esc(task.id)}"><td><strong>${esc(task.name)}</strong></td><td>${question ? `${esc(question.name)}<small>${esc(question.type)} · 第${question.revision}版</small>` : '<span class="vt-muted">待选择采集内容</span>'}</td>
        <td>${esc(taskGroups(task))}</td><td><span class="vt-pill ${esc(task.mode)}">${modeNames[task.mode]}</span></td><td>${esc(taskScope(task))}</td><td>${esc(taskSchedule(task)).replace(/\n/g, '<br>')}</td>
        <td><div class="vt-actions"><button data-task-action="view">查看</button>${item.status === 'draft' ? '<button data-task-action="edit">编辑</button><button data-task-action="delete">删除</button>' : ''}</div></td></tr>`;
    }).join('');
    $('vt-task-empty').hidden = tasks.length > 0;
    $('vt-task-total').textContent = `共 ${tasks.length} 个任务`;
  }

  function renderQuestions() {
    const term = $('vt-question-search').value.trim().toLowerCase();
    const questions = linkedQuestions().filter(item => `${item.name} ${item.id}`.toLowerCase().includes(term));
    $('vt-question-body').innerHTML = questions.map(question => {
      const refs = state.versions.filter(item => item.tasks.some(task => task.questionId === question.id && task.questionRevision === question.revision));
      return `<tr><td><strong>${esc(question.name)}</strong></td><td>${question.id}</td><td>${esc(question.type)}</td><td>第${question.revision}版</td><td>${refs.length ? refs.map(item => esc(item.version)).join('、') : '0 个版本'}</td><td><div class="vt-actions"><button data-unlink-question="${question.id}">移除</button></div></td></tr>`;
    }).join('');
    $('vt-question-empty').hidden = questions.length > 0;
    $('vt-question-total').textContent = `共 ${questions.length} 份问卷`;
  }

  function showVersionList() {
    activeVersionId = null;
    $('vt-version-panel').hidden = false;
    $('vt-task-panel').hidden = true;
    renderVersions();
  }
  function showTaskDetail(versionId) {
    activeVersionId = versionId;
    $('vt-version-panel').hidden = true;
    $('vt-task-panel').hidden = false;
    $('vt-task-search').value = '';
    $('vt-task-mode-filter').value = '';
    renderTasks();
  }

  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('[data-vt-tab]').forEach(button => {
      const active = button.dataset.vtTab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    $('vt-version-panel').hidden = tab !== 'tasks';
    $('vt-task-panel').hidden = true;
    $('vt-question-panel').hidden = tab !== 'questions';
    $('vt-map-panel').hidden = tab !== 'mapping';
    if (tab !== 'mapping') $('visit-data-sources').hidden = true;
    if (tab === 'tasks') showVersionList();
    if (tab === 'questions') renderQuestions();
    const url = new URL(location.href);
    url.searchParams.set('page', 'collection');
    url.searchParams.set('section', tab);
    url.searchParams.set('project', project);
    if (tab === 'mapping') url.searchParams.set('version', mappingVisitVersion); else url.searchParams.delete('version');
    history.replaceState(null, '', url);
  }

  function loadProject() {
    project = $('view-detail').dataset.projectId || 'SYX-ML46252';
    readFailed = false;
    try {
      state = readState(project);
    } catch (error) {
      state = initialState(project);
      readFailed = true;
      showToast('无法读取采集配置，请刷新后重试；原数据未被覆盖');
    }
    document.querySelectorAll('#view-detail .tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'collection'));
    document.querySelectorAll('#view-detail .tab-panel').forEach(panel => panel.hidden = panel.id !== 'tab-collection');
    root.hidden = false;
  }

  function open(_unused, tab = 'tasks') {
    loadProject();
    if (tab === 'mapping') {
      currentTab = 'mapping';
      mappingVisitVersion = visitVersions.includes(_unused) ? _unused : mappingVisitVersion;
      $('vt-map-version').value = mappingVisitVersion;
      window.DataSources.open(mappingVisitVersion);
    } else setTab(tab);
  }

  root.querySelector('.vt-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-vt-tab]');
    if (!button || button.dataset.vtTab === currentTab) return;
    const action = () => {
      if (button.dataset.vtTab === 'mapping') window.DataSources.open(mappingVisitVersion);
      else setTab(button.dataset.vtTab);
    };
    if (currentTab === 'mapping') window.DataSources.requestLeave(action); else action();
  });

  ['vt-version-search', 'vt-version-visit-filter', 'vt-version-status-filter'].forEach(id => $(id).addEventListener(id === 'vt-version-search' ? 'input' : 'change', renderVersions));
  function openVersionDialog(item = null) {
    editingVersionId = item?.id || null;
    $('vt-version-form').reset();
    $('vt-version-dialog-title').textContent = item ? '编辑采集任务版本' : '新增采集任务版本';
    $('vt-version-visit').value = item?.visitVersion || 'V2.0';
    $('vt-version-number').value = item?.version || nextVersionNumber();
    $('vt-version-name').value = item?.name || '';
    $('vt-version-description').value = item?.description || '';
    document.querySelectorAll('[name=vt-version-groups]').forEach(input => { input.checked = !!item?.groups.includes(input.value); });
    $('vt-create-version').textContent = item ? '保存' : '创建版本';
    $('vt-version-error').hidden = true;
    versionDialog.showModal();
    $('vt-version-name').focus();
  }
  $('vt-add-version').addEventListener('click', () => openVersionDialog());
  $('vt-create-version').addEventListener('click', () => {
    const name = $('vt-version-name').value.trim();
    const visitVersion = $('vt-version-visit').value;
    const version = $('vt-version-number').value;
    const description = $('vt-version-description').value.trim();
    const selectedGroups = [...document.querySelectorAll('[name=vt-version-groups]:checked')].map(input => input.value);
    if (!name) {
      $('vt-version-error').textContent = '请输入版本名称';
      $('vt-version-error').hidden = false;
      return;
    }
    if (state.versions.some(item => item.id !== editingVersionId && item.name === name)) {
      $('vt-version-error').textContent = '版本名称已存在，请修改后重试';
      $('vt-version-error').hidden = false;
      return;
    }
    const next = copy(state);
    let item = next.versions.find(versionItem => versionItem.id === editingVersionId);
    if (item) Object.assign(item, {name, description, visitVersion, groupMode: selectedGroups.length ? 'selected' : 'all', groups: selectedGroups});
    else {
      item = {id: crypto.randomUUID(), name, version, description, visitVersion, groupMode: selectedGroups.length ? 'selected' : 'all', groups: selectedGroups, tasks: [], status: 'draft', publishedAt: null};
      next.versions.unshift(item);
    }
    if (commit(next)) {
      versionDialog.close();
      if (editingVersionId) {
        renderVersions();
        showToast('版本信息已保存');
      } else {
        showTaskDetail(item.id);
        showToast('采集任务版本已创建');
      }
      editingVersionId = null;
    }
  });

  $('vt-version-body').addEventListener('click', event => {
    const button = event.target.closest('[data-version-action]');
    const row = event.target.closest('[data-version-id]');
    if (!button || !row) return;
    const item = state.versions.find(version => version.id === row.dataset.versionId);
    if (!item) return;
    if (button.dataset.versionAction === 'open') showTaskDetail(item.id);
    if (button.dataset.versionAction === 'edit') openVersionDialog(item);
    if (button.dataset.versionAction === 'publish') publishVersion(item);
    if (button.dataset.versionAction === 'delete') ask('删除版本草稿？', `确定删除「${item.name} · ${item.version}」？`, () => {
      const next = copy(state);
      next.versions = next.versions.filter(version => version.id !== item.id);
      if (commit(next)) { renderVersions(); showToast('版本草稿已删除'); }
    }, '删除');
    if (button.dataset.versionAction === 'copy') {
      const next = copy(state);
      const duplicated = {...copy(item), id: crypto.randomUUID(), version: nextVersionNumber(), name: `${item.name}（修订）`, description: `基于 ${item.version} 创建`, status: 'draft', publishedAt: null};
      duplicated.tasks.forEach(task => { task.id = crypto.randomUUID(); });
      next.versions.unshift(duplicated);
      if (commit(next)) { showTaskDetail(duplicated.id); showToast('已复制为新版本草稿'); }
    }
  });

  function publishVersion(item) {
    if (!item.tasks.length) {
      showToast('请先添加至少一个采集任务');
      return;
    }
    const invalid = item.tasks.find(task => !task.name || !questionOf(task));
    if (invalid) {
      showToast('版本中存在未完成的任务配置');
      return;
    }
    ask('发布采集任务版本？', `将发布「${item.name} · ${item.version}」，包含 ${item.tasks.length} 个任务，所属访视版本为 ${item.visitVersion}。`, () => {
      const next = copy(state);
      const target = next.versions.find(version => version.id === item.id);
      target.status = 'published';
      target.publishedAt = new Date().toISOString();
      if (commit(next)) {
        activeVersionId ? renderTasks() : renderVersions();
        showToast('采集任务版本已发布（本地原型）');
      }
    }, '发布');
  }
  $('vt-publish-version').addEventListener('click', () => publishVersion(activeVersion()));
  $('vt-back-versions').addEventListener('click', showVersionList);
  $('vt-task-search').addEventListener('input', renderTasks);
  $('vt-task-mode-filter').addEventListener('change', renderTasks);

  function readTaskForm() {
    const question = linkedQuestions().find(item => item.id === $('vt-task-question').value);
    return {
      id: editingTaskId || crypto.randomUUID(), name: $('vt-task-name').value.trim(), questionId: $('vt-task-question').value,
      questionRevision: question?.revision || '', groupMode: document.querySelector('[name=vt-task-group-mode]:checked').value,
      groups: [...document.querySelectorAll('[name=vt-task-groups]:checked')].map(input => input.value),
      mode: document.querySelector('[name=vt-task-mode]:checked').value,
      visits: [...document.querySelectorAll('[name=vt-task-visits]:checked')].map(input => input.value),
      openOffset: Number($('vt-task-open').value), closeOffset: Number($('vt-task-close').value), start: $('vt-task-start').value,
      end: $('vt-task-end').value, frequency: $('vt-task-frequency').value, weekday: $('vt-task-weekday').value,
      time: $('vt-task-time').value, instructions: $('vt-task-instructions').value.trim()
    };
  }

  function updateTaskForm() {
    const task = readTaskForm();
    $('vt-task-groups').hidden = task.groupMode !== 'selected';
    $('vt-visit-rule').hidden = task.mode !== 'visit';
    $('vt-period-rule').hidden = task.mode === 'visit';
    $('vt-task-frequency-field').hidden = task.mode !== 'periodic';
    $('vt-task-time-field').hidden = task.mode !== 'periodic';
    $('vt-task-weekday-field').hidden = task.mode !== 'periodic' || task.frequency !== 'weekly';
    $('vt-task-ondemand-hint').hidden = task.mode !== 'ondemand';
    $('vt-task-preview').textContent = `${taskGroups(task)} · ${taskScope(task)} · ${taskSchedule(task).replace('\n', '，')}`;
  }

  function openTaskEditor(task = null, readonly = false) {
    const item = activeVersion();
    editingTaskId = task?.id || null;
    const current = copy(task || blankTask());
    $('vt-task-form').reset();
    $('vt-task-question').innerHTML = '<option value="">请选择采集内容</option>' + linkedQuestions().map(question => `<option value="${question.id}">${esc(question.name)} · 第${question.revision}版</option>`).join('');
    $('vt-task-name').value = current.name;
    $('vt-task-question').value = current.questionId;
    $('vt-task-instructions').value = current.instructions;
    $('vt-task-open').value = current.openOffset;
    $('vt-task-close').value = current.closeOffset;
    $('vt-task-start').value = current.start;
    $('vt-task-end').value = current.end;
    $('vt-task-frequency').value = current.frequency;
    $('vt-task-weekday').value = current.weekday;
    $('vt-task-time').value = current.time;
    document.querySelectorAll('[name=vt-task-group-mode]').forEach(input => { input.checked = input.value === current.groupMode; });
    document.querySelectorAll('[name=vt-task-groups]').forEach(input => { input.checked = current.groups.includes(input.value); });
    document.querySelectorAll('[name=vt-task-mode]').forEach(input => { input.checked = input.value === current.mode; });
    document.querySelectorAll('[name=vt-task-visits]').forEach(input => { input.checked = current.visits.includes(input.value); });
    $('vt-task-form').querySelectorAll('input, select, textarea').forEach(input => { input.disabled = readonly; });
    $('vt-save-task').hidden = readonly;
    $('vt-task-dialog-title').textContent = readonly ? '查看任务' : task ? '编辑任务' : '新增任务';
    $('vt-task-error').hidden = true;
    updateTaskForm();
    taskEditorSnapshot = JSON.stringify(readTaskForm());
    taskDialog.showModal();
    if (!readonly) $('vt-task-name').focus();
    if (item.status !== 'draft') $('vt-save-task').hidden = true;
  }

  $('vt-add-task').addEventListener('click', () => openTaskEditor());
  $('vt-task-form').addEventListener('input', updateTaskForm);
  $('vt-task-form').addEventListener('change', updateTaskForm);
  $('vt-save-task').addEventListener('click', () => {
    const task = readTaskForm();
    let error = '';
    if (!task.name) error = '请输入任务名称';
    else if (!questionOf(task)) error = '请选择当前项目已关联的采集内容';
    else if (task.groupMode === 'selected' && !task.groups.length) error = '请至少选择一个适用分组';
    else if (task.mode === 'visit' && !task.visits.length) error = '请至少选择一个适用访视';
    else if (task.mode === 'visit' && (!Number.isInteger(task.openOffset) || !Number.isInteger(task.closeOffset) || task.openOffset > task.closeOffset)) error = '开放与截止时间不正确';
    else if (activeVersion().tasks.some(item => item.id !== editingTaskId && item.name === task.name)) error = '当前版本已存在同名任务';
    if (error) {
      $('vt-task-error').textContent = error;
      $('vt-task-error').hidden = false;
      return;
    }
    const next = copy(state);
    const item = next.versions.find(version => version.id === activeVersionId);
    const index = item.tasks.findIndex(existing => existing.id === editingTaskId);
    if (index >= 0) item.tasks[index] = task; else item.tasks.unshift(task);
    if (commit(next)) {
      taskDialog.close();
      renderTasks();
      showToast(index >= 0 ? '任务已更新' : '任务已添加');
    }
  });

  $('vt-task-body').addEventListener('click', event => {
    const button = event.target.closest('[data-task-action]');
    const row = event.target.closest('[data-task-id]');
    if (!button || !row) return;
    const task = activeVersion().tasks.find(item => item.id === row.dataset.taskId);
    if (!task) return;
    if (button.dataset.taskAction === 'view') openTaskEditor(task, true);
    if (button.dataset.taskAction === 'edit') openTaskEditor(task);
    if (button.dataset.taskAction === 'delete') ask('删除采集任务？', `确定从当前版本删除「${task.name}」？`, () => {
      const next = copy(state);
      const item = next.versions.find(version => version.id === activeVersionId);
      item.tasks = item.tasks.filter(existing => existing.id !== task.id);
      if (commit(next)) { renderTasks(); showToast('任务已删除'); }
    }, '删除');
  });

  $('vt-question-search').addEventListener('input', renderQuestions);
  $('vt-question-body').addEventListener('click', event => {
    const button = event.target.closest('[data-unlink-question]');
    if (!button) return;
    const id = button.dataset.unlinkQuestion;
    if (state.versions.some(item => item.tasks.some(task => task.questionId === id)) || mappingUses(id)) {
      showToast('该问卷已被采集任务版本或映射配置引用，暂不能移除');
      return;
    }
    ask('移除项目问卷？', '只移除当前项目的关联，公共问卷库中的表单会保留。', () => {
      const next = copy(state);
      next.questions = next.questions.filter(question => question.id !== id);
      if (commit(next)) { renderQuestions(); showToast('项目问卷已移除'); }
    }, '移除');
  });

  function mappingUses(id) {
    try {
      return visitVersions.some(visitVersion => {
        const raw = localStorage.getItem(`ai-edc:data-sources:v1:${encodeURIComponent(project)}:${encodeURIComponent(visitVersion)}`);
        if (!raw) return project === 'SYX-ML46252' && visitVersion === 'V2.0' && ['Q_001', 'Q_002', 'Q_003'].includes(id);
        const parsed = JSON.parse(raw);
        return [parsed.mappings, parsed.draft, parsed.published].filter(Boolean).some(mapping => Object.values(mapping).some(ids => Array.isArray(ids) && ids.includes(id)));
      });
    } catch (error) {
      return true;
    }
  }

  function renderPicker() {
    const term = $('vt-picker-search').value.trim().toLowerCase();
    const questions = projectCatalog().filter(item => `${item.name} ${item.id}`.toLowerCase().includes(term));
    $('vt-picker-body').innerHTML = questions.map(question => {
      const linked = state.questions.some(item => item.id === question.id && item.revision === question.revision);
      return `<tr><td><input type="checkbox" data-pick-question="${question.id}" ${linked ? 'checked disabled' : selectedQuestions.has(question.id) ? 'checked' : ''} /></td><td>${esc(question.name)}${linked ? '<small>已关联</small>' : ''}</td><td>${question.id}</td><td>${esc(question.type)}</td><td>第${question.revision}版</td></tr>`;
    }).join('');
    $('vt-picker-ok').disabled = selectedQuestions.size === 0;
  }
  $('vt-associate').addEventListener('click', () => {
    selectedQuestions.clear();
    $('vt-picker-search').value = '';
    renderPicker();
    pickerDialog.showModal();
  });
  $('vt-picker-search').addEventListener('input', renderPicker);
  $('vt-picker-body').addEventListener('change', event => {
    const id = event.target.dataset.pickQuestion;
    if (!id) return;
    if (event.target.checked) selectedQuestions.add(id); else selectedQuestions.delete(id);
    $('vt-picker-ok').disabled = selectedQuestions.size === 0;
  });
  $('vt-picker-ok').addEventListener('click', () => {
    const next = copy(state);
    projectCatalog().filter(question => selectedQuestions.has(question.id) && !next.questions.some(item => item.id === question.id && item.revision === question.revision))
      .forEach(question => next.questions.push({id: question.id, revision: question.revision}));
    if (commit(next)) { pickerDialog.close(); renderQuestions(); showToast('问卷已关联到当前项目'); }
  });

  $('vt-map-version').addEventListener('change', event => {
    const requested = event.target.value;
    event.target.value = mappingVisitVersion;
    window.DataSources.requestLeave(() => {
      mappingVisitVersion = requested;
      $('vt-map-version').value = requested;
      window.DataSources.open(requested);
    });
  });

  function getQuestions(projectId = project) {
    try {
      const data = projectId === project && state ? state : readState(projectId);
      return projectCatalog(projectId).filter(question => data.questions.some(item => item.id === question.id && item.revision === question.revision));
    } catch (error) {
      return [];
    }
  }

  window.VisitTasks = {
    open,
    getQuestions,
    updateSummary() {},
    onMappingOpen(visitVersion) {
      loadProject();
      currentTab = 'mapping';
      mappingVisitVersion = visitVersions.includes(visitVersion) ? visitVersion : 'V2.0';
      $('vt-map-version').value = mappingVisitVersion;
      setTab('mapping');
    }
  };

  document.addEventListener('click', event => {
    if (event.target.closest('.tab:not([data-tab=collection]), .nav-item[data-view], #back-trials, .open-detail')) {
      const url = new URL(location.href);
      ['page', 'section', 'version', 'project'].forEach(key => url.searchParams.delete(key));
      history.replaceState(null, '', url);
    }
  });

  const params = new URLSearchParams(location.search);
  if (['collection', 'visit-tasks', 'questionnaires', 'data-sources'].includes(params.get('page'))) {
    const projectId = params.get('project') || 'SYX-ML46252';
    const row = [...document.querySelectorAll('#trial-table tbody tr')].find(item => item.cells[0].textContent.trim() === projectId);
    if (row) {
      $('view-detail').dataset.projectId = projectId;
      document.querySelector('#view-detail .detail-title').textContent = row.cells[1].textContent.trim();
      document.querySelector('#view-detail .detail-meta').textContent = `项目编号 ${projectId}    最近同步时间 ${row.cells[2].textContent.trim()}`;
    }
    const requested = params.get('page');
    const section = requested === 'data-sources' ? 'mapping' : requested === 'questionnaires' ? 'questions' : params.get('section') || 'tasks';
    showView('detail');
    open(params.get('version') || 'V2.0', ['tasks', 'questions', 'mapping'].includes(section) ? section : 'tasks');
  }
})();
