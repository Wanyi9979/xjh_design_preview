(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const formIds = {
    '访视日期':'sv', '方案知情同意':'ic', '子课题知情同意':'subic', '人口学资料':'dm',
    '女性生育状态':'rep', '入组 PIK3CA 检测':'pik3ca', '入排标准':'ie', '生命体征':'vs',
    'ECOG 评分':'ecog', '血常规':'lbhema', '合并用药':'cm', '不良事件':'ae', '血生化':'lbchem',
    '研究用药':'ex', '疗效评估':'rs', '治疗结束':'eot', '末次疗效评估':'rs-final', '后续治疗':'followup'
  };
  const fallbackQuestions = [
    ['Q_001','生命体征记录表'], ['Q_002','健康状况调查表'], ['Q_003','人口学资料调查表'],
    ['Q_004','ECOG 体能状态问卷'], ['Q_005','血常规检查记录表'], ['Q_006','血生化检查记录表'],
    ['Q_007','合并用药记录表'], ['Q_008','不良事件随访问卷'], ['Q_009','治疗情况调查表'],
    ['Q_010','生活质量问卷'], ['Q_011','女性生育状态调查表'], ['Q_012','后续治疗随访问卷'],
    ['Q_013','用药日记卡'], ['Q_014','检查报告上传表']
  ].map(([id, name]) => ({id, name}));
  const sourceFieldFixtures = {
    Q_001: [['体温','TEMP'], ['收缩压','SYSBP'], ['舒张压','DIABP'], ['脉搏','PULSE']],
    Q_002: [['性别','SEX'], ['出生日期','BRTHDTC'], ['身高','HEIGHT'], ['体重','WEIGHT'], ['健康状况说明','HEALTHDESC']],
    Q_003: [['性别','DM_SEX'], ['亚裔','RACE_ASIAN'], ['其他种族','RACE_OTHER'], ['民族','ETHNIC']],
    Q_004: [['ECOG评分','ECOG_SCORE'], ['评估日期','ECOG_DTC']],
    Q_005: [['检查是否完成','LBHEMA_DONE'], ['检查日期','LBHEMA_DTC'], ['检查结果','LBHEMA_RESULT']],
    Q_006: [['检查是否完成','LBCHEM_DONE'], ['检查日期','LBCHEM_DTC'], ['检查结果','LBCHEM_RESULT']],
    Q_007: [['是否使用合并用药','CMYN'], ['药物名称','CMTRT'], ['药物剂量','CMDOSTXT'], ['用药频次','CMDOSFRQ'], ['给药途径','CMROUTE']],
    Q_008: [['是否发生不良事件','AEYN'], ['不良事件名称','AETERM'], ['严重程度','AESEV']],
    Q_009: [['本周期是否治疗','TRTYN'], ['治疗名称','TRTNAME'], ['给药途径','TRTROUTE']],
    Q_010: [['生活质量评分','QOL_SCORE'], ['填写日期','QOL_DTC']],
    Q_011: [['是否绝经','MENOPAUSE'], ['妊娠状态','PREG_STATUS']],
    Q_012: [['是否计划后续治疗','FOLLOWYN'], ['后续治疗方案','FOLLOWTRT']],
    Q_013: [['记录日期','DIARY_DTC'], ['药物名称','DIARY_DRUG'], ['剂量','DIARY_DOSE'], ['服药时间','DIARY_TIME']],
    Q_014: [['报告名称','REPORT_NAME'], ['报告日期','REPORT_DTC'], ['附件','REPORT_FILE']]
  };
  const targetVariables = {
    dm: {'性别':'SEX', '亚裔':'RACE_ASIAN', '其他':'RACE_OTHER', '民族':'ETHNIC'},
    vs: {'体温（℃）':'TEMP', '收缩压（mmHg）':'SYSBP', '舒张压（mmHg）':'DIABP', '脉搏（次/分）':'PULSE', '血压是否异常':'BPABN', '生命体征是否异常':'VSABN'},
    cm: {'是否使用合并用药':'CMYN'}, ae: {'是否发生不良事件':'AEYN', '严重程度':'AESEV'},
    ecog: {'ECOG 评分':'ECOG'}, lbhema: {'检查是否完成':'LBDONE', '检查日期':'LBDTC'},
    lbchem: {'检查是否完成':'LBDONE'}, ex: {'本周期是否用药':'EXYN'}, rs: {'总体疗效':'RSORRES'},
    'rs-final': {'总体疗效':'RSORRES'}, eot: {'结束治疗原因':'DSDECOD'}, followup: {'是否计划后续治疗':'FOLLOWYN'}
  };

  let projectId = 'SYX-ML46252', version = 'V2.0', forms = [], activeId = null, editingMappingId = null;
  let saved = {crfIds: [], mappings: []}, draft = {crfIds: [], mappings: []}, published = null;
  let selectedCrfs = new Set(), hasStoredDraft = false, readFailed = false, pendingAction = null, pendingDeleteAction = null, navigationApproved = false;
  const page = el('visit-data-sources');
  const storageKey = () => `ai-edc:data-sources:v1:${encodeURIComponent(projectId)}:${encodeURIComponent(version)}`;
  const projectQuestions = () => window.VisitTasks ? window.VisitTasks.getQuestions(projectId, version) : fallbackQuestions;
  const sourceFields = questionId => (sourceFieldFixtures[questionId] || []).map(([name, variable]) => ({id: `${questionId}:${variable}`, name, variable}));
  const activeForm = () => forms.find(form => form.id === activeId) || null;
  const mappingsFor = crfId => draft.mappings.filter(mapping => mapping.crfId === crfId);
  const isDirty = () => JSON.stringify(saved) !== JSON.stringify(draft);

  function collectForms() {
    const unique = new Map();
    Object.entries(visitCrfData).forEach(([visit, list]) => list.forEach(rawForm => {
      const id = rawForm.oid || rawForm.id || formIds[rawForm.name];
      if (!id) return;
      if (!unique.has(id)) unique.set(id, {id, name: rawForm.name, visits: [], fields: []});
      const form = unique.get(id);
      if (!form.visits.includes(visit)) form.visits.push(visit);
      rawForm.fields.forEach(rawField => {
        if (form.fields.some(field => field.name === rawField.label)) return;
        const variable = targetVariables[id]?.[rawField.label] || `${id.toUpperCase().replace(/-/g, '_')}_${String(form.fields.length + 1).padStart(2, '0')}`;
        form.fields.push({id: `${id}:${variable}`, name: rawField.label, variable});
      });
    }));
    return [...unique.values()];
  }

  const emptyConfiguration = () => ({crfIds: [], mappings: []});
  function defaultConfiguration() {
    if (projectId !== 'SYX-ML46252' || version !== 'V2.0') return emptyConfiguration();
    const configuration = {crfIds: ['dm', 'vs'], mappings: []};
    const add = (crfId, targetVariable, questionId, sourceVariable) => {
      const target = forms.find(form => form.id === crfId)?.fields.find(field => field.variable === targetVariable);
      const source = sourceFields(questionId).find(field => field.variable === sourceVariable);
      if (target && source) configuration.mappings.push({id: crypto.randomUUID(), crfId, targetFieldId: target.id, sourceQuestionId: questionId, sourceFieldId: source.id});
    };
    add('dm', 'SEX', 'Q_003', 'DM_SEX');
    add('dm', 'ETHNIC', 'Q_003', 'ETHNIC');
    add('vs', 'TEMP', 'Q_001', 'TEMP');
    add('vs', 'SYSBP', 'Q_001', 'SYSBP');
    return configuration;
  }

  function validateConfiguration(configuration) {
    if (!configuration || !Array.isArray(configuration.crfIds) || !Array.isArray(configuration.mappings)) throw Error('Invalid configuration');
    const crfIds = [...new Set(configuration.crfIds)];
    if (crfIds.some(id => !forms.some(form => form.id === id))) throw Error('Invalid CRF');
    const questionIds = new Set(projectQuestions().map(question => question.id));
    const mappingIds = new Set();
    const targetKeys = new Set();
    const normalizedMappings = [];
    configuration.mappings.forEach(mapping => {
      const target = forms.find(form => form.id === mapping.crfId)?.fields.find(field => field.id === mapping.targetFieldId);
      const source = sourceFields(mapping.sourceQuestionId).find(field => field.id === mapping.sourceFieldId);
      if (!mapping.id || mappingIds.has(mapping.id) || !crfIds.includes(mapping.crfId) || !target || !questionIds.has(mapping.sourceQuestionId) || !source) throw Error('Invalid field mapping');
      mappingIds.add(mapping.id);
      const targetKey = `${mapping.crfId}:${mapping.targetFieldId}`;
      if (targetKeys.has(targetKey)) return;
      targetKeys.add(targetKey);
      normalizedMappings.push(clone(mapping));
    });
    return {crfIds, mappings: normalizedMappings};
  }

  function migrateLegacy(mappings) {
    if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) return emptyConfiguration();
    return {crfIds: Object.entries(mappings).filter(([id, ids]) => forms.some(form => form.id === id) && Array.isArray(ids) && ids.length).map(([id]) => id), mappings: []};
  }

  function readConfiguration() {
    published = null; hasStoredDraft = false; readFailed = false;
    const raw = localStorage.getItem(storageKey());
    if (raw === null) return defaultConfiguration();
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.schema === 3) {
        const nextPublished = parsed.published === null ? null : validateConfiguration(parsed.published);
        const nextDraft = parsed.draft === null ? null : validateConfiguration(parsed.draft);
        published = nextPublished; hasStoredDraft = nextDraft !== null;
        return nextDraft || clone(nextPublished || emptyConfiguration());
      }
      if (!parsed || ![1, 2].includes(parsed.schema)) throw Error('Invalid storage');
      const nextPublished = parsed.schema === 1 ? migrateLegacy(parsed.mappings) : parsed.published === null ? null : migrateLegacy(parsed.published);
      const nextDraft = parsed.schema === 2 && parsed.draft !== null ? migrateLegacy(parsed.draft) : null;
      published = nextPublished; hasStoredDraft = nextDraft !== null;
      return nextDraft || clone(nextPublished || emptyConfiguration());
    } catch (error) {
      readFailed = true;
      showToast('无法读取映射配置，请检查浏览器存储后重试');
      return emptyConfiguration();
    }
  }

  function renderScope() {
    if (!draft.crfIds.includes(activeId)) activeId = draft.crfIds[0] || null;
    const term = el('ds-crf-search').value.trim().toLocaleLowerCase();
    const added = forms.filter(form => draft.crfIds.includes(form.id));
    const visible = added.filter(form => form.name.toLocaleLowerCase().includes(term));
    el('ds-crf-list').innerHTML = visible.map(form => `<div class="ds-crf-item${form.id === activeId ? ' active' : ''}">
      <button class="ds-crf-select" data-select-crf="${escape(form.id)}"><strong>${escape(form.name)}</strong><span>${mappingsFor(form.id).length} 条字段映射</span></button>
      <button class="ds-crf-remove" data-remove-crf="${escape(form.id)}" aria-label="移出${escape(form.name)}">移出</button>
    </div>`).join('');
    el('ds-crf-empty').hidden = visible.length > 0;
    el('ds-crf-empty-title').textContent = added.length ? '未找到相关 CRF' : '暂无需要映射的 CRF';
    el('ds-crf-empty-description').textContent = added.length ? '请调整搜索内容' : '点击「添加 CRF」建立映射范围';
  }

  function renderMappings() {
    const form = activeForm();
    const formMappings = form ? mappingsFor(form.id) : [];
    el('ds-add-mapping').disabled = !form || formMappings.length >= form.fields.length;
    el('ds-mapping-subtitle').textContent = form ? form.name : '请先添加并选择 CRF';
    const rows = [];
    form?.fields.forEach(field => {
      const mapping = formMappings.find(item => item.targetFieldId === field.id);
      if (!mapping) return;
      const question = projectQuestions().find(item => item.id === mapping.sourceQuestionId);
      const source = sourceFields(mapping.sourceQuestionId).find(item => item.id === mapping.sourceFieldId);
      rows.push(`<tr><td>${escape(field.name)}</td><td>${escape(field.variable)}</td><td>${escape(form.name)}</td><td>${escape(question?.name || mapping.sourceQuestionId)}</td><td>${escape(source?.name || '—')}</td><td>${escape(source?.variable || '—')}</td><td><div class="ds-row-actions"><button data-edit-mapping="${escape(mapping.id)}">编辑</button><button class="danger" data-delete-mapping="${escape(mapping.id)}">删除</button></div></td></tr>`);
    });
    el('ds-mapping-body').innerHTML = rows.join('');
    el('ds-mapping-empty').hidden = rows.length > 0;
    el('ds-mapping-empty-title').textContent = form ? '暂无字段映射' : draft.crfIds.length ? '请选择 CRF' : '暂无需要映射的 CRF';
    el('ds-mapping-empty-description').textContent = form ? '点击右上角「新增映射」开始配置' : draft.crfIds.length ? '从左侧选择后查看字段映射对应' : '点击左侧「添加 CRF」开始配置';
    el('ds-mapping-total').textContent = `共 ${rows.length} 条映射`;
  }

  function render() { renderScope(); renderMappings(); }

  function availablePickerForms() {
    const term = el('ds-crf-picker-search').value.trim().toLocaleLowerCase();
    const visit = el('ds-crf-picker-visit').value;
    return forms.filter(form => !draft.crfIds.includes(form.id) && form.name.toLocaleLowerCase().includes(term) && (!visit || form.visits.includes(visit)));
  }

  function renderCrfPicker() {
    const available = availablePickerForms();
    el('ds-crf-picker-body').innerHTML = available.length ? available.map(form => `<tr class="${selectedCrfs.has(form.id) ? 'checked' : ''}"><td><input type="checkbox" id="ds-pick-crf-${escape(form.id)}" value="${escape(form.id)}" ${selectedCrfs.has(form.id) ? 'checked' : ''} /></td><td><label for="ds-pick-crf-${escape(form.id)}">${escape(form.name)}</label></td><td>${escape(form.visits.join('、'))}</td></tr>`).join('') : '<tr><td colspan="3" class="ds-picker-empty">暂无可添加的 CRF</td></tr>';
    const selected = available.filter(form => selectedCrfs.has(form.id)).length;
    el('ds-crf-check-all').disabled = !available.length;
    el('ds-crf-check-all').checked = available.length > 0 && selected === available.length;
    el('ds-crf-check-all').indeterminate = selected > 0 && selected < available.length;
    el('ds-add-crf-confirm').disabled = selectedCrfs.size === 0;
  }

  function updateMappingForm() {
    el('ds-mapping-error').hidden = true;
    const target = activeForm()?.fields.find(field => field.id === el('ds-target-field').value);
    const source = sourceFields(el('ds-source-form').value).find(field => field.id === el('ds-source-field').value);
    el('ds-target-variable').value = target?.variable || '';
    el('ds-target-form').value = activeForm()?.name || '';
    el('ds-source-variable').value = source?.variable || '';
  }
  function renderSourceFields(selectedId = '') {
    const fields = sourceFields(el('ds-source-form').value);
    el('ds-source-field').innerHTML = fields.length ? '<option value="">请选择数据来源字段</option>' + fields.map(field => `<option value="${escape(field.id)}">${escape(field.name)}</option>`).join('') : '<option value="">当前表单暂无可用字段</option>';
    el('ds-source-field').disabled = !fields.length;
    el('ds-source-field').value = fields.some(field => field.id === selectedId) ? selectedId : '';
    updateMappingForm();
  }
  function openMappingDialog(mapping = null, targetFieldId = '') {
    const form = activeForm();
    if (!form) return;
    editingMappingId = mapping?.id || null;
    el('ds-mapping-dialog-title').textContent = mapping ? '编辑映射' : '新增映射';
    el('ds-mapping-error').hidden = true;
    const usedTargetIds = new Set(mappingsFor(form.id).filter(item => item.id !== editingMappingId).map(item => item.targetFieldId));
    const availableFields = form.fields.filter(field => !usedTargetIds.has(field.id));
    el('ds-target-field').innerHTML = '<option value="">请选择 CRF 字段</option>' + availableFields.map(field => `<option value="${escape(field.id)}">${escape(field.name)}</option>`).join('');
    el('ds-target-field').value = mapping?.targetFieldId || targetFieldId || '';
    el('ds-source-form').innerHTML = '<option value="">请选择数据来源表单</option>' + projectQuestions().map(question => `<option value="${escape(question.id)}">${escape(question.name)}</option>`).join('');
    el('ds-source-form').value = mapping?.sourceQuestionId || '';
    renderSourceFields(mapping?.sourceFieldId || '');
    updateMappingForm();
    el('ds-mapping-dialog').showModal();
  }
  function openDeleteDialog(title, message, action) {
    el('ds-delete-title').textContent = title;
    el('ds-delete-copy').textContent = message;
    pendingDeleteAction = action;
    el('ds-delete-dialog').showModal();
  }

  function openSources(targetVersion) {
    projectId = el('view-detail').dataset.projectId || 'SYX-ML46252';
    version = targetVersion;
    forms = collectForms();
    saved = readConfiguration();
    draft = clone(saved);
    activeId = draft.crfIds[0] || null;
    el('ds-crf-search').value = '';
    ['visit-version-list', 'visit-version-detail', 'visit-template-config'].forEach(id => el(id).hidden = true);
    el('ds-version-title').textContent = `${version} 数据来源配置`;
    page.hidden = false;
    window.VisitTasks?.onMappingOpen(version);
    render();
  }

  document.querySelectorAll('.configure-data-sources').forEach(button => button.addEventListener('click', () => openSources(button.dataset.version)));
  el('ds-crf-search').addEventListener('input', renderScope);
  el('ds-crf-list').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-crf]');
    if (remove) {
      const form = forms.find(item => item.id === remove.dataset.removeCrf);
      openDeleteDialog('移出映射 CRF？', `移出「${form?.name || ''}」后，该 CRF 的全部字段映射将被清除。`, () => {
        draft.crfIds = draft.crfIds.filter(id => id !== remove.dataset.removeCrf);
        draft.mappings = draft.mappings.filter(mapping => mapping.crfId !== remove.dataset.removeCrf);
        if (activeId === remove.dataset.removeCrf) activeId = draft.crfIds[0] || null;
        const savedSuccessfully = persistConfiguration();
        render();
        if (savedSuccessfully) showToast('CRF 已移出映射范围');
      });
      return;
    }
    const select = event.target.closest('[data-select-crf]');
    if (select) { activeId = select.dataset.selectCrf; render(); }
  });

  el('ds-add-crf').addEventListener('click', () => {
    selectedCrfs.clear();
    el('ds-crf-picker-search').value = '';
    el('ds-crf-picker-visit').innerHTML = '<option value="">全部访视</option>' + Object.keys(visitCrfData).map(visit => `<option value="${escape(visit)}">${escape(visit)}</option>`).join('');
    renderCrfPicker(); el('ds-add-crf-dialog').showModal(); el('ds-crf-picker-search').focus();
  });
  el('ds-crf-picker-search').addEventListener('input', renderCrfPicker);
  el('ds-crf-picker-visit').addEventListener('change', renderCrfPicker);
  el('ds-crf-picker-body').addEventListener('change', event => {
    const input = event.target.closest('input[type=checkbox]');
    if (!input) return;
    input.checked ? selectedCrfs.add(input.value) : selectedCrfs.delete(input.value); renderCrfPicker();
  });
  el('ds-crf-check-all').addEventListener('change', event => {
    availablePickerForms().forEach(form => event.target.checked ? selectedCrfs.add(form.id) : selectedCrfs.delete(form.id));
    renderCrfPicker();
  });
  el('ds-add-crf-confirm').addEventListener('click', () => {
    const added = forms.filter(form => selectedCrfs.has(form.id)).map(form => form.id);
    draft.crfIds.push(...added.filter(id => !draft.crfIds.includes(id)));
    if (!activeId) activeId = added[0] || null;
    const savedSuccessfully = persistConfiguration();
    el('ds-add-crf-dialog').close(); render();
    if (savedSuccessfully) showToast(`已添加 ${added.length} 张 CRF`);
  });

  el('ds-add-mapping').addEventListener('click', () => openMappingDialog());
  el('ds-target-field').addEventListener('change', updateMappingForm);
  el('ds-source-form').addEventListener('change', () => renderSourceFields());
  el('ds-source-field').addEventListener('change', updateMappingForm);
  el('ds-mapping-confirm').addEventListener('click', () => {
    const targetFieldId = el('ds-target-field').value, sourceQuestionId = el('ds-source-form').value, sourceFieldId = el('ds-source-field').value;
    let error = !targetFieldId ? '请选择 CRF 字段' : !sourceQuestionId ? '请选择数据来源表单' : !sourceFieldId ? '请选择数据来源字段' : '';
    if (!error && draft.mappings.some(mapping => mapping.id !== editingMappingId && mapping.crfId === activeId && mapping.targetFieldId === targetFieldId)) error = '该 CRF 字段已配置映射';
    if (error) { el('ds-mapping-error').textContent = error; el('ds-mapping-error').hidden = false; return; }
    const item = {id: editingMappingId || crypto.randomUUID(), crfId: activeId, targetFieldId, sourceQuestionId, sourceFieldId};
    const index = draft.mappings.findIndex(mapping => mapping.id === editingMappingId);
    if (index >= 0) draft.mappings[index] = item; else draft.mappings.push(item);
    const savedSuccessfully = persistConfiguration();
    el('ds-mapping-dialog').close(); render();
    if (savedSuccessfully) showToast(index >= 0 ? '映射已更新' : '映射已新增');
  });
  el('ds-mapping-body').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-mapping]');
    if (edit) return openMappingDialog(draft.mappings.find(mapping => mapping.id === edit.dataset.editMapping));
    const remove = event.target.closest('[data-delete-mapping]');
    if (remove) openDeleteDialog('删除字段映射？', '删除后该数据来源字段将不再映射到当前 CRF 字段。', () => {
      draft.mappings = draft.mappings.filter(mapping => mapping.id !== remove.dataset.deleteMapping);
      const savedSuccessfully = persistConfiguration();
      render();
      if (savedSuccessfully) showToast('字段映射已删除');
    });
  });
  el('ds-delete-confirm').addEventListener('click', () => {
    const action = pendingDeleteAction; pendingDeleteAction = null; el('ds-delete-dialog').close(); action?.();
  });
  el('ds-delete-dialog').addEventListener('close', () => { if (!el('ds-delete-dialog').open) pendingDeleteAction = null; });

  function persistConfiguration() {
    if (readFailed) { showToast('原配置读取异常，请刷新后重试'); return false; }
    try {
      const validated = validateConfiguration(draft);
      const record = {schema: 3, projectId, version, published, draft: validated};
      localStorage.setItem(storageKey(), JSON.stringify(record));
      hasStoredDraft = true; saved = clone(validated); draft = clone(validated);
      return true;
    } catch (error) { showToast('保存失败：配置数据不完整或浏览器存储不可用'); return false; }
  }
  function confirmDiscard(action) {
    if (!isDirty()) return action();
    pendingAction = action; el('ds-confirm-dialog').showModal();
  }
  const leaveSources = () => { page.hidden = true; window.VisitTasks.open(undefined, 'tasks'); };
  el('ds-back').addEventListener('click', () => confirmDiscard(leaveSources));
  el('ds-confirm-action').addEventListener('click', () => {
    const action = pendingAction; pendingAction = null; draft = clone(saved); el('ds-confirm-dialog').close(); action?.();
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
  window.DataSources = {open: openSources, requestLeave: confirmDiscard};
})();
