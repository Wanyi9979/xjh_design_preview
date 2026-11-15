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
  const original = structuredClone(versions[0]);
  original.id='v1'; original.name='初始任务配置'; original.version='V1.0'; original.visitVersion='V1.0'; original.description='保留供原版本参与者使用'; original.updated='2026-09-01 09:00';
  versions.push(original);
  const initialProtocol=window.visitProtocols.get(projectId,original.visitVersion);if(initialProtocol)original.tasks[1][1]=initialProtocol.visits.slice(1).join('、');
  const versionFilter = document.getElementById('template-version-filter');
  const nameSearch = document.getElementById('template-name-search');
  versionFilter.insertAdjacentHTML('beforeend', versions.map(item => `<option value="${escape(item.version)}">${escape(item.version)}</option>`).join(''));

  const list = document.getElementById('version-list');
  const rows = document.getElementById('template-task-rows');
  let active = versions[0].id;
  const taskNameSearch = document.getElementById('task-name-search');
  const taskVisitFilter = document.getElementById('task-visit-filter');
  let taskFilterVersion = null;

  function render() {
    const query = nameSearch.value.trim().toLocaleLowerCase();
    const filtered = versions.filter(item => (!versionFilter.value || item.version === versionFilter.value) && item.name.toLocaleLowerCase().includes(query));
    if (!filtered.some(item => item.id === active)) active = filtered[0]?.id || null;
    document.getElementById('version-count').textContent = `共 ${filtered.length} 个版本`;
    document.getElementById('version-empty').hidden = filtered.length > 0;
    document.getElementById('task-empty').hidden = filtered.length > 0;
    document.querySelector('.template-task-table-wrap').hidden = !filtered.length;
    list.innerHTML = filtered.map(version => `<button type="button" class="template-version-card" role="option" data-version="${version.id}" aria-selected="${version.id === active}"><span class="template-version-card-head"><strong>${escape(version.name)}</strong><span class="template-version-tag">${escape(version.version)}</span></span><p class="template-version-description">${escape(version.description)}</p><dl class="template-version-meta"><dt>访视版本</dt><dd><span class="visit-version-tag">${escape(version.visitVersion)}</span></dd><dt>适用分组</dt><dd>${escape(version.groups)}</dd><dt>更新时间</dt><dd>${escape(version.updated)}</dd></dl></button>`).join('');
    const version = versions.find(item => item.id === active);
    document.querySelector('.template-task-filters').hidden = !version;
    if (!version) {
      document.getElementById('task-version-title').textContent = '任务模板';
      document.getElementById('task-version-description').textContent = '';
      document.getElementById('task-count').textContent = '共 0 条任务';
      rows.innerHTML = '';
      return;
    }
    document.getElementById('task-version-title').textContent = `任务模板 ${version.version} · ${version.name}`;
    document.getElementById('task-version-description').textContent = `${version.description} · 访视版本 ${version.visitVersion} · ${version.groups}`;
    renderTasks();
  }
  function renderTasks() {
    const version = versions.find(item => item.id === active);
    if (!version) return;
    if (taskFilterVersion !== active) {
      const previousVisit = taskVisitFilter.value;
      const visits = [...new Set(version.tasks.flatMap(task => task[1].split('、')))];
      taskVisitFilter.innerHTML = '<option value="">全部适用访视</option>' + visits.map(visit => `<option value="${escape(visit)}">${escape(visit === '—' ? '未关联访视' : visit)}</option>`).join('');
      taskVisitFilter.value = visits.includes(previousVisit) ? previousVisit : '';
      taskFilterVersion = active;
    }
    const query = taskNameSearch.value.trim().toLocaleLowerCase();
    const filteredTasks = version.tasks.map((task,index) => ({task,index})).filter(({task}) => task[0].toLocaleLowerCase().includes(query) && (!taskVisitFilter.value || task[1].split('、').includes(taskVisitFilter.value)));
    document.getElementById('task-count').textContent = `共 ${filteredTasks.length} 条任务`;
    rows.innerHTML = filteredTasks.length ? filteredTasks.map(({task,index}) => `<tr><td>${escape(task[0])}</td><td>${escape(task[1])}</td><td>${escape(task[2])}</td><td>${escape(task[3])}</td><td>${escape(task[4])}</td><td>${escape(task[5])}</td><td><button type="button" data-task="${index}">查看</button></td></tr>`).join('') : '<tr><td colspan="7" class="template-task-no-results">未找到匹配的任务，请调整搜索或筛选条件</td></tr>';
  }
  taskNameSearch.addEventListener('input', renderTasks);
  taskVisitFilter.addEventListener('change', renderTasks);
  versionFilter.addEventListener('change', render);
  nameSearch.addEventListener('input', render);
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
    const version = versions.find(item => item.id === active);
    const field = (label,value) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`;
    const descriptions = {
      '基线健康评估':'采集参与者基线健康状况及相关症状。',
      '生活质量评估':'收集参与者在对应访视期间的生活质量及治疗感受。',
      '每日用药日记':'记录每日用药情况及用药后的相关症状。',
      '常规治疗记录':'记录治疗期间的治疗情况及相关变化。',
      '院外报告上传':'上传院外检查报告，保留报告日期及完整检查结果。'
    };
    const times = ['09:00'];
    const days = task[4] === '连续采集' ? [1,2,3,4,5,6,7] : [1];
    document.getElementById('task-detail-content').innerHTML = `
      <section class="template-detail-section"><h3>任务信息</h3><dl class="template-detail-grid">
        ${field('任务名称',task[0])}${field('适用访视',task[1])}${field('采集方式',task[2])}${field('填写方式',task[3])}
        ${field('任务模板',version.version+' · '+version.name)}${field('访视版本',version.visitVersion)}
        ${task[2] === '表单填写' ? `<div><dt>表单</dt><dd><button type="button" data-form-preview="${escape(task[0]+'表')}">${escape(task[0]+'表')}</button></dd></div>` : field('上传内容','院外检查报告')}
        <div class="is-full"><dt>任务说明</dt><dd>${escape(descriptions[task[0]] || task[0]+'相关采集任务。')}</dd></div>
      </dl></section>
      <section class="template-detail-section"><h3>采集配置 <small>配置来源：任务模板</small></h3><dl class="template-detail-grid">
        ${field('采集周期',task[4])}${field('时间基准','访视日期')}${field('采集安排',times.length+'个时段（'+times.join('、')+'）')}${field('时间窗口',task[5])}
        ${field('逾期执行','关闭')}${field('自动映射CRF','关闭')}
      </dl></section>
      <section class="template-detail-section"><h3>执行任务安排 <small>共 ${days.length * times.length} 条</small></h3>
        <p class="template-detail-hint">发放时按参与者的访视日期生成对应计划日期及允许执行窗口。</p>
        <div class="template-detail-plan-wrap"><table class="template-detail-plan"><thead><tr><th>执行任务</th><th>相对基准日期</th><th>采集时间</th><th>允许执行窗口</th></tr></thead><tbody>
        ${days.map((day,index)=>`<tr><td>第${index+1}次</td><td>${day===1?'访视当日':'访视后第'+(day-1)+'天'}</td><td>${times.join('、')}</td><td>${escape(task[5])}</td></tr>`).join('')}
        </tbody></table></div>
      </section>`;
    window.showQuietDialog(dialog);
  });
  dialog.querySelectorAll('[data-task-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  render();
})();
