(() => {
  const projects = {
    'CT-2026-001': 'HER2 阳性晚期乳腺癌真实世界研究',
    'HX-LC-II-06': '非小细胞肺癌 II 期研究',
    'HX-BC-III-02': '乳腺癌 III 期临床研究',
    'HX-GI-III-01': '消化道肿瘤 III 期研究'
  };
  const seed = [
    ['张**', 'S001', 'CT-2026-001', '已入组', 83],
    ['李**', 'SYS0171', 'HX-LC-II-06', '已入组', 100],
    ['王*', 'SCR0204', 'HX-BC-III-02', '筛选中', 56],
    ['赵*', 'SYS0148', 'HX-GI-III-01', '筛选中', 100],
    ['陈*', 'SYS0091', 'HX-BC-III-02', '研究结束', 100],
    ['周**', 'SYS0193', 'HX-LC-II-06', '筛选失败', 100],
    ['刘*', 'SYS0126', 'HX-BC-III-02', '筛选中', 88],
    ['孙*', 'SYS0109', 'HX-GI-III-01', '研究结束', 100],
    ['孙*', 'SYS0109', 'HX-GI-III-01', '随访中', 81],
    ['孙*', 'SYS0109', 'HX-GI-III-01', '随访中', 81]
  ];
  const initials = name => ({ 张: 'Z', 李: 'L', 王: 'W', 赵: 'Z', 陈: 'C', 周: 'Z', 刘: 'L', 孙: 'S', 吴: 'W', 林: 'L', 陶: 'T', 钱: 'Q' }[name?.[0]] || '') + (name?.includes('**') ? 'XX' : name?.includes('*') ? 'X' : '');
  const actions = status => ['研究结束', '筛选失败'].includes(status) ? ['数据录入', '访视任务'] : ['数据录入', '访视任务', '参与者状态', '访视激活'];
  function create() {
    const projectCatalog = { ...projects };
    const windows = ['窗口期内访视', '窗口期内访视', '超窗待访视', '即将访视（7天后访视）', '窗口期内访视', '超窗待访视', '即将访视（7天后访视）', '窗口期内访视', '超窗待访视', '即将访视（7天后访视）'];
    const participants = seed.map(([name, id, study, status, rate], index) => ({ name, id, study, status, rate, initials: initials(name), hospital: ['第一医院', '第二医院', '肿瘤专科医院'][index % 3], visitWindow: windows[index], actions: actions(status) }));
    if (new URLSearchParams(location.search).has('planEmbed')) return { participants, projectCatalog };
    const store = window.clinicalVisitStore;
    const source = store.calendar() || store.fromTasks(window.clinicalTasks, Object.entries(projectCatalog).map(([id, name]) => ({ id, name })), [{ hospital: '第一医院', department: '乳腺肿瘤科', group: '乳腺肿瘤一组' }]);
    source.projects.forEach(project => { projectCatalog[project.id] = project.name; });
    const sourcePeople = source.participants.map(person => ({ ...person, study: person.projectId, initials: initials(person.name), hospital: person.hospital || '未分配' }));
    sourcePeople.forEach(person => {
      const existing = participants.find(p => p.study === person.study && p.id === person.id);
      if (existing) { Object.assign(existing, person); existing.actions = actions(person.status); }
      else participants.push({ ...person, rate: 0, actions: actions(person.status) });
    });
    return { participants, projectCatalog, source, sourcePeople };
  }
  window.clinicalParticipantDirectory = { create };
})();
