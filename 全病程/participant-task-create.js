// 复用配置中心 v2 新增任务的字段、布局和动态采集规则。
(() => {
 const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const copy = value => JSON.parse(JSON.stringify(value));
 const anchorNames = {visit_date:'访视日期',enrollment_date:'入组日期',randomization_date:'随机日期',first_dose_date:'首次给药日期'};
 const windowUnits = {days:{label:'天',max:365},hours:{label:'时',max:8760},minutes:{label:'分',max:525600}};
  const catalog = [
    ['Q_001', '生命体征记录表'], ['Q_002', '健康状况调查表'], ['Q_003', '人口学资料调查表'],
    ['Q_004', 'ECOG 体能状态问卷'], ['Q_005', '血常规检查记录表'], ['Q_006', '血生化检查记录表'],
    ['Q_007', '合并用药记录表'], ['Q_008', '不良事件随访问卷'], ['Q_009', '治疗情况调查表'],
    ['Q_010', '生活质量问卷'], ['Q_011', '女性生育状态调查表'], ['Q_012', '后续治疗随访问卷'],
    ['Q_013', '用药日记卡', '电子日记卡'], ['Q_014', '检查报告上传表', '上传表单']
  ].map(([id, name, type]) => ({id, name, type: type || '问卷', revision: id === 'Q_010' ? '2' : '1', updatedAt: '2026-08-14T15:30:00+08:00'}));

 window.openParticipantTaskCreator = ({project,participantId,participantName,defaultVisit,onSave}) => {
  document.querySelectorAll('.participant-create-dialog').forEach(dialog=>dialog.remove());
  const directory = window.clinicalParticipantDirectory.create();
  const person = directory.participants.find(p=>p.study===project && p.id===participantId);
  const visits = window.clinicalVisitStore.directoryVisits(directory).filter(v=>v.projectId===project && v.participantId===participantId);
  let editingTaskId=null, templateId='';
  let forms=[...catalog];
  let published=[];
  try {const saved=JSON.parse(localStorage.getItem('ai-edc:collection-config:v3:'+encodeURIComponent(project))||'null');if(saved){forms=[...forms,...(saved.questions||[])].filter((q,i,all)=>all.findIndex(x=>x.id===q.id)===i);published=(saved.versions||[]).filter(v=>v.status==='published'&&v.enabled!==false&&v.visitVersion===person?.protocolVersion).flatMap(v=>(v.tasks||[]).map(t=>({...t,templateName:v.name,templateVersion:v.version})));}}catch{}
  const linkedQuestions=()=>forms;
  const questionOf=task=>forms.find(q=>q.id===task.questionId);
  const activeVersion=()=>({groupMode:'all',groups:[]});
  const $=id=>document.getElementById(id);
  const showToast=message=>{const error=$('vt-task-error');error.textContent=message;error.hidden=false;error.scrollIntoView({block:'nearest'});};
  const context=`<div class="participant-create-context"><strong>${esc(participantName)} · ${esc(participantId)}</strong><span>${esc(project)} ${esc(directory.projectCatalog[project])}</span></div>`;
  function createDialog(id,title,body,footer,className=''){
   const dialog=document.createElement('dialog');dialog.id=id;dialog.className='vt-dialog participant-create-dialog '+className;dialog.setAttribute('aria-labelledby',id+'-title');
   dialog.innerHTML=`<header class="vt-dialog-head"><h2 id="${id}-title">${title}</h2><button type="button" data-close-dialog aria-label="关闭">×</button></header>${body}<footer class="vt-dialog-footer">${footer}</footer>`;
   document.body.append(dialog);dialog.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>dialog.close());return dialog;
  }
  const taskDialog = createDialog('vt-task-dialog', '新增任务', `
    <form id="vt-task-form" novalidate><div class="vt-dialog-body"><p class="vt-error" id="vt-task-error" hidden></p>
      <div class="vt-section"><h3>1. 基础配置</h3><div class="vt-grid">
        <div class="vt-field full"><label class="vt-required" for="vt-task-name">任务名称</label><input id="vt-task-name" maxlength="50" placeholder="请输入任务名称" /></div>
        <div class="vt-field full"><span class="vt-label vt-required">适用访视</span><details class="vt-multi-select vt-visit-picker" id="vt-task-visits-select"><summary><span id="vt-task-visits-text">请选择适用访视</span></summary><div class="vt-multi-options">${visits.map(item => `<label><input type="checkbox" name="vt-task-visits" value="${esc(item.id)}" />${esc(item.name)} · ${esc(item.plannedDate)}</label>`).join('')}</div></details><div class="vt-selected-tags" id="vt-task-visit-tags"></div></div>
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
        <div class="vt-rule" id="vt-time-anchor-rule" hidden><div class="vt-field"><label class="vt-required" for="vt-task-time-anchor">时间基准</label><select id="vt-task-time-anchor">${Object.entries(anchorNames).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div></div>
        <div class="vt-rule" id="vt-continuous-rule" hidden><div class="vt-field"><span class="vt-label vt-required">连续采集范围</span><div class="vt-day-range"><span>从第</span><input id="vt-task-continuous-start" type="number" min="1" max="365" value="1" aria-label="连续采集开始天数" /><span>天开始，连续</span><input id="vt-task-continuous-duration" type="number" min="1" max="365" value="5" aria-label="连续采集天数" /><span>天</span></div><small id="vt-task-continuous-summary">采集范围：第1天至第5天</small></div></div>
        <div class="vt-rule" id="vt-specified-rule" hidden><div class="vt-field"><span class="vt-label vt-required">指定天数</span><div class="vt-day-adder"><span>第</span><input id="vt-task-specified-day" type="number" min="1" max="365" value="1" aria-label="指定采集天数" /><span>天</span><button type="button" class="btn" id="vt-add-specified-day">添加</button></div><div class="vt-selected-tags" id="vt-task-specified-days"></div><small>可添加多个指定天数，点击标签中的 × 可删除。</small></div></div>
        <div class="vt-subsection" id="vt-daily-schedule" hidden><div class="vt-field full"><span class="vt-label vt-required">采集安排</span><div class="vt-schedule-modes"><label><input type="radio" name="vt-task-daily-frequency" value="once" checked />每日一次</label><label><input type="radio" name="vt-task-daily-frequency" value="multiple" />每日多次</label></div><div class="vt-daily-count" id="vt-daily-count-field" hidden><label for="vt-daily-times-count">每日采集次数</label><input id="vt-daily-times-count" type="number" min="2" max="8" value="2" /><span>次</span></div><div class="vt-collection-times" id="vt-task-collection-times"></div></div></div>
      </div>
      <div class="vt-section"><h3>3. 执行配置</h3><div class="vt-field full" id="vt-task-window-field"><span class="vt-label vt-required">时间窗口</span><div class="vt-window-row">
        <label><span>允许提前</span><input id="vt-task-window-before" type="number" min="0" max="365" value="0" /></label>
        <label><span>允许延后</span><input id="vt-task-window-after" type="number" min="0" max="365" value="0" /></label>
        <label class="vt-window-unit"><span>单位</span><select id="vt-task-window-unit"><option value="days">天</option><option value="hours">时</option><option value="minutes">分</option></select></label>
      </div></div>
        <div class="vt-switch-list vt-single-switch"><label class="vt-switch-row" for="vt-task-allow-overdue"><span><strong>逾期执行</strong><small>开启后，超过时间窗口仍允许补充执行。</small></span><span class="vt-switch"><input id="vt-task-allow-overdue" type="checkbox" /><i></i></span></label><label class="vt-switch-row" for="vt-task-auto-map-crf"><span><strong>自动预填CRF</strong><small>开启后，采集数据将按照字段映射配置自动写入CRF。</small></span><span class="vt-switch"><input id="vt-task-auto-map-crf" type="checkbox" checked /><i></i></span></label></div>
      </div>
    </div></form>`, '<button class="btn" data-close-dialog>取消</button><button class="btn" id="vt-save-task">保存任务</button><button class="btn primary" id="vt-issue-task">直接发放</button>', 'vt-task-config-dialog');
  taskDialog.querySelector('.vt-dialog-body').insertAdjacentHTML('afterbegin',context);
  $('vt-time-anchor-rule').insertAdjacentHTML('beforeend','<div class="vt-field" data-create-anchor-date hidden><label class="vt-required" for="vt-anchor-date">基准日期</label><input type="date" id="vt-anchor-date"></div>');
  const radioValue = name => document.querySelector(`[name="${name}"]:checked`)?.value || '';
  function setRadioValue(name, value) {
    document.querySelectorAll(`[name="${name}"]`).forEach(input => { input.checked = input.value === String(value); });
  }
  function syncVisitSelection() {
    const selected = [...document.querySelectorAll('[name=vt-task-visits]:checked')].map(input => input.value);
    $('vt-task-visits-text').textContent = selected.length ? `已选择 ${selected.length} 个访视` : '请选择适用访视';
    $('vt-task-visits-text').classList.toggle('placeholder', !selected.length);
    $('vt-task-visit-tags').innerHTML = selected.map(visit => `<span class="vt-tag">${esc(visits.find(v=>v.id===visit)?.name||visit)}<button type="button" data-remove-visit="${esc(visit)}" aria-label="删除${esc(visit)}">×</button></span>`).join('');
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
      type: row.querySelector('select')?.value || 'fixed',
      time: row.querySelector('input[type=time]').value
    }));
  }
  function renderCollectionTimes(values) {
    const defaults = ['08:00', '12:00', '16:00', '20:00', '22:00', '06:00', '10:00', '18:00'];
    const multiple = radioValue('vt-task-daily-frequency') === 'multiple';
    const source = values?.length ? values.slice(0, 8) : [{type: 'unspecified', time: ''}];
    const requested = Number($('vt-daily-times-count').value);
    const count = multiple ? Math.max(2, Math.min(8, Number.isInteger(requested) ? requested : 2)) : 1;
    const items = Array.from({length: count}, (_, index) => ({
      type: multiple ? 'fixed' : source[0]?.type === 'fixed' ? 'fixed' : 'unspecified',
      time: source[index]?.time ?? defaults[index]
    }));
    $('vt-task-collection-times').innerHTML = items.map((item, index) => `<div class="vt-time-row">
      <span class="vt-time-index">第${index + 1}次</span>${multiple ? '' : `<select aria-label="采集时间类型"><option value="fixed" ${item.type === 'fixed' ? 'selected' : ''}>指定时间</option><option value="unspecified" ${item.type !== 'fixed' ? 'selected' : ''}>当天任意时间</option></select>`}
      <input type="time" value="${esc(item.time)}" aria-label="第${index + 1}次采集时间" ${item.type === 'fixed' ? '' : 'hidden'} />
    </div>`).join('');
  }
  function executionWindowUnit() {
    return $('vt-task-window-unit').value;
  }
  function updateExecutionWindowUnit() {
    const unit = windowUnits[executionWindowUnit()] || windowUnits.days;
    ['vt-task-window-before', 'vt-task-window-after'].forEach(id => { $(id).max = String(unit.max); });
  }
  function readTaskForm() {
    const collectionMethod = radioValue('vt-task-collection-method') || 'questionnaire';
    const question = linkedQuestions().find(item => item.id === $('vt-task-question').value);
    const collectionDateMode = radioValue('vt-task-date-mode') || 'single';
    const collectionTimes = readCollectionTimes();
    const continuousStartDay = Number($('vt-task-continuous-start').value);
    const continuousDuration = Number($('vt-task-continuous-duration').value);
    const version = activeVersion();
    return {
      anchorDate: $('vt-task-time-anchor').value==='visit_date'?'':$('vt-anchor-date').value,
      id: editingTaskId || crypto.randomUUID(), name: $('vt-task-name').value.trim(),
      questionId: collectionMethod === 'questionnaire' ? $('vt-task-question').value : '',
      questionRevision: collectionMethod === 'questionnaire' ? question?.revision || '' : '',
      description: $('vt-task-description').value.trim(), groupMode: version?.groupMode || 'all', groups: copy(version?.groups || []),
      visits: [...document.querySelectorAll('[name=vt-task-visits]:checked')].map(input => input.value),
      collectionMethod, collectionDateMode, mode: collectionDateMode,
      timeAnchor: $('vt-task-time-anchor').value, continuousStartDay, continuousEndDay: continuousStartDay + continuousDuration - 1,
      specifiedDays: specifiedDays(), dailyFrequency: radioValue('vt-task-daily-frequency') || 'once', collectionTimes,
      windowBefore: Number($('vt-task-window-before').value), windowAfter: Number($('vt-task-window-after').value),
      windowUnit: executionWindowUnit(), patientOnly: $('vt-task-patient-only').checked,
      allowOverdue: $('vt-task-allow-overdue').checked, autoMapCrf: $('vt-task-auto-map-crf').checked
    };
  }

  function updateTaskForm() {
    syncVisitSelection();
    const multiple = radioValue('vt-task-daily-frequency') === 'multiple';
    const rows = [...$('vt-task-collection-times').querySelectorAll('.vt-time-row')];
    rows.forEach(row => {
      const select = row.querySelector('select');
      row.querySelector('input[type=time]').hidden = !multiple && select?.value !== 'fixed';
    });
    const task = readTaskForm();
    $('vt-task-question-field').hidden = task.collectionMethod !== 'questionnaire';
    $('vt-time-anchor-rule').hidden = false;
    taskDialog.querySelector('[data-create-anchor-date]').hidden = task.timeAnchor === 'visit_date';
    $('vt-continuous-rule').hidden = task.collectionDateMode !== 'continuous';
    $('vt-specified-rule').hidden = task.collectionDateMode !== 'specified';
    $('vt-daily-schedule').hidden = false;
    $('vt-daily-schedule').classList.toggle('is-single', !multiple);
    $('vt-daily-count-field').hidden = !multiple;
    const duration = Number($('vt-task-continuous-duration').value);
    const continuousEnd = task.continuousStartDay + duration - 1;
    $('vt-task-continuous-summary').textContent = Number.isInteger(task.continuousStartDay) && Number.isInteger(duration) && duration > 0
      ? `采集范围：第${task.continuousStartDay}天至第${continuousEnd}天`
      : '请输入有效的开始天数和连续天数';
    $('vt-task-error').hidden = true;
  }

  $('vt-task-form').addEventListener('input', updateTaskForm);
  $('vt-task-form').addEventListener('change', updateTaskForm);
  document.querySelectorAll('[name=vt-task-daily-frequency]').forEach(input => input.addEventListener('change', () => {
    renderCollectionTimes(readCollectionTimes());
    updateTaskForm();
  }));
  $('vt-daily-times-count').addEventListener('change', () => {
    const count = Math.max(2, Math.min(8, Number($('vt-daily-times-count').value) || 2));
    $('vt-daily-times-count').value = count;
    renderCollectionTimes(readCollectionTimes());
    updateTaskForm();
  });
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
      showToast('指定天数需为1至365天的整数', 'error');
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

  function submitTask(issueImmediately = false){
    const task = readTaskForm();
    let error = '';
    if (!task.name) error = '请输入任务名称';
    else if (!task.visits.length) error = '请选择至少一个适用访视';
    else if (task.collectionMethod === 'questionnaire' && !questionOf(task)) error = '请选择表单';
    else if (!anchorNames[task.timeAnchor]) error = '请选择时间基准';
    else if (task.collectionDateMode === 'continuous' && (!Number.isInteger(task.continuousStartDay) || !Number.isInteger(task.continuousEndDay) || task.continuousStartDay < 1 || task.continuousEndDay < task.continuousStartDay || task.continuousEndDay > 365)) error = '连续采集范围需在第1天至第365天内';
    else if (task.collectionDateMode === 'specified' && !task.specifiedDays.length) error = '请至少添加一个指定天数';
    else if (!task.collectionTimes.length) error = '请配置采集时间';
    else if (task.dailyFrequency === 'once' && task.collectionTimes.length !== 1) error = '每日一次只能配置一个采集时间';
    else if (task.dailyFrequency === 'multiple' && (task.collectionTimes.length < 2 || task.collectionTimes.length > 8 || task.collectionTimes.some(item => item.type !== 'fixed'))) error = '每日多次采集需设置2至8个指定时间';
    else if (task.collectionTimes.some(item => item.type === 'fixed' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) error = '请完整填写固定采集时间';
    else if (new Set(task.collectionTimes.filter(item => item.type === 'fixed').map(item => item.time)).size !== task.collectionTimes.filter(item => item.type === 'fixed').length) error = '固定采集时间不能重复';
    else if (!windowUnits[task.windowUnit]) error = '请选择时间窗口单位';
    else if (![task.windowBefore, task.windowAfter].every(value => Number.isInteger(value) && value >= 0 && value <= windowUnits[task.windowUnit].max)) error = `时间窗口需为0至${windowUnits[task.windowUnit].max}${windowUnits[task.windowUnit].label}的整数`;
    if (error) {
      showToast(error, 'error');
      return;
    }

    try {onSave({...task,questionName:questionOf(task)?.name||'',templateId},visits,{issueImmediately});taskDialog.close();}
    catch(error){showToast(error.message);}
  }
  $('vt-save-task').addEventListener('click',()=>submitTask());
  $('vt-issue-task').addEventListener('click',()=>submitTask(true));
  function openEditor(definition){
    $('vt-task-form').reset();templateId=definition?.id||'';
    $('vt-task-question').innerHTML='<option value="">请选择</option>'+forms.filter(q=>q.type!=='上传表单').map(q=>`<option value="${esc(q.id)}">${esc(q.name)} · 第${esc(q.revision||1)}版</option>`).join('');
    const current={name:'',visits:[],collectionMethod:'questionnaire',questionId:'',description:'',patientOnly:true,collectionDateMode:'single',timeAnchor:'visit_date',continuousStartDay:1,continuousEndDay:5,specifiedDays:[],dailyFrequency:'once',collectionTimes:[{type:'unspecified',time:''}],windowBefore:0,windowAfter:0,windowUnit:'days',allowOverdue:false,autoMapCrf:true,...definition};
    $('vt-task-name').value=current.name;$('vt-task-question').value=current.questionId;
    $('vt-task-description').value=current.description;$('vt-task-patient-only').checked=current.patientOnly;
    setRadioValue('vt-task-collection-method',current.collectionMethod);setRadioValue('vt-task-date-mode',current.collectionDateMode);
    setRadioValue('vt-task-daily-frequency',current.dailyFrequency);$('vt-daily-times-count').value=Math.max(2,current.collectionTimes.length);
    $('vt-task-time-anchor').value=current.timeAnchor;$('vt-task-continuous-start').value=current.continuousStartDay;
    $('vt-task-continuous-duration').value=current.continuousEndDay-current.continuousStartDay+1;
    $('vt-task-window-before').value=current.windowBefore;$('vt-task-window-after').value=current.windowAfter;$('vt-task-window-unit').value=current.windowUnit;
    $('vt-task-allow-overdue').checked=current.allowOverdue;$('vt-task-auto-map-crf').checked=current.autoMapCrf;
    document.querySelectorAll('[name=vt-task-visits]').forEach(input=>{const visit=visits.find(v=>v.id===input.value);input.checked=defaultVisit?visit.id===defaultVisit.id:current.visits.includes(visit.id)||current.visits.includes(visit.name);});
    $('vt-task-visits-select').open=false;renderSpecifiedDays(current.specifiedDays);renderCollectionTimes(current.collectionTimes);updateExecutionWindowUnit();updateTaskForm();
    taskDialog.showModal();$('vt-task-name').focus();
  }
  function seedTemplates(){
    const version=window.clinicalTaskTemplates.seed()[0];
    return version.tasks.map((row,index)=>({id:'seed:'+index,name:row[0],visits:row[1].split('、'),collectionMethod:row[2]==='上传文件'?'upload':'questionnaire',patientOnly:true,description:'',questionId:({'基线健康评估':'Q_002','生活质量评估':'Q_010','每日用药日记':'Q_013','常规治疗记录':'Q_009'})[row[0]]||'',collectionDateMode:row[4]==='连续采集'?'continuous':'single',windowBefore:Number(row[5].match(/提前(\d+)/)?.[1]||0),windowAfter:Number(row[5].match(/延后(\d+)/)?.[1]||0),templateName:person?.protocolVersion==='V2.0'?'任务配置修订':'初始任务配置',templateVersion:person?.protocolVersion||'V1.0'}));
  }
  const templates=published.length?published:seedTemplates();
  const picker=createDialog('participant-task-template-picker','从任务模板选择',`<div class="vt-dialog-body">${context}<div class="vt-field"><label for="participant-task-template-search">任务名称</label><input type="search" id="participant-task-template-search" placeholder="搜索模板任务名称"></div><div class="participant-task-template-options"></div><p class="vt-error" data-template-error hidden></p></div>`,`<button class="btn" data-close-dialog>取消</button><button class="btn primary" data-use-template>下一步</button>`);
  const renderTemplates=()=>{const query=$('participant-task-template-search').value.trim().toLowerCase();picker.querySelector('.participant-task-template-options').innerHTML=templates.map((task,index)=>({task,index})).filter(({task})=>task.name.toLowerCase().includes(query)).map(({task,index})=>`<label class="participant-task-template-option"><input type="radio" name="participant-template-task" value="${index}"><span><strong>${esc(task.name)}</strong><small>${esc(task.templateName)} · ${esc(task.templateVersion)} · ${task.collectionMethod==='upload'?'上传文件':'表单填写'}</small></span></label>`).join('')||'<p class="participant-task-template-empty">暂无匹配任务模板</p>';};
  $('participant-task-template-search').oninput=renderTemplates;
  picker.querySelector('[data-use-template]').onclick=()=>{const selected=picker.querySelector('[name=participant-template-task]:checked');if(!selected){const error=picker.querySelector('[data-template-error]');error.textContent='请选择一个任务模板';error.hidden=false;return;}picker.close();openEditor(templates[Number(selected.value)]);};
  const choice=createDialog('participant-task-create-choice','新增访视任务',`<div class="vt-dialog-body">${context}<div class="participant-task-create-options"><button type="button" data-create-manual><strong>手动创建</strong><span>填写任务内容、采集规则和执行配置</span></button><button type="button" data-create-template><strong>从任务模板选择</strong><span>选择模板任务，核对配置后添加</span></button></div></div>`,`<button class="btn" data-close-dialog>取消</button>`);
  choice.querySelector('[data-create-manual]').onclick=()=>{choice.close();openEditor();};
  choice.querySelector('[data-create-template]').onclick=()=>{choice.close();renderTemplates();picker.showModal();};
  choice.showModal();
 };
})();
