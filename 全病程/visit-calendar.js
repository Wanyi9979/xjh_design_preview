(() => {
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const parse = value => new Date(`${value}T12:00:00`);
  const dayOfWeek = value => (parse(value).getDay() + 6) % weekdays.length;
  const shortDate = value => value?.slice(5).replace('-', '/') || '—';

  function addDays(value, offset) {
    const date = parse(value);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  window.createVisitCalendar = ({ root, controls, today, dateFor, windowState, actionMarkup, onDateChange }) => {
    const store = window.clinicalVisitStore;
    let selectedDate = today;
    let lastRenderedDate;
    controls.className = 'appointment-calendar-toolbar';
    controls.innerHTML = `
      <div class="appointment-month-actions">
        <button type="button" data-calendar-week="previous" aria-label="上一周">‹</button>
        <button type="button" data-calendar-week="today">今天</button>
        <button type="button" data-calendar-week="next" aria-label="下一周">›</button>
      </div>`;
    function setDate(value) { selectedDate = value; }
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-calendar-week]');
      if (!button) return;
      const action = button.dataset.calendarWeek;
      setDate(action === 'today' ? today : addDays(selectedDate, action === 'next' ? 7 : -7));
      onDateChange();
    });
    setDate(today);

    function card(visit) {
      const state = store.status(visit);
      const period = windowState(visit);
      const identity = `${visit.participantId}（${visit.person.name}）`;
      const schedule = `计划日期 ${visit.plannedDate}，访视窗口 ${visit.windowStart} 至 ${visit.windowEnd}`;
      return `<article class="appointment-card is-${state}" aria-label="${escape(`${identity} ${visit.name} ${store.statusLabels[state]}`)}">
        <div class="appointment-card-head">
          <span class="appointment-card-person" title="${escape(identity)}"><strong>${escape(visit.participantId)}</strong>（${escape(visit.person.name)}）</span>
          ${actionMarkup(visit)}
        </div>
        <div class="appointment-card-visit-line"><span class="appointment-card-name" title="${escape(visit.name)}">${escape(visit.name)}</span></div>
        <div class="appointment-card-dates is-${period}" title="${escape(schedule)}">
          <span class="appointment-window-dot" role="img" aria-label="${escape(store.statusLabels[state])}"></span>
          <span>${escape(shortDate(visit.plannedDate))}${visit.noWindow?'（暂无窗口）':`（${escape(shortDate(visit.windowStart))}~${escape(shortDate(visit.windowEnd))}）`}</span>
        </div>
        <div class="appointment-card-booking">
          ${visit.appointmentDate ? `<span>预约 <time datetime="${escape(visit.appointmentDate)}" title="${escape(visit.appointmentDate)}">${escape(shortDate(visit.appointmentDate))}</time></span>` : `<span class="appointment-unbooked">未预约</span>`}
          ${period === 'overdue' ? '<span class="appointment-overdue">已超窗</span>' : ''}
        </div>
      </article>`;
    }

    function render(visits, invalidRange) {
      const weekStart = addDays(selectedDate, -dayOfWeek(selectedDate));
      const priorScroll = root.querySelector('.appointment-calendar-scroll')?.scrollLeft || 0;
      const dayGroups = new Map();
      for (const visit of visits) {
        const date = dateFor(visit);
        if (!dayGroups.has(date)) dayGroups.set(date, []);
        dayGroups.get(date).push(visit);
      }
      const columns = weekdays.map((weekday, index) => {
        const date = addDays(weekStart, index);
        const isToday = date === today;
        const items = dayGroups.get(date) || [];
        return `<section class="appointment-day${isToday ? ' is-today' : ''}" aria-label="${date}，${items.length}次访视">
          <header><span>${weekday}</span><time datetime="${date}"${isToday ? ' aria-current="date"' : ''}>${shortDate(date)}</time>
            ${isToday ? '<span>今天</span>' : ''}<span class="appointment-day-count">${items.length}次</span></header>
          <div class="appointment-day-visits">${items.length ? items.map(card).join('') : '<span class="appointment-day-empty">暂无访视</span>'}</div>
        </section>`;
      }).join('');
      root.innerHTML = invalidRange ? '<p class="appointment-day-empty" role="status">开始日期不能晚于结束日期，请调整筛选范围</p>'
        : `<div class="appointment-calendar-scroll"><div class="appointment-calendar is-week"><div class="appointment-calendar-grid">${columns}</div></div></div>`;
      const scroll = root.querySelector('.appointment-calendar-scroll');
      if (!scroll) return;
      const columnWidth = scroll.scrollWidth / weekdays.length;
      scroll.scrollLeft = lastRenderedDate === selectedDate ? priorScroll : Math.max(0, dayOfWeek(selectedDate) * columnWidth - (scroll.clientWidth - columnWidth) / 2);
      lastRenderedDate = selectedDate;
    }
    return { render, setDate, get date() { return selectedDate; } };
  };
})();
