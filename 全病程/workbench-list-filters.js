(() => {
  const project = document.querySelector('[data-wb1-project]');
  const center = document.querySelector('[data-wb1-center]');
  const search = document.querySelector('[data-wb1-participant]');
  const searchField = search.closest('.wb1-filter');
  const form = document.createElement('form');
  form.className = 'wb-list-filters';
  form.setAttribute('aria-label', '任务列表筛选');
  form.innerHTML = `
    <select name="project" aria-label="任务项目筛选">${project.innerHTML}</select>
    <select name="center" aria-label="任务中心筛选">${center.innerHTML}</select>
    <select name="trial" aria-label="试验筛选"><option value="">全部试验</option></select>
    <input name="task" type="search" placeholder="任务名称 / 跟进内容" aria-label="搜索任务名称或跟进内容">
    <div class="wb-list-date-range" role="group" aria-label="日期范围">
      <span data-list-date-label>计划日期</span>
      <input name="start" type="date" aria-label="开始日期">
      <span aria-hidden="true">至</span>
      <input name="end" type="date" aria-label="结束日期">
    </div>
    <select name="visitCycle" aria-label="当前访视周期"><option value="">当前访视周期</option></select>
    <select name="participantStatus" aria-label="参与者状态"><option value="">参与者状态</option></select>
    <select name="executionState" aria-label="处理状态"><option value="">处理状态</option><option value="executed">已处理</option><option value="unexecuted">未处理</option></select>
    <button type="button" data-list-reset>重置</button>`;
  const fields = form.elements;
  const reset = form.querySelector('[data-list-reset]');
  const dateLabel = form.querySelector('[data-list-date-label]');
  const dateRange = dateLabel.parentElement;
  form.prepend(document.querySelector('.wb1-execution-switch'));
  document.querySelector('.wb1-task-panel').insertBefore(form, document.querySelector('.wb1-table-wrap'));

  function setOptions(select, values) {
    const selected = select.value;
    select.replaceChildren(select.options[0], ...[...new Set(values.filter(Boolean))].map(value => new Option(value, value)));
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  function setMode(mode, issueTab = 'draft') {
    const issue = mode === 'issue';
    const processing = mode === 'processing';
    const visitFilters = issue || mode === 'execution';
    form.classList.toggle('is-issue', issue);
    form.classList.toggle('has-visit-filters', visitFilters);
    fields.task.hidden = fields.task.disabled = visitFilters || processing;
    fields.trial.hidden = fields.trial.disabled = !processing;
    fields.task.placeholder = mode === 'appointment' ? '访视名称' : '任务名称 / 跟进内容';
    fields.task.setAttribute('aria-label', mode === 'appointment' ? '搜索访视名称' : '搜索任务名称或跟进内容');
    fields.visitCycle.hidden = fields.visitCycle.disabled = !(visitFilters || processing);
    fields.participantStatus.hidden = fields.participantStatus.disabled = !visitFilters;
    fields.visitCycle.options[0].textContent = processing ? '全部访视' : '当前访视周期';
    fields.visitCycle.setAttribute('aria-label', processing ? '访视筛选' : '当前访视周期');
    fields.executionState.hidden = fields.executionState.disabled = !issue || issueTab !== 'sent';
    const label = visitFilters ? '访视日期' : '计划日期';
    dateLabel.textContent = label;
    dateRange.setAttribute('aria-label', label + '范围');
    form.insertBefore(searchField, visitFilters ? reset : fields.task);
    if (processing) {
      const tasks = window.researchDemo.processingTasks;
      setOptions(fields.trial, tasks.map(row => row.trial));
      setOptions(fields.visitCycle, tasks.map(visitName));
      form.insertBefore(fields.trial, dateRange);
      form.insertBefore(fields.visitCycle, dateRange);
    } else {
      form.insertBefore(fields.visitCycle, fields.participantStatus);
    }
    if (visitFilters) {
      const { taskSets, executionTasks } = window.researchDemo;
      const tasks = issue ? Object.values(taskSets).flat() : executionTasks;
      const people = window.clinicalParticipantDirectory.create().participants;
      setOptions(fields.visitCycle, tasks.map(visitName));
      setOptions(fields.participantStatus, [...people.map(person => person.status), ...tasks.map(row => Array.isArray(row) ? row[7] : row.participantStatus)]);
    }
  }

  form.addEventListener('submit', event => event.preventDefault());
  const notify = () => window.dispatchEvent(new Event('workbench-list-filter-change'));
  form.addEventListener('input', notify);
  form.addEventListener('change', notify);
  function clearFilters() {
    form.reset();
    fields.project.value = project.value;
    fields.center.value = center.value;
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  reset.addEventListener('click', () => {
    form.dispatchEvent(new Event('workbench-list-filter-reset', { bubbles: true }));
    clearFilters();
  });
  const state = () => ({
    project: fields.project.value, center: fields.center.value, search: search.value,
    task: fields.task.disabled ? '' : fields.task.value,
    trial: fields.trial.disabled ? '' : fields.trial.value,
    visitCycle: fields.visitCycle.disabled ? '' : fields.visitCycle.value,
    participantStatus: fields.participantStatus.disabled ? '' : fields.participantStatus.value,
    executionState: fields.executionState.disabled ? '' : fields.executionState.value,
    start: fields.start.value, end: fields.end.value
  });
  const visitName = row => Array.isArray(row) ? row[2] : row.visitFull || row.visit;
  function matches(row, participantStatus) {
    const filters = state();
    const array = Array.isArray(row);
    const name = array ? row[1] : row.task || row.content || row.visit || '';
    const visitDate = form.classList.contains('has-visit-filters') ? row.baselineDate : '';
    const date = (array ? row[9] : visitDate || row.plannedAt || row.plannedDate || row.date || '').slice(0, 10);
    return (!filters.task || name.toLowerCase().includes(filters.task.trim().toLowerCase()))
      && (!filters.start || date >= filters.start) && (!filters.end || date <= filters.end)
      && (!filters.trial || row.trial === filters.trial)
      && (!filters.visitCycle || visitName(row) === filters.visitCycle)
      && (!filters.participantStatus || participantStatus === filters.participantStatus);
  }
  setMode('issue');
  window.workbenchListFilters = { state, inherit: clearFilters, matches, setMode };
})();
