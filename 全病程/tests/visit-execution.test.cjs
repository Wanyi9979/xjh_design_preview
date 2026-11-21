const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){const records=new Map();const window={visitProtocols:{stamp:v=>v}};const localStorage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};vm.runInNewContext(fs.readFileSync(__dirname+'/../clinical-visit-store.js','utf8'),{window,localStorage,Date});return window.clinicalVisitStore;}
const visit=()=>({id:'v1',projectId:'P1',participantId:'S1',visitIndex:1,state:'已激活',plannedDate:'2026-10-29',windowStart:'2026-10-27',windowEnd:'2026-10-31',appointmentDate:'2026-10-29'});
test('partial execution persists outstanding items without completing the visit',()=>{const s=setup(),v=visit();s.recordExecution(v,['生命体征'],'','','2026-10-29');assert.equal(s.status(v),'partial');assert.equal(v.actualDate,undefined);assert.deepEqual([...s.apply(v).incompleteItems],['不良事件','用药记录']);});
test('all completion requires an actual date and cannot be performed before booking',()=>{const s=setup(),v=visit(),items=s.executionItems(v);assert.throws(()=>s.recordExecution(v,items,'','','2026-10-29'),/实际/);v.appointmentDate='';assert.throws(()=>s.recordExecution(v,items,'2026-10-29','','2026-10-29'),/已预约/);});
test('completed visits are read-only and preserve the actual visit date',()=>{const s=setup(),v=visit();s.recordExecution(v,s.executionItems(v),'2026-10-29','','2026-10-29');assert.equal(s.status(v),'completed');assert.equal(s.apply(v).actualDate,'2026-10-29');assert.throws(()=>s.recordExecution(v,[],'','','2026-10-29'),/进行中/);});

test('visit overdue is based on the window, independent of past, today or future booking dates',()=>{const s=setup();for(const appointmentDate of ['2026-10-27','2026-10-29','2026-10-31']){const v={...visit(),appointmentDate,windowStart:'2026-10-24',windowEnd:'2026-10-28'};assert.equal(s.windowStatus(v,'2026-10-29'),'overdue');v.windowEnd='2026-10-30';assert.equal(s.windowStatus(v,'2026-10-29'),'window');}});
test('the last day of a visit window is still within the window',()=>{const s=setup(),v=visit();assert.equal(s.windowStatus(v,'2026-10-31'),'window');assert.equal(s.windowStatus(v,'2026-11-01'),'overdue');});

test('execution result requires an out-of-window reason for all completion',()=>{
 const s=setup(),v=visit();
 assert.throws(()=>s.recordExecutionResult(v,{completion:'all',actualDate:'2026-10-26'},'2026-10-29'),/超窗/);
 assert.equal(s.status(v),'activated');
 s.recordExecutionResult(v,{completion:'all',actualDate:'2026-10-26',reason:'参与者调整到院时间'},'2026-10-29');
 assert.equal(s.apply(v).actualDate,'2026-10-26');assert.equal(s.status(v),'completed');
});
test('partial follow-up validates remaining items, time and content before saving',()=>{
 const s=setup(),v=visit(),base={completion:'partial',incompleteItems:['用药记录'],handling:'followup',followupAt:'2026-10-30T10:00',followupContent:'用药记录需持续跟进'};
 assert.throws(()=>s.recordExecutionResult(v,{...base,incompleteItems:[]},'2026-10-29'),/未完成/);
 assert.throws(()=>s.recordExecutionResult(v,{...base,followupAt:''},'2026-10-29'),/跟进时间/);
 assert.throws(()=>s.recordExecutionResult(v,{...base,followupContent:'  '},'2026-10-29'),/跟进内容/);
 assert.equal(s.status(v),'activated');
 s.recordExecutionResult(v,base,'2026-10-29');
 const saved=s.apply(v);assert.equal(s.status(saved),'partial');assert.deepEqual([...saved.completedItems],['生命体征','不良事件']);assert.equal(saved.partialHandling.content,base.followupContent);assert.equal(saved.actualDate,'');
});
test('later execution preserves original visit schedule and stores a separate next execution time',()=>{
 const s=setup(),v=visit(),before=[v.plannedDate,v.windowStart,v.windowEnd,v.appointmentDate];
 assert.throws(()=>s.recordExecutionResult(v,{completion:'partial',incompleteItems:['不良事件'],handling:'execute',nextPlannedAt:'2026-10-28T10:00'},'2026-10-29'),/下次/);
 const plan={completion:'partial',incompleteItems:['不良事件'],handling:'execute',nextPlannedAt:'2026-10-30T10:00'};
 assert.throws(()=>s.recordExecutionResult(v,plan,'2026-10-29'),/后续执行原因/);
 assert.throws(()=>s.recordExecutionResult(v,{...plan,reason:'  '},'2026-10-29'),/后续执行原因/);
 s.recordExecutionResult(v,{...plan,reason:'剩余检查改至下次到院完成'},'2026-10-29');
 assert.equal(s.apply(v).partialHandling.reason,'剩余检查改至下次到院完成');
 assert.equal(s.apply(v).executionHistory.at(-1).reason,'剩余检查改至下次到院完成');
 assert.deepEqual([v.plannedDate,v.windowStart,v.windowEnd,v.appointmentDate],before);assert.equal(s.apply(v).nextExecutionAt,'2026-10-30T10:00');
});
test('no further processing closes visit while preserving waived item reasons',()=>{
 const s=setup(),v=visit(),result={completion:'partial',incompleteItems:['不良事件','用药记录'],handling:'none'};
 assert.throws(()=>s.recordExecutionResult(v,result,'2026-10-29'),/无需处理原因/);
 s.recordExecutionResult(v,{...result,reason:'研究者确认剩余项目无需执行'},'2026-10-29');
 assert.equal(s.status(v),'completed');assert.equal(s.apply(v).partialHandling.reason,'研究者确认剩余项目无需执行');assert.equal(v.incompleteItems.length,2);
});
test('partial execution rejects already completed items and closed or unbooked visits',()=>{
 const s=setup(),v=visit(),result={completion:'partial',incompleteItems:['生命体征'],handling:'none',reason:'不再执行'};
 v.completedItems=['生命体征'];assert.throws(()=>s.recordExecutionResult(v,result,'2026-10-29'),/已完成事项/);
 v.appointmentDate='';assert.throws(()=>s.recordExecutionResult(v,result,'2026-10-29'),/已预约/);
 v.appointmentDate='2026-10-29';v.state='已终止';assert.throws(()=>s.recordExecutionResult(v,result,'2026-10-29'),/进行中/);
});

