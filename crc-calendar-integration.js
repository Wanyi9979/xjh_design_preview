(() => {
  const tabs = [...document.querySelectorAll('#clinical-module-tabs [role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const catalog = projects.map(([id, name, , groups]) => ({ id, name, groups }));
  const organizationTree = [
    { hospital: '第一医院', department: '乳腺肿瘤科', groups: ['乳腺肿瘤一组', '乳腺肿瘤二组'] },
    { hospital: '第一医院', department: '胸部肿瘤科', groups: ['胸部肿瘤二组', '肺癌综合治疗组'] },
    { hospital: '第二医院', department: '内分泌科', groups: ['内分泌治疗组', '糖尿病管理组'] }
  ];
  const organizations = organizationTree.flatMap(org => org.groups.map(group => ({ hospital: org.hospital, department: org.department, group })));
  let savedProject;
  try { savedProject = sessionStorage.getItem('clinical-calendar-project'); } catch {}
  let currentProject = catalog.find(project => project.id === new URLSearchParams(location.search).get('project')) || catalog.find(project => project.id === savedProject) || catalog[0];

  function calendarData(project) {
    const legacyProjectId = catalog[0].id;
    const shared = window.clinicalVisitStore.fromTasks(clinicalTasks, catalog, organizations);
    const { visits, participants } = shared;
    const todoTasks = [
      ...clinicalTasks.draft.filter(task => !task.removed && !task.handled).map(task => ({ ...task, type: 'draft' })),
      ...clinicalTasks.pendingTasks().map(task => ({ ...task, type: 'execute' })),
      ...clinicalTasks.pendingTasks().filter(task => clinicalTasks.planDate(task) < clinicalTasks.today).map(task => ({ ...task, type: 'overdue' })),
      ...clinicalTasks.follow.filter(task => !task.removed && !task.handled).map(task => ({ ...task, type: 'follow' })),
      ...clinicalTasks.processing.filter(task => !task.removed && !task.handled).map(task => ({ ...task, type: 'processing' }))
    ].map(task => ({ ...task, projectId: task.projectId || legacyProjectId }));
    const focusVisit = visits.find(visit => visit.participantId === 'S001' && visit.state === '待执行') || visits[0];
    const focusItems = focusVisit ? [{ visitId: focusVisit.id, tone: 'amber', title: 'S001 第一周期第一天（C1D1）', note: '今日为窗口期内最后一天访视日' }] : [];
    const data = { project, projects: catalog, participants, visits, todoTasks, focusItems, organizations, today: clinicalTasks.today, demo: true };
    window.clinicalVisitStore.cacheCalendar(data);
    return data;
  }

  function rememberProject() {
    try { sessionStorage.setItem('clinical-calendar-project', currentProject.id); } catch {}
  }

  const calendar = window.CRCVisitCalendar.mount(document.getElementById('clinical-calendar'), {
    ...calendarData(currentProject),
    onAllOpen: ({ data, projectId, filters, start, end, activeFilter }) => {
      window.clinicalVisitStore.cacheCalendar(data);
      const params = new URLSearchParams({ view: 'visits', source: 'calendar', pending: '1', referenceDate: data.today, start, end });
      if (projectId) params.set('project', projectId);
      if (activeFilter) params.set(activeFilter === 'upcoming' ? 'calendarWindow' : 'window', activeFilter);
      Object.entries(filters).forEach(([field, value]) => { if (value) params.set(field, value); });
      location.href = `项目参与者-Figma.html?${params}`;
    },
    onTodoOpen: ({ type, project }) => {
      const pages = { draft: '待制定访视计划', execute: '待执行访视计划', overdue: '逾期未执行访视', follow: '待跟进参与者', processing: '待数据处理' };
      location.href = pages[type] + '-Figma.html?' + new URLSearchParams({ project: project.id });
    },
    onProjectChange: projectId => {
      const project = catalog.find(item => item.id === projectId);
      if (!project) return;
      currentProject = project;
      calendar.setData(calendarData(currentProject));
      rememberProject();
      const url = new URL(location.href);
      url.searchParams.set('project', currentProject.id);
      url.searchParams.set('tab', 'workbench');
      history.replaceState(null, '', url);
    },
    onVisitDateChange: ({ visit }) => {
      window.clinicalVisitStore.save(visit);
      (visit.sourceTaskIndices || [visit.sourceTaskIndex]).forEach(index => {
        const task = clinicalTasks.execute[index];
        if (!task) return;
        task.appointmentDate = visit.appointmentDate || '';
        task.actualDate = visit.actualDate || '';
        task.appointmentHistory = visit.appointmentHistory.map(item => ({ ...item }));
        task.actualHistory = visit.actualHistory.map(item => ({ ...item }));
      });
    },
    onVisitOpen: ({ project, participant, visit }) => {
      const params = new URLSearchParams({ project: project.id, name: participant?.name || '', id: visit.participantId, status: participant?.status || '筛选中' });
      if (Number.isInteger(visit.visitIndex)) params.set('visitIndex', visit.visitIndex);
      location.href = `项目参与者详情-Figma.html?${params}`;
    }
  });
  window.clinicalCalendar = {
    ...calendar,
    setData(nextData) {
      calendar.setData(nextData);
      window.clinicalVisitStore.cacheCalendar(nextData);
      currentProject = { ...nextData.project };
      rememberProject();
      const url = new URL(location.href);
      url.searchParams.set('project', currentProject.id);
      history.replaceState(null, '', url);
    }
  };

  function selectTab(index, updateURL = true) {
    calendar.closeDrawer();
    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', String(index === tabIndex));
      tab.tabIndex = index === tabIndex ? 0 : -1;
      panels[tabIndex].hidden = index !== tabIndex;
    });
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.set('tab', index === 1 ? 'workbench' : 'overview');
      url.searchParams.set('project', currentProject.id);
      history.replaceState(null, '', url);
    }
    rememberProject();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : 1 - index;
      selectTab(next);
      tabs[next].focus();
    });
  });
  document.getElementById('project-rows').addEventListener('click', event => {
    const link = event.target.closest('[data-calendar-project]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (document.documentElement.dataset.clinicalModule === 'care') return;
    const project = catalog.find(item => item.id === link.dataset.calendarProject);
    if (!project) return;
    event.preventDefault();
    currentProject = project;
    calendar.setData(calendarData(currentProject));
    selectTab(1);
    tabs[1].focus();
  });
  function restoreLocation() {
    const params = new URLSearchParams(location.search);
    const project = catalog.find(item => item.id === params.get('project'));
    if (project && project.id !== currentProject.id) {
      currentProject = project;
      calendar.setData(calendarData(currentProject));
    }
    selectTab(params.get('module') === 'care' || params.get('tab') === 'overview' ? 0 : 1, false);
  }
  window.addEventListener('popstate', restoreLocation);
  restoreLocation();
})();
