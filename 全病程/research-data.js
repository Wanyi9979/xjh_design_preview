(() => {
const taskSets = {
    draft: [
      ['S003', 'C1D1用药后呕吐症状采集', 'C1D1（第1周期第1天）', '表单填写', '单次填写', '提前2天/延后2天', 'WX', '已入组', 'HER2 阳性晚期乳腺癌真实世界研究', '2026-10-25'],
      ['S006', '筛选期生命体征采集', '筛选访视', '院内采集', '单次采集', '提前1天/延后1天', 'ZXH', '筛选中', '非小细胞肺癌 II 期研究', '2026-10-27'],
      ['S008', '安全性随访问卷', '安全性访视', '患者填写', '单次填写', '提前2天/延后2天', 'CXM', '已入组', 'HER2 阳性晚期乳腺癌真实世界研究', '2026-10-28'],
      ['S012', '预筛选症状评估', '预筛选访视', '电话采集', '单次采集', '当天', 'ZX', '筛选中', '消化道肿瘤 III 期研究', '2026-10-30']
    ],
    sent: [
      ['S001', '第一周期不良反应问卷', 'C1D1（第1周期第1天）', '表单填写', '每周期', '提前2天/延后2天', 'ZXX', '已入组', 'HER2 阳性晚期乳腺癌真实世界研究', '2026-10-25'],
      ['S004', '治疗期间生命体征采集', '第15天访视', '院内采集', '每周期', '提前1天/延后1天', 'CXX', '已入组', '非小细胞肺癌 II 期研究', '2026-10-26'],
      ['S009', '安全性事件确认', '安全性访视', '电话采集', '单次采集', '当天', 'LX', '已入组', '消化道肿瘤 III 期研究', '2026-10-27']
    ],
    none: [
      ['S002', '筛选失败记录确认', '筛选访视', '系统记录', '单次采集', '当天', 'LXX', '筛选失败', 'HER2 阳性晚期乳腺癌真实世界研究', '2026-10-24'],
      ['S013', '终止访视原因记录', '终止访视', '系统记录', '单次采集', '当天', 'WXX', '已终止', '非小细胞肺癌 II 期研究', '2026-10-22']
    ]
  };
const executionTasks = [
    { participantId: 'S003', participant: 'WX', participantStatus: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究', packageId: 'TP-20261025-003', task: 'C1D1用药后呕吐症状采集', visit: 'C1D1', visitFull: 'C1D1（第1周期第1天）', sequence: '第1次', relativeDay: '第5天', plannedAt: '2026-10-29 18:00', window: '10/29 08:00～18:00', status: '待执行', scope: 'today', method: '表单填写', formName: '用药后呕吐症状采集表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '指定天数', baselineDate: '2026-10-25', windowRule: '提前0天/延后2天', progress: '0/2' },
    { participantId: 'S003', participant: 'WX', participantStatus: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究', packageId: 'TP-20261025-003', task: 'C1D1用药后呕吐症状采集', visit: 'C1D1', visitFull: 'C1D1（第1周期第1天）', sequence: '第2次', relativeDay: '第8天', plannedAt: '2026-11-01 18:00', window: '11/01 08:00～18:00', status: '未开始', scope: 'upcoming', method: '表单填写', formName: '用药后呕吐症状采集表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '指定天数', baselineDate: '2026-10-25', windowRule: '提前0天/延后2天', progress: '0/2' },
    { participantId: 'S006', participant: 'ZXH', participantStatus: '已入组', trial: '非小细胞肺癌 II 期研究', packageId: 'TP-20261027-006', task: '筛选期生命体征采集', visit: '筛选访视', visitFull: '筛选访视', sequence: '第1次', relativeDay: '第1天', plannedAt: '2026-10-27 09:00', window: '10/27 08:00～18:00', status: '待执行', scope: 'today', method: '表单填写', formName: '生命体征记录表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '单次采集', baselineDate: '2026-10-27', windowRule: '提前1天/延后1天', progress: '0/1' },
    { participantId: 'S008', participant: 'CXM', participantStatus: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究', packageId: 'TP-20261028-008', task: '安全性检查报告上传', visit: '安全性访视', visitFull: '安全性访视', sequence: '第1次', relativeDay: '第5天', plannedAt: '2026-10-28 20:00', window: '10/28 08:00～18:00', status: '已逾期', scope: 'overdue', method: '上传文件', formName: '', fillMode: '个案可填', canCaseExecute: true, executionType: 'upload', cycle: '单次采集', baselineDate: '2026-10-24', windowRule: '提前1天/延后1天', progress: '0/1' },
    { participantId: 'S010', participant: 'SXX', participantStatus: '已入组', trial: '消化道肿瘤 III 期研究', packageId: 'TP-20261029-010', task: '治疗体验问卷', visit: '第15天访视', visitFull: '第15天访视', sequence: '第1次', relativeDay: '第15天', plannedAt: '2026-10-29 10:00', window: '10/29 08:00～18:00', status: '待执行', scope: 'today', method: '表单填写', formName: '治疗体验问卷', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '每周期', baselineDate: '2026-10-15', windowRule: '提前0天/延后1天', progress: '0/1' },
    { participantId: 'S012', participant: 'ZX', participantStatus: '筛选中', trial: '消化道肿瘤 III 期研究', packageId: 'TP-20261030-012', task: '预筛选症状评估', visit: '预筛选访视', visitFull: '预筛选访视', sequence: '第1次', relativeDay: '第1天', plannedAt: '2026-10-30 10:00', window: '10/30 08:00～20:00', status: '未开始', scope: 'upcoming', method: '表单填写', formName: '预筛选症状评估表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '单次采集', baselineDate: '2026-10-30', windowRule: '当天', progress: '0/1' },
    { participantId: 'S004', participant: 'CXX', participantStatus: '已入组', trial: '非小细胞肺癌 II 期研究', packageId: 'TP-20261026-004', task: '治疗期间生命体征采集', visit: '第15天访视', visitFull: '第15天访视', sequence: '第1次', relativeDay: '第15天', plannedAt: '2026-10-26 09:00', window: '10/26 08:00～18:00', status: '已完成', scope: 'completed', method: '表单填写', formName: '生命体征记录表', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '每周期', baselineDate: '2026-10-12', windowRule: '提前1天/延后1天', progress: '1/1', result: '血压 118/76 mmHg，心率 72 次/分，体温 36.5℃', completedAt: '2026-10-26 09:18', operator: '研究护士 李敏' },
    { participantId: 'S014', participant: 'QXX', participantStatus: '筛选失败', trial: 'HER2 阳性晚期乳腺癌真实世界研究', packageId: 'TP-20261024-014', task: '筛选期症状问卷', visit: '筛选访视', visitFull: '筛选访视', sequence: '第1次', relativeDay: '第1天', plannedAt: '2026-10-24 09:00', window: '10/24 08:00～18:00', status: '无需处理', scope: 'none', method: '表单填写', formName: '筛选期症状问卷', fillMode: '个案可填', canCaseExecute: true, executionType: 'form', cycle: '单次采集', baselineDate: '2026-10-24', windowRule: '提前0天/延后1天', progress: '0/1', noProcessReason: '参与者筛选失败，任务无需继续执行。' }
  ];
const followupTasks = [
    { participantId: 'S003', participant: 'WX', date: '2026-10-29', type: '症状跟进', content: '跟进用药后呕吐症状，确认症状变化及用药情况。', record: '已电话联系，参与者反馈症状较前缓解，需再次确认恢复情况。', operatedAt: '2026-10-28 16:30', operator: '李敏' },
    { participantId: 'S006', participant: 'ZXH', date: '2026-10-29', type: '访视跟进', content: '确认筛选访视到院安排，提醒携带检查报告。', record: '已发送到院提醒，等待参与者确认具体时间。', operatedAt: '2026-10-28 15:20', operator: '王芳' },
    { participantId: 'S008', participant: 'CXM', date: '2026-10-30', type: '任务跟进', content: '跟进安全性检查报告上传，确认报告是否齐全。', record: '', operatedAt: '2026-10-29 09:10', operator: '李敏' },
    { participantId: 'S012', participant: 'ZX', date: '2026-10-30', type: '电话随访', content: '电话确认预筛选症状评估情况及后续访视意向。', record: '', operatedAt: '2026-10-29 10:00', operator: '王芳' },
    { participantId: 'S003', participant: 'WX', date: '2026-10-27', content: '确认用药后症状变化及恢复情况。', scope: 'completed', record: '已电话随访，参与者反馈症状已缓解，完成本次跟进。', createdAt: '2026-10-26 09:00', createdBy: '李敏', operatedAt: '2026-10-27 15:20', operator: '李敏' },
    { participantId: 'S006', participant: 'ZXH', date: '2026-10-28', content: '确认原定筛选访视到院安排。', scope: 'none', noProcessReason: '访视预约已调整，原到院提醒无需继续跟进。', createdAt: '2026-10-26 10:30', createdBy: '王芳', operatedAt: '2026-10-27 16:10', operator: '王芳' }
  ];
const processingTasks = [
    { participantId: 'S003', participant: 'WX', participantStatus: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究', visit: 'C1D1（第1周期第1天）', visitIndex: 1, plannedDate: '2026-10-25（±2）', actualDate: '2026-10-26', completeness: 13, scope: 'pending' },
    { participantId: 'S006', participant: 'ZXH', participantStatus: '筛选中', trial: '非小细胞肺癌 II 期研究', visit: '筛选期', visitIndex: 0, plannedDate: '2026-10-27（±1）', actualDate: '2026-10-27', completeness: 40, scope: 'pending' },
    { participantId: 'S008', participant: 'CXM', participantStatus: '已入组', trial: 'HER2 阳性晚期乳腺癌真实世界研究', visit: 'C1D15（第1周期第15天）', visitIndex: 2, plannedDate: '2026-10-28（±2）', actualDate: '2026-10-29', completeness: 65, scope: 'pending' },
    { participantId: 'S012', participant: 'ZX', participantStatus: '筛选中', trial: '消化道肿瘤 III 期研究', visit: '筛选期', visitIndex: 0, plannedDate: '2026-10-30（±1）', actualDate: '2026-10-30', completeness: 25, scope: 'pending' },
    { participantId: 'S002', participant: 'LXX', participantStatus: '筛选失败', trial: 'HER2 阳性晚期乳腺癌真实世界研究', visit: '筛选期', visitIndex: 0, plannedDate: '2026-10-24（±1）', actualDate: '2026-10-24', completeness: 13, scope: 'none', noProcessReason: '参与者筛选失败，已确认现有访视资料，剩余资料无需继续处理。' }
  ];
 const key='journey-v2-research-state';
 let saved; try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 window.researchDemo=saved&&saved.taskSets&&saved.executionTasks? saved:{taskSets,executionTasks,followupTasks,processingTasks};
 window.saveResearchDemo=()=>{try{localStorage.setItem(key,JSON.stringify(window.researchDemo));for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k.startsWith('journey-v2-participant-tasks-v3:')&&!k.includes(':view'))sessionStorage.removeItem(k);}}catch{}};
 const projectId=trial=>trial==='乳腺癌 III 期临床研究'?'HX-BC-III-02':trial==='非小细胞肺癌 II 期研究'?'HX-LC-II-06':trial==='消化道肿瘤 III 期研究'?'HX-GI-III-01':'CT-2026-001';
 window.researchProjectId=projectId;
 const visitName=value=>{
  const name=String(value||'');
  if(/筛选/.test(name))return '筛选期';
  const code=name.match(/C(\d+)D(\d+)/i);
  if(code)return `第${code[1]}周期第${code[2]}天（C${code[1]}D${code[2]}）`;
  const day=name.match(/第(\d+)天访视/);
  if(day)return `第1周期第${day[1]}天（C1D${day[1]}）`;
  if(name==='安全性访视')return '第1周期第1天（C1D1）';
  return name;
 };
 const base=(name,id,trial,status,visit,date)=>({name,id,projectId:projectId(trial),study:trial,status,cycle:visitName(visit),date,planDate:date,hospital:projectId(trial)==='HX-LC-II-06'?'第二医院':'第一医院',window:date,content:''});
 const data=window.researchDemo;
 // Seed S001 once without resetting existing demo operations.
 if(!data.s001TaskExamplesV1){
  const trial='HER2 阳性晚期乳腺癌真实世界研究', visit='第1周期第1天（C1D1）';
  const draft=(name,method='表单填写')=>['S001',name,visit,method,'单次采集','提前2天/延后2天','ZXX','已入组',trial,'2026-10-22'];
  data.taskSets.draft.push(draft('生活质量评估'),draft('治疗期间用药记录'));
  data.taskSets.none.push(draft('重复检查报告确认','上传文件'));
  const common={participantId:'S001',participant:'ZXX',participantStatus:'已入组',trial,visit,visitFull:visit,baselineDate:'2026-10-22',protocolVersion:'V1.0',method:'表单填写',fillMode:'个案可填',canCaseExecute:true,executionType:'form',cycle:'单次采集',windowRule:'提前2天/延后2天',relativeDay:'第8天',sequence:'第1次'};
  data.executionTasks.push(
   {...common,canonicalKey:'s001-demo-execute-symptoms',packageId:'DEMO-S001-01',task:'治疗期间症状随访',plannedAt:'2026-10-29 09:00',window:'10/27～10/31',scope:'today',status:'待执行',formName:'安全性随访问卷',progress:'0/1'},
   {...common,canonicalKey:'s001-demo-execute-report',packageId:'DEMO-S001-02',task:'血常规检查报告上传',method:'上传文件',executionType:'upload',plannedAt:'2026-10-28 10:00',window:'10/26～10/30',scope:'overdue',status:'已逾期',progress:'0/1'},
   {...common,canonicalKey:'s001-demo-execute-done',packageId:'DEMO-S001-03',task:'筛选期健康评估',visit:'筛选期',visitFull:'筛选期',baselineDate:'2026-10-08',plannedAt:'2026-10-08 09:00',window:'10/06～10/10',scope:'completed',status:'已完成',progress:'1/1',result:'已完成健康状况及既往史采集。',completedAt:'2026-10-08 09:20',operator:'研究护士'},
   {...common,canonicalKey:'s001-demo-execute-none',packageId:'DEMO-S001-04',task:'重复用药提醒',plannedAt:'2026-10-27 09:00',window:'10/25～10/29',scope:'none',status:'无需处理',noProcessReason:'已通过电话完成提醒，本次重复任务无需执行。',progress:'0/1'}
  );
  data.followupTasks.push(
   {participantId:'S001',participant:'ZXX',participantStatus:'已入组',trial,date:'2026-10-29',type:'访视跟进',content:'确认本周期复查安排，提醒携带检查报告。',scope:'pending',record:'',createdAt:'2026-10-28 10:00',operator:'研究护士'},
   {participantId:'S001',participant:'ZXX',participantStatus:'已入组',trial,date:'2026-10-28',type:'用药跟进',content:'电话确认用药依从性和症状变化。',scope:'completed',record:'已电话联系，参与者反馈按计划用药。',operatedAt:'2026-10-28 15:00',operator:'研究护士'},
   {participantId:'S001',participant:'ZXX',participantStatus:'已入组',trial,date:'2026-10-27',type:'预约提醒',content:'原预约到院时间提醒。',scope:'none',noProcessReason:'预约时间已调整，原提醒无需继续。',operator:'研究护士'}
  );
  data.s001TaskExamplesV1=true;
  try{localStorage.setItem(key,JSON.stringify(data));}catch{}
 }

 // Completed examples include their actual payload, separate from the summary text.
 if(!data.taskResultPayloadExamplesV1){
  const health=data.executionTasks.find(task=>task.canonicalKey==='s001-demo-execute-done');
  if(health&&!health.formAnswers?.length)health.formAnswers=[{label:'健康状况',value:'良好'},{label:'既往史',value:'无特殊既往史'}];
  const report=data.executionTasks.find(task=>task.canonicalKey==='s001-demo-execute-report');
  if(report&&!data.executionTasks.some(task=>task.canonicalKey==='s001-demo-upload-result'))data.executionTasks.push({...report,canonicalKey:'s001-demo-upload-result',packageId:'DEMO-S001-UPLOAD-RESULT',task:'血常规报告上传示例',scope:'completed',status:'已完成',progress:'1/1',result:'已上传血常规检查报告。',completedAt:'2026-10-28 11:20',operator:'研究护士',uploads:[{name:'血常规检查报告.png',type:'image/png',url:'figma-clinical-assets/entry-lab-report.png'}],executionNote:'检查报告图片示例'});
  data.taskResultPayloadExamplesV1=true;try{localStorage.setItem(key,JSON.stringify(data));}catch{}
 }
 // Keep the completed screening example explicit; task completion alone does not complete a visit.
 if(!data.s001VisitExampleV1){
  const screening=data.executionTasks.find(row=>row.canonicalKey==='s001-demo-execute-done');
  if(screening&&!Object.prototype.hasOwnProperty.call(screening,'actualDate'))screening.actualDate='2026-10-08';
  data.s001VisitExampleV1=true;
  try{localStorage.setItem(key,JSON.stringify(data));}catch{}
 }

 // Keep names consistent on both new and previously saved demo tasks.
 const demoIdentity = window.demoParticipantIdentity;
 if (demoIdentity) {
  Object.values(data.taskSets).flat().forEach(row => { row[6] = demoIdentity.name(row[0], row[6]); });
  [...data.executionTasks, ...data.followupTasks, ...data.processingTasks].forEach(row => {
   row.participant = demoIdentity.name(row.participantId, row.participant);
  });
 }
 data.followupTasks.forEach(row=>{row.trial ||= row.participantId==='S006'?'非小细胞肺癌 II 期研究':row.participantId==='S012'?'消化道肿瘤 III 期研究':'HER2 阳性晚期乳腺癌真实世界研究';});
 window.clinicalTasks={today:'2026-10-29',draft:Object.entries(data.taskSets).flatMap(([state,rows])=>rows.map(row=>({...base(row[6],row[0],row[8],row[7],row[2],row[9]),content:row[1],method:row[3],state:state==='sent'?'已发放':state==='none'?'无需处理':'待发放',issued:state==='sent',noProcessReason:state==='none'?(data.packageSettings?.[JSON.stringify([projectId(row[8]),row[0],row[2],row[1]])]?.reason||'该任务无需继续发放'):'',config:{cycle:row[4],baseline:'访视日期',description:row[1]}}))),execute:data.executionTasks.map(row=>({...base(row.participant,row.participantId,row.trial,row.participantStatus,row.visitFull||row.visit,row.baselineDate||row.plannedAt.slice(0,10)),protocolVersion:row.protocolVersion||window.visitProtocols.bind(projectId(row.trial),row.participantId),content:row.task,formName:row.formName,cycle:visitName(row.visitFull||row.visit),baselineDate:row.baselineDate,windowRule:row.windowRule,allowOverdue:row.allowOverdue,autoMapCrf:row.autoMapCrf,config:row.config||{cycle:row.cycle,baseline:'访视日期',description:row.description||'',overdue:row.allowOverdue,autoMap:row.autoMapCrf},plannedAt:row.plannedAt,window:row.window,state:row.scope==='completed'?'已完成':row.scope==='none'?'无需处理':'待执行',overdue:row.scope==='overdue',method:row.method,executionType:row.executionType,canCaseExecute:row.canCaseExecute,fillMode:row.fillMode,packageId:row.packageId,result:row.result,uploads:row.uploads||[],formAnswers:row.formAnswers||[],executionNote:row.executionNote||'',completedAt:row.completedAt,operator:row.operator,noProcessReason:row.noProcessReason})),follow:data.followupTasks.map(row=>({...base(row.participant,row.participantId,row.trial||'HER2 阳性晚期乳腺癌真实世界研究',row.participantStatus||'已入组','',row.date),content:row.content,handled:row.scope==='completed',state:row.scope==='none'?'无需处理':'待处理',result:row.record,noProcessReason:row.noProcessReason})),processing:[]};
 ['draft','execute','follow'].forEach(kind=>window.clinicalTasks[kind].forEach((row,index)=>{row.sourceKey=(kind==='execute'?data.executionTasks[index].canonicalKey:null)||kind+':'+row.projectId+':'+row.id+':'+row.content+':'+(row.plannedAt||row.date);}));
 window.saveResearchTasks=(project,id,tasks)=>{
  const state=window.researchDemo;
  tasks.forEach(task=>{
   if(task.kind==='draft'){
    let row; Object.values(state.taskSets).forEach(rows=>{const i=rows.findIndex(row=>row[0]===id&&projectId(row[8])===project&&row[1]===task.name);if(i>=0)row=rows.splice(i,1)[0];});
    if(row)state.taskSets[task.state==='issued'?'sent':task.state==='none'?'none':'draft'].push(row);
   }else if(task.kind==='execute'){
    let row=state.executionTasks.find(row=>row.participantId===id&&projectId(row.trial)===project&&(row.canonicalKey===task.key||row.task===task.name&&row.plannedAt===task.plannedAt));
    if(!row&&task.local){row={participantId:id,participant:task.participantName||document.getElementById('person-name')?.textContent||id,participantStatus:document.getElementById('person-status')?.textContent||'已入组',trial:project==='HX-LC-II-06'?'非小细胞肺癌 II 期研究':project==='HX-GI-III-01'?'消化道肿瘤 III 期研究':'HER2 阳性晚期乳腺癌真实世界研究',task:task.name,visit:task.visit,visitFull:task.visit,plannedAt:task.plannedAt||task.date,baselineDate:task.date,window:task.window,method:task.method,executionType:task.executionType,canCaseExecute:task.canCaseExecute,fillMode:task.fillMode,formName:task.formName,packageId:task.packageId,relativeDay:task.relativeDay||'访视当日',sequence:task.sequence||'第1次',canonicalKey:task.key};state.executionTasks.push(row);}
    if(row){row.creation=Boolean(task.creation);row.plannedAt=task.plannedAt||task.date;row.window=task.window;row.visitId ||= task.visitId||'';row.history=task.history||row.history;row.protocolVersion ||= task.protocolVersion || window.visitProtocols.bind(project,id);row.scope=task.state==='done'?'completed':task.state==='none'?'none':task.date<'2026-10-29'?'overdue':task.date==='2026-10-29'?'today':'upcoming';row.status=task.state==='done'?'已完成':task.state==='none'?'无需处理':'待执行';row.result=task.result;row.uploads=task.uploads||[];row.formAnswers=task.formAnswers||[];row.executionNote=task.executionNote||'';row.completedAt=task.completedAt;row.operator=task.operator;row.noProcessReason=task.noProcessReason;row.progress=task.state==='done'?'1/1':'0/1';}
   }else if(task.kind==='follow'){
    let row=state.followupTasks.find(row=>row.participantId===id&&projectId(row.trial||'')===project&&row.content===task.name&&row.date===task.date);
    if(!row&&task.local){row={participantId:id,participant:document.getElementById('person-name')?.textContent||id,trial:project==='HX-LC-II-06'?'非小细胞肺癌 II 期研究':project==='HX-GI-III-01'?'消化道肿瘤 III 期研究':'HER2 阳性晚期乳腺癌真实世界研究',content:task.name,date:task.date,operator:'当前个案',operatedAt:new Date().toLocaleString('sv-SE'),history:[]};state.followupTasks.push(row);}
    if(row){const next=task.state==='done'?'completed':task.state==='none'?'none':'pending';if(row.scope!==next||(row.record||'')!==(task.note||'')){(row.history||=[]).push({action:next==='completed'?'完成跟进':next==='none'?'无需处理':'更新跟进',at:new Date().toLocaleString('sv-SE'),operator:'当前个案',record:task.note||'',scope:next});}row.scope=next;row.record=task.note;row.noProcessReason=task.noProcessReason;}
   }
  });window.saveResearchDemo();
 };
 ['draft','execute','follow'].forEach(kind=>window.clinicalTasks[kind].forEach(row=>{row.protocolVersion=window.visitProtocols.bind(row.projectId,row.id,row.protocolVersion);}));
 window.clinicalTasks.planDate=task=>task.planDate||task.date;
 window.clinicalTasks.countParticipants=rows=>new Set(rows.map(row=>row.projectId+":"+row.id)).size;
 const shift=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 window.clinicalTasks.execute.forEach((row,i)=>{
  const task=data.executionTasks[i]; row.window=task.creation?task.window:shift(row.planDate,-2)+' ～ '+shift(row.planDate,2);row.actualDate=task.actualDate||'';row.visitStatus=task.scope==='none'?'已终止':'已激活';
  row.appointmentDate=task.appointmentDate||'';
 });
})();
