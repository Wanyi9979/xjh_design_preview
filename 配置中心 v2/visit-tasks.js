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
    clear: icon('<path d="m6 6 12 12M18 6 6 18"/>')
  };

  const catalog = [
    ['Q_001', '生命体征记录表'], ['Q_002', '健康状况调查表'], ['Q_003', '人口学资料调查表'],
    ['Q_004', 'ECOG 体能状态问卷'], ['Q_005', '血常规检查记录表'], ['Q_006', '血生化检查记录表'],
    ['Q_007', '合并用药记录表'], ['Q_008', '不良事件随访问卷'], ['Q_009', '治疗情况调查表'],
    ['Q_010', '生活质量问卷'], ['Q_011', '女性生育状态调查表'], ['Q_012', '后续治疗随访问卷'],
    ['Q_013', '用药日记卡', '电子日记卡'], ['Q_014', '检查报告上传表', '上传表单']
  ].map(([id, name, type]) => ({id, name, type: type || '问卷', revision: id === 'Q_010' ? '2' : '1', updatedAt: '2026-08-14T15:30:00+08:00'}));
  const availableForms = [
    ['Q_015', '症状评估表'], ['Q_016', '疼痛数字评分量表'],
    ['Q_017', '营养风险筛查表'], ['Q_018', '患者报告结局量表'],
    ['Q_019', '睡眠质量评估表'], ['Q_020', '焦虑抑郁筛查表'],
    ['Q_021', '治疗依从性评估表'], ['Q_022', '患者满意度调查表']
  ].map(([id, name]) => ({id, name, type: '问卷', revision: '1', updatedAt: '2026-10-20T10:00:00+08:00'}));
  const groups = [{id: 'experimental', name: '试验组'}, {id: 'control', name: '对照组'}];
  const visitVersions = ['V2.0', 'V1.1', 'V1.0'];
  const visits = Object.keys(visitCrfData);
  const modeNames = {single: '单次采集', continuous: '连续天数', specified: '指定天数'};
  const cycleNames = {single: '单次采集', continuous: '连续采集', specified: '指定天数'};
  const windowUnits = {days: {label: '天', max: 365}, hours: {label: '时', max: 8760}, minutes: {label: '分', max: 525600}};
  const anchorNames = {visit_date: '指定访视日期', enrollment_date: '入组日期', randomization_date: '随机日期', first_dose_date: '首次给药日期'};

  let project = 'SYX-ML46252';
  let mappingVisitVersion = 'V2.0';
  let state = null;
  let readFailed = false;
  let currentTab = 'tasks';
  let activeVersionId = null;
  let editingVersionId = null;
  let editingTaskId = null;
  let taskEditorSnapshot = '';
  let confirmAction = null;
  let pendingRelatedFormIds = new Set();

  const storageKey = (projectId = project) => `ai-edc:collection-config:v3:${encodeURIComponent(projectId)}`;
  const previousStorageKey = (projectId = project) => `ai-edc:collection-config:v2:${encodeURIComponent(projectId)}`;
  const legacyStorageKey = (projectId, visitVersion) => `ai-edc:visit-tasks:v1:${encodeURIComponent(projectId)}:${encodeURIComponent(visitVersion)}`;
  const projectCatalog = (projectId = project) => projectId === 'SYX-ML46252' ? [...catalog, ...availableForms] : [];
  const groupName = id => groups.find(group => group.id === id)?.name || id;
  const visitGroupStorageKey = (projectId, visitVersion) => `config-center:visit-groups:${encodeURIComponent(projectId)}:${encodeURIComponent(visitVersion)}`;
  function configuredVisitGroups(projectId, visitVersion) {
    try {
      const stored = JSON.parse(localStorage.getItem(visitGroupStorageKey(projectId, visitVersion)) || '[]');
      return Array.isArray(stored) ? stored.map(item => typeof item === 'string' ? item.trim() : typeof item?.name === 'string' ? item.name.trim() : '').filter(Boolean) : [];
    } catch (_) { return []; }
  }
  function isGroupReferencedByPublishedTasks(projectId, visitVersion, name) {
    try {
      const data = projectId === project && state ? state : readState(projectId);
      return data.versions.some(version => version.visitVersion === visitVersion && version.status === 'published' && version.tasks.length > 0 && (
        (version.groupMode === 'selected' && version.groups.some(id => groupName(id) === name)) ||
        version.tasks.some(task => task.groupMode === 'selected' && task.groups.some(id => groupName(id) === name))
      ));
    } catch (_) { return true; }
  }
  const activeVersion = () => state?.versions.find(item => item.id === activeVersionId) || null;
  const questionsFromState = (data, projectId = project) => data.questions.map(link => {
    const catalogQuestion = projectCatalog(projectId).find(question => question.id === link.id && question.revision === link.revision);
    return catalogQuestion || (link.name ? {
      id: link.id, name: link.name, description: link.description || '', type: '问卷', revision: link.revision, updatedAt: link.updatedAt
    } : null);
  }).filter(Boolean);
  const linkedQuestions = () => questionsFromState(state);
  const questionOf = task => linkedQuestions().find(question => question.id === task.questionId && question.revision === task.questionRevision);
  const versionGroups = item => item.groupMode === 'all' || !item.groups.length ? '全部组' : item.groups.map(groupName).join('、');
  const nextVersionNumber = () => {
    const highest = state.versions.reduce((max, item) => Math.max(max, Number(String(item.version).match(/V(\d+)/)?.[1] || 0)), 0);
    return `V${highest + 1}.0`;
  };
  const nextCopyName = name => {
    const possibleBase = name.replace(/_\d+$/, '');
    const base = possibleBase !== name && state.versions.some(item => item.name === possibleBase) ? possibleBase : name;
    const prefix = `${base}_`;
    const highest = state.versions.reduce((max, item) => {
      if (!item.name.startsWith(prefix)) return max;
      const suffix = item.name.slice(prefix.length);
      return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max;
    }, 0);
    return `${base}_${highest + 1}`;
  };
  const nextQuestionId = () => {
    const highest = [...projectCatalog(), ...state.questions].reduce((max, item) => Math.max(max, Number(String(item.id).match(/^Q_(\d+)$/)?.[1] || 0)), 0);
    return `Q_${String(highest + 1).padStart(3, '0')}`;
  };
  const blankTask = () => ({
    id: crypto.randomUUID(), name: '', questionId: '', questionRevision: '', groupMode: 'all', groups: [],
    description: '', visits: [], collectionMethod: 'questionnaire', collectionDateMode: 'single', mode: 'single',
    timeAnchor: 'visit_date', continuousStartDay: 1, continuousEndDay: 5, specifiedDays: [],
    collectionTimes: [{type: 'unspecified', time: ''}], windowBefore: 0, windowAfter: 0,
    windowUnit: 'days', patientOnly: true, allowOverdue: false, autoMapCrf: true
  });

  function initialState(projectId) {
    return {schema: 3, project: projectId, questions: catalog.map(({id, revision}) => ({id, revision})), versions: []};
  }

  function normalizeTask(task) {
    const legacyMode = {visit: 'single', periodic: 'continuous', event: 'single', temporary: 'single', ondemand: 'single'}[task.mode];
    const collectionDateMode = task.collectionDateMode || legacyMode || 'single';
    const legacyQuestion = projectCatalog().find(item => item.id === task.questionId);
    const collectionMethod = task.collectionMethod || (legacyQuestion?.type === '上传表单' ? 'upload' : 'questionnaire');
    const legacyTimes = Array.isArray(task.timeSlots) && task.timeSlots.length ? task.timeSlots : [task.time || ''];
    const collectionTimes = Array.isArray(task.collectionTimes) && task.collectionTimes.length
      ? task.collectionTimes.map(item => ({type: item.type === 'fixed' ? 'fixed' : 'unspecified', time: item.time || ''}))
      : legacyTimes.map(time => ({type: time ? 'fixed' : 'unspecified', time: time || ''}));
    const normalized = {...blankTask(), ...copy(task), collectionMethod, collectionDateMode, mode: collectionDateMode, collectionTimes};
    normalized.id = task.id || crypto.randomUUID();
    normalized.description = task.description ?? task.instructions ?? '';
    normalized.visits = Array.isArray(task.visits) ? copy(task.visits) : [];
    normalized.timeAnchor = anchorNames[task.timeAnchor] ? task.timeAnchor : 'visit_date';
    normalized.continuousStartDay = Number(task.continuousStartDay) || 1;
    normalized.continuousEndDay = Number(task.continuousEndDay) || Math.max(normalized.continuousStartDay, Number(task.durationValue) || 7);
    normalized.specifiedDays = Array.isArray(task.specifiedDays) ? [...new Set(task.specifiedDays.map(Number))].sort((a, b) => a - b) : [1, 2];
    normalized.windowBefore = Number.isFinite(Number(task.windowBefore)) ? Number(task.windowBefore) : Math.max(0, Math.abs(Number(task.openOffset) || 0));
    normalized.windowAfter = Number.isFinite(Number(task.windowAfter)) ? Number(task.windowAfter) : Math.max(0, Number(task.closeOffset) || 0);
    normalized.windowUnit = windowUnits[task.windowUnit] ? task.windowUnit : 'days';
    normalized.patientOnly = task.patientOnly !== false;
    normalized.allowOverdue = task.allowOverdue === true;
    normalized.autoMapCrf = task.autoMapCrf !== false;
    delete normalized.taskRevision;
    delete normalized.visitVersion;
    delete normalized.instructions;
    delete normalized.start;
    delete normalized.end;
    delete normalized.weekday;
    delete normalized.time;
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
      id: crypto.randomUUID(), name: '初始任务配置', version: 'V1.0', description: '由原任务配置迁移',
      visitVersion, groupMode: 'all', groups: [], tasks: publishedTasks, status: 'published', publishedAt: new Date().toISOString()
    });
    if (hasDraft || (!publishedTasks.length && workingTasks.length)) result.versions.push({
      id: crypto.randomUUID(), name: hasDraft && publishedTasks.length ? '任务配置修订' : '初始任务配置',
      version: publishedTasks.length ? 'V2.0' : 'V1.0', description: '由原待发布任务迁移', visitVersion,
      groupMode: 'all', groups: [], tasks: workingTasks, status: 'draft', publishedAt: null
    });
    return result;
  }

  function migrateFromLegacy(projectId) {
    const synthetic = {questions: [], tasks: []};
    let foundLegacy = false;
    for (const visitVersion of visitVersions) {
      const raw = localStorage.getItem(legacyStorageKey(projectId, visitVersion));
      if (!raw) continue;
      foundLegacy = true;
      const parsed = JSON.parse(raw);
      for (const question of parsed.questions || []) {
        if (!synthetic.questions.some(item => item.id === question.id && item.revision === question.revision)) synthetic.questions.push(copy(question));
      }
      for (const task of parsed.tasks || []) {
        const withVersion = config => config ? {...copy(config), visitVersion} : null;
        synthetic.tasks.push({...copy(task), published: withVersion(task.published), draft: withVersion(task.draft)});
      }
    }
    // The previous prototype supplied its initial task set in memory before any
    // localStorage write. Recreate that set so the v3 upgrade does not appear empty.
    if (!foundLegacy && projectId === 'SYX-ML46252') {
      synthetic.questions = catalog.map(({id, revision}) => ({id, revision}));
      const config = overrides => ({
        name: '', questionId: '', questionRevision: '', groupMode: 'all', groups: [], mode: 'visit', visits: [],
        openOffset: -3, closeOffset: 0, start: '治疗开始', end: '治疗结束', frequency: 'daily', weekday: '1',
        time: '20:00', instructions: '', visitVersion: 'V2.0', ...overrides
      });
      const task = (id, overrides, published = true) => {
        const current = config(overrides);
        current.questionRevision = catalog.find(item => item.id === current.questionId)?.revision || '';
        return {id, published: published ? current : null, draft: published ? null : current};
      };
      synthetic.tasks = [
        task('task-baseline', {name: '基线健康评估', questionId: 'Q_002', visits: [visits[0]]}),
        task('task-quality', {name: '生活质量评估', questionId: 'Q_010', visits: [visits[1], visits[3], visits[6]], openOffset: 0}),
        task('task-diary', {name: '每日用药日记', questionId: 'Q_013', groupMode: 'selected', groups: ['experimental'], mode: 'periodic'}),
        task('task-treatment', {name: '常规治疗记录', questionId: 'Q_009', groupMode: 'selected', groups: ['control'], mode: 'periodic', frequency: 'weekly'}, false),
        task('task-upload', {name: '院外报告上传', questionId: 'Q_014', mode: 'ondemand', start: '入组', end: '研究结束'}, false)
      ];
    }
    return migrateFromV2({schema: 2, project: projectId, questions: synthetic.questions, tasks: synthetic.tasks}, projectId);
  }

  function validateState(data, projectId) {
    if (!data || data.schema !== 3 || data.project !== projectId || !Array.isArray(data.questions) || !Array.isArray(data.versions)) throw Error('Invalid collection config');
    const allowedQuestions = projectCatalog(projectId);
    const questionIds = new Set();
    for (const item of data.questions) {
      const isCatalogQuestion = allowedQuestions.some(question => question.id === item.id && question.revision === item.revision);
      const isCustomQuestion = /^Q_\d+$/.test(item.id) && typeof item.name === 'string' && item.name.trim() && item.revision === '1'
        && typeof item.description === 'string' && typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt));
      if ((!isCatalogQuestion && !isCustomQuestion) || questionIds.has(item.id)) throw Error('Invalid question reference');
      questionIds.add(item.id);
    }
    const ids = new Set();
    for (const item of data.versions) {
      if (item.name === '初始采集任务配置') item.name = '初始任务配置';
      if (item.name === '采集任务配置修订') item.name = '任务配置修订';
      if (item.description === '由原采集任务配置迁移') item.description = '由原任务配置迁移';
      if (!item.id || ids.has(item.id) || !item.name || !/^V\d+\.\d+$/.test(item.version) || !visitVersions.includes(item.visitVersion)) throw Error('Invalid version');
      if (!['draft', 'published'].includes(item.status) || !Array.isArray(item.groups) || !Array.isArray(item.tasks)) throw Error('Invalid version state');
      ids.add(item.id);
      item.tasks = item.tasks.map(normalizeTask);
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
  root.setAttribute('aria-label', '项目访视任务');
  root.innerHTML = `
    <nav class="vt-nav" aria-label="访视任务功能">
      <div class="vt-nav-caption"><span>访视任务</span></div>
      ${[['tasks', '任务模板'], ['questions', '表单管理'], ['mapping', '映射配置']].map(([id, name]) => `<button type="button" data-vt-tab="${id}">${icons[id]}${name}</button>`).join('')}
    </nav>
    <div class="vt-main">
      <section id="vt-version-panel">
        <div class="vt-heading"><h2>任务模板</h2></div>
        <div class="vt-toolbar vt-version-filters">
          <div class="search vt-clearable-filter"><span class="vt-search-icon">${icons.search}</span><input id="vt-version-search" type="text" placeholder="搜索版本名称" aria-label="搜索版本名称" /><button type="button" class="vt-clear-filter" data-clear-filter="vt-version-search" aria-label="清空版本名称搜索" hidden>${icons.clear}</button></div>
          <div class="vt-clearable-filter vt-select-filter"><select id="vt-version-visit-filter" aria-label="筛选项目访视版本"><option value="all">全部访视版本</option>${visitVersions.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}</select><button type="button" class="vt-clear-filter" data-clear-filter="vt-version-visit-filter" aria-label="清空访视版本筛选" hidden>${icons.clear}</button></div>
          <div class="vt-clearable-filter vt-select-filter"><select id="vt-version-status-filter" aria-label="筛选状态"><option value="all">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option></select><button type="button" class="vt-clear-filter" data-clear-filter="vt-version-status-filter" aria-label="清空状态筛选" hidden>${icons.clear}</button></div>
          <button type="button" class="btn vt-filter-reset" id="vt-version-reset">重置</button>
          <button type="button" class="btn primary" id="vt-add-version">＋ 新增模板</button>
        </div>
        <div class="vt-card">
          <div class="vt-scroll"><table class="vt-table vt-version-table sticky-action-table" aria-label="任务模板列表"><thead><tr>${['版本名称', '版本号', '版本说明', '访视版本', '适用分组', '任务数量', '状态', '发布时间', '操作'].map(item => `<th>${item}</th>`).join('')}</tr></thead><tbody id="vt-version-body"></tbody></table></div>
          <div class="vt-empty" id="vt-version-empty" hidden><strong id="vt-version-empty-title">暂无任务模板</strong><span id="vt-version-empty-copy">点击「新增」创建第一套任务模板</span></div>
          <div class="vt-pagination"><span id="vt-version-total">共 0 个版本</span></div>
        </div>
      </section>
      <section id="vt-task-panel" hidden>
        <div class="vt-detail-head">
          <button type="button" class="vt-back-link" id="vt-back-versions" aria-label="返回任务模板列表" title="返回任务模板列表"><img src="assets/figma/version-back.svg" alt="" /></button>
          <div class="vt-detail-title"><div class="vt-detail-heading"><h2 id="vt-detail-name"></h2><span class="vt-pill version" id="vt-detail-version"></span><span class="vt-detail-status" id="vt-detail-status"></span></div><div class="vt-detail-meta" id="vt-detail-meta"></div></div>
          <div class="vt-detail-actions"><button class="btn" id="vt-publish-version">发布模板</button><button class="btn primary" id="vt-add-task">＋ 新增任务</button></div>
        </div>
        <div class="vt-toolbar vt-task-filters">
          <div class="search vt-clearable-filter"><span class="vt-search-icon">${icons.search}</span><input id="vt-task-search" type="text" placeholder="搜索任务名称" aria-label="搜索任务名称" /><button type="button" class="vt-clear-filter" data-clear-task-filter="vt-task-search" aria-label="清空任务名称搜索" hidden>${icons.clear}</button></div>
          <div class="vt-clearable-filter vt-select-filter"><select id="vt-task-visit-filter" aria-label="筛选适用访视"><option value="all">全部适用访视</option>${visits.map(visit => `<option value="${esc(visit)}">${esc(visit)}</option>`).join('')}</select><button type="button" class="vt-clear-filter" data-clear-task-filter="vt-task-visit-filter" aria-label="清空适用访视筛选" hidden>${icons.clear}</button></div>
          <button type="button" class="btn vt-filter-reset" id="vt-task-reset">重置</button>
        </div>
        <section class="vt-card vt-visit-task-content">
          <div class="vt-scroll"><table class="vt-table vt-task-table sticky-action-table" aria-label="任务列表"><thead><tr>${['任务名称', '适用访视', '采集方式', '填写方式', '采集周期', '时间窗口', '操作'].map(item => `<th>${item}</th>`).join('')}</tr></thead><tbody id="vt-task-body"></tbody></table></div>
          <div class="vt-empty" id="vt-task-empty" hidden><img src="assets/empty-list.png" alt="" /><strong id="vt-task-empty-title">暂无任务</strong></div>
          <div class="vt-pagination"><span id="vt-task-total">共 0 个任务</span></div>
        </section>
      </section>
      <section id="vt-question-panel" hidden>
        <div class="vt-heading"><h2>表单管理</h2><div class="vt-heading-actions"><button class="btn" id="vt-link-question">${icons.mapping}关联表单</button></div></div>
        <div class="vt-card"><div class="vt-scroll"><table class="vt-table vt-question-table sticky-action-table" aria-label="项目表单列表"><thead><tr><th>表单ID</th><th>表单名称</th><th>操作</th></tr></thead><tbody id="vt-question-body"></tbody></table></div><div class="vt-empty" id="vt-question-empty" hidden>暂无表单</div><div class="vt-pagination" id="vt-question-total"></div></div>
      </section>
      <section id="vt-map-panel" hidden><div class="vt-heading"><h2>映射配置</h2></div><select id="vt-map-version" hidden aria-hidden="true">${visitVersions.map(item => `<option value="${item}">${item}</option>`).join('')}</select></section>
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
    dialog.innerHTML = `<div class="vt-dialog-head"><h2 id="${id}-title">${title}</h2><button type="button" class="modal-close" data-close-dialog aria-label="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>${body}<div class="vt-dialog-footer">${footer}</div>`;
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => dialog.close()));
    return dialog;
  }

  const versionDialog = createDialog('vt-version-dialog', '新增', `
    <form id="vt-version-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-version-error" hidden></p><div class="vt-grid">
      <div class="vt-field full"><label class="vt-required" for="vt-version-visit">项目访视版本</label><select id="vt-version-visit" required><option value="">请选择项目访视版本</option>${visitVersions.map(item => `<option value="${item}">${item}</option>`).join('')}</select></div>
      <div class="vt-field full"><label class="vt-required" for="vt-version-name">版本名称</label><input id="vt-version-name" maxlength="50" placeholder="请输入版本名称" /></div>
      <div class="vt-field full"><label for="vt-version-description">版本说明</label><textarea id="vt-version-description" maxlength="300" placeholder="选填，说明本版本的配置目的或主要变化"></textarea></div>
      <div class="vt-field full"><span class="vt-label">适用分组</span><details class="vt-multi-select" id="vt-version-groups-select"><summary><span id="vt-version-groups-text">请选择适用分组</span></summary><div class="vt-multi-options"></div></details></div>
    </div></div></form>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-create-version">确定</button>');

  const taskDialog = createDialog('vt-task-dialog', '新增任务', `
    <form id="vt-task-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-task-error" hidden></p>
      <div class="vt-section"><h3>1. 基础配置</h3><div class="vt-grid">
        <div class="vt-field full"><label class="vt-required" for="vt-task-name">任务名称</label><input id="vt-task-name" maxlength="50" placeholder="请输入任务名称" /></div>
        <div class="vt-field full"><span class="vt-label vt-required">适用访视</span><details class="vt-multi-select vt-visit-picker" id="vt-task-visits-select"><summary><span id="vt-task-visits-text">请选择适用访视</span></summary><div class="vt-multi-options">${visits.map(item => `<label><input type="checkbox" name="vt-task-visits" value="${esc(item)}" />${esc(item)}</label>`).join('')}</div></details><div class="vt-selected-tags" id="vt-task-visit-tags"></div></div>
        <div class="vt-field full"><span class="vt-label vt-required">采集方式</span><div class="vt-mode-options vt-two-options">
          <label><input type="radio" name="vt-task-collection-method" value="questionnaire" checked />表单填写</label>
          <label><input type="radio" name="vt-task-collection-method" value="upload" />上传文件</label>
        </div></div>
        <div class="vt-field full" id="vt-task-question-field"><label class="vt-required" for="vt-task-question">选择表单</label><select id="vt-task-question"><option value="">请选择</option></select></div>
        <div class="vt-field full"><span class="vt-label">填写方式</span><div class="vt-switch-list"><label class="vt-switch-row" for="vt-task-patient-only"><span><strong>仅患者填写</strong><small>关闭后，后期个案可填写。</small></span><span class="vt-switch"><input id="vt-task-patient-only" type="checkbox" checked /><i></i></span></label></div></div>
        <div class="vt-field full"><label for="vt-task-description">任务说明</label><input id="vt-task-description" maxlength="300" placeholder="选填，说明任务目的或填写要求" /></div>
      </div></div>
      <div class="vt-section"><h3>2. 采集配置</h3><div class="vt-field full"><span class="vt-label vt-required">采集周期</span><div class="vt-mode-options">
        <label><input type="radio" name="vt-task-date-mode" value="single" checked />单次采集</label>
        <label><input type="radio" name="vt-task-date-mode" value="continuous" />连续天数</label>
        <label><input type="radio" name="vt-task-date-mode" value="specified" />指定天数</label>
      </div></div>
        <div class="vt-rule" id="vt-time-anchor-rule" hidden><div class="vt-field"><label class="vt-required" for="vt-task-time-anchor">时间基准</label><select id="vt-task-time-anchor">${Object.entries(anchorNames).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select><small>基准日当天按第1天计算。</small></div></div>
        <div class="vt-rule" id="vt-continuous-rule" hidden><div class="vt-field"><span class="vt-label vt-required">连续采集范围</span><div class="vt-day-range"><span>从第</span><input id="vt-task-continuous-start" type="number" min="1" max="365" value="1" aria-label="连续采集开始天数" /><span>天开始，连续</span><input id="vt-task-continuous-duration" type="number" min="1" max="365" value="5" aria-label="连续采集天数" /><span>天</span></div><small id="vt-task-continuous-summary">采集范围：第1天至第5天</small></div></div>
        <div class="vt-rule" id="vt-specified-rule" hidden><div class="vt-field"><span class="vt-label vt-required">指定天数</span><div class="vt-day-adder"><span>第</span><input id="vt-task-specified-day" type="number" min="1" max="365" value="1" aria-label="指定采集天数" /><span>天</span><button type="button" class="btn" id="vt-add-specified-day">添加</button></div><div class="vt-selected-tags" id="vt-task-specified-days"></div><small>可添加多个指定天数，点击标签中的 × 可删除。</small></div></div>
        <div class="vt-subsection" id="vt-daily-schedule" hidden><div class="vt-field full"><div class="vt-field-head"><span class="vt-label vt-required" id="vt-schedule-label">每日采集安排</span><button type="button" class="btn vt-add-row" id="vt-add-collection-time">＋ 添加采集时段</button></div><div class="vt-collection-times" id="vt-task-collection-times"></div><small id="vt-task-schedule-hint">每日1次时，可以选择当天任意时间或指定时间。</small></div></div>
      </div>
      <div class="vt-section"><h3>3. 执行配置</h3><div class="vt-field full" id="vt-task-window-field"><span class="vt-label vt-required">时间窗口</span><div class="vt-window-row">
        <label><span>允许提前</span><input id="vt-task-window-before" type="number" min="0" max="365" value="0" /></label>
        <label><span>允许延后</span><input id="vt-task-window-after" type="number" min="0" max="365" value="0" /></label>
        <label class="vt-window-unit"><span>单位</span><select id="vt-task-window-unit"><option value="days">天</option><option value="hours">时</option><option value="minutes">分</option></select></label>
      </div><small id="vt-task-window-hint">以任务对应的采集日期为基准计算时间窗口。</small></div>
        <div class="vt-switch-list vt-single-switch"><label class="vt-switch-row" for="vt-task-allow-overdue"><span><strong>逾期执行</strong><small>开启后，超过时间窗口仍允许补充执行。</small></span><span class="vt-switch"><input id="vt-task-allow-overdue" type="checkbox" /><i></i></span></label><label class="vt-switch-row" for="vt-task-auto-map-crf"><span><strong>自动映射CRF</strong><small>开启后，采集数据将按照字段映射配置自动写入CRF。</small></span><span class="vt-switch"><input id="vt-task-auto-map-crf" type="checkbox" checked /><i></i></span></label></div>
      </div>
    </div></form>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-save-task">保存任务</button>', 'vt-task-config-dialog');

  const confirmDialog = createDialog('vt-confirm-dialog', '确认操作', '<div class="vt-dialog-body"><p id="vt-confirm-copy"></p></div>', '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-confirm-ok">确定</button>', 'vt-small-dialog');
  const questionDialog = createDialog('vt-question-dialog', '新增表单', `
    <form id="vt-question-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-question-error" hidden></p><div class="vt-grid">
      <div class="vt-field full"><label class="vt-required" for="vt-question-title">标题</label><input id="vt-question-title" maxlength="100" placeholder="请输入标题" /></div>
      <div class="vt-field full"><label for="vt-question-description">表单说明</label><textarea id="vt-question-description" maxlength="500" placeholder="请输入表单说明（选填）"></textarea></div>
    </div></div></form>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-create-question">确定</button>');
  const linkQuestionDialog = createDialog('vt-link-question-dialog', '关联表单', `
    <div class="vt-dialog-body"><div class="vt-link-toolbar"><div class="search">${icons.search}<input id="vt-link-question-search" placeholder="搜索表单ID或表单名称" aria-label="搜索可关联表单" /></div><span id="vt-link-question-selected">已选择 0 个表单</span></div>
      <div class="vt-link-table-wrap"><table class="vt-link-table" aria-label="可关联表单列表"><thead><tr><th class="vt-link-check"><input type="checkbox" id="vt-link-question-all" aria-label="全选当前结果" /></th><th>表单ID</th><th>表单名称</th></tr></thead><tbody id="vt-link-question-body"></tbody></table><div class="vt-link-empty" id="vt-link-question-empty" hidden>暂无可关联表单</div></div>
    </div>`, '<button class="btn" data-close-dialog>取消</button><button class="btn primary" id="vt-link-question-confirm">确定关联</button>', 'vt-link-dialog');

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
  const radioValue = name => document.querySelector(`[name="${name}"]:checked`)?.value || '';
  function setRadioValue(name, value) {
    document.querySelectorAll(`[name="${name}"]`).forEach(input => { input.checked = input.value === String(value); });
  }
  function syncVisitSelection() {
    const selected = [...document.querySelectorAll('[name=vt-task-visits]:checked')].map(input => input.value);
    $('vt-task-visits-text').textContent = selected.length ? `已选择 ${selected.length} 个访视` : '请选择适用访视';
    $('vt-task-visits-text').classList.toggle('placeholder', !selected.length);
    $('vt-task-visit-tags').innerHTML = selected.map(visit => `<span class="vt-tag">${esc(visit)}<button type="button" data-remove-visit="${esc(visit)}" aria-label="删除${esc(visit)}">×</button></span>`).join('');
  }
  function specifiedDays() {
    return [...$('vt-task-specified-days').querySelectorAll('[data-day]')].map(item => Number(item.dataset.day));
  }
  function renderSpecifiedDays(values) {
    const days = [...new Set((values || []).map(Number).filter(day => Number.isInteger(day) && day >= 1 && day <= 365))].sort((a, b) => a - b);
    $('vt-task-specified-days').innerHTML = days.map(day => `<span class="vt-tag" data-day="${day}">第${day}天<button type="button" data-remove-day="${day}" aria-label="删除第${day}天">×</button></span>`).join('');
  }
  function readCollectionTimes() {
    return [...$('vt-task-collection-times').querySelectorAll('.vt-time-row')].map(row => ({
      type: row.querySelector('select').value,
      time: row.querySelector('input[type=time]').value
    }));
  }
  function renderCollectionTimes(values) {
    const defaults = ['08:00', '12:00', '16:00', '20:00', '22:00', '06:00', '10:00', '18:00'];
    const source = values?.length ? values.slice(0, 8) : [{type: 'unspecified', time: ''}];
    const multiple = source.length > 1;
    const items = source.map((item, index) => ({type: multiple ? 'fixed' : item.type, time: item.time || defaults[index]}));
    $('vt-task-collection-times').innerHTML = items.map((item, index) => `<div class="vt-time-row">
      <span class="vt-time-index">第${index + 1}次</span><select aria-label="第${index + 1}次采集时间类型" ${multiple ? 'disabled' : ''}><option value="fixed" ${item.type === 'fixed' ? 'selected' : ''}>指定时间</option><option value="unspecified" ${item.type !== 'fixed' ? 'selected' : ''}>当天任意时间</option></select>
      <input type="time" value="${esc(item.time)}" aria-label="第${index + 1}次采集时间" ${item.type === 'fixed' ? '' : 'hidden'} /><button type="button" class="vt-remove-row" data-remove-time="${index}" aria-label="删除第${index + 1}次采集时间" ${items.length === 1 ? 'hidden' : ''}>删除</button>
    </div>`).join('');
    $('vt-add-collection-time').disabled = items.length >= 8;
  }
  function executionWindowUnit() {
    return $('vt-task-window-unit').value;
  }
  function updateExecutionWindowUnit() {
    const unit = windowUnits[executionWindowUnit()] || windowUnits.days;
    ['vt-task-window-before', 'vt-task-window-after'].forEach(id => { $(id).max = String(unit.max); });
    $('vt-task-window-hint').textContent = `以任务对应的采集日期为基准，时间窗口单位为${unit.label}。`;
  }
  function taskDateText(task) {
    const anchor = anchorNames[task.timeAnchor] || anchorNames.visit_date;
    if (task.collectionDateMode === 'continuous') return {label: '连续天数', detail: `${anchor} · 第${task.continuousStartDay}天至第${task.continuousEndDay}天`};
    if (task.collectionDateMode === 'specified') return {label: '指定天数', detail: `${anchor} · ${task.specifiedDays.map(day => `第${day}天`).join('、')}`};
    return {label: '单次采集', detail: `${anchor} · 完成1次`};
  }
  function taskTimeText(task) {
    if (task.collectionTimes.length === 1) return task.collectionTimes[0].type === 'fixed' ? task.collectionTimes[0].time : '当天任意时间';
    return task.collectionTimes.map((item, index) => `第${index + 1}次 ${item.time}`).join('、');
  }
  function taskWindowText(task) {
    const unit = windowUnits[task.windowUnit]?.label || windowUnits.days.label;
    return `提前${task.windowBefore}${unit} / 延后${task.windowAfter}${unit}`;
  }
  function taskGroups(task) {
    if (task.groupMode === 'all' || !task.groups.length) return '版本内全部组';
    return task.groups.map(groupName).join('、');
  }

  function renderVersions() {
    document.querySelectorAll('#vt-version-panel [data-clear-filter]').forEach(button => {
      const control = $(button.dataset.clearFilter);
      button.hidden = control.value === '' || control.value === 'all';
    });
    const nameQuery = $('vt-version-search').value.trim().toLocaleLowerCase();
    const visitFilter = $('vt-version-visit-filter').value;
    const statusFilter = $('vt-version-status-filter').value;
    const versions = state.versions.filter(item => (!nameQuery || item.name.toLocaleLowerCase().includes(nameQuery))
      && (visitFilter === 'all' || item.visitVersion === visitFilter)
      && (statusFilter === 'all' || item.status === statusFilter));
    $('vt-version-body').innerHTML = versions.map(item => `<tr data-version-id="${esc(item.id)}">
      <td><strong>${esc(item.name)}</strong></td><td><span class="vt-pill version">${esc(item.version)}</span></td><td>${item.description ? esc(item.description) : '<span class="vt-muted">—</span>'}</td>
      <td><span class="vt-pill visit-version">${esc(item.visitVersion)}</span></td><td>${esc(versionGroups(item))}</td><td>${item.tasks.length}</td>
      <td><span class="vt-state ${item.status === 'draft' ? 'draft' : ''}">${item.status === 'draft' ? '草稿' : '已发布'}</span></td><td>${formatDate(item.publishedAt)}</td>
      <td><div class="vt-actions"><button data-version-action="open">${item.status === 'draft' ? '配置任务' : '查看任务'}</button>${item.status === 'draft' ? '<button data-version-action="publish">发布</button><button data-version-action="copy">复制</button><button data-version-action="edit">编辑</button><button data-version-action="delete">删除</button>' : '<button data-version-action="copy">复制</button>'}</div></td>
    </tr>`).join('');
    $('vt-version-empty').hidden = versions.length > 0;
    $('vt-version-empty-title').textContent = state.versions.length ? '暂无符合条件的任务模板' : '暂无任务模板';
    $('vt-version-empty-copy').textContent = state.versions.length ? '请调整搜索或筛选条件' : '点击「新增」创建第一套任务模板';
    $('vt-version-total').textContent = `共 ${versions.length} 个版本`;
  }
  ['vt-version-search', 'vt-version-visit-filter', 'vt-version-status-filter'].forEach(id => {
    $(id).addEventListener(id === 'vt-version-search' ? 'input' : 'change', renderVersions);
  });
  $('vt-version-panel').addEventListener('click', event => {
    const button = event.target.closest('[data-clear-filter]');
    if (!button) return;
    const control = $(button.dataset.clearFilter);
    control.value = control.tagName === 'SELECT' ? 'all' : '';
    renderVersions();
    control.focus();
  });
  $('vt-version-reset').addEventListener('click', () => {
    $('vt-version-search').value = '';
    $('vt-version-visit-filter').value = 'all';
    $('vt-version-status-filter').value = 'all';
    renderVersions();
  });

  function renderTasks() {
    const item = activeVersion();
    if (!item) return showVersionList();
    document.querySelectorAll('#vt-task-panel [data-clear-task-filter]').forEach(button => {
      const control = $(button.dataset.clearTaskFilter);
      button.hidden = control.value === '' || control.value === 'all';
    });
    const nameQuery = $('vt-task-search').value.trim().toLocaleLowerCase();
    const visitFilter = $('vt-task-visit-filter').value;
    const tasks = item.tasks.filter(task => (!nameQuery || task.name.toLocaleLowerCase().includes(nameQuery))
      && (visitFilter === 'all' || task.visits.includes(visitFilter)));
    $('vt-detail-name').textContent = item.name;
    $('vt-detail-version').textContent = item.version;
    $('vt-detail-status').textContent = item.status === 'draft' ? '草稿' : '已发布';
    $('vt-detail-status').classList.toggle('is-draft', item.status === 'draft');
    $('vt-detail-status').classList.toggle('is-published', item.status !== 'draft');
    $('vt-detail-meta').innerHTML = `<span>访视版本：${esc(item.visitVersion)}</span><span>适用分组：${esc(versionGroups(item))}</span>`;
    $('vt-add-task').hidden = item.status !== 'draft';
    $('vt-publish-version').hidden = item.status !== 'draft';
    $('vt-task-body').innerHTML = tasks.map(task => {
      const method = task.collectionMethod === 'upload' ? '上传文件' : '表单填写';
      const fillingMethod = task.patientOnly ? '仅患者可填' : '患者个案可填';
      return `<tr data-task-id="${esc(task.id)}"><td><strong>${esc(task.name)}</strong></td><td>${task.visits.map(visit => esc(visit)).join('、') || '—'}</td><td>${method}</td><td>${fillingMethod}</td><td>${esc(cycleNames[task.collectionDateMode] || cycleNames.single)}</td>
        <td>${esc(taskWindowText(task))}</td>
        <td><div class="vt-actions"><button data-task-action="view">查看</button>${item.status === 'draft' ? '<button data-task-action="edit">编辑</button><button data-task-action="delete">删除</button>' : ''}</div></td></tr>`;
    }).join('');
    $('vt-task-empty').hidden = tasks.length > 0;
    $('vt-task-empty-title').textContent = item.tasks.length ? '暂无符合条件的任务' : '暂无任务';
    $('vt-task-total').textContent = `共 ${tasks.length} 个任务`;
  }
  $('vt-task-search').addEventListener('input', renderTasks);
  $('vt-task-visit-filter').addEventListener('change', renderTasks);
  $('vt-task-reset').addEventListener('click', () => {
    $('vt-task-search').value = '';
    $('vt-task-visit-filter').value = 'all';
    renderTasks();
  });
  $('vt-task-panel').addEventListener('click', event => {
    const button = event.target.closest('[data-clear-task-filter]');
    if (!button) return;
    const control = $(button.dataset.clearTaskFilter);
    control.value = control.tagName === 'SELECT' ? 'all' : '';
    renderTasks();
    control.focus();
  });

  function renderQuestions() {
    const questions = linkedQuestions();
    $('vt-question-body').innerHTML = questions.map(question => `<tr><td>${esc(question.id)}</td><td><strong>${esc(question.name)}</strong></td><td><div class="vt-actions"><button data-delete-question="${esc(question.id)}">删除</button></div></td></tr>`).join('');
    $('vt-question-empty').hidden = questions.length > 0;
    $('vt-question-total').textContent = `共 ${questions.length} 个表单`;
  }

  function renderLinkableForms() {
    const term = $('vt-link-question-search').value.trim().toLowerCase();
    const linkedIds = new Set(state.questions.map(item => item.id));
    const forms = projectCatalog().filter(item => !linkedIds.has(item.id) && `${item.id} ${item.name}`.toLowerCase().includes(term));
    $('vt-link-question-body').innerHTML = forms.map(item => `<tr><td class="vt-link-check"><input type="checkbox" value="${esc(item.id)}" aria-label="选择${esc(item.name)}" ${pendingRelatedFormIds.has(item.id) ? 'checked' : ''} /></td><td>${esc(item.id)}</td><td><strong>${esc(item.name)}</strong></td></tr>`).join('');
    $('vt-link-question-empty').hidden = forms.length > 0;
    $('vt-link-question-selected').textContent = `已选择 ${pendingRelatedFormIds.size} 个表单`;
    $('vt-link-question-confirm').disabled = pendingRelatedFormIds.size === 0;
    const selectAll = $('vt-link-question-all');
    const selectedVisibleCount = forms.filter(item => pendingRelatedFormIds.has(item.id)).length;
    selectAll.disabled = forms.length === 0;
    selectAll.checked = forms.length > 0 && selectedVisibleCount === forms.length;
    selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < forms.length;
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
    $('vt-task-visit-filter').value = 'all';
    renderTasks();
  }

  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('[data-vt-tab]').forEach(button => {
      const active = button.dataset.vtTab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('#view-detail .tabs .tab').forEach(button => {
      const active = button.dataset.tab === (tab === 'tasks' ? 'collection' : tab);
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
      showToast('无法读取访视任务配置，请刷新后重试；原数据未被覆盖');
    }
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

  function updateVersionGroupSelect() {
    const groupInputs = [...document.querySelectorAll('[name=vt-version-groups]')];
    const selectedGroups = groupInputs.filter(input => input.checked).map(input => groupName(input.value));
    const selectAll = $('vt-version-groups-all');
    if (selectAll) {
      selectAll.checked = groupInputs.length > 0 && selectedGroups.length === groupInputs.length;
      selectAll.indeterminate = selectedGroups.length > 0 && selectedGroups.length < groupInputs.length;
    }
    $('vt-version-groups-text').textContent = selectedGroups.length ? selectedGroups.join('、') : '请选择适用分组';
    $('vt-version-groups-text').classList.toggle('placeholder', selectedGroups.length === 0);
  }
  $('vt-version-groups-select').addEventListener('change', event => {
    if (event.target.id === 'vt-version-groups-all') {
      document.querySelectorAll('[name=vt-version-groups]').forEach(input => { input.checked = event.target.checked; });
    }
    updateVersionGroupSelect();
  });
  function renderVersionGroupOptions(visitVersion, selected = []) {
    const names = configuredVisitGroups(project, visitVersion);
    const options = $('vt-version-groups-select').querySelector('.vt-multi-options');
    options.innerHTML = names.length
      ? `<label class="vt-select-all"><input type="checkbox" id="vt-version-groups-all" aria-label="全选适用分组" />全选</label>${names.map(name => `<label><input type="checkbox" name="vt-version-groups" value="${esc(name)}" ${selected.includes(name) ? 'checked' : ''} />${esc(name)}</label>`).join('')}`
      : `<div class="vt-multi-empty">${visitVersion ? '该访视版本暂无分组' : '请先选择访视版本'}</div>`;
    $('vt-version-groups-select').open = false;
    updateVersionGroupSelect();
  }
  $('vt-version-visit').addEventListener('change', event => renderVersionGroupOptions(event.target.value));
  function openVersionDialog(item = null) {
    editingVersionId = item?.id || null;
    $('vt-version-form').reset();
    $('vt-version-dialog-title').textContent = item ? '编辑' : '新增';
    $('vt-version-visit').value = item?.visitVersion || '';
    renderVersionGroupOptions($('vt-version-visit').value, item?.groups || []);
    $('vt-version-name').value = item?.name || '';
    $('vt-version-description').value = item?.description || '';
    $('vt-version-groups-select').open = false;
    updateVersionGroupSelect();
    $('vt-create-version').textContent = item ? '保存' : '确定';
    $('vt-version-error').hidden = true;
    versionDialog.showModal();
    $('vt-version-name').focus();
  }
  $('vt-add-version').addEventListener('click', () => openVersionDialog());
  $('vt-create-version').addEventListener('click', () => {
    const name = $('vt-version-name').value.trim();
    const visitVersion = $('vt-version-visit').value;
    const description = $('vt-version-description').value.trim();
    const selectedGroups = [...document.querySelectorAll('[name=vt-version-groups]:checked')].map(input => input.value);
    if (!visitVersion) {
      $('vt-version-error').textContent = '请选择项目访视版本';
      $('vt-version-error').hidden = false;
      $('vt-version-visit').focus();
      return;
    }
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
      item = {id: crypto.randomUUID(), name, version: nextVersionNumber(), description, visitVersion, groupMode: selectedGroups.length ? 'selected' : 'all', groups: selectedGroups, tasks: [], status: 'draft', publishedAt: null};
      next.versions.unshift(item);
    }
    if (commit(next)) {
      versionDialog.close();
      if (editingVersionId) {
        renderVersions();
        showToast('版本信息已保存');
      } else {
        showTaskDetail(item.id);
        showToast('任务配置版本已创建');
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
      const duplicated = {...copy(item), id: crypto.randomUUID(), version: nextVersionNumber(), name: nextCopyName(item.name), description: `基于 ${item.version} 创建`, status: 'draft', publishedAt: null};
      duplicated.tasks.forEach(task => { task.id = crypto.randomUUID(); });
      next.versions.unshift(duplicated);
      if (commit(next)) { showTaskDetail(duplicated.id); showToast('已复制为新版本草稿'); }
    }
  });

  function publishVersion(item) {
    if (!item.tasks.length) {
      showToast('请先添加至少一个任务');
      return;
    }
    const invalid = item.tasks.find(task => !task.name || !task.visits.length || (task.collectionMethod === 'questionnaire' && !questionOf(task)));
    if (invalid) {
      showToast('版本中存在未完成的任务配置');
      return;
    }
    ask('发布任务模板？', `将发布「${item.name} · ${item.version}」，包含 ${item.tasks.length} 个任务，项目访视版本为 ${item.visitVersion}。`, () => {
      const next = copy(state);
      const target = next.versions.find(version => version.id === item.id);
      target.status = 'published';
      target.publishedAt = new Date().toISOString();
      if (commit(next)) {
        activeVersionId ? renderTasks() : renderVersions();
        showToast('任务模板已发布（本地原型）');
      }
    }, '发布');
  }
  $('vt-publish-version').addEventListener('click', () => publishVersion(activeVersion()));
  $('vt-back-versions').addEventListener('click', showVersionList);

  function readTaskForm() {
    const collectionMethod = radioValue('vt-task-collection-method') || 'questionnaire';
    const question = linkedQuestions().find(item => item.id === $('vt-task-question').value);
    const collectionDateMode = radioValue('vt-task-date-mode') || 'single';
    const collectionTimes = readCollectionTimes();
    const continuousStartDay = Number($('vt-task-continuous-start').value);
    const continuousDuration = Number($('vt-task-continuous-duration').value);
    const version = activeVersion();
    return {
      id: editingTaskId || crypto.randomUUID(), name: $('vt-task-name').value.trim(),
      questionId: collectionMethod === 'questionnaire' ? $('vt-task-question').value : '',
      questionRevision: collectionMethod === 'questionnaire' ? question?.revision || '' : '',
      description: $('vt-task-description').value.trim(), groupMode: version?.groupMode || 'all', groups: copy(version?.groups || []),
      visits: [...document.querySelectorAll('[name=vt-task-visits]:checked')].map(input => input.value),
      collectionMethod, collectionDateMode, mode: collectionDateMode,
      timeAnchor: $('vt-task-time-anchor').value, continuousStartDay, continuousEndDay: continuousStartDay + continuousDuration - 1,
      specifiedDays: specifiedDays(), collectionTimes,
      windowBefore: Number($('vt-task-window-before').value), windowAfter: Number($('vt-task-window-after').value),
      windowUnit: executionWindowUnit(), patientOnly: $('vt-task-patient-only').checked,
      allowOverdue: $('vt-task-allow-overdue').checked, autoMapCrf: $('vt-task-auto-map-crf').checked
    };
  }

  function updateTaskForm() {
    syncVisitSelection();
    const singleMode = radioValue('vt-task-date-mode') === 'single';
    if (singleMode && $('vt-task-collection-times').querySelectorAll('.vt-time-row').length > 1) {
      renderCollectionTimes(readCollectionTimes().slice(0, 1));
    }
    const rows = [...$('vt-task-collection-times').querySelectorAll('.vt-time-row')];
    const multiple = rows.length > 1;
    rows.forEach(row => {
      const select = row.querySelector('select');
      if (multiple) select.value = 'fixed';
      select.disabled = multiple;
      row.querySelector('input[type=time]').hidden = select.value !== 'fixed';
    });
    const task = readTaskForm();
    $('vt-task-question-field').hidden = task.collectionMethod !== 'questionnaire';
    $('vt-time-anchor-rule').hidden = false;
    $('vt-continuous-rule').hidden = task.collectionDateMode !== 'continuous';
    $('vt-specified-rule').hidden = task.collectionDateMode !== 'specified';
    $('vt-daily-schedule').hidden = false;
    $('vt-daily-schedule').classList.toggle('is-single', singleMode);
    $('vt-schedule-label').textContent = singleMode ? '采集时间' : '每日采集安排';
    $('vt-add-collection-time').hidden = singleMode;
    $('vt-task-schedule-hint').textContent = singleMode
      ? '每个适用访视完成1次采集，可选择当天任意时间或指定时间。'
      : multiple
      ? '每日多次采集需分别指定时间，每个时间点独立生成执行任务。'
      : '每日1次时，可以选择当天任意时间或指定时间。';
    const duration = Number($('vt-task-continuous-duration').value);
    const continuousEnd = task.continuousStartDay + duration - 1;
    $('vt-task-continuous-summary').textContent = Number.isInteger(task.continuousStartDay) && Number.isInteger(duration) && duration > 0
      ? `采集范围：第${task.continuousStartDay}天至第${continuousEnd}天`
      : '请输入有效的开始天数和连续天数';
    $('vt-task-error').hidden = true;
  }

  function openTaskEditor(task = null, readonly = false, defaultVisit = '') {
    const item = activeVersion();
    editingTaskId = task?.id || null;
    const current = normalizeTask(task || blankTask());
    if (!task && defaultVisit) current.visits = [defaultVisit];
    $('vt-task-form').reset();
    $('vt-task-question').innerHTML = '<option value="">请选择</option>' + linkedQuestions().filter(question => question.type !== '上传表单').map(question => `<option value="${question.id}">${esc(question.name)} · 第${question.revision}版</option>`).join('');
    $('vt-task-name').value = current.name;
    document.querySelectorAll('[name=vt-task-visits]').forEach(input => { input.checked = current.visits.includes(input.value); });
    $('vt-task-visits-select').open = false;
    setRadioValue('vt-task-collection-method', current.collectionMethod);
    $('vt-task-question').value = current.questionId;
    $('vt-task-patient-only').checked = current.patientOnly;
    $('vt-task-description').value = current.description;
    setRadioValue('vt-task-date-mode', current.collectionDateMode);
    $('vt-task-time-anchor').value = current.timeAnchor;
    $('vt-task-continuous-start').value = current.continuousStartDay;
    $('vt-task-continuous-duration').value = Math.max(1, current.continuousEndDay - current.continuousStartDay + 1);
    renderSpecifiedDays(current.specifiedDays);
    renderCollectionTimes(current.collectionTimes);
    $('vt-task-window-before').value = current.windowBefore;
    $('vt-task-window-after').value = current.windowAfter;
    $('vt-task-window-unit').value = current.windowUnit;
    $('vt-task-allow-overdue').checked = current.allowOverdue;
    $('vt-task-auto-map-crf').checked = current.autoMapCrf;
    $('vt-task-form').querySelectorAll('input, select, textarea, button').forEach(input => { input.disabled = false; });
    updateTaskForm();
    updateExecutionWindowUnit();
    $('vt-task-form').classList.toggle('is-readonly', readonly);
    if (readonly) $('vt-task-form').querySelectorAll('input, select, textarea, button').forEach(input => { input.disabled = true; });
    $('vt-add-collection-time').disabled = readonly || readCollectionTimes().length >= 8;
    $('vt-save-task').hidden = readonly;
    $('vt-task-dialog-title').textContent = readonly ? '查看任务' : task ? '编辑任务' : '新增任务';
    $('vt-task-error').hidden = true;
    taskEditorSnapshot = JSON.stringify(readTaskForm());
    taskDialog.showModal();
    if (!readonly) $('vt-task-name').focus();
    if (item.status !== 'draft') $('vt-save-task').hidden = true;
  }

  $('vt-add-task').addEventListener('click', () => openTaskEditor());
  $('vt-task-form').addEventListener('input', updateTaskForm);
  $('vt-task-form').addEventListener('change', updateTaskForm);
  $('vt-task-window-unit').addEventListener('change', updateExecutionWindowUnit);
  $('vt-task-visit-tags').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-visit]');
    if (!button) return;
    const input = [...document.querySelectorAll('[name=vt-task-visits]')].find(item => item.value === button.dataset.removeVisit);
    if (input) input.checked = false;
    updateTaskForm();
  });
  $('vt-add-specified-day').addEventListener('click', () => {
    const day = Number($('vt-task-specified-day').value);
    if (!Number.isInteger(day) || day < 1 || day > 365) {
      $('vt-task-error').textContent = '指定天数需为1至365天的整数';
      $('vt-task-error').hidden = false;
      return;
    }
    renderSpecifiedDays([...specifiedDays(), day]);
    updateTaskForm();
  });
  $('vt-task-specified-days').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-day]');
    if (!button) return;
    renderSpecifiedDays(specifiedDays().filter(day => day !== Number(button.dataset.removeDay)));
    updateTaskForm();
  });
  $('vt-add-collection-time').addEventListener('click', () => {
    const items = readCollectionTimes();
    if (items.length >= 8) return;
    if (items.length === 1 && items[0].type === 'unspecified') items[0] = {type: 'fixed', time: '08:00'};
    const defaults = ['08:00', '12:00', '16:00', '20:00', '22:00', '06:00', '10:00', '18:00'];
    const used = new Set(items.map(item => item.time));
    const nextTime = defaults.find(time => !used.has(time)) || '08:00';
    renderCollectionTimes([...items, {type: 'fixed', time: nextTime}]);
    updateTaskForm();
  });
  $('vt-task-collection-times').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-time]');
    if (!button) return;
    const items = readCollectionTimes();
    items.splice(Number(button.dataset.removeTime), 1);
    renderCollectionTimes(items);
    updateTaskForm();
  });
  $('vt-save-task').addEventListener('click', () => {
    const task = readTaskForm();
    let error = '';
    if (!task.name) error = '请输入任务名称';
    else if (!task.visits.length) error = '请选择至少一个适用访视';
    else if (task.collectionMethod === 'questionnaire' && !questionOf(task)) error = '请选择表单';
    else if (!anchorNames[task.timeAnchor]) error = '请选择时间基准';
    else if (task.collectionDateMode === 'continuous' && (!Number.isInteger(task.continuousStartDay) || !Number.isInteger(task.continuousEndDay) || task.continuousStartDay < 1 || task.continuousEndDay > 365)) error = '连续采集范围需在第1天至第365天内';
    else if (task.collectionDateMode === 'specified' && !task.specifiedDays.length) error = '请至少添加一个指定天数';
    else if (!task.collectionTimes.length) error = '请配置采集时间';
    else if (task.collectionDateMode === 'single' && task.collectionTimes.length !== 1) error = '单次采集只能配置一个采集时间';
    else if (task.collectionDateMode !== 'single' && task.collectionTimes.length > 1 && task.collectionTimes.some(item => item.type !== 'fixed')) error = '每日多次采集需分别指定时间';
    else if (task.collectionTimes.some(item => item.type === 'fixed' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) error = '请完整填写固定采集时间';
    else if (new Set(task.collectionTimes.filter(item => item.type === 'fixed').map(item => item.time)).size !== task.collectionTimes.filter(item => item.type === 'fixed').length) error = '固定采集时间不能重复';
    else if (!windowUnits[task.windowUnit]) error = '请选择时间窗口单位';
    else if (![task.windowBefore, task.windowAfter].every(value => Number.isInteger(value) && value >= 0 && value <= windowUnits[task.windowUnit].max)) error = `时间窗口需为0至${windowUnits[task.windowUnit].max}${windowUnits[task.windowUnit].label}的整数`;
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
    if (button.dataset.taskAction === 'delete') ask('删除任务？', `确定从当前版本删除「${task.name}」？`, () => {
      const next = copy(state);
      const item = next.versions.find(version => version.id === activeVersionId);
      item.tasks = item.tasks.filter(existing => existing.id !== task.id);
      if (commit(next)) { renderTasks(); showToast('任务已删除'); }
    }, '删除');
  });

  $('vt-question-body').addEventListener('click', event => {
    const button = event.target.closest('[data-delete-question]');
    if (!button) return;
    const id = button.dataset.deleteQuestion;
    if (state.versions.some(item => item.tasks.some(task => task.questionId === id)) || mappingUses(id)) {
      showToast('该表单已被任务配置或映射配置引用，暂不能删除');
      return;
    }
    const question = linkedQuestions().find(item => item.id === id);
    ask('删除表单？', `确定删除「${question?.name || id}」？`, () => {
      const next = copy(state);
      next.questions = next.questions.filter(question => question.id !== id);
      if (commit(next)) { renderQuestions(); showToast('表单已删除'); }
    }, '删除');
  });

  function mappingUses(id) {
    try {
      return visitVersions.some(visitVersion => {
        const raw = localStorage.getItem(`ai-edc:data-sources:v1:${encodeURIComponent(project)}:${encodeURIComponent(visitVersion)}`);
        if (!raw) return project === 'SYX-ML46252' && visitVersion === 'V2.0' && ['Q_001', 'Q_002', 'Q_003'].includes(id);
        const parsed = JSON.parse(raw);
        if (parsed.schema === 3) return [parsed.draft, parsed.published].filter(Boolean).some(configuration => configuration.mappings.some(mapping => mapping.sourceQuestionId === id));
        return [parsed.mappings, parsed.draft, parsed.published].filter(Boolean).some(mapping => Object.values(mapping).some(ids => Array.isArray(ids) && ids.includes(id)));
      });
    } catch (error) {
      return true;
    }
  }

  $('vt-link-question').addEventListener('click', () => {
    pendingRelatedFormIds = new Set();
    $('vt-link-question-search').value = '';
    renderLinkableForms();
    linkQuestionDialog.showModal();
    $('vt-link-question-search').focus();
  });
  $('vt-link-question-search').addEventListener('input', renderLinkableForms);
  $('vt-link-question-body').addEventListener('change', event => {
    const input = event.target.closest('input[type=checkbox]');
    if (!input) return;
    if (input.checked) pendingRelatedFormIds.add(input.value);
    else pendingRelatedFormIds.delete(input.value);
    renderLinkableForms();
  });
  $('vt-link-question-all').addEventListener('change', event => {
    const visibleIds = [...$('vt-link-question-body').querySelectorAll('input[type=checkbox]')].map(input => input.value);
    visibleIds.forEach(id => event.target.checked ? pendingRelatedFormIds.add(id) : pendingRelatedFormIds.delete(id));
    renderLinkableForms();
  });
  $('vt-link-question-confirm').addEventListener('click', () => {
    const selectedForms = projectCatalog().filter(item => pendingRelatedFormIds.has(item.id));
    if (!selectedForms.length) return;
    const next = copy(state);
    selectedForms.forEach(item => {
      if (!next.questions.some(question => question.id === item.id)) next.questions.push({id: item.id, revision: item.revision});
    });
    if (commit(next)) {
      linkQuestionDialog.close();
      renderQuestions();
      showToast(`已关联 ${selectedForms.length} 个表单`);
    }
  });
  $('vt-create-question').addEventListener('click', () => {
    const name = $('vt-question-title').value.trim();
    const description = $('vt-question-description').value.trim();
    if (!name) {
      $('vt-question-error').textContent = '请输入标题';
      $('vt-question-error').hidden = false;
      return;
    }
    if (linkedQuestions().some(question => question.name === name)) {
      $('vt-question-error').textContent = '表单标题已存在，请修改后重试';
      $('vt-question-error').hidden = false;
      return;
    }
    const next = copy(state);
    next.questions.push({id: nextQuestionId(), name, description, revision: '1', updatedAt: new Date().toISOString()});
    if (commit(next)) { questionDialog.close(); renderQuestions(); showToast('表单已新增'); }
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
      return questionsFromState(data, projectId);
    } catch (error) {
      return [];
    }
  }

  window.VisitTasks = {
    open,
    getQuestions,
    isGroupReferencedByPublishedTasks,
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
    if (event.target.closest('.tab:not([data-tab=collection]):not([data-tab=questions]):not([data-tab=mapping]), .nav-item[data-view], #back-trials, .open-detail')) {
      const url = new URL(location.href);
      ['page', 'section', 'version', 'project'].forEach(key => url.searchParams.delete(key));
      history.replaceState(null, '', url);
    }
  });

  const params = new URLSearchParams(location.search);
  if (['collection', 'visit-tasks', 'questionnaires', 'data-sources'].includes(params.get('page'))) {
    const projectId = params.get('project') || 'SYX-ML46252';
    const card = [...document.querySelectorAll('#trial-grid .trial-card')].find(item => item.dataset.projectId === projectId);
    if (card) {
      $('view-detail').dataset.projectId = projectId;
      document.querySelector('#view-detail .detail-title').textContent = card.querySelector('.trial-card-title').textContent.trim();
      document.querySelector('#view-detail .detail-meta').textContent = `项目编号 ${projectId}    最近同步时间 ${card.dataset.syncTime}`;
    }
    const requested = params.get('page');
    const section = requested === 'data-sources' ? 'mapping' : requested === 'questionnaires' ? 'questions' : params.get('section') || 'tasks';
    showView('detail');
    open(params.get('version') || 'V2.0', ['tasks', 'questions', 'mapping'].includes(section) ? section : 'tasks');
  }
})();
