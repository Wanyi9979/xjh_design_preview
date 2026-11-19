const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(followupTasks) {
 const window = {
  researchDemo:{followupTasks},clinicalTasks:{draft:[],execute:[],follow:[]},
  researchProjectId:trial=>trial,
  visitProtocols:{bind:()=> 'V1.0'},
  clinicalVisitStore:{calendar:()=>({visits:[]}),terminatedVisits:()=>[],apply:v=>v,status:v=>v.state}
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/../participant-tasks.js','utf8'),{window,sessionStorage:{getItem:()=>null}});
 return window;
}
test('visit follow-ups retain their visit identity and include completed records',()=>{
 const w=setup([
  {id:'f1',projectId:'P1',participantId:'S001',visitId:'v1',visit:'C1D1',date:'2026-10-29',content:'确认到院',scope:'pending'},
  {id:'f2',projectId:'P1',participantId:'S001',visitId:'v1',visit:'C1D1',date:'2026-10-28',content:'确认报告',scope:'completed',record:'已确认'},
  {id:'f3',projectId:'P1',participantId:'S001',visitId:'v2',visit:'C1D1',date:'2026-10-29',content:'另一访视',scope:'pending'}
 ]);
 const tasks=w.loadParticipantTasks('P1','S001');
 const own=tasks.filter(task=>w.participantTaskBelongsToVisit(task,{id:'v1',protocolVersion:'V1.0'}));
 assert.equal(own.length,2);
 assert.equal(own.find(t=>t.key==='f2').state,'done');
 assert.equal(own.find(t=>t.key==='f2').note,'已确认');
});
test('unassigned and cross-project follow-ups cannot leak into a selected visit',()=>{
 const w=setup([
  {id:'f1',projectId:'P1',participantId:'S001',date:'2026-10-29',content:'一般随访',scope:'pending'},
  {id:'f2',projectId:'P2',participantId:'S001',visitId:'v1',date:'2026-10-29',content:'另一项目',scope:'pending'}
 ]);
 const tasks=w.loadParticipantTasks('P1','S001');
 assert.equal(tasks.length,1);
 assert.equal(tasks.filter(t=>w.participantTaskBelongsToVisit(t,{id:'v1',name:'C1D1'})).length,0);
});
test('follow-up additions are visible without rebuilding the page source snapshot',()=>{
 const live=[];const w=setup(live);
 assert.equal(w.loadParticipantTasks('P1','S001').length,0);
 live.push({id:'new',projectId:'P1',participantId:'S001',visitId:'v1',date:'2026-10-29',content:'新跟进',scope:'pending'});
 assert.equal(w.loadParticipantTasks('P1','S001')[0].visitId,'v1');
});
