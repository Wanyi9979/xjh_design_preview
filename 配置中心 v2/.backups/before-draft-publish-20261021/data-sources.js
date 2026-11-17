(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  // Prototype OIDs are explicit. The production sync adapter must provide CRF IDs
  // and version-specific visit references, rather than deduplicating by display name.
  const formIds = {
    '访视日期':'sv', '方案知情同意':'ic', '子课题知情同意':'subic', '人口学资料':'dm',
    '女性生育状态':'rep', '入组 PIK3CA 检测':'pik3ca', '入排标准':'ie', '生命体征':'vs',
    'ECOG 评分':'ecog', '血常规':'lbhema', '合并用药':'cm', '不良事件':'ae', '血生化':'lbchem',
    '研究用药':'ex', '疗效评估':'rs', '治疗结束':'eot', '末次疗效评估':'rs-final', '后续治疗':'followup'
  };
  const catalog = [
    {id:'Q_001', name:'生命体征记录表'}, {id:'Q_002', name:'健康状况调查表'},
    {id:'Q_003', name:'人口学资料调查表'}, {id:'Q_004', name:'ECOG 体能状态问卷'},
    {id:'Q_005', name:'血常规检查记录表'}, {id:'Q_006', name:'血生化检查记录表'},
    {id:'Q_007', name:'合并用药记录表'}, {id:'Q_008', name:'不良事件随访问卷'},
    {id:'Q_009', name:'治疗情况调查表'}, {id:'Q_010', name:'生活质量问卷'},
    {id:'Q_011', name:'女性生育状态调查表'}, {id:'Q_012', name:'后续治疗随访问卷'}
  ];
  // Project membership is explicit, not inferred from the public questionnaire ID.
  // Only the source prototype's first project currently has a fixture catalog.
  const projectQuestionnaireIds = {'SYX-ML46252': catalog.map(q => q.id)};
  let projectId = 'SYX-ML46252', projectName = 'SUNYIXIAN-III 真实世界研究', version = 'V2.0';
  let forms = [], saved = {}, draft = {}, activeId = null, selectedQuestionnaires = new Set();
  let expandedVisits = new Set(), pendingAction = null, navigationApproved = false;
  const page = el('visit-data-sources');
  const isDirty = () => JSON.stringify(saved) !== JSON.stringify(draft);
  const storageKey = () => `ai-edc:data-sources:v1:${encodeURIComponent(projectId)}:${encodeURIComponent(version)}`;
  const projectQuestions = () => catalog.filter(q => (projectQuestionnaireIds[projectId] || []).includes(q.id));
  const activeForm = () => forms.find(f => f.id === activeId);
  const linkedIds = id => draft[id] || [];

  function collectForms() {
    const unique = new Map();
    Object.entries(visitCrfData).forEach(([visit, list]) => list.forEach(form => {
      const id = form.oid || form.id || formIds[form.name];
      if (!id) return;
      if (!unique.has(id)) unique.set(id, {id, name: form.name, visits: [], variants: []});
      const item = unique.get(id);
      if (!item.visits.includes(visit)) item.visits.push(visit);
      item.variants.push({visit, fields: form.fields});
    }));
    return [...unique.values()];
  }
  function readMappings() {
    const initial = Object.fromEntries(forms.map(f => [f.id, []]));
    if (projectId === 'SYX-ML46252' && version === 'V2.0') {
      initial.vs = ['Q_001', 'Q_002']; initial.dm = ['Q_003'];
    }
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.schema !== 1 || !parsed.mappings || typeof parsed.mappings !== 'object') throw new Error('Invalid stored mapping');
        const allowed = new Set(projectQuestions().map(q => q.id));
        forms.forEach(f => {
          const ids = parsed.mappings[f.id];
          if (ids !== undefined && (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !allowed.has(id)))) throw new Error('Invalid questionnaire ID');
          initial[f.id] = [...new Set(ids || [])];
        });
      }
    } catch (error) {
      showToast('无法读取本地配置，请检查浏览器存储后重试');
    }
    return initial;
  }
  function visibleForms() {
    const term = el('ds-crf-search').value.trim().toLocaleLowerCase();
    const filter = el('ds-status-filter').value;
    return forms.filter(f => f.name.toLocaleLowerCase().includes(term)
      && (filter === 'all' || (filter === 'configured' ? linkedIds(f.id).length > 0 : linkedIds(f.id).length === 0)));
  }
  function render() {
    const visible = visibleForms();
    if (!visible.some(f => f.id === activeId)) activeId = visible[0]?.id || null;
    el('ds-crf-body').innerHTML = visible.map(f => {
      const expanded = expandedVisits.has(f.id);
      const visits = expanded ? f.visits : f.visits.slice(0, 2);
      return `<tr class="${f.id === activeId ? 'active' : ''}" data-crf="${escape(f.id)}">
        <td><button class="ds-crf-button" aria-pressed="${f.id === activeId}" data-select-crf="${escape(f.id)}">${escape(f.name)}</button></td>
        <td><span class="ds-visits">${visits.map(escape).join('<br>')}</span>${f.visits.length > 2 ? `<button class="ds-visits-summary" data-expand-visits="${escape(f.id)}" aria-expanded="${expanded}">${expanded ? '收起' : `另 ${f.visits.length - 2} 个访视`}</button>` : ''}</td></tr>`;
    }).join('');
    el('ds-crf-empty').hidden = visible.length > 0;
    el('ds-crf-total').textContent = `共 ${visible.length} 张 CRF${visible.length !== forms.length ? ` / 全部 ${forms.length} 张` : ''}`;
    renderQuestions();
    updateSaveState();
  }
  function renderQuestions() {
    const form = activeForm();
    el('ds-current-crf').textContent = form?.name || '请选择 CRF';
    el('ds-associate').disabled = !form;
    el('ds-preview').hidden = !form;
    const questions = form ? projectQuestions().filter(q => linkedIds(form.id).includes(q.id)) : [];
    el('ds-questionnaire-body').innerHTML = questions.map(q => `<tr><td>${escape(q.name)}</td><td><code>${escape(q.id)}</code></td><td><button class="btn link" data-remove-questionnaire="${escape(q.id)}" aria-label="移除${escape(q.name)}">移除</button></td></tr>`).join('');
    el('ds-questionnaire-empty').hidden = questions.length > 0;
    el('ds-empty-title').textContent = form ? '暂未关联问卷' : '请选择 CRF';
    el('ds-empty-description').textContent = form ? '点击「关联问卷」选择当前项目的数据来源' : '选择左侧 CRF 后查看关联问卷';
    el('ds-questionnaire-total').textContent = `共 ${questions.length} 份问卷`;
  }
  function updateSaveState() {
    el('ds-save').disabled = !isDirty();
    el('ds-save-status').textContent = isDirty() ? '有未保存的修改，切换 CRF 不会丢失' : '切换 CRF 保留当前修改，保存后统一生效';
    el('ds-save-status').classList.toggle('dirty', isDirty());
  }
  function openSources(targetVersion) {
    projectId = el('view-detail').dataset.projectId || 'SYX-ML46252';
    projectName = document.querySelector('#view-detail .detail-title').textContent;
    version = targetVersion;
    forms = collectForms(); saved = readMappings(); draft = clone(saved);
    activeId = forms.find(f => linkedIds(f.id).length)?.id || forms[0]?.id;
    expandedVisits.clear();
    el('ds-crf-search').value = ''; el('ds-status-filter').value = 'all';
    ['visit-version-list', 'visit-version-detail', 'visit-template-config'].forEach(id => el(id).hidden = true);
    el('ds-version-title').textContent = `${version} 数据来源配置`;
    page.hidden = false;
    render();
  }
  document.querySelectorAll('.configure-data-sources').forEach(button => button.addEventListener('click', () => openSources(button.dataset.version)));
  el('ds-crf-body').addEventListener('click', event => {
    const expander = event.target.closest('[data-expand-visits]');
    if (expander) {
      const id = expander.dataset.expandVisits;
      expandedVisits.has(id) ? expandedVisits.delete(id) : expandedVisits.add(id);
      render();
      el('ds-crf-body').querySelector(`[data-expand-visits="${id}"]`)?.focus({preventScroll:true});
      return;
    }
    const row = event.target.closest('[data-crf]');
    if (!row) return;
    activeId = row.dataset.crf; render();
    el('ds-crf-body').querySelector(`[data-select-crf="${activeId}"]`)?.focus({preventScroll:true});
  });
  el('ds-crf-search').addEventListener('input', render);
  el('ds-status-filter').addEventListener('change', render);
  el('ds-clear-filter').addEventListener('click', () => { el('ds-crf-search').value = ''; el('ds-status-filter').value = 'all'; render(); });

  function pickerQuestions() {
    const term = el('ds-questionnaire-search').value.trim().toLocaleLowerCase();
    return projectQuestions().filter(q => `${q.name} ${q.id}`.toLocaleLowerCase().includes(term));
  }
  function renderPicker() {
    const results = pickerQuestions();
    el('ds-picker-body').innerHTML = results.length ? results.map(q => {
      const linked = linkedIds(activeId).includes(q.id);
      return `<tr class="${selectedQuestionnaires.has(q.id) ? 'checked' : ''}"><td><input type="checkbox" id="ds-pick-${escape(q.id)}" value="${escape(q.id)}" ${selectedQuestionnaires.has(q.id) ? 'checked' : ''} ${linked ? 'disabled' : ''} aria-label="${escape(q.name)}${linked ? '，已关联' : ''}" /></td><td><label for="ds-pick-${escape(q.id)}">${escape(q.name)}</label>${linked ? '<small>已关联</small>' : ''}</td><td>${escape(q.id)}</td></tr>`;
    }).join('') : `<tr><td colspan="3" class="ds-picker-empty">${projectQuestions().length ? '未找到相关问卷，请调整搜索条件' : '当前项目暂无可关联的问卷'}</td></tr>`;
    const selectable = results.filter(q => !linkedIds(activeId).includes(q.id));
    const checked = selectable.filter(q => selectedQuestionnaires.has(q.id)).length;
    const all = el('ds-check-all');
    all.disabled = selectable.length === 0;
    all.checked = selectable.length > 0 && checked === selectable.length;
    all.indeterminate = checked > 0 && checked < selectable.length;
    el('ds-associate-confirm').disabled = ![...selectedQuestionnaires].some(id => !linkedIds(activeId).includes(id));
  }
  el('ds-associate').addEventListener('click', () => {
    if (!activeForm()) return;
    el('ds-dialog-project').textContent = projectName;
    el('ds-dialog-version').textContent = version;
    el('ds-dialog-crf').textContent = activeForm().name;
    selectedQuestionnaires = new Set(linkedIds(activeId));
    el('ds-questionnaire-search').value = '';
    renderPicker(); el('ds-associate-dialog').showModal(); el('ds-questionnaire-search').focus();
  });
  el('ds-questionnaire-search').addEventListener('input', renderPicker);
  el('ds-picker-body').addEventListener('change', event => {
    const input = event.target.closest('input[type=checkbox]');
    if (!input || input.disabled) return;
    input.checked ? selectedQuestionnaires.add(input.value) : selectedQuestionnaires.delete(input.value);
    renderPicker(); el(`ds-pick-${input.value}`)?.focus({preventScroll:true});
  });
  el('ds-check-all').addEventListener('change', event => {
    pickerQuestions().filter(q => !linkedIds(activeId).includes(q.id)).forEach(q => event.target.checked ? selectedQuestionnaires.add(q.id) : selectedQuestionnaires.delete(q.id));
    renderPicker();
  });
  el('ds-associate-confirm').addEventListener('click', () => {
    draft[activeId] = projectQuestions().filter(q => selectedQuestionnaires.has(q.id)).map(q => q.id);
    el('ds-associate-dialog').close(); render();
    showToast('问卷已关联，请保存配置');
  });
  el('ds-questionnaire-body').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-questionnaire]');
    if (!button) return;
    draft[activeId] = linkedIds(activeId).filter(id => id !== button.dataset.removeQuestionnaire);
    render(); showToast('已移除问卷，保存后生效');
  });
  el('ds-save').addEventListener('click', () => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify({schema:1, projectId, version, mappings:draft}));
      saved = clone(draft); updateSaveState(); showToast('数据来源配置已保存');
    } catch (error) { showToast('保存失败：浏览器存储不可用，当前修改已保留'); }
  });
  function confirmDiscard(action) {
    if (!isDirty()) { action(); return; }
    pendingAction = action; el('ds-confirm-dialog').showModal();
  }
  const leaveSources = () => { page.hidden = true; showVisitVersionList(); };
  el('ds-back').addEventListener('click', () => confirmDiscard(leaveSources));
  el('ds-cancel').addEventListener('click', () => confirmDiscard(() => { draft = clone(saved); leaveSources(); }));
  el('ds-confirm-action').addEventListener('click', () => {
    const action = pendingAction; pendingAction = null; draft = clone(saved);
    el('ds-confirm-dialog').close(); action?.();
  });
  document.querySelectorAll('[data-ds-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.addEventListener('click', event => {
    if (navigationApproved || page.hidden || !isDirty()) return;
    const navigation = event.target.closest('.tab, .nav-item[data-view], #back-trials');
    if (!navigation) return;
    event.preventDefault(); event.stopImmediatePropagation();
    confirmDiscard(() => { navigationApproved = true; navigation.click(); navigationApproved = false; });
  }, true);
  window.addEventListener('beforeunload', event => { if (!page.hidden && isDirty()) { event.preventDefault(); event.returnValue = ''; } });
  el('ds-preview').addEventListener('click', () => {
    const form = activeForm(); if (!form) return;
    el('ds-preview-title').textContent = `${form.name} · CRF 预览`;
    // The existing prototype has different field samples per visit; show each
    // distinct sample honestly instead of suggesting all structures are identical.
    const variants = new Map();
    form.variants.forEach(variant => {
      const key = JSON.stringify(variant.fields);
      if (!variants.has(key)) variants.set(key, {fields:variant.fields, visits:[]});
      variants.get(key).visits.push(variant.visit);
    });
    el('ds-preview-body').innerHTML = [...variants.values()].map(variant => `<h3>${variant.visits.map(escape).join('、')}</h3>${variant.fields.map(field => `<div class="config-field"><div class="config-field-title${field.required ? ' required' : ''}">${escape(field.label)}</div>${field.type === 'text' ? `<div class="readonly-input">${escape(field.placeholder || '文本填写项')}</div>` : `<div class="option-list readonly-options">${(field.options || []).map(option => `<span class="readonly-option">${escape(option)}</span>`).join('')}</div>`}</div>`).join('')}`).join('');
    el('ds-preview-dialog').showModal();
  });
  const params = new URLSearchParams(location.search);
  if (params.get('page') === 'data-sources') {
    const requested = params.get('version') || 'V2.0';
    if (['V2.0','V1.1','V1.0'].includes(requested)) {
      showView('detail'); activateTab('visits'); openSources(requested);
    }
  }
})();
