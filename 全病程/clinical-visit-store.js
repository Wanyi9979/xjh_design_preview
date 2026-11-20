(() => {
  const storageKey = 'journey-v2-clinical-visit-dates-v1';
  const calendarKey = 'journey-v2-clinical-visit-calendar-v1';
  const key = visit => JSON.stringify([visit.projectId, visit.id]);
  const read = (storageName, name, fallback) => {
    try { return JSON.parse(window[storageName].getItem(name)) || fallback; } catch { return fallback; }
  };
  let memory = {};
  let calendarMemory = null;
  const statusLabels = { inactive: '未激活', activated: '待执行', partial: '进行中', completed: '已完成', terminated: '已终止' };
  function status(visit) {
    const explicit = visit.visitStatus || visit.state;
    if (visit.state === '已终止' || ['terminated', '已终止','无需处理','无需执行'].includes(explicit)) return 'terminated';
    const names=executionItems(visit),plans=itemExecutionResults(visit);
    const hasResults=Object.keys(visit.itemResults||{}).length||(visit.completedItems||[]).length||visit.partialHandling?.type;
    if(hasResults){
      const pending=names.some(name=>!['done','none'].includes(plans[name]?.type));
      if(!pending)return 'completed';
      return names.some(name=>plans[name]?.type==='done')?'partial':'activated';
    }
    if (visit.actualDate) return 'completed';
    if (visit.executionState === 'partial' || ['部分完成','partial','进行中'].includes(explicit)) return 'partial';
    const entry = Object.entries(statusLabels).find(([key, label]) => explicit === key || explicit === label);
    if (entry) return entry[0];
    if (['已执行', '已结束','已访视'].includes(explicit)) return 'completed';
    return 'activated';
  }
  function appointmentStatus(visit) {
    return visit.appointmentDate ? 'booked' : 'unbooked';
  }
  function windowStatus(visit, today) {
    if(visit.noWindow||(/筛选/.test(visit.name||'')&&(!visit.windowStart||!visit.windowEnd)))return 'none';
    if (!['activated','partial'].includes(status(visit)) || !visit.windowStart || !visit.windowEnd) return '';
    return today < visit.windowStart ? 'upcoming' : today > visit.windowEnd ? 'overdue' : 'window';
  }
  function overdueUnhandled(visit,today){
    if(!['activated','partial'].includes(status(visit)))return false;
    if(Object.keys(visit.itemResults||{}).length){return Object.values(visit.itemResults).some(plan=>plan.type==='execute'&&plan.nextPlannedAt?.slice(0,10)<today&&String(plan.at||'').slice(0,10)<plan.nextPlannedAt.slice(0,10));}
    if(['none','followup'].includes(visit.partialHandling?.type))return false;
    const due=String(visit.nextExecutionAt||visit.appointmentDate||'').slice(0,10);
    if(!due||due>=today)return false;
    const handled=[visit.todayHandledDate,...(visit.executionHistory||[]).map(item=>item.at||item.time),...(visit.appointmentHistory||[]).filter(item=>item.action==='调整预约').map(item=>item.at||item.time)].filter(Boolean).map(value=>String(value).slice(0,10)).sort().at(-1)||'';
    return handled<due;
  }
  function apply(visit) {
    const saved = read('localStorage', storageKey, memory)[key(visit)];
    const record = saved ? { ...visit, ...saved } : { ...visit };
    if(['每周期','单次采集','指定天数'].includes(record.name)){
      const task=window.clinicalTasks?.execute?.[record.sourceTaskIndex];
      record.name=task?.cycle&&!['每周期','单次采集','指定天数'].includes(task.cycle)?task.cycle:(window.visitProtocols.get?.(record.projectId,record.protocolVersion)?.visits?.[record.visitIndex]||'筛选期');
    }
    record.participantId = window.demoParticipantIdentity?.canonicalId(record.participantId) || record.participantId;
    if(/筛选/.test(record.name||'')){
      const states=read('localStorage','journey-v2-person-status',{});
      const baseline=states[record.projectId+':'+record.participantId]?.enrollmentDate||record.screeningBaselineDate||'';
      record.screeningBaselineDate=baseline;record.noWindow=!/^\d{4}-\d{2}-\d{2}$/.test(baseline);
      const shiftScreen=days=>{const date=new Date(baseline+'T12:00:00');date.setDate(date.getDate()+days);return date.toLocaleDateString('sv-SE');};
      record.windowStart=record.noWindow?'':shiftScreen(-28);record.windowEnd=record.noWindow?'':shiftScreen(-2);
    }

    return window.visitProtocols.stamp(record);
  }
  function save(visit) {
    const records = read('localStorage', storageKey, memory);
    records[key(visit)] = {
      protocolVersion:window.visitProtocols.stamp(visit).protocolVersion, state:visit.state, visitStatus:visit.visitStatus||'',plannedDate:visit.plannedDate,windowStart:visit.windowStart,windowEnd:visit.windowEnd,
      appointmentWaiver: visit.appointmentWaiver || null, appointmentDate: visit.appointmentDate || '', actualDate: visit.actualDate || '',
      todayHandledDate:visit.todayHandledDate||'', itemResults:visit.itemResults||{}, partialHandling:visit.partialHandling||null, nextExecutionAt:visit.nextExecutionAt||'', executionState:visit.executionState||'', incompleteItems:visit.incompleteItems||[], completedItems:visit.completedItems||[], executionHistory:visit.executionHistory||[],
      activationHistory: [...(visit.activationHistory || [])], appointmentHistory: [...(visit.appointmentHistory || [])], actualHistory: [...(visit.actualHistory || [])],
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
  const overviewDemoPeople = new Set(['CT-2026-001:S001','CT-2026-001:S003']);
  const overviewNames = (project,id) => overviewDemoPeople.has(project+':'+id) ? ['筛选期','第1周期第1天（C1D1）','第1周期第15天（C1D15）','第2周期第1天（C2D1）','第2周期第15天（C2D15）','第3周期第1天（C3D1）'] : null;
  const cycleKey = name => String(name||'').match(/C\d+D\d+/i)?.[0]?.toUpperCase() || (/筛选/.test(name)?'screen':String(name||'').replace(/[\s（）()]/g,''));
  function directoryVisits(directory, today = directory.source.today) {
    const { source, sourcePeople, participants } = directory;
    const shift = (value, days) => {
      const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const visits = source.visits.map(visit => ({ appointmentHistory: [], actualHistory: [], ...apply(visit), calendar: true })).filter(visit => !visit.removed);
    participants.filter((person, index, list) => list.findIndex(p => p.study === person.study && p.id === person.id) === index).forEach((person, index) => {
      const protocol = window.visitProtocols.get(person.study, person.protocolVersion);
      const plannedNames = protocol?.visits || ['筛选期', '第1周期第1天（C1D1）', '第1周期第15天（C1D15）'];
      const existing = visits.filter(visit => visit.projectId === person.study && visit.participantId === person.id && visit.protocolVersion === person.protocolVersion);
      const normalize = name => String(name || '').replace(/[\s（）()]/g, '');
      plannedNames.forEach((name, visitIndex) => {
        if (existing.some(visit => normalize(visit.name) === normalize(name) || visit.visitIndex === visitIndex)) return;
        const anchor = existing.find(visit => Number.isInteger(visit.visitIndex) && visit.plannedDate);
        const plannedDate = person.addedAt ? shift(person.appointmentDate||person.consentSignedDate||today, visitIndex * (protocol?.cycleDays || 14)) : anchor ? shift(anchor.plannedDate, (visitIndex - anchor.visitIndex) * (protocol?.cycleDays || 14)) : shift(today, (index % 3 - 1) * 7 + (visitIndex - 1) * (protocol?.cycleDays || 14));
        const stableId = window.demoParticipantIdentity?.legacyId(person.id) || person.id;
        visits.push({ ...apply({ id: `participant-${stableId}-${visitIndex}`, projectId: person.study, participantId: person.id,
          protocolVersion:person.protocolVersion, name: (protocol?.visits || ['筛选期', '第1周期第1天（C1D1）', '第1周期第15天（C1D15）'])[visitIndex], visitIndex, plannedDate,
          windowStart: shift(plannedDate, -2), windowEnd: shift(plannedDate, 2), appointmentDate: person.addedAt ? (visitIndex===0?person.appointmentDate||'':'') : visitIndex === 1 && index % 2 === 0 ? plannedDate : '',
          actualDate: !person.addedAt && !existing.length && visitIndex === 0 && plannedDate < today ? plannedDate : '', appointmentHistory: [], actualHistory: [],
          state: ['研究结束', '筛选失败'].includes(person.status) ? '已终止' : person.addedAt ? (visitIndex===0&&person.appointmentDate?'已激活':'未激活') : existing.length || visitIndex===2?'未激活':'已激活', hospital: person.hospital }), calendar: false });
      });
    });
    // The two main prototype participants follow the six-cycle Figma example.
    // Persisted actions retain precedence; identifiers and task associations are reused.
    participants.filter(person=>overviewNames(person.study,person.id)&&!['研究结束','筛选失败'].includes(person.status)).forEach(person=>{
      const names=overviewNames(person.study,person.id);
      const own=visits.filter(v=>v.projectId===person.study&&v.participantId===person.id&&v.protocolVersion===person.protocolVersion);
      const sampleDates=['2026-10-08','2026-10-22','2026-11-05','2026-11-05','2026-10-08','2026-11-05'];
      const canonical=names.map((name,index)=>{
        const candidates=own.filter(v=>cycleKey(v.name)===cycleKey(name)).sort((a,b)=>Number(['activated','partial'].includes(status(b)))-Number(['activated','partial'].includes(status(a))));
        const base=candidates[0]||{};
        const plannedDate=sampleDates[index];
        const seed={...base,id:base.id||`overview-${person.id}-${cycleKey(name)}`,projectId:person.study,participantId:person.id,protocolVersion:person.protocolVersion,
          name,visitIndex:index,plannedDate,windowStart:shift(plannedDate,-2),windowEnd:shift(plannedDate,2),
          state:index===0?'已完成':index===1?'已激活':'未激活',visitStatus:index===0?'completed':index===1?'activated':'inactive',
          actualDate:index===0?plannedDate:'',appointmentDate:base.appointmentDate||'',hospital:person.hospital,
          aliasVisitIds:candidates.map(v=>v.id).filter(id=>id!==base.id),sourceTaskIndices:[...new Set(candidates.flatMap(v=>v.sourceTaskIndices||[v.sourceTaskIndex]).filter(Number.isInteger))]};
        const merged=apply(seed);
        merged.name=name;merged.visitIndex=index;
        return merged;
      });
      const ownIds=new Set(own.map(v=>v.id));
      for(let i=visits.length-1;i>=0;i--)if(ownIds.has(visits[i].id)&&visits[i].projectId===person.study&&visits[i].participantId===person.id)visits.splice(i,1);
      visits.push(...canonical);
    });
    return visits.map(visit=>{const person=participants.find(p=>p.study===visit.projectId&&p.id===visit.participantId);return apply({...visit,screeningBaselineDate:person?.enrollmentDate||''});});
  }
  function fromTasks(tasks, projects, organizations = []) {
    const people = new Map();
    const visitGroups = new Map();
    tasks.execute.forEach((task, index) => {
      if (task.removed) return;
      const projectId = task.projectId || projects[0].id;
      const protocolVersion = task.protocolVersion || window.visitProtocols.bind(projectId, task.id);
      const group = task.group || (task.id === 'S001' && projectId === projects[0].id ? '乳腺肿瘤一组' : '');
      const org = organizations.find(item => item.group === group) || {};
      const person = { id: task.id, projectId, protocolVersion, name: task.name, status: task.status, sex: task.sex, age: task.age, ...org, hospital: task.hospital || org.hospital, department: task.department || org.department, group };
      const personKey = JSON.stringify([projectId, task.id]);
      if (!people.has(personKey) || task.state === '待执行') people.set(personKey, person);
      const dates = (task.window || '').match(/\d{4}[/-]\d{2}[/-]\d{2}/g) || [];
      const date = task.date.replaceAll('/', '-');
      const visit = {
        id: task.visitId || `task-${index}`, projectId, protocolVersion, participantId: task.id, name: task.cycle,
        date, plannedDate: tasks.planDate(task).replaceAll('/', '-'),
        windowStart: dates[0]?.replaceAll('/', '-') || date, windowEnd: dates[1]?.replaceAll('/', '-') || date,
        appointmentDate: task.appointmentDate || '',
        actualDate: task.actualDate || task.executedAt?.slice(0, 10) || '',
        appointmentHistory: task.appointmentHistory || [], actualHistory: task.actualHistory || [], state: task.state, visitStatus: task.visitStatus || '', removed: task.removed,
        sourceTaskIndex: index, sourceTaskIndices: [index], visitIndex: task.visitIndex ?? (/C1D1[）)]/.test(task.cycle) ? 1 : /C1D15/.test(task.cycle) ? 2 : 0), hospital: person.hospital, department: person.department, group,
        tasks: [task.state === '待执行' ? '待执行访视计划' : task.state, ...(task.content || '').split('、')].filter(Boolean)
      };
      const identity = JSON.stringify([projectId, task.id, protocolVersion, task.visitId || [task.cycle, visit.plannedDate, visit.windowStart, visit.windowEnd]]);
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

  function executionItems(visit) {
    const index=/C1D15|C2D1|第15天/.test(visit.name||'')?2:/C1D1|第1周期第1天/.test(visit.name||'')?1:visit.visitIndex;
    return index===0?['生命体征','血常规','实验室检查','心电图']:index===1?['生命体征','不良事件','用药记录']:['CT检查','实验室检查','体格检查'];
  }
  function itemExecutionResults(visit){
    const completed=new Set(visit.completedItems||[]),legacy=visit.partialHandling||{};
    return Object.fromEntries(executionItems(visit).map(name=>{
      const saved=visit.itemResults?.[name]||[...(visit.executionHistory||[])].reverse().find(record=>record.itemResults?.[name])?.itemResults[name];
      if(completed.has(name)){
        const history=(visit.executionHistory||[]).find(record=>record.itemResults?.[name]?.type==='done'||(record.completed||[]).includes(name));
        const actualDate=saved?.actualDate||history?.itemResults?.[name]?.actualDate||history?.actualDate||String(history?.at||history?.time||saved?.at||visit.actualDate||'').slice(0,10);
        return [name,{...saved,type:'done',actualDate}];
      }
      return [name,saved||((visit.incompleteItems||[]).includes(name)&&legacy.type?{...legacy}:{type:''})];
    }));
  }
  function validateItemExecutionPlan(visit,name,value,today){
    if(!executionItems(visit).includes(name))throw Error('未知访视项');
    const prior=itemExecutionResults(visit)[name]||{},input=value||{};
    if(prior.type==='done'){
      if(input.type!=='done')throw Error(name+'：已完成事项不能重新标记为未完成');
      return {...prior,type:'done'};
    }
    const type=input.type,reason=String(input.reason||'').trim(),content=String(input.content||'').trim();
    const fail=message=>{throw Error(name+'：'+message);};
    const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T12:00:00'))&&new Date(value+'T12:00:00').toLocaleDateString('sv-SE')===value;
    const validTime=value=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||'')&&validDate(value.slice(0,10))&&!Number.isNaN(new Date(value).getTime())&&value.slice(0,10)>=today;
    if(!['done','execute','followup','none'].includes(type))fail('请选择处理方式');
    if(reason.length>200||content.length>200)fail('原因或跟进内容最多200字');
    if(type==='done'){
      if(!validDate(input.actualDate)||input.actualDate>today)fail('请填写不晚于今天的完成日期');
      if(!visit.noWindow&&visit.windowStart&&visit.windowEnd&&(input.actualDate<visit.windowStart||input.actualDate>visit.windowEnd)&&!reason)fail('完成日期超窗，请填写原因');
      return {type,actualDate:input.actualDate,reason};
    }
    if(type==='execute'){
      if(!validTime(input.nextPlannedAt))fail('请填写不早于今天的下次执行时间');
      if(!reason)fail('请填写后续执行原因');
      return {type,nextPlannedAt:input.nextPlannedAt,reason};
    }
    if(type==='followup'){
      if(!validTime(input.followupAt))fail('请填写不早于今天的跟进时间');
      if(!content)fail('请填写跟进内容');
      return {type,followupAt:input.followupAt,content};
    }
    if(!reason)fail('请填写无需处理原因');
    return {type,reason};
  }
  function validateItemExecutionResults(visit,results,today){
    if(!['activated','partial'].includes(status(visit))||!visit.appointmentDate)throw Error('仅已预约且进行中的访视可以执行');
    const names=executionItems(visit);
    if(Object.keys(results||{}).some(name=>!names.includes(name)))throw Error('包含未知访视项');
    return Object.fromEntries(names.map(name=>[name,validateItemExecutionPlan(visit,name,results?.[name],today)]));
  }
  function recordItemExecutionResults(visit,results,today){
    const plans=validateItemExecutionResults(visit,results,today),prior=itemExecutionResults(visit),at=new Date().toLocaleString('sv-SE'),names=executionItems(visit);
    const completed=names.filter(name=>plans[name].type==='done'),remaining=names.filter(name=>plans[name].type!=='done');
    visit.itemResults=Object.fromEntries(names.map(name=>[name,prior[name]?.type==='done'?plans[name]:{...plans[name],at,operator:'当前个案'}]));
    visit.completedItems=completed;visit.incompleteItems=remaining;
    const nextState=status(visit);
    visit.state=statusLabels[nextState];visit.visitStatus=visit.executionState=nextState;
    const executions=remaining.map(name=>plans[name]).filter(plan=>plan.type==='execute');
    visit.nextExecutionAt=executions.map(plan=>plan.nextPlannedAt).sort()[0]||'';
    const pending=remaining.map(name=>plans[name]);
    visit.partialHandling=pending.length&&pending.every(plan=>plan.type===pending[0].type)?{...pending[0],at,operator:'当前个案'}:null;
    if(nextState==='completed'){visit.actualDate=completed.map(name=>plans[name].actualDate||visit.actualDate||'').filter(Boolean).sort().at(-1)||'';if(visit.actualDate)(visit.actualHistory||=[]).push({action:'记录实际访视日期',to:visit.actualDate,operator:'当前个案',at});}
    (visit.executionHistory||=[]).push({action:'按访视项处理',completed:[...completed],incomplete:[...remaining],itemResults:JSON.parse(JSON.stringify(visit.itemResults)),at,operator:'当前个案'});
    save(visit);return visit;
  }
  function recordExecution(visit, completed, actualDate, note, today) {
    if(!['activated','partial'].includes(status(visit))||!visit.appointmentDate)throw Error('仅已预约且进行中的访视可以执行');
    const expected=executionItems(visit),chosen=[...new Set(completed)].filter(item=>expected.includes(item));
    if(!chosen.length)throw Error('请至少勾选一项已完成内容');
    const remaining=expected.filter(item=>!chosen.includes(item));
    if(!remaining.length&&(!/^\d{4}-\d{2}-\d{2}$/.test(actualDate)||actualDate>today))throw Error('全部完成时，请填写不晚于今天的实际访视日期');
    if(!remaining.length&&!visit.noWindow&&(actualDate<visit.windowStart||actualDate>visit.windowEnd)&&!note.trim())throw Error('实际访视日期超窗，请填写原因');
    visit.completedItems=chosen;visit.incompleteItems=remaining;visit.executionState=remaining.length?'partial':'completed';
    visit.state=remaining.length?'部分完成':'已完成';visit.visitStatus=remaining.length?'partial':'completed';
    const at=new Date().toLocaleString('sv-SE');
    (visit.executionHistory ||= []).push({action:remaining.length?'部分完成访视':'完成访视',completed:chosen,incomplete:remaining,actualDate:remaining.length?'':actualDate,reason:note,operator:'当前个案',at});
    if(!remaining.length){visit.actualDate=actualDate;(visit.actualHistory ||= []).push({action:'记录实际访视日期',to:actualDate,reason:note,operator:'当前个案',at});}
    save(visit);return visit;
  }
  function recordExecutionResult(visit, result, today) {
    if (!['activated','partial'].includes(status(visit)) || !visit.appointmentDate) throw Error('仅已预约且进行中的访视可以执行');
    const items = executionItems(visit);
    if (result.completion === 'all') {
      recordExecution(visit, items, String(result.actualDate || ''), String(result.reason || '').trim(), today);
      visit.partialHandling = null; visit.nextExecutionAt = ''; save(visit);
      return visit;
    }
    if (result.completion !== 'partial') throw Error('请选择访视完成情况');
    const remaining = [...new Set(result.incompleteItems || [])];
    if (!remaining.length || remaining.some(item => !items.includes(item))) throw Error('请至少选择一项未完成事项');
    if (remaining.some(item => (visit.completedItems || []).includes(item))) throw Error('已完成事项不能重新标记为未完成');
    const handling = result.handling;
    if (!['execute','followup','none'].includes(handling)) throw Error('请选择后续处理方式');
    const validTime = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '') && !Number.isNaN(new Date(value).getTime()) && value.slice(0,10) >= today;
    const reason = String(result.reason || '').trim();
    const followupContent = String(result.followupContent || '').trim();
    if (handling === 'execute' && !validTime(result.nextPlannedAt)) throw Error('请填写不早于今天的下次计划执行时间');
    if (handling === 'execute' && (!reason || reason.length > 200)) throw Error('请填写200字以内的后续执行原因');
    if (handling === 'followup' && !validTime(result.followupAt)) throw Error('请选择不早于今天的跟进时间');
    if (handling === 'followup' && (!followupContent || followupContent.length > 200)) throw Error('请填写200字以内的跟进内容');
    if (handling === 'none' && (!reason || reason.length > 200)) throw Error('请填写200字以内的无需处理原因');
    const at = new Date().toLocaleString('sv-SE');
    const completed = items.filter(item => !remaining.includes(item));
    const plan = {type:handling, at, operator:'当前个案', ...(handling === 'execute' ? {nextPlannedAt:result.nextPlannedAt,reason} : handling === 'followup' ? {followupAt:result.followupAt,content:followupContent} : {reason})};
    visit.completedItems = completed; visit.incompleteItems = remaining;
    visit.state = '部分完成'; visit.visitStatus = 'partial'; visit.executionState = 'partial';
    visit.partialHandling = plan; visit.nextExecutionAt = handling === 'execute' ? result.nextPlannedAt : '';
    (visit.executionHistory ||= []).push({action:'部分完成访视',completed,incomplete:remaining,handling, ...plan,reason:['execute','none'].includes(handling)?reason:'',at,operator:'当前个案'});
    save(visit); return visit;
  }
  window.clinicalVisitStore = { apply, save, overviewNames, executionItems, itemExecutionResults, validateItemExecutionPlan, validateItemExecutionResults, recordItemExecutionResults, recordExecution, recordExecutionResult, cacheCalendar, fromTasks, directoryVisits, status, statusLabels, appointmentStatus, windowStatus, overdueUnhandled, calendar: () => read('sessionStorage', calendarKey, calendarMemory), terminatedVisits: () => Object.values(read('localStorage', storageKey, memory)).filter(visit => visit.state === '已终止' && visit.id) };
})();
