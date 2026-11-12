(()=>{const person=(name,id,cycle,status='筛选中')=>({name,id,study:'这是试验项目名称',cycle,status,date:'2026-09-08',window:'2026/09/06 ~ 2026/09/10',content:'血常规、尿常规、生命体征'});window.clinicalTasks={draft:[person('张*','S001','筛选期'),person('赵**','S002','第1周期第1天（C1D1）','已入组'),person('王*','S003','筛选期'),person('陈*','S004','筛选期'),person('刘*','Y002','治疗结束访视','随访中'),person('周**','Y001','第3周期第15天（C3D15）','已入组'),person('周**','Y001','访视名称','已入组')],execute:Array.from({length:4},(_,i)=>({...person(i%2?'赵**':'张*',i%2?'S002':'S001',i%2?'第1周期第1天（C1D1）':'筛选期',i%2?'已入组':'筛选中'),date:i%2?'2026-09-30':'2026-09-29',window:'2026/09/27 ~ 2026/09/30',planDate:i%2?'2026-09-30':'2026-09-29',state:'待执行',remind:'未提醒',overdue:false,deadline:i%2?'09/30':'09/29',content:i===1?'不良反应问卷':i===3?'生命体征、体格检查、凝血功能':'血常规、尿常规、生命体征',caseOnly:i!==1})),follow:Array.from({length:4},(_,i)=>({...person(i%2?'赵**':'张*',i%2?'S002':'S001',i%2?'第1周期第1天（C1D1）':'筛选期',i%2?'已入组':'筛选中'),content:'好好吃饭',sent:'2025-07-31 00:00:00',kind:i%2?'患者未读':'患者未确认',handled:false}))};})();

clinicalTasks.processing=[['张*','SYS0170','第1周期第1天（C1D1）','已入组',1],['王*','SCR0204','筛选期','筛选中',0],['周**','SYS0193','第1周期第15天（C1D15）','已入组',2],['刘*','SYS0126','筛选期','筛选中',0]].map(([name,id,cycle,status,visitIndex],key)=>({key,name,id,cycle,status,visitIndex,study:'这是试验项目名称～',date:'2026/09/08',window:'2026/09/06 ~ 2026/09/10',content:'血常规、尿常规、生命体征',handled:false}));
clinicalTasks.countParticipants=rows=>new Set(rows.map(r=>JSON.stringify([r.study,r.id]))).size;

// 工作台、列表与日历共用任务示例及统计口径。
clinicalTasks.today="2026-09-29";
(()=>{
 const data=clinicalTasks.execute,calendarToday=clinicalTasks.today;
    const examples=[
      ['2026-09-28','刘*','S001','待执行','未提醒','尿常规、肝肾功能'],
      ['2026-09-28','李*','S003','已终止','未提醒','血常规、尿常规、生命体征'],
      ['2026-09-28','陶*','S005','已执行','已提醒','不良反应问卷'],
      ['2026-09-29','张*','S006','待执行','已提醒','生命体征、体格检查'],
      ['2026-09-29','王*','S003','待执行','未提醒','不良反应问卷'],
      ['2026-10-01','吴*','S004','待执行','未提醒','不良反应问卷'],
      ['2026-10-03','李*','S008','待执行','未提醒','血常规、生命体征'],
      ['2026-09-21','陈*','S009','已执行','已提醒','生命体征、体格检查'],
      ['2026-09-23','周*','S010','已执行','已提醒','血常规、尿常规'],
      ['2026-09-23','赵*','S011','已终止','未提醒','不良反应问卷'],
      ['2026-09-25','孙*','S012','已执行','已提醒','心电图检查'],
      ['2026-09-27','林*','S013','已执行','已提醒','血常规、肝肾功能']
    ];
    const base={...data[0]};
    const displayDate=d=>`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    // 同一份示例供列表和日历使用，替换旧种子，避免任务重复叠加。
    data.splice(0,data.length,...examples.map(([date,name,id,state,remind,content])=>{
      const start=new Date(date+'T12:00:00'),end=new Date(start);start.setDate(start.getDate()-2);end.setDate(end.getDate()+2);
      return {...base,name,id,state,remind,content,date,window:`${displayDate(start)} ~ ${displayDate(end)}`,executedAt:state==='已执行'?date+' 15:30':undefined,terminatedAt:state==='已终止'?date+' 15:30':undefined,planDate:date,deadline:date.slice(5).replace('-','/'),cycle:'筛选期',overdue:state==='待执行'&&date<calendarToday,caseOnly:true,calendarDemo:true,skipReason:'参与者状态调整'};
    }));
})();
clinicalTasks.planDate=r=>r.planDate||r.date;
clinicalTasks.pendingTasks=()=>clinicalTasks.execute.filter(r=>!r.removed&&r.state==="待执行"&&clinicalTasks.planDate(r)<=clinicalTasks.today);
