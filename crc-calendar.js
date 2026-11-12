(() => {
  const labels = { upcoming: '即将访视', window: '窗口期内访视', overdue: '超窗访视' };
  const todoLabels = { draft: '待发放访视任务', execute: '待执行访视任务', overdue: '逾期待执行访视任务', follow: '待跟进任务', processing: '待数据处理' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parseDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new TypeError(`无效日历日期：${value}`);
    const parsed = new Date(`${value}T12:00:00`);
    if (dateKey(parsed) !== value) throw new TypeError(`无效日历日期：${value}`);
    return parsed;
  };
  const addDays = (value, days) => {
    const date = parseDate(value);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  };
  const weekStart = value => addDays(value, -((parseDate(value).getDay() + 6) % 7));
  const displayDate = value => value ? value.replaceAll('-', '/') : '未安排';
  const shortDate = value => displayDate(value).slice(5);

  function mount(root, options) {
    if (!(root instanceof HTMLElement)) throw new TypeError('请提供日历挂载节点');
    root.classList.add('crc-workbench');
    const controller = new AbortController();
    const listenerOptions = { signal: controller.signal };
    let data, start, activeFilter = '', projectFilter = '', activeVisit = null, returnFocus = null, previousOverflow = '';
    let filters = { hospital: '', department: '', group: '' };
    let onVisitOpen = options.onVisitOpen;
    let onTodoOpen = options.onTodoOpen;
    let onVisitDateChange = options.onVisitDateChange;

    root.innerHTML = `
      <div class="workbench-layout">
      <aside class="workbench-sidebar" aria-label="项目待办与今日重点关注">
        <section class="workbench-side-panel" aria-label="待办任务"><div class="workbench-side-heading"><h2>待办任务</h2><span class="todo-count" aria-label="待办任务数量">0</span></div><div class="workbench-todos"></div></section>
        <section class="workbench-side-panel" aria-label="今日重点关注"><div class="workbench-side-heading"><h2>今日重点关注</h2><span class="focus-count" aria-label="重点关注数量">0</span></div><div class="workbench-focus-list"></div></section>
      </aside>
      <section class="calendar-shell" aria-label="每周访视日历">
        <header class="topbar">
          <div class="calendar-heading"><div class="calendar-heading-title"><i aria-hidden="true"></i><h2>访视管理</h2></div><div class="top-filters" aria-label="日历筛选"><span class="project-select"><select data-project aria-label="项目筛选"></select></span><span class="org-select"><select data-org-combined aria-label="医院、科室、治疗组筛选"></select></span></div></div>
          <div class="calendar-toolbar"><div class="title-block"><h3 aria-live="polite"></h3></div><div class="date-nav" aria-label="日期导航"><button class="nav-btn" type="button" aria-label="上一周" data-action="previous">‹</button><button class="nav-btn" type="button" aria-label="下一周" data-action="next">›</button><button class="today-btn" type="button" data-action="today">今天</button><button class="today-btn" type="button" data-action="all-visits">全部 ›</button></div></div>
        </header>
        <div class="legend" aria-label="访视状态筛选">${Object.entries(labels).map(([type, label]) => `<button class="legend-item" type="button" data-filter="${type}" aria-pressed="false"><i class="dot ${type}" aria-hidden="true"></i><span>${label}</span><span class="legend-count" data-count="${type}">0</span></button>`).join('')}<span class="calendar-summary" data-summary="results" role="status"></span></div>
        <div class="calendar"></div>
      </section>
      </div>
      <div class="drawer-backdrop" data-action="close" hidden></div>
      <aside class="visit-drawer" role="dialog" aria-modal="true" aria-label="参与者访视详情" aria-hidden="true" inert>
        <header class="drawer-head"><div class="drawer-title"><strong data-detail="participant"></strong><span class="enroll-badge" data-detail="enrollment"></span><span data-detail="demographic"></span></div><button class="drawer-close" type="button" data-action="close" aria-label="关闭详情">×</button></header>
        <div class="drawer-body">
          <dl class="detail-list"></dl>
          <section class="visit-date-editor" aria-labelledby="visit-date-editor-title">
            <div class="drawer-section-heading"><h3 id="visit-date-editor-title">访视日期管理</h3><span>计划日期不可修改</span></div>
            <div class="date-editor-row"><label for="visit-appointment-date">预约访视日期</label><input id="visit-appointment-date" type="date" data-date-field="appointment"><button type="button" data-action="save-appointment">保存预约</button></div>
            <div class="date-editor-row"><label for="visit-actual-date">实际访视日期</label><input id="visit-actual-date" type="date" data-date-field="actual"><button type="button" data-action="save-actual">记录实际</button></div>
            <label class="date-reason"><span>调整原因</span><input type="text" maxlength="80" data-date-reason placeholder="超出窗口期时必填"></label>
            <div class="date-editor-meta"><button type="button" class="text-action" data-action="clear-appointment">恢复计划日期</button><p data-date-error role="alert"></p></div>
            <div class="date-history"></div>
          </section>
          <div class="drawer-section-heading task-heading"><h3>关联任务</h3><span data-task-count></span></div>
          <div class="task-stack"></div>
        </div>
        <footer class="drawer-foot"><button class="primary-action" type="button" data-action="participant">查看参与者</button></footer>
      </aside>`;
    const drawer = root.querySelector('.visit-drawer');
    const backdrop = root.querySelector('.drawer-backdrop');
    const getParticipant = visit => data.participants.find(participant => participant.projectId === visit.projectId && participant.id === visit.participantId);
    const organization = visit => {
      const participant = getParticipant(visit);
      return Object.fromEntries(['hospital', 'department', 'group'].map(field => [field, visit[field] || participant?.[field] || '未分配']));
    };
    const status = visit => data.today > visit.windowEnd ? 'overdue' : data.today < visit.windowStart ? 'upcoming' : 'window';
    const calendarDate = visit => visit.actualDate || visit.appointmentDate || visit.plannedDate;
    const taskLabel = task => typeof task === 'string' ? task : task?.name || task?.title || task?.label || '未命名任务';
    const projectVisits = () => data.visits.filter(visit => (!projectFilter || visit.projectId === projectFilter) && !visit.removed && !visit.actualDate && !['已执行', '已完成', '已终止', '无需执行'].includes(visit.state));

    function renderSidebar() {
      const tasks = (data.todoTasks || []).filter(task => (!projectFilter || task.projectId === projectFilter) && !task.removed && !task.handled);
      root.querySelector('.todo-count').textContent = tasks.length;
      root.querySelector('.workbench-todos').innerHTML = Object.entries(todoLabels).map(([type, label]) => {
        const count = tasks.filter(task => task.type === type).length;
        return `<button type="button" class="workbench-todo${type === 'overdue' ? ' todo-overdue' : ''}" data-todo="${type}" aria-label="${label} ${count}项"><span>${label}</span><strong>${count}</strong><span class="todo-chevron" aria-hidden="true">›</span></button>`;
      }).join('');
      const configuredFocus = (data.focusItems || []).map(item => ({ ...item, visit: projectVisits().find(visit => visit.id === item.visitId) })).filter(item => item.visit).filter(item => {
        const org = organization(item.visit);
        return Object.entries(filters).every(([field, value]) => !value || org[field] === value);
      }).slice(0, 1);
      if (data.focusItems?.length) {
        root.querySelector('.focus-count').textContent = String(configuredFocus.length);
        root.querySelector('.workbench-focus-list').innerHTML = configuredFocus.length ? (() => {
          const item = configuredFocus[0];
          return `<button type="button" class="workbench-focus compact ${escape(item.tone || 'amber')}" data-visit="${escape(item.visit.id)}" aria-label="重点关注 ${escape(item.title)} ${escape(item.note)}"><strong class="focus-title">${escape(item.title)}</strong><span class="focus-note">${escape(item.note)}</span></button>`;
        })() : '<p class="focus-empty">当前筛选下暂无重点关注访视</p>';
        return;
      }
      const focuses = projectVisits().filter(visit => {
        const org = organization(visit);
        return Object.entries(filters).every(([field, value]) => !value || org[field] === value);
      }).map(visit => {
        if (status(visit) === 'completed') return null;
        if (visit.windowEnd < data.today) return { visit, tone: 'red', priority: 0, label: '超窗待访视', note: '已超出访视窗口，请及时跟进' };
        if (visit.windowEnd === data.today) return { visit, tone: 'amber', priority: 1, label: '窗口末日', note: '今日为窗口期内最后一天访视日' };
        if (visit.plannedDate < data.today) return { visit, tone: 'red', priority: 2, label: '逾期待执行', note: '已超过预约访视日期，请及时跟进' };
        if (visit.plannedDate === data.today) return { visit, tone: 'blue', priority: 3, label: '今日访视', note: '今日预约访视，待执行' };
        return null;
      }).filter(Boolean).sort((first, second) => first.priority - second.priority || first.visit.plannedDate.localeCompare(second.visit.plannedDate));
      root.querySelector('.focus-count').textContent = focuses.length;
      root.querySelector('.workbench-focus-list').innerHTML = focuses.map(({ visit, tone, label, note }) => `<button type="button" class="workbench-focus ${tone}" data-visit="${escape(visit.id)}" aria-label="重点关注 ${escape(visit.participantId)} ${escape(visit.name)} ${label}"><span class="focus-top"><strong>${escape(visit.participantId)}</strong><span class="focus-badge">${label}</span></span><span class="focus-visit">${escape(visit.name)}</span><span class="focus-note">${note}</span><span class="focus-date">预约 ${displayDate(visit.plannedDate)} · 窗口截止 ${shortDate(visit.windowEnd)}</span></button>`).join('') || '<p class="focus-empty">今日暂无重点关注访视</p>';
    }

    function renderFilters() {
      const projectSelect = root.querySelector('[data-project]');
      const projects = data.projects?.length ? data.projects : [data.project];
      projectSelect.innerHTML = '<option value="">全部项目</option>' + projects.map(project => `<option value="${escape(project.id)}">${escape(`${project.id} ${project.name}`)}</option>`).join('');
      projectSelect.value = projectFilter;
      const selectedProject = projects.find(project => project.id === projectFilter);
      const organizations = [...data.organizations.filter(org => !selectedProject?.groups?.length || selectedProject.groups.includes(org.group)), ...projectVisits().map(organization)];
      const uniqueOrganizations = [...new Map(organizations.map(org => {
        const normalized = { hospital: org.hospital || '未分配', department: org.department || '未分配', group: org.group || '未分配' };
        return [JSON.stringify(normalized), normalized];
      })).values()];
      const selectedOrganization = filters.hospital || filters.department || filters.group ? JSON.stringify(filters) : '';
      if (selectedOrganization && !uniqueOrganizations.some(org => JSON.stringify(org) === selectedOrganization)) filters = { hospital: '', department: '', group: '' };
      const organizationSelect = root.querySelector('[data-org-combined]');
      organizationSelect.innerHTML = '<option value="">全部医院/科室/治疗组</option>' + uniqueOrganizations.map(org => {
        const value = JSON.stringify(org);
        return `<option value="${escape(value)}">${escape(`${org.hospital} / ${org.department} / ${org.group}`)}</option>`;
      }).join('');
      organizationSelect.value = filters.hospital || filters.department || filters.group ? JSON.stringify(filters) : '';
    }

    function render() {
      renderSidebar();
      const end = addDays(start, 6);
      root.querySelector('.title-block h3').textContent = `${displayDate(start)}–${displayDate(end)}`;
      const eligible = projectVisits().filter(visit => {
        const org = organization(visit);
        const displayedDate = calendarDate(visit);
        return displayedDate >= start && displayedDate <= end && Object.entries(filters).every(([field, value]) => !value || org[field] === value);
      });
      Object.keys(labels).forEach(type => {
        root.querySelector(`[data-count="${type}"]`).textContent = eligible.filter(visit => status(visit) === type).length;
        const button = root.querySelector(`[data-filter="${type}"]`);
        button.classList.toggle('is-active', activeFilter === type);
        button.setAttribute('aria-pressed', String(activeFilter === type));
      });
      const visible = eligible.filter(visit => !activeFilter || status(visit) === activeFilter);
      root.querySelector('[data-summary="results"]').textContent = visible.length ? `本周 ${visible.length} 项访视` : '本周暂无匹配访视';
      root.querySelector('.calendar').innerHTML = Array.from({ length: 7 }, (_, index) => {
        const day = addDays(start, index);
        const visits = visible.filter(visit => calendarDate(visit) === day);
        const participantCount = new Set(visits.map(visit => JSON.stringify([visit.projectId, visit.participantId]))).size;
        return `<article class="day-column" aria-label="${day}"><div class="day-head${day === data.today ? ' today' : ''}"><strong>${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parseDate(day).getDay()]}</strong><span class="day-meta"><span>${shortDate(day)}${day === data.today ? ' · 今天' : ''}</span><span class="day-participants" aria-label="${participantCount}位参与者"><i aria-hidden="true"></i>${participantCount}人</span></span></div>${visits.map(visit => {
          const displayedDate = calendarDate(visit);
          const datePrefix = visit.actualDate ? '实际' : visit.appointmentDate ? '预约' : '计划';
          const dateText = displayedDate === visit.plannedDate ? `${shortDate(displayedDate)}（${shortDate(visit.windowStart)}-${shortDate(visit.windowEnd)}）` : `${datePrefix} ${shortDate(displayedDate)} · 计划 ${shortDate(visit.plannedDate)}`;
          const taskCount = visit.tasks.length;
          return `<button type="button" class="event ${status(visit)}" data-visit="${escape(visit.id)}" aria-label="${escape(`${getParticipant(visit)?.name || ''} ${visit.participantId} ${visit.name} ${labels[status(visit)]}${taskCount ? ` 关联任务${taskCount}项` : ''}`)}"><span class="event-top"><b>${escape(visit.participantId)}</b>${taskCount ? `<span class="event-task${status(visit) === 'overdue' ? ' is-overdue' : ''}" title="关联任务 ${taskCount} 项" aria-label="关联任务 ${taskCount} 项"><i aria-hidden="true"></i>${taskCount}</span>` : ''}</span><span title="${escape(visit.name)}">${escape(visit.name)}</span><span class="window-line"><i class="visit-icon" aria-hidden="true"></i>${escape(dateText)}</span></button>`;
        }).join('') || '<p class="empty-day">暂无访视</p>'}</article>`;
      }).join('');
    }

    function closeDrawer(restoreFocus = true) {
      if (!activeVisit) return;
      activeVisit = null;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.inert = true;
      backdrop.classList.remove('is-open');
      backdrop.hidden = true;
      root.querySelector('.calendar-shell').inert = false;
      root.querySelector('.workbench-sidebar').inert = false;
      document.body.style.overflow = previousOverflow;
      if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    }

    function renderDrawerContent(visit) {
      const participant = getParticipant(visit);
      root.querySelector('[data-detail="participant"]').textContent = `${participant?.name || '未命名'}（${visit.participantId}）`;
      root.querySelector('[data-detail="enrollment"]').textContent = participant?.status || '状态未提供';
      root.querySelector('[data-detail="demographic"]').textContent = [participant?.sex, participant?.age == null ? '' : `${participant.age}岁`].filter(Boolean).join('/');
      const org = organization(visit);
      const details = [
        ['参与试验：', data.projects.find(project => project.id === visit.projectId)?.name || data.project.name],
        ['医院/科室：', `${org.hospital} / ${org.department}`],
        ['治疗组：', org.group],
        ['当前访视：', visit.name],
        ['计划访视日期：', displayDate(visit.plannedDate)],
        ['访视窗口：', `${displayDate(visit.windowStart)}–${displayDate(visit.windowEnd)}`],
        ['预约访视日期：', visit.appointmentDate ? displayDate(visit.appointmentDate) : '未预约'],
        ['实际访视日期：', visit.actualDate ? displayDate(visit.actualDate) : '未执行']
      ];
      drawer.querySelector('.detail-list').innerHTML = details.map(([label, value]) => `<div class="detail-row"><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('') + `<div class="detail-row"><dt>访视状态：</dt><dd><span class="visit-status-badge ${status(visit)}">${labels[status(visit)]}</span></dd></div>`;
      drawer.querySelector('[data-date-field="appointment"]').value = visit.appointmentDate || '';
      drawer.querySelector('[data-date-field="actual"]').value = visit.actualDate || '';
      drawer.querySelector('[data-date-reason]').value = '';
      drawer.querySelector('[data-date-error]').textContent = '';
      const history = [...visit.appointmentHistory, ...visit.actualHistory].sort((first, second) => String(second.at).localeCompare(String(first.at)));
      drawer.querySelector('.date-history').innerHTML = history.length ? `<details><summary>查看日期变更记录（${history.length}）</summary>${history.map(item => `<div class="history-item"><span>${item.type === 'actual' ? '实际日期' : '预约日期'}：${displayDate(item.from)} → ${displayDate(item.to)}</span><small>${escape(item.reason || '未填写原因')} · ${escape(item.at || '')}</small></div>`).join('')}</details>` : '';
      drawer.querySelector('[data-task-count]').textContent = visit.tasks.length ? `${visit.tasks.length} 项` : '';
      drawer.querySelector('.task-stack').innerHTML = visit.tasks.length ? visit.tasks.map(task => `<div class="drawer-task">${escape(taskLabel(task))}</div>`).join('') : '<div class="drawer-task is-empty">暂无关联任务</div>';
    }

    function openDrawer(visit, trigger) {
      if (!activeVisit) previousOverflow = document.body.style.overflow;
      activeVisit = visit;
      returnFocus = trigger;
      renderDrawerContent(visit);
      drawer.inert = false;
      drawer.setAttribute('aria-hidden', 'false');
      drawer.classList.add('is-open');
      backdrop.hidden = false;
      backdrop.classList.add('is-open');
      root.querySelector('.calendar-shell').inert = true;
      root.querySelector('.workbench-sidebar').inert = true;
      document.body.style.overflow = 'hidden';
      drawer.querySelector('.drawer-close').focus();
    }

    function emitDateChange(visit, type, previousValue, nextValue, reason) {
      const project = data.projects.find(item => item.id === visit.projectId) || data.project;
      const detail = { project, visit, type, previousValue, nextValue, reason };
      if (onVisitDateChange) onVisitDateChange(detail);
      else root.dispatchEvent(new CustomEvent('calendar:visit-date-change', { detail, bubbles: true }));
    }

    function updateVisitDate(type) {
      if (!activeVisit) return;
      const field = type === 'actual' ? 'actualDate' : 'appointmentDate';
      const input = drawer.querySelector(`[data-date-field="${type}"]`);
      const error = drawer.querySelector('[data-date-error]');
      const nextValue = input.value;
      const reason = drawer.querySelector('[data-date-reason]').value.trim();
      error.textContent = '';
      if (!nextValue) { error.textContent = `请选择${type === 'actual' ? '实际' : '预约'}访视日期`; input.focus(); return; }
      parseDate(nextValue);
      const outsideWindow = nextValue < activeVisit.windowStart || nextValue > activeVisit.windowEnd;
      if (outsideWindow && !reason) { error.textContent = '日期超出访视窗口，请填写调整原因'; drawer.querySelector('[data-date-reason]').focus(); return; }
      if (outsideWindow && !window.confirm('所选日期超出访视窗口，确认继续保存吗？')) return;
      const previousValue = activeVisit[field] || '';
      if (previousValue === nextValue) { error.textContent = '日期未发生变化'; return; }
      activeVisit[field] = nextValue;
      const historyField = type === 'actual' ? 'actualHistory' : 'appointmentHistory';
      activeVisit[historyField].push({ type, from: previousValue, to: nextValue, reason: reason || (type === 'actual' ? '记录实际访视' : '患者预约调整'), at: new Date().toLocaleString('zh-CN', { hour12: false }) });
      emitDateChange(activeVisit, type, previousValue, nextValue, reason);
      render();
      renderDrawerContent(activeVisit);
    }

    function clearAppointment() {
      if (!activeVisit?.appointmentDate) {
        drawer.querySelector('[data-date-error]').textContent = '当前未设置预约访视日期';
        return;
      }
      const previousValue = activeVisit.appointmentDate;
      const reason = drawer.querySelector('[data-date-reason]').value.trim() || '恢复计划访视日期';
      activeVisit.appointmentDate = '';
      activeVisit.appointmentHistory.push({ type: 'appointment', from: previousValue, to: activeVisit.plannedDate, reason, at: new Date().toLocaleString('zh-CN', { hour12: false }) });
      emitDateChange(activeVisit, 'appointment', previousValue, '', reason);
      render();
      renderDrawerContent(activeVisit);
    }

    function setData(nextData) {
      if (!nextData.project?.id || !nextData.project?.name) throw new TypeError('请提供当前项目 id 和 name');
      const today = nextData.today || dateKey(new Date());
      parseDate(today);
      const visits = (nextData.visits || []).map(visit => {
        if (!visit.id || !visit.projectId || !visit.participantId) throw new TypeError('访视必须包含 id、projectId、participantId');
        const normalized = { ...visit, plannedDate: visit.plannedDate || visit.date, appointmentDate: visit.appointmentDate || '', actualDate: visit.actualDate || '', windowStart: visit.windowStart || visit.date, windowEnd: visit.windowEnd || visit.date, tasks: [...(visit.tasks || [])], appointmentHistory: [...(visit.appointmentHistory || [])], actualHistory: [...(visit.actualHistory || [])] };
        ['date', 'plannedDate', 'windowStart', 'windowEnd'].forEach(field => parseDate(normalized[field]));
        if (normalized.appointmentDate) parseDate(normalized.appointmentDate);
        if (normalized.actualDate) parseDate(normalized.actualDate);
        if (normalized.windowStart > normalized.windowEnd) throw new TypeError('访视窗口开始日期不能晚于结束日期');
        return normalized;
      });
      const keys = visits.map(visit => JSON.stringify([visit.projectId, visit.id]));
      if (new Set(keys).size !== keys.length) throw new TypeError('同一项目的访视 id 不可重复');
      closeDrawer(false);
      const changedProject = data?.project.id !== nextData.project.id;
      data = { ...nextData, project: { ...nextData.project }, projects: (nextData.projects || [nextData.project]).map(project => ({ ...project })), focusItems: (nextData.focusItems || []).map(item => ({ ...item })), today, visits, participants: (nextData.participants || []).map(participant => ({ ...participant })), organizations: (nextData.organizations || []).map(org => ({ ...org })) };
      if (changedProject) { projectFilter = ''; filters = { hospital: '', department: '', group: '' }; activeFilter = ''; }
      start = weekStart(today);
      if (nextData.onVisitOpen) onVisitOpen = nextData.onVisitOpen;
      if (nextData.onTodoOpen) onTodoOpen = nextData.onTodoOpen;
      if (nextData.onVisitDateChange) onVisitDateChange = nextData.onVisitDateChange;
      renderFilters();
      render();
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button, .drawer-backdrop');
      if (!button) return;
      if (button.dataset.todo) {
        const detail = { type: button.dataset.todo, project: data.project };
        if (onTodoOpen) onTodoOpen(detail);
        else root.dispatchEvent(new CustomEvent('calendar:todo-open', { detail, bubbles: true }));
      } else if (button.dataset.visit) {
        const visit = projectVisits().find(item => item.id === button.dataset.visit);
        if (visit) openDrawer(visit, button);
      } else if (button.dataset.filter) {
        activeFilter = activeFilter === button.dataset.filter ? '' : button.dataset.filter;
        render();
      } else {
        const action = button.dataset.action;
        if (action === 'all-visits') {
          const detail = { data, projectId: projectFilter, filters: { ...filters }, start, end: addDays(start, 6), activeFilter };
          if (options.onAllOpen) options.onAllOpen(detail);
          else root.dispatchEvent(new CustomEvent('calendar:all-open', { detail, bubbles: true }));
        }
        if (action === 'close') closeDrawer();
        if (action === 'projects') options.onProjectChange?.();
        if (action === 'save-appointment') updateVisitDate('appointment');
        if (action === 'save-actual') updateVisitDate('actual');
        if (action === 'clear-appointment') clearAppointment();
        if (action === 'participant' && activeVisit) {
          const visit = activeVisit, participant = getParticipant(visit);
          closeDrawer();
          const project = data.projects.find(item => item.id === visit.projectId) || data.project;
          if (onVisitOpen) onVisitOpen({ project, participant, visit });
          else root.dispatchEvent(new CustomEvent('calendar:visit-open', { detail: { project, participant, visit }, bubbles: true }));
        }
        if (['previous', 'next', 'today'].includes(action)) {
          start = action === 'today' ? weekStart(data.today) : addDays(start, action === 'previous' ? -7 : 7);
          render();
        }
      }
    }, listenerOptions);
    root.addEventListener('change', event => {
      if (event.target.matches('[data-project]')) {
        projectFilter = event.target.value;
        filters = { hospital: '', department: '', group: '' };
        activeFilter = '';
        renderFilters();
        render();
        return;
      }
      if (event.target.matches('[data-org-combined]')) {
        filters = event.target.value ? JSON.parse(event.target.value) : { hospital: '', department: '', group: '' };
        renderFilters();
        render();
        return;
      }
      const field = event.target.dataset.org;
      if (!field) return;
      filters[field] = event.target.value;
      if (field === 'hospital') { filters.department = ''; filters.group = ''; }
      if (field === 'department') filters.group = '';
      renderFilters();
      render();
    }, listenerOptions);
    document.addEventListener('keydown', event => {
      if (!activeVisit) return;
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
      if (event.key === 'Tab') {
        const buttons = [...drawer.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }, listenerOptions);
    document.addEventListener('focusin', event => {
      if (activeVisit && !drawer.contains(event.target)) drawer.querySelector('.drawer-close').focus();
    }, listenerOptions);
    setData(options);
    return { setData, closeDrawer, destroy() { closeDrawer(false); controller.abort(); root.replaceChildren(); root.classList.remove('crc-workbench'); } };
  }
  window.CRCVisitCalendar = { mount };
})();