test('per-item execution supports four different actions and persists each plan independently',()=>{
 const s=setup(),v={...visit(),visitIndex:0,name:'筛选期',noWindow:true};
 const names=s.executionItems(v),plans={
  [names[0]]:{type:'done',actualDate:'2026-10-29'},
  [names[1]]:{type:'execute',nextPlannedAt:'2026-10-30T09:00',reason:'等待检查排期'},
  [names[2]]:{type:'followup',followupAt:'2026-10-31T10:00',content:'跟进检查报告'},
  [names[3]]:{type:'none',reason:'本次不适用'}
 };
 s.recordItemExecutionResults(v,plans,'2026-10-29');
 const saved=s.apply(v);assert.equal(s.status(saved),'partial');assert.deepEqual([...saved.completedItems],[names[0]]);
 assert.equal(saved.itemResults[names[1]].type,'execute');assert.equal(saved.itemResults[names[2]].content,'跟进检查报告');assert.equal(saved.itemResults[names[3]].reason,'本次不适用');
 assert.equal(saved.partialHandling,null);assert.equal(saved.nextExecutionAt,'2026-10-30');assert.equal(saved.executionHistory.at(-1).itemResults[names[3]].type,'none');
});
test('per-item validation is atomic and enforces dates and reasons on each item',()=>{
 const s=setup(),v=visit(),names=s.executionItems(v),before=JSON.stringify(v);
 const plans=Object.fromEntries(names.map(name=>[name,{type:'done',actualDate:'2026-10-29'}]));
 plans[names[1]]={type:'none',reason:'  '};assert.throws(()=>s.recordItemExecutionResults(v,plans,'2026-10-29'),/无需处理原因/);assert.equal(JSON.stringify(v),before);
 plans[names[1]]={type:'execute',nextPlannedAt:'2026-10-28T09:00',reason:'改期'};assert.throws(()=>s.recordItemExecutionResults(v,plans,'2026-10-29'),/不早于今天/);
 plans[names[1]]={type:'followup',followupAt:'2026-10-30T09:00',content:''};assert.throws(()=>s.recordItemExecutionResults(v,plans,'2026-10-29'),/跟进内容/);
 plans[names[1]]={type:'done',actualDate:'2026-10-26'};assert.throws(()=>s.recordItemExecutionResults(v,plans,'2026-10-29'),/超窗/);
});
test('per-item completion locks previous results and resolves pending execution items',()=>{
 const s=setup(),v=visit(),names=s.executionItems(v);
 s.recordItemExecutionResults(v,{[names[0]]:{type:'done',actualDate:'2026-10-29'},[names[1]]:{type:'none',reason:'待确认'},[names[2]]:{type:'execute',nextPlannedAt:'2026-10-30T10:00',reason:'预约检查'}},'2026-10-29');
 const plans=s.itemExecutionResults(v);plans[names[0]]={type:'none',reason:'回退'};assert.throws(()=>s.recordItemExecutionResults(v,plans,'2026-10-30'),/不能重新标记/);
 plans[names[0]]={type:'done'};plans[names[1]]={type:'done',actualDate:'2026-10-30'};plans[names[2]]={type:'done',actualDate:'2026-10-30'};
 s.recordItemExecutionResults(v,plans,'2026-10-30');assert.equal(s.status(v),'completed');assert.equal(v.itemResults[names[0]].actualDate,'2026-10-29');assert.equal(v.actualDate,'2026-10-30');assert.equal(v.nextExecutionAt,'');
});

