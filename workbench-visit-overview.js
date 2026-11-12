(() => {
  const root = document.querySelector('[data-visit-overview]');
  if (!root) return;
  const today = '2026-10-29';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parse = value => new Date(`${value}T12:00:00`);
  const addDays = (value, count) => { const date = parse(value); date.setDate(date.getDate() + count); return dateKey(date); };
  const shortDate = value => value.slice(5).replace('-', '/');
  const studies = ['SUN真实世界研究', '恒星肺癌观察研究', '启航症状管理研究'];
  const projectIds = ['CT-2026-001', 'HX-LC-II-06', 'HX-GI-III-01'];
  const seeds = [
    ['S001', '张**', 'ZXX', 0, 'C1D1', '2026-10-25', '2026-10-26', '2026-10-26'],
    ['S003', '王*', 'WX', 0, 'C1D1', '2026-10-25', '', ''],
    ['S004', '陈**', 'CXX', 1, '第15天访视', '2026-10-26', '2026-10-26', '2026-10-26'],
    ['S006', '周**', 'ZXX', 1, '筛选访视', '2026-10-27', '2026-10-29', ''],
    ['S008', '陈**', 'CXX', 0, '安全性访视', '2026-10-28', '2026-10-29', '2026-10-29'],
    ['S010', '孙**', 'SXX', 2, '第15天访视', '2026-10-29', '2026-10-29', ''],
    ['S012', '赵*', 'ZX', 2, '预筛选访视', '2026-10-30', '', ''],
    ['S009', '刘*', 'LX', 2, 'C2D1', '2026-10-30', '2026-10-30', ''],
    ['S015', '郑**', 'ZXX', 1, 'C1D15', '2026-10-31', '', ''],
    ['S016', '林*', 'LX', 0, '安全性访视', '2026-11-01', '2026-11-01', ''],
    ['S003', '王*', 'WX', 0, 'C1D15', '2026-11-08', '', ''],
    ['S006', '周**', 'ZXX', 1, 'C1D1', '2026-11-10', '', ''],
    ['S010', '孙**', 'SXX', 2, '安全性访视', '2026-11-12', '2026-11-12', ''],
    ['S008', '陈**', 'CXX', 0, 'C2D1', '2026-11-15', '', '']
  ];
  const storageKey = 'workbench-one-visit-dates-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
  const visits = seeds.map(([participantId, participant, initials, study, name, plannedDate, appointmentDate, actualDate], index) => {
    const id = `wb1-${index}`;
    return { id, participantId, participant, initials, study, name, plannedDate, appointmentDate, actualDate, center: study === 1 ? '第二医院' : '第一医院', windowStart: addDays(plannedDate, -2), windowEnd: addDays(plannedDate, 2), ...(saved[id] || {}) };
  });
  const projectFilter = document.querySelector('[data-wb1-project]');
  const centerFilter = document.querySelector('[data-wb1-center]');
  const search = document.querySelector('[data-wb1-participant]');
  const mask = document.querySelector('[data-calendar-drawer]');
  const detail = mask.querySelector('[data-calendar-detail]');
  const drawer = mask.querySelector('.wvc-drawer');
  let activeVisit = null;
  let returnFocus = null;
  let previousOverflow = '';
  const displayDate = visit => visit.actualDate || visit.appointmentDate || visit.plannedDate;
  const status = visit => visit.actualDate ? 'completed' : visit.windowEnd < today ? 'overdue' : visit.appointmentDate ? 'booked' : 'unbooked';
  const labels = { booked: '已预约', unbooked: '未预约', completed: '已完成', overdue: '超窗未访' };
  const groupLabels = { today: '今日需到访', overdue: '超窗待访视', upcoming: '即将访视（7天内）' };
  const visitGroup = visit => {
    if (visit.actualDate) return '';
    if (visit.windowEnd < today) return 'overdue';
    if (displayDate(visit) <= today) return 'today';
    return displayDate(visit) <= addDays(today, 7) ? 'upcoming' : '';
  };
  const filtered = () => visits.filter(visit => (!projectFilter.value || studies[visit.study] === projectFilter.value) && (!centerFilter.value || visit.center === centerFilter.value) && `${visit.participantId}${visit.participant}${visit.initials}`.toLowerCase().includes(search.value.trim().toLowerCase()));
  // 工作台1每次进入都从全部项目开始，用户仍可手动筛选。
  projectFilter.value = '';
  const initialURL = new URL(location.href);
  if (initialURL.searchParams.has('project')) {
    initialURL.searchParams.delete('project');
    history.replaceState(null, '', initialURL);
  }

  function render() {
    const all = filtered();
    root.innerHTML = Object.entries(groupLabels).map(([group, label]) => {
      const items = all.filter(visit => visitGroup(visit) === group).sort((first, second) => displayDate(first).localeCompare(displayDate(second)) || first.participantId.localeCompare(second.participantId));
      const count = new Set(items.map(visit => `${visit.study}:${visit.participantId}`)).size;
      return `<section class="wb1-visit-group is-${group}" aria-label="${label}"><header class="wb1-visit-group-head"><i class="wb1-status-icon" aria-hidden="true"></i><strong>${label}</strong><span>${count}人</span></header>${items.map(visit => {
        const days = Math.round((parse(today) - parse(visit.windowEnd)) / 86400000);
        const state = group === 'overdue' ? `超窗${days}天` : visit.appointmentDate ? '已预约' : '未预约';
        return `<button type="button" class="wb1-visit-row" data-calendar-visit="${visit.id}" aria-label="${escape(`${visit.participant} ${visit.participantId} ${visit.name} ${state}`)}"><strong>${escape(visit.participant)}（${escape(visit.initials)}）</strong><strong>${escape(visit.participantId)}</strong><span class="wb1-visit-name" title="${escape(visit.name)}">${escape(visit.name)}</span><span title="${escape(`${visit.windowStart} 至 ${visit.windowEnd}`)}">${shortDate(visit.plannedDate)}（±2）</span><span class="wb1-visit-state">${state}</span></button>`;
      }).join('') || '<p class="wb1-visit-empty">暂无匹配访视</p>'}</section>`;
    }).join('');
  }

  function showDrawer(title, markup, trigger) {
    if (mask.hidden) { returnFocus = trigger; previousOverflow = document.body.style.overflow; }
    mask.querySelector('h2').textContent = title;
    detail.innerHTML = markup;
    mask.hidden = false;
    document.body.style.overflow = 'hidden';
    drawer.focus();
  }

  function showVisit(visit, trigger) {
    activeVisit = visit;
    const params = new URLSearchParams({ project: projectIds[visit.study], id: visit.participantId, name: visit.participant, tab: 'data-entry' });
    showDrawer(`${visit.participant}（${visit.participantId}）`, `<div class="wvc-detail-heading"><h3>${escape(visit.name)}</h3><span class="wvc-state is-${status(visit)}">${labels[status(visit)]}</span></div><dl class="wvc-detail-fields">${[['参与试验', studies[visit.study]], ['研究中心', visit.center], ['计划日期', visit.plannedDate], ['访视窗口', `${visit.windowStart} 至 ${visit.windowEnd}`], ['预约日期', visit.appointmentDate || '未预约'], ['实际日期', visit.actualDate || '未记录']].map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><form class="wvc-date-form" data-calendar-form><h3>访视日期管理</h3><label>预约访视日期<input type="date" name="appointment" value="${escape(visit.appointmentDate)}"></label><label>实际访视日期<input type="date" name="actual" max="${today}" value="${escape(visit.actualDate)}"></label><label>调整原因<textarea name="reason" maxlength="500" placeholder="超窗安排、取消预约或修改实际日期时必填"></textarea></label><p class="wvc-form-error" role="alert"></p><button type="submit">保存日期</button></form><a class="wvc-participant-link" href="项目参与者详情-Figma.html?${escape(params)}">进入参与者访视管理 ›</a>`, trigger);
  }

  function closeDrawer() {
    mask.hidden = true;
    document.body.style.overflow = previousOverflow;
    activeVisit = null;
    if (returnFocus?.isConnected) returnFocus.focus();
    else document.querySelector('[data-wb1-all-visits]').focus();
  }

  root.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.calendarVisit) showVisit(visits.find(visit => visit.id === target.dataset.calendarVisit), target);
  });
  mask.addEventListener('click', event => {
    if (event.target === mask || event.target.closest('[data-calendar-close]')) closeDrawer();
  });
  detail.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const appointmentDate = form.elements.appointment.value;
    const actualDate = form.elements.actual.value;
    const reason = form.elements.reason.value.trim();
    const fail = message => { form.querySelector('[role="alert"]').textContent = message; };
    if (actualDate > today) { fail('实际访视日期不能晚于今天'); return; }
    const outside = value => value && (value < activeVisit.windowStart || value > activeVisit.windowEnd);
    if (((appointmentDate !== activeVisit.appointmentDate && (outside(appointmentDate) || !appointmentDate && activeVisit.appointmentDate)) || (actualDate !== activeVisit.actualDate && (outside(actualDate) || activeVisit.actualDate))) && !reason) { fail('请填写本次调整原因'); return; }
    if (appointmentDate === activeVisit.appointmentDate && actualDate === activeVisit.actualDate) { fail('访视日期未发生变化'); return; }
    saved[activeVisit.id] = { appointmentDate, actualDate, reason };
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { fail('日期保存失败，请稍后重试'); return; }
    Object.assign(activeVisit, { appointmentDate, actualDate });
    render();
    showVisit(activeVisit, returnFocus);
    detail.querySelector('[role="alert"]').textContent = '日期已保存，访视列表已更新';
  });
  document.addEventListener('keydown', event => {
    if (mask.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
    if (event.key === 'Tab') {
      const controls = [...drawer.querySelectorAll('button, a, input, textarea')].filter(control => !control.disabled && !control.hidden);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawer)) { event.preventDefault(); first.focus(); }
    }
  });
  [projectFilter, centerFilter].forEach(filter => filter.addEventListener('change', render));
  search.addEventListener('input', render);
  render();
})();
