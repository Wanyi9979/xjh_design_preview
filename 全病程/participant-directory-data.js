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
    const participants = seed.filter((row, index, all) => all.findIndex(other => other[1] === row[1] && other[2] === row[2]) === index).map(([name, id, study, status, rate], index) => ({ name, id, study, status, rate, initials: initials(name), hospital: ['第一医院', '第二医院', '肿瘤专科医院'][index % 3], visitWindow: windows[index], actions: actions(status) }));
    participants.forEach(person => { person.protocolVersion = window.visitProtocols.bind(person.study, person.id, person.protocolVersion); });
    if (new URLSearchParams(location.search).has('planEmbed')) return { participants, projectCatalog };
    const store = window.clinicalVisitStore;
    const source = store.calendar() || store.fromTasks(window.clinicalTasks, Object.entries(projectCatalog).map(([id, name]) => ({ id, name })), [{ hospital: '第一医院', department: '乳腺肿瘤科', group: '乳腺肿瘤一组' }]);
    // 补充跨项目访视演示：今日 2 条、未来 2 条，与已有数据合计为 4 / 3。
    // 使用稳定参与者和访视标识，刷新时不重复生成，也不覆盖预约或实际到访记录。
    const demoShift = days => { const d=new Date(source.today+'T12:00:00');d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
    [
      {id:'S015',name:'吴**',projectId:'CT-2026-001',status:'已入组',protocolVersion:'V1.0',offset:0,booked:true,visit:'第1周期第1天（C1D1）',hospital:'第一医院'},
      {id:'S016',name:'林*',projectId:'HX-LC-II-06',status:'筛选中',protocolVersion:'V2.0',offset:0,booked:false,visit:'筛选期',hospital:'第二医院'},
      {id:'S017',name:'陶**',projectId:'CT-2026-001',status:'随访中',protocolVersion:'V2.0',offset:2,booked:true,visit:'第2周期第1天（C2D1）',hospital:'第一医院'},
      {id:'S018',name:'钱*',projectId:'HX-GI-III-01',status:'已入组',protocolVersion:'V1.0',offset:4,booked:false,visit:'第1周期第15天（C1D15）',hospital:'第一医院'}
    ].forEach(person => {
      if(!source.participants.some(p=>p.projectId===person.projectId&&p.id===person.id))source.participants.push({id:person.id,name:person.name,projectId:person.projectId,status:person.status,protocolVersion:person.protocolVersion,hospital:person.hospital});
      const id='demo-attention-'+person.id;
      if(!source.visits.some(v=>v.projectId===person.projectId&&v.id===id))source.visits.push({id,projectId:person.projectId,participantId:person.id,name:person.visit,protocolVersion:person.protocolVersion,visitIndex:person.visit==='筛选期'?0:person.visit.includes('C1D1）')?1:2,plannedDate:demoShift(person.offset),windowStart:demoShift(person.offset-2),windowEnd:demoShift(person.offset+2),appointmentDate:person.booked?demoShift(person.offset):'',actualDate:'',appointmentHistory:[],actualHistory:[],state:'已激活',hospital:person.hospital});
    });
    source.projects.forEach(project => { projectCatalog[project.id] = project.name; });
    const sourcePeople = source.participants.map(person => ({ ...person, study: person.projectId, initials: initials(person.name), hospital: person.hospital || '未分配' }));
    sourcePeople.forEach(person => {
      const existing = participants.find(p => p.study === person.study && p.id === person.id);
      if (existing) { Object.assign(existing, person); existing.actions = actions(person.status); }
      else participants.push({ ...person, rate: 0, actions: actions(person.status) });
    });
    let participantStates={};try{participantStates=JSON.parse(localStorage.getItem('journey-v2-person-status'))||{};}catch{}
    participants.forEach(person=>{const saved=participantStates[person.study+':'+person.id];if(saved){person.status=saved.status;person.actions=actions(person.status);}});
    participants.forEach(person => { person.protocolVersion = window.visitProtocols.bind(person.study, person.id, person.protocolVersion); });
    const result={participants,projectCatalog,source,sourcePeople};
    const visits=store.directoryVisits(result,source.today);
    participants.forEach(person=>{const own=visits.filter(v=>v.projectId===person.study&&v.participantId===person.id&&store.status(v)!=='inactive');person.rate=own.length?Math.round(own.filter(v=>store.status(v)==='completed').length/own.length*100):0;person.visitWindow=own.some(v=>store.windowStatus(v,source.today)==='overdue')?'超窗待访视':own.some(v=>store.windowStatus(v,source.today)==='window')?'窗口期内访视':'即将访视（7天后访视）';});
    return result;
  }
  window.clinicalParticipantDirectory = { create };
})();
