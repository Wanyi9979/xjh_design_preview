/* Shared task rules. The demo clock follows the dated clinical example. */
(() => {
  const data = window.researchDemo;
  const today = window.clinicalTasks.today;
  const now = () => `${today} 12:00`;
  const project = task => task.projectId || window.researchProjectId(Array.isArray(task) ? task[8] : task.trial);
  const personKey = task => JSON.stringify([project(task), Array.isArray(task) ? task[0] : task.participantId]);
  const packageKey = row => JSON.stringify([project(row), row[0], row[2], row[1]]);
  const meta = row => (data.packageSettings ||= {})[packageKey(row)] ||= {};
  const shift = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const rule = text => { const m = String(text).match(/提前(\d+)天\s*\/\s*延后(\d+)天/); return {before:+(m?.[1]||0),after:+(m?.[2]||0)}; };
  function range(task) {
    const parts = String(task.window || '').replace(/–|—/g,'～').split(/～|~/).map(x=>x.trim());
    const date = task.plannedAt.slice(0,10), year = date.slice(0,4);
    const parse = (part, end, fallbackDate = date) => {
      let day = part.match(/\d{4}[-/]\d{2}[-/]\d{2}/)?.[0]?.replaceAll('/','-');
      const short = part.match(/(?:^|\s)(\d{2})\/(\d{2})/);
      if (!day && short) {day=`${year}-${short[1]}-${short[2]}`;const delta=(new Date(day)-new Date(date))/86400000;if(delta>180)day=(+year-1)+day.slice(4);if(delta< -180)day=(+year+1)+day.slice(4);}
      const time=part.match(/\d{2}:\d{2}/)?.[0];
      return (day||fallbackDate)+' '+(time||(end?'23:59':'00:00'));
    };
    if (parts.length===2) {const start=parse(parts[0],false);return [start,parse(parts[1],true,start.slice(0,10))];}
    const r=rule(task.windowRule);return [shift(date,-r.before)+' 00:00',shift(date,r.after)+' 23:59'];
  }
  const closed = task => ['completed','none'].includes(task.scope);
  function refresh(task) {
    if (closed(task)) return task;
    const end=range(task)[1]; task.scope=now()>end?'overdue':task.plannedAt.slice(0,10)<=today?'today':'upcoming';
    task.status={overdue:'已逾期',today:'待执行',upcoming:'未开始'}[task.scope]; return task;
  }
  function executionBlock(task) {
    if(closed(task))return '该任务已关闭，无法重复执行';
    if(!task.canCaseExecute||/仅患者|仅参与者/.test(task.fillMode||''))return '该任务仅允许参与者执行，个案不可代填或上传';
    const [start,end]=range(task);
    if(now()<start)return '尚未进入执行窗口，暂不可执行';
    if(now()>end && !task.allowOverdue)return '已超过执行窗口，模板未开启逾期执行';
    return '';
  }
  const due = task => !closed(task)&&task.plannedAt.slice(0,10)<=today;
  const count = rows => new Set(rows.map(personKey)).size;
  const normalize = name => { const n=String(name||'');const c=n.match(/C\d+D\d+/i);return c?c[0].toUpperCase():/筛选/.test(n)?'screen':n.replace(/[\s（）()]/g,''); };
  function visits() {
    const directory=window.clinicalParticipantDirectory.create();
    return window.clinicalVisitStore.directoryVisits(directory,today).map(v=>{const p=directory.participants.find(p=>p.study===v.projectId&&p.id===v.participantId);return {...v,participant:p?.name||v.participantId,participantStatus:p?.status||'',trial:directory.projectCatalog[v.projectId],hospital:v.hospital||p?.hospital};});
  }
  function matchesVisit(task, visit) {
    if(project(task)!==visit.projectId||(Array.isArray(task)?task[0]:task.participantId)!==visit.participantId)return false;
    if(task.visitId)return task.visitId===visit.id;
    return normalize(Array.isArray(task)?task[2]:task.visitFull||task.visit)===normalize(visit.name);
  }
  function issuedExecutions(row) {
    const packageId = data.packageSettings?.[packageKey(row)]?.packageId;
    return data.executionTasks.filter(task => personKey(task) === personKey(row) &&
      (packageId ? task.packageId === packageId : task.task === row[1] && normalize(task.visitFull || task.visit) === normalize(row[2])));
  }
  const issuedExecuted = row => issuedExecutions(row).some(task => task.scope === 'completed' || Boolean(task.completedAt));
  function canAdjustIssued(row) {
    const tasks = issuedExecutions(row);
    return !issuedExecuted(row) && (!tasks.length || tasks.some(task => !closed(task)));
  }
  const dayDifference = (from, to) => (Date.parse(to) - Date.parse(from)) / 86400000;
  function shiftExecutionPlan(task, days) {
    const move = value => shift(value.slice(0, 10), days) + value.slice(10);
    const [start, end] = range(task);
    const datedWindow = /\d{2}:\d{2}/.test(task.window || task.plannedAt);
    const format = value => datedWindow ? move(value) : move(value).slice(0, 10);
    return { plannedAt: move(task.plannedAt), window: format(start) + ' ～ ' + format(end) };
  }
  function eligible(task, list) {
    const own=list.filter(v=>matchesVisit(task,v));
    return own.length?own.some(v=>['activated','partial'].includes(window.clinicalVisitStore.status(v))):!['筛选失败','已终止','研究结束'].includes(Array.isArray(task)?task[7]:task.participantStatus);
  }
  function schedule(row, date, times, offsets) {
    const r=rule(row[5]);
    return times.map((time,i)=>{const day=shift(date,offsets?.[i]||0);return {date:day,time,plannedAt:day+(time?' '+time:''),window:shift(day,-r.before)+(time?' '+time:'')+' ～ '+shift(day,r.after)+(time?' '+time:'')};});
  }
  function adjust(task, date, time, reason) {
    if(closed(task))throw Error('已完成或无需处理的任务不能调整');
    if(!date||!reason.trim()||reason.length>200)throw Error('请选择日期并填写200字以内调整原因');
    const before={plannedAt:task.plannedAt,window:task.window}; const r=rule(task.windowRule);
    task.plannedAt=date+(time?' '+time:'');task.window=shift(date,-r.before)+(time?' '+time:'')+' ～ '+shift(date,r.after)+(time?' '+time:'');
    (task.adjustmentHistory ||= []).push({before,after:{plannedAt:task.plannedAt,window:task.window},reason,at:now(),operator:'当前个案'});refresh(task);
  }
  function terminate(visit, reason) {
    if(!reason.trim()||reason.length>200)throw Error('请填写200字以内终止原因');
    const pending=data.taskSets.draft.filter(t=>matchesVisit(t,visit));
    pending.forEach(row=>{meta(row).reason=reason;meta(row).terminated=true;data.taskSets.draft.splice(data.taskSets.draft.indexOf(row),1);data.taskSets.none.push(row);});
    data.executionTasks.filter(t=>matchesVisit(t,visit)&&!closed(t)).forEach(t=>{t.scope='none';t.status='无需处理';t.noProcessReason='访视终止：'+reason;});
    visit.state='已终止';visit.visitStatus='terminated';visit.terminationReason=reason;visit.terminatedAt=now();
    (visit.terminationHistory ||= []).push({reason,at:now(),operator:'当前个案'});window.clinicalVisitStore.save(visit);window.saveResearchDemo();
  }
  const expected = index => index===0?['生命体征','血常规','实验室检查','心电图']:index===1?['生命体征','不良事件','用药记录']:['CT检查','实验室检查','体格检查'];
  function crfs(task) {
    const key=`journey-v2-clinical-entry-draft-${project(task)}:${task.participantId}:${task.visitIndex}:`;
    return expected(task.visitIndex).map(name=>{let saved;try{saved=JSON.parse(localStorage.getItem(key+name));}catch{}return {name,record:saved||{},state:saved?.state||(saved?.values?.some(Boolean)?'待提交':'待录入'),key:key+name};});
  }
  function syncProcessing(task) { if(task.scope==='none')return;task.scope=crfs(task).every(c=>c.state==='已完成')?'completed':'pending'; }
  data.executionTasks.forEach(task=>{if(task.allowOverdue===undefined)task.allowOverdue=['S006','S008'].includes(task.participantId);refresh(task);});
  window.workbenchTaskPolicy={today,now,project,personKey,packageKey,meta,shift,rule,range,closed,due,count,normalize,visits,matchesVisit,issuedExecutions,issuedExecuted,canAdjustIssued,dayDifference,shiftExecutionPlan,eligible,schedule,adjust,executionBlock,refresh,terminate,crfs,syncProcessing};
})();
