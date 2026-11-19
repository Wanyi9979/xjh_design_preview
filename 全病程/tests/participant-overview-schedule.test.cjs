const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const records=new Map();const storage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};
 const window={localStorage:storage,sessionStorage:storage,visitProtocols:{stamp:v=>v,get:()=>({cycleDays:21,visits:['筛选期','第1周期第1天（C1D1）','第2周期第1天（C2D1）']})}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../clinical-visit-store.js','utf8'),{window,Date,Set,JSON});
 const directory={participants:[{study:'CT-2026-001',id:'S003',protocolVersion:'V2.0',status:'已入组',hospital:'第一医院'}],sourcePeople:[],source:{today:'2026-10-29',visits:[{id:'existing-task',projectId:'CT-2026-001',participantId:'S003',protocolVersion:'V2.0',name:'C1D1（第1周期第1天）',visitIndex:0,plannedDate:'2026-10-25',windowStart:'2026-10-23',windowEnd:'2026-10-27',appointmentDate:'2026-10-29',sourceTaskIndices:[0],state:'已激活'}]}};
 return {store:window.clinicalVisitStore,directory};
}
test('Figma participant example has six canonical cycles and reuses source task identity',()=>{
 const {store,directory}=setup();const visits=store.directoryVisits(directory);
 assert.equal(visits.length,6);assert.equal(new Set(visits.map(v=>v.id)).size,6);
 const current=visits.find(v=>v.name==='第1周期第1天（C1D1）');
 assert.equal(current.id,'existing-task');assert.equal(current.appointmentDate,'2026-10-29');assert.equal(current.sourceTaskIndices[0],0);
 assert.equal(visits[0].name,'筛选期');assert.equal(store.status(visits[0]),'completed');
 assert.equal(visits.at(-1).name,'第3周期第1天（C3D1）');
});
test('persisted appointment and partial execution take precedence over Figma sample defaults',()=>{
 const {store,directory}=setup();const visit=store.directoryVisits(directory).find(v=>v.id==='existing-task');
 visit.appointmentDate='2026-11-02';visit.plannedDate='2026-10-30';visit.state='部分完成';visit.visitStatus='partial';visit.completedItems=['生命体征'];visit.incompleteItems=['不良事件','用药记录'];store.save(visit);
 const restored=store.directoryVisits(directory).find(v=>v.id==='existing-task');
 assert.equal(restored.appointmentDate,'2026-11-02');assert.equal(restored.plannedDate,'2026-10-30');assert.equal(store.status(restored),'partial');assert.equal(restored.completedItems[0],'生命体征');
});
