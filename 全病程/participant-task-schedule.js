// 将配置中心的采集规则展开成具体访视的执行安排，保持原访视计划不变。
(() => {
 const anchors={visit_date:'访视日期',enrollment_date:'入组日期',randomization_date:'随机日期',first_dose_date:'首次给药日期'};
 const units={days:86400000,hours:3600000,minutes:60000};
 const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const shift=(value,days)=>new Date(Date.parse(value+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 function occurrences(definition,visit){
  const d=definition,base=d.anchorDate||(d.timeAnchor==='visit_date'?(visit.actualDate||visit.plannedDate):'');
  if(!date(base))throw Error('请填写有效的'+(anchors[d.timeAnchor]||'基准')+'日期');
  let days=[1];
  if(d.collectionDateMode==='continuous'){
   if(!Number.isInteger(d.continuousStartDay)||!Number.isInteger(d.continuousEndDay)||d.continuousStartDay<1||d.continuousEndDay<d.continuousStartDay||d.continuousEndDay>365)throw Error('连续采集范围需在第1天至第365天内');
   days=Array.from({length:d.continuousEndDay-d.continuousStartDay+1},(_,i)=>d.continuousStartDay+i);
  }else if(d.collectionDateMode==='specified'){
   days=[...new Set(d.specifiedDays||[])].sort((a,b)=>a-b);if(!days.length||days.some(n=>!Number.isInteger(n)||n<1||n>365))throw Error('请选择有效的指定天数');
  }
  if(!d.collectionTimes?.length)throw Error('请配置采集时间');
  if(!units[d.windowUnit]||![d.windowBefore,d.windowAfter].every(n=>Number.isInteger(n)&&n>=0))throw Error('请配置有效的时间窗口');
  const format=ms=>new Date(ms).toISOString().slice(0,16).replace('T',' ');
  return days.flatMap(day=>d.collectionTimes.map((time,index)=>{
   if(time.type==='fixed'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.time))throw Error('请完整填写固定采集时间');
   const dayDate=shift(base,day-1),clock=time.type==='fixed'?time.time:'';
   const start=Date.parse(dayDate+'T'+(clock||'00:00')+':00Z')-d.windowBefore*units[d.windowUnit];
   const end=Date.parse(dayDate+'T'+(clock||'23:59')+':00Z')+d.windowAfter*units[d.windowUnit];
   return {date:dayDate,plannedAt:dayDate+(clock?' '+clock:''),relativeDay:day===1?'访视当日':'第'+day+'天',sequence:'第'+(index+1)+'次',window:(d.windowUnit==='days'&&!clock?format(start).slice(0,10):format(start))+' ～ '+(d.windowUnit==='days'&&!clock?format(end).slice(0,10):format(end))};
  }));
 }
 function packages(definition,visits,{participantId,participantName}){
  const chosen=visits.filter(v=>definition.visits.includes(v.id));if(!chosen.length)throw Error('请选择至少一个适用访视');
  return chosen.map(visit=>{
   const rows=occurrences(definition,visit),key='visit-new:'+definition.id+':'+visit.id;
   return {key,local:true,creation:true,kind:'draft',state:'draft',participantId,participantName,name:definition.name,visit:visit.name,visitId:visit.id,protocolVersion:visit.protocolVersion,date:rows[0].date,window:rows[0].window,children:[definition.name],note:'',method:definition.collectionMethod==='upload'?'上传文件':'表单填写',executionType:definition.collectionMethod==='upload'?'upload':'form',formName:definition.questionName||definition.name,canCaseExecute:!definition.patientOnly,fillMode:definition.patientOnly?'仅患者填写':'个案可填',collectionDefinition:structuredClone(definition),scheduleVisit:{plannedDate:visit.plannedDate,actualDate:visit.actualDate},config:{description:definition.description,cycle:{single:'单次采集',continuous:'连续天数',specified:'指定天数'}[definition.collectionDateMode],baseline:anchors[definition.timeAnchor],overdue:definition.allowOverdue,autoMap:definition.autoMapCrf},createdAt:new Date().toISOString()};
  });
 }
 function executions(parent){return occurrences(parent.collectionDefinition,parent.scheduleVisit).map((row,index)=>({...parent,...row,key:parent.key+':execution:'+index,kind:'execute',state:'pending',parentKey:parent.key,packageId:parent.packageId||'PKG-'+parent.key,children:[],result:''}));}
 window.clinicalNewVisitTasks={occurrences,packages,executions};
})();
