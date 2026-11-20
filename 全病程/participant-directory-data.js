(() => {
  const identity = window.demoParticipantIdentity;
  const projects = {
    'CT-2026-001': 'HER2 阳性晚期乳腺癌真实世界研究',
    'HX-LC-II-06': '非小细胞肺癌 II 期研究',
    'HX-BC-III-02': '乳腺癌 III 期临床研究',
    'HX-GI-III-01': '消化道肿瘤 III 期研究'
  };
  const seed = [
    ['S001', 'CT-2026-001', '已入组', 83],
    ['S101', 'HX-LC-II-06', '已入组', 100],
    ['S102', 'HX-BC-III-02', '筛选中', 56],
    ['S103', 'HX-GI-III-01', '筛选中', 100],
    ['S104', 'HX-BC-III-02', '研究结束', 100],
    ['S105', 'HX-LC-II-06', '筛选失败', 100],
    ['S106', 'HX-BC-III-02', '筛选中', 88],
    ['S107', 'HX-GI-III-01', '研究结束', 100]
  ];
  const actions = status => ['研究结束', '筛选失败'].includes(status) ? ['数据录入', '访视任务'] : ['数据录入', '访视任务', '参与者状态', '访视激活'];
  function create() {
    const projectCatalog = { ...projects };
    const windows = ['窗口期内访视', '窗口期内访视', '超窗待访视', '即将访视（7天后访视）', '窗口期内访视', '超窗待访视', '即将访视（7天后访视）', '窗口期内访视', '超窗待访视', '即将访视（7天后访视）'];
    const participants = seed.map(([id, study, status, rate], index) => {
      const name = identity.name(id);
      return { name, id, study, status, rate, initials: name, hospital: ['第一医院', '第二医院', '肿瘤专科医院'][index % 3], visitWindow: windows[index], actions: actions(status) };
    });
    participants.forEach(person => { person.protocolVersion = window.visitProtocols.bind(person.study, person.id, person.protocolVersion); });
    if (new URLSearchParams(location.search).has('planEmbed')) return { participants, projectCatalog };
    const store = window.clinicalVisitStore;
    const snapshot = store.calendar() || store.fromTasks(window.clinicalTasks, Object.entries(projectCatalog).map(([id, name]) => ({ id, name })), [{ hospital: '第一医院', department: '乳腺肿瘤科', group: '乳腺肿瘤一组' }]);
    const source = {
      ...snapshot,
      participants: snapshot.participants.map(person => ({
        ...person, id: identity.canonicalId(person.id), name: identity.name(person.id, person.name)
      })),
      visits: snapshot.visits.map(visit => ({ ...visit, participantId: identity.canonicalId(visit.participantId) }))
    };
    // 补充跨项目访视演示：今日 2 条、未来 2 条，与已有数据合计为 4 / 3。
    // 使用稳定参与者和访视标识，刷新时不重复生成，也不覆盖预约或实际到访记录。
    const demoShift = days => { const d=new Date(source.today+'T12:00:00');d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
    [
      {id:'S015',name:identity.name('S015'),projectId:'CT-2026-001',status:'已入组',protocolVersion:'V1.0',offset:0,booked:true,visit:'第1周期第1天（C1D1）',hospital:'第一医院'},
      {id:'S016',name:identity.name('S016'),projectId:'HX-LC-II-06',status:'筛选中',protocolVersion:'V2.0',offset:0,booked:false,visit:'筛选期',hospital:'第二医院'},
      {id:'S017',name:identity.name('S017'),projectId:'CT-2026-001',status:'随访中',protocolVersion:'V2.0',offset:2,booked:true,visit:'第2周期第1天（C2D1）',hospital:'第一医院'},
      {id:'S018',name:identity.name('S018'),projectId:'HX-GI-III-01',status:'已入组',protocolVersion:'V1.0',offset:4,booked:false,visit:'第1周期第15天（C1D15）',hospital:'第一医院'}
    ].forEach(person => {
      if(!source.participants.some(p=>p.projectId===person.projectId&&p.id===person.id))source.participants.push({id:person.id,name:person.name,projectId:person.projectId,status:person.status,protocolVersion:person.protocolVersion,hospital:person.hospital});
      const id='demo-attention-'+person.id;
      if(!source.visits.some(v=>v.projectId===person.projectId&&v.id===id))source.visits.push({id,projectId:person.projectId,participantId:person.id,name:person.visit,protocolVersion:person.protocolVersion,visitIndex:person.visit==='筛选期'?0:person.visit.includes('C1D1）')?1:2,plannedDate:demoShift(person.offset),windowStart:demoShift(person.offset-2),windowEnd:demoShift(person.offset+2),appointmentDate:person.booked?demoShift(person.offset):'',actualDate:'',appointmentHistory:[],actualHistory:[],state:'已激活',hospital:person.hospital});
    });
    // Stable, editable calendar examples. Existing saved operations take precedence in store.apply().
    const sampleDays=[[-3,'completed'],[-3,'activated'],[-3,'partial'],[-2,'completed'],[-2,'activated'],[-2,'terminated'],[-1,'partial'],[-1,'completed'],[-1,'activated'],[0,'activated'],[0,'activated'],[0,'partial'],[0,'terminated'],[1,'activated'],[1,'activated'],[1,'terminated'],[2,'activated'],[2,'activated'],[3,'activated'],[3,'activated'],[0,'unbooked'],[1,'unbooked'],[2,'unbooked']];
    const sampleProjects=['CT-2026-001','HX-LC-II-06','HX-BC-III-02','HX-GI-III-01'];
    sampleDays.forEach(([offset,state],index)=>{
      const { id: participantId, name: participantName, legacyId } = identity.sampleIds[index];
      const projectId = sampleProjects[index % 4];
      const id = 'calendar-sample-' + legacyId;
      if(!source.participants.some(p=>p.projectId===projectId&&p.id===participantId))source.participants.push({id:participantId,name:participantName,projectId,status:'已入组',protocolVersion:'V1.0',hospital:projectId==='HX-LC-II-06'?'第二医院':'第一医院'});
      if(source.visits.some(v=>v.projectId===projectId&&v.id===id))return;
      const date=demoShift(offset),visitIndex=index%3,name=['筛选期','第1周期第1天（C1D1）','第1周期第15天（C1D15）'][visitIndex];
      const expected=store.executionItems({name,visitIndex});
      source.visits.push({id,projectId,participantId,name,visitIndex,protocolVersion:'V1.0',plannedDate:date,windowStart:demoShift(offset-2),windowEnd:demoShift(offset+2),appointmentDate:state==='unbooked'?'':date,actualDate:state==='completed'?date:'',state:{activated:'已激活',partial:'部分完成',completed:'已完成',terminated:'已终止',unbooked:'已激活'}[state],visitStatus:state==='unbooked'?'activated':state,hospital:projectId==='HX-LC-II-06'?'第二医院':'第一医院',appointmentHistory:state==='unbooked'?[]:[{action:'访视预约',to:date,at:demoShift(-5)+' 10:00',operator:'研究护士',reason:'门诊排期已确认'}],actualHistory:state==='completed'?[{action:'记录实际访视日期',to:date,at:date+' 11:00',operator:'研究护士',reason:'访视已完成'}]:[],executionState:state==='partial'?'partial':state==='completed'?'completed':'',completedItems:state==='partial'?[expected[0]]:[],incompleteItems:state==='partial'?expected.slice(1):[],executionHistory:state==='partial'?[{action:'部分完成访视',completed:[expected[0]],incomplete:expected.slice(1),at:date+' 09:30',operator:'研究护士',reason:'部分检查结果待补充'}]:[],...(state==='terminated'?{terminationReason:'演示记录：参与者本次无法继续到访，已沟通终止本次访视。',terminatedAt:demoShift(Math.min(offset,0))+' 14:00',terminationHistory:[{action:'终止访视',reason:'参与者本次无法继续到访',at:demoShift(Math.min(offset,0))+' 14:00',operator:'研究护士'}]}:{})});
    });
    source.projects.forEach(project => { projectCatalog[project.id] = project.name; });
    const sourcePeople = source.participants.map(person => ({ ...person, study: person.projectId, initials: person.name, hospital: person.hospital || '未分配' }));
    sourcePeople.forEach(person => {
      const existing = participants.find(p => p.study === person.study && p.id === person.id);
      if (existing) { Object.assign(existing, person); existing.actions = actions(person.status); }
      else participants.push({ ...person, rate: 0, actions: actions(person.status) });
    });
    let addedPeople=[];try{addedPeople=JSON.parse(localStorage.getItem('journey-v2-added-participants'))||[];}catch{}
    addedPeople.forEach(person => {
      if (!projectCatalog[person.study] || participants.some(p => p.study === person.study && p.id === person.id)) return;
      const name = person.initials || person.name;
      participants.push({ ...person, name, rate: 0, actions: actions(person.status) });
    });
    let participantStates={};try{participantStates=JSON.parse(localStorage.getItem('journey-v2-person-status'))||{};}catch{}
    participants.forEach(person=>{const saved=participantStates[person.study+':'+person.id] || participantStates[person.study+':'+identity.legacyId(person.id)];if(saved){person.status=saved.status;if(saved.enrollmentNumber!==undefined)person.enrollmentNumber=saved.enrollmentNumber;if(saved.enrollmentDate!==undefined)person.enrollmentDate=saved.enrollmentDate;if(saved.group!==undefined)person.group=saved.group;person.actions=actions(person.status);}});
    participants.forEach(person => { person.protocolVersion = window.visitProtocols.bind(person.study, person.id, person.protocolVersion); });
    const result={participants,projectCatalog,source,sourcePeople};
    const visits=store.directoryVisits(result,source.today);
    participants.forEach(person=>{const own=visits.filter(v=>v.projectId===person.study&&v.participantId===person.id&&store.status(v)!=='inactive');person.rate=own.length?Math.round(own.filter(v=>store.status(v)==='completed').length/own.length*100):0;person.visitWindow=own.some(v=>store.windowStatus(v,source.today)==='overdue')?'超窗待访视':own.some(v=>store.windowStatus(v,source.today)==='window')?'窗口期内访视':'即将访视（7天后访视）';});
    return result;
  }
  window.clinicalParticipantDirectory = { create };
})();
