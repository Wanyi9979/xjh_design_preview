(() => {
  const projects = {
    'CT-2026-001': 'HER2 阳性晚期乳腺癌真实世界研究',
    'HX-LC-II-06': '非小细胞肺癌 II 期研究',
    'HX-BC-III-02': '乳腺癌 III 期临床研究',
    'HX-GI-III-01': '消化道肿瘤 III 期研究'
  };
  const versions = [
    {
      id: 'v2', name: '任务配置修订', version: 'V2.0', description: '由原待发布任务迁移', visitVersion: 'V2.0', groups: '全部组', updated: '2026-10-21 14:30',
      tasks: [
        ['基线健康评估', '筛选期', '表单填写', '仅患者可填', '单次采集', '提前3天 / 延后2天'],
        ['生活质量评估', '第1周期第1天（C1D1）、第2周期第1天（C2D1）、第3周期第15天（C3D15）', '表单填写', '仅患者可填', '单次采集', '提前0天 / 延后2天'],
        ['每日用药日记', '—', '表单填写', '仅患者可填', '连续采集', '提前3天 / 延后2天'],
        ['常规治疗记录', '—', '表单填写', '仅患者可填', '连续采集', '提前3天 / 延后2天'],
        ['院外报告上传', '—', '上传文件', '仅患者可填', '单次采集', '提前3天 / 延后2天']
      ]
    }
  ];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const params = new URLSearchParams(location.search);
  const projectId = params.get('project') || 'CT-2026-001';
  document.getElementById('template-project').textContent = `${projectId} · ${projects[projectId] || '临床研究项目'}`;
  document.getElementById('version-count').textContent = `共 ${versions.length} 个版本`;
  const list = document.getElementById('version-list');
  const rows = document.getElementById('template-task-rows');
  let active = versions[0].id;

  function render() {
    list.innerHTML = versions.map(version => `<button type="button" class="template-version-card" role="option" data-version="${version.id}" aria-selected="${version.id === active}"><span class="template-version-card-head"><strong>${escape(version.name)}</strong><span class="template-version-tag">${escape(version.version)}</span></span><p class="template-version-description">${escape(version.description)}</p><dl class="template-version-meta"><dt>访视版本</dt><dd><span class="visit-version-tag">${escape(version.visitVersion)}</span></dd><dt>适用分组</dt><dd>${escape(version.groups)}</dd><dt>更新时间</dt><dd>${escape(version.updated)}</dd></dl></button>`).join('');
    const version = versions.find(item => item.id === active);
    document.getElementById('task-version-title').textContent = `${version.name} ${version.version}`;
    document.getElementById('task-version-description').textContent = `${version.description} · 访视版本 ${version.visitVersion} · ${version.groups}`;
    document.getElementById('task-count').textContent = `共 ${version.tasks.length} 条任务`;
    rows.innerHTML = version.tasks.map((task, index) => `<tr><td>${escape(task[0])}</td><td>${escape(task[1])}</td><td>${escape(task[2])}</td><td>${escape(task[3])}</td><td>${escape(task[4])}</td><td>${escape(task[5])}</td><td><button type="button" data-task="${index}">查看</button></td></tr>`).join('');
  }
  list.addEventListener('click', event => {
    const card = event.target.closest('[data-version]');
    if (!card) return;
    active = card.dataset.version;
    render();
  });
  const dialog = document.getElementById('task-detail-dialog');
  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-task]');
    if (!button) return;
    const task = versions.find(item => item.id === active).tasks[Number(button.dataset.task)];
    const labels = ['任务名称', '适用访视', '采集方式', '填写方式', '采集周期', '时间窗口'];
    document.getElementById('task-detail-content').innerHTML = task.map((value, index) => `<div class="task-detail-field"><span>${labels[index]}</span><strong>${escape(value)}</strong></div>`).join('');
    dialog.showModal();
  });
  dialog.querySelectorAll('[data-task-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  render();
})();