test('legacy completed items recover their own first completion date from history',()=>{
 const s=setup(),v={...visit(),completedItems:['生命体征'],executionHistory:[{completed:['生命体征'],at:'2026-10-27 09:30'},{completed:['生命体征','不良事件'],at:'2026-10-29 11:00'}]};
 assert.equal(s.itemExecutionResults(v)['生命体征'].actualDate,'2026-10-27');
 v.itemResults={'生命体征':{type:'done',actualDate:'2026-10-26'}};
 assert.equal(s.itemExecutionResults(v)['生命体征'].actualDate,'2026-10-26');
});

test('visit states derive from pending item actions and actual completed items',()=>{
 const s=setup(),names=s.executionItems(visit());
 for(const pendingType of ['execute','followup']){
  const v=visit(),pending=pendingType==='execute'?{type:'execute',nextPlannedAt:'2026-10-30T10:00',reason:'改期'}:{type:'followup',followupAt:'2026-10-30T10:00',content:'确认报告'};
  const plans=Object.fromEntries(names.map(name=>[name,pending]));
  s.recordItemExecutionResults(v,plans,'2026-10-29');assert.equal(s.status(s.apply(v)),'activated');assert.equal(v.state,'待执行');
  plans[names[0]]={type:'done',actualDate:'2026-10-29'};
  s.recordItemExecutionResults(v,plans,'2026-10-29');assert.equal(s.status(s.apply(v)),'partial');assert.equal(v.state,'进行中');
  plans[names[1]]={type:'none',reason:'不适用'};plans[names[2]]={type:'none',reason:'不适用'};
  s.recordItemExecutionResults(v,plans,'2026-10-29');assert.equal(s.status(s.apply(v)),'completed');assert.equal(v.state,'已完成');
 }
});
test('all waived items complete a visit without inventing a performed date',()=>{
 const s=setup(),v=visit(),plans=Object.fromEntries(s.executionItems(v).map(name=>[name,{type:'none',reason:'不适用'}]));
 s.recordItemExecutionResults(v,plans,'2026-10-29');assert.equal(s.status(s.apply(v)),'completed');assert.equal(v.actualDate,'');assert.equal(v.completedItems.length,0);
});
test('inactive and terminated visits remain distinct from item handling',()=>{
 const s=setup();assert.equal(s.status({...visit(),state:'未激活'}),'inactive');
 assert.equal(s.status({...visit(),state:'已终止',itemResults:{生命体征:{type:'done'}}}),'terminated');
 assert.equal(s.statusLabels.activated,'待执行');assert.equal(s.statusLabels.partial,'进行中');
});

test('item readback uses newest history snapshot only when the current result is absent',()=>{
 const s=setup(),v={...visit(),executionHistory:[{itemResults:{生命体征:{type:'execute',nextPlannedAt:'2026-10-29T09:00',reason:'旧预约'}}},{itemResults:{生命体征:{type:'execute',nextPlannedAt:'2026-10-30T09:00',reason:'最新预约'}}}]};
 assert.equal(s.itemExecutionResults(v)['生命体征'].reason,'最新预约');
 v.itemResults={生命体征:{type:'followup',followupAt:'2026-10-31T10:00',content:'当前跟进'}};
 assert.equal(s.itemExecutionResults(v)['生命体征'].type,'followup');assert.equal(s.itemExecutionResults(v)['生命体征'].content,'当前跟进');
});

test('per-item later execution and followup accept date-only plans and normalize legacy datetimes',()=>{
 const s=setup(),v=visit(),name=s.executionItems(v)[0];
 assert.equal(s.validateItemExecutionPlan(v,name,{type:'execute',nextPlannedAt:'2026-10-30',reason:'改期'},'2026-10-29').nextPlannedAt,'2026-10-30');
 assert.equal(s.validateItemExecutionPlan(v,name,{type:'followup',followupAt:'2026-10-30',content:'确认'},'2026-10-29').followupAt,'2026-10-30');
 assert.equal(s.validateItemExecutionPlan(v,name,{type:'execute',nextPlannedAt:'2026-10-30T09:00',reason:'改期'},'2026-10-29').nextPlannedAt,'2026-10-30');
 assert.throws(()=>s.validateItemExecutionPlan(v,name,{type:'followup',followupAt:'2026-10-28',content:'确认'},'2026-10-29'),/不早于今天/);
 assert.throws(()=>s.validateItemExecutionPlan(v,name,{type:'execute',nextPlannedAt:'2026-02-30',reason:'改期'},'2026-01-01'),/日期/);
});
