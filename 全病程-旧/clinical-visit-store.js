(() => {
  const storageKey = 'clinical-visit-dates-v1';
  const calendarKey = 'clinical-visit-calendar-v1';
  const key = visit => JSON.stringify([visit.projectId, visit.id]);
  const read = (storageName, name, fallback) => {
    try { return JSON.parse(window[storageName].getItem(name)) || fallback; } catch { return fallback; }
  };
  let memory = {};
  let calendarMemory = null;
  const statusLabels = { inactive: '未激活', activated: '已激活', completed: '已完成', terminated: '已终止' };
  function status(visit) {
    const explicit = visit.visitStatus || visit.state;
    if (visit.state === '已终止' || ['terminated', '已终止'].includes(explicit)) return 'terminated';
    // 实际访视日期代表本次访视已完成；关联任务、资料仍保留各自的处理状态。
    if (visit.actualDate) return 'completed';
    const entry = Object.entries(statusLabels).find(([key, label]) => explicit === key || explicit === label);
    if (entry) return entry[0];
    if (['已执行', '已结束'].includes(explicit)) return 'completed';
    if (explicit === '已访视') return 'completed';
    // 兼容旧的“进行中”记录：没有实际访视日期时归为已激活。
    return 'activated';
  }
  function appointmentStatus(visit) {
    if (visit.appointmentDate) return 'booked';
    const last = (visit.appointmentHistory || []).at(-1);
    return last && (last.action === '取消预约' || last.from && !last.to) ? 'cancelled' : 'unbooked';
  }
  function windowStatus(visit, today) {
    if (status(visit) !== 'activated' || !visit.windowStart || !visit.windowEnd) return '';
    return today < visit.windowStart ? 'upcoming' : today > visit.windowEnd ? 'overdue' : 'window';
  }
  function apply(visit) {
    const saved = read('localStorage', storageKey, memory)[key(visit)];
    return saved ? { ...visit, ...saved } : { ...visit };
  }
  function save(visit) {
    const records = read('localStorage', storageKey, memory);
    records[key(visit)] = {
      appointmentDate: visit.appointmentDate || '', actualDate: visit.actualDate || '',
      appointmentHistory: [...(visit.appointmentHistory || [])], actualHistory: [...(visit.actualHistory || [])],
      ...(visit.state === '已终止' ? { id: visit.id, projectId: visit.projectId, participantId: visit.participantId, name: visit.name, plannedDate: visit.plannedDate, sourceTaskIndices: visit.sourceTaskIndices || [], state: visit.state, terminationReason: visit.terminationReason || '', terminatedAt: visit.terminatedAt || '', terminationHistory: [...(visit.terminationHistory || [])] } : {})
    };
    try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch { /* 当前页面仍保留修改。 */ }
    memory = records;
  }
  function cacheCalendar(data) {
    const snapshot = { projects: data.projects, participants: data.participants, visits: data.visits, today: data.today };
    calendarMemory = snapshot;
    try { sessionStorage.setItem(calendarKey, JSON.stringify(snapshot)); } catch { /* 日历本身不依赖缓存。 */ }
  }
  function directoryVisits(directory, today = directory.source.today) {
    const { source, sourcePeople, participants } = directory;
    const shift = (value, days) => {
      const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const visits = source.visits.map(visit => ({ appointmentHistory: [], actualHistory: [], ...apply(visit), calendar: true })).filter(visit => !visit.removed);
    participants.filter((person, index, list) => list.findIndex(p => p.study === person.study && p.id === person.id) === index && !sourcePeople.some(p => p.study === person.study && p.id === person.id)).forEach((person, index) => {
      [0, 1, 2].forEach(visitIndex => {
        const plannedDate = shift(today, (index % 3 - 1) * 7 + (visitIndex - 1) * 14);
        visits.push({ ...apply({ id: `participant-${person.id}-${visitIndex}`, projectId: person.study, participantId: person.id,
          name: ['筛选期', '第1周期第1天（C1D1）', '第1周期第15天（C1D15）'][visitIndex], visitIndex, plannedDate,
          windowStart: shift(plannedDate, -2), windowEnd: shift(plannedDate, 2), appointmentDate: visitIndex === 1 && index % 2 === 0 ? plannedDate : '',
          actualDate: visitIndex === 0 && plannedDate < today ? plannedDate : '', appointmentHistory: [], actualHistory: [],
          state: ['研究结束', '筛选失败'].includes(person.status) ? '已终止' : '已激活', hospital: person.hospital }), calendar: false });
      });
    });
    return visits;
  }
  function fromTasks(tasks, projects, organizations = []) {
    const people = new Map();
    const visitGroups = new Map();
    tasks.execute.forEach((task, index) => {
      if (task.removed) return;
      const projectId = task.projectId || projects[0].id;
      const group = task.group || (task.id === 'S001' && projectId === projects[0].id ? '乳腺肿瘤一组' : '');
      const org = organizations.find(item => item.group === group) || {};
      const person = { id: task.id, projectId, name: task.name, status: task.status, sex: task.sex, age: task.age, ...org, hospital: task.hospital || org.hospital, department: task.department || org.department, group };
      const personKey = JSON.stringify([projectId, task.id]);
      if (!people.has(personKey) || task.state === '待执行') people.set(personKey, person);
      const dates = (task.window || '').match(/\d{4}[/-]\d{2}[/-]\d{2}/g) || [];
      const date = task.date.replaceAll('/', '-');
      const visit = {
        id: task.visitId || `task-${index}`, projectId, participantId: task.id, name: task.cycle,
        date, plannedDate: tasks.planDate(task).replaceAll('/', '-'),
        windowStart: dates[0]?.replaceAll('/', '-') || date, windowEnd: dates[1]?.replaceAll('/', '-') || date,
        appointmentDate: task.appointmentDate || (index === 0 && projectId === projects[0].id ? '2026-09-29' : ''),
        actualDate: task.actualDate || task.executedAt?.slice(0, 10) || '',
        appointmentHistory: task.appointmentHistory || [], actualHistory: task.actualHistory || [], state: task.state, visitStatus: task.visitStatus || '', removed: task.removed,
        sourceTaskIndex: index, sourceTaskIndices: [index], visitIndex: task.visitIndex ?? (/C1D1[）)]/.test(task.cycle) ? 1 : /C1D15/.test(task.cycle) ? 2 : 0), hospital: person.hospital, department: person.department, group,
        tasks: [task.state === '待执行' ? '待执行访视计划' : task.state, ...(task.content || '').split('、')].filter(Boolean)
      };
      const identity = JSON.stringify([projectId, task.id, task.visitId || [task.cycle, visit.plannedDate, visit.windowStart, visit.windowEnd]]);
      const existing = visitGroups.get(identity);
      if (existing) {
        existing.sourceTaskIndices.push(index);
        existing.tasks = [...new Set([...existing.tasks, ...visit.tasks])];
        if (task.state === '待执行') existing.state = task.state;
        existing.actualDate ||= visit.actualDate;
        existing.appointmentDate ||= visit.appointmentDate;
      } else visitGroups.set(identity, visit);
    });
    const visits = [...visitGroups.values()].map(apply);
    return { projects, participants: [...people.values()], visits, today: tasks.today };
  }
  window.clinicalVisitStore = { apply, save, cacheCalendar, fromTasks, directoryVisits, status, statusLabels, appointmentStatus, windowStatus, calendar: () => read('sessionStorage', calendarKey, calendarMemory), terminatedVisits: () => Object.values(read('localStorage', storageKey, memory)).filter(visit => visit.state === '已终止' && visit.id) };
})();
