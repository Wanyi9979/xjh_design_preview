(()=>{
  const mode=document.body.dataset.taskPage;
  const isDraft=mode==='draft',isFollow=mode==='follow',isExec=!isDraft&&!isFollow;
  const currentProject=new URLSearchParams(location.search).get('project');
  const taskSource=isDraft?clinicalTasks.draft:isFollow?clinicalTasks.follow:clinicalTasks.execute;
  const data=currentProject?taskSource.filter(task=>(task.projectId||'CT-2026-001')===currentProject):taskSource;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const select=(id,label,values)=>`<select id="${id}" aria-label="${label}"><option value="">${label}</option>${[...new Set(values)].map(v=>`<option>${esc(v)}</option>`).join('')}</select>`;
  const todayText='2026-09-29 15:30';
  const operator='个案xx';

  if(isFollow&&!data.some(r=>r.handled)){
    data.slice(0,4).forEach((r,i)=>data.push({...r,handled:true,handledAt:'2025-08-12 18:02:15',handler:'测试8',result:i===0?'患者操作确认':i===1?'患者查看提醒':i===2?'标记为已处理-微信处理-':'无需跟踪-患者不愿确认-',kind:i%2?'患者未读':'患者未确认'}));
  }
  const calendarToday=clinicalTasks.today;
  data.forEach((r,i)=>r.key=i);

  let tab=isFollow?'待处理提醒计划':'待执行';
  let reminder='全部',overdue=mode==='overdue',activeActionRow=null;

  const fileInput=document.createElement('input');
  fileInput.type='file';fileInput.multiple=true;fileInput.hidden=true;
  document.body.append(fileInput);
  let uploadingRow=null;

  const tabs=isDraft?'':(isFollow?['待处理提醒计划','已处理提醒计划']:['待执行','已执行','已终止']);
  $('task-tabs').innerHTML=isDraft?'':`<div class="task-tabs">${tabs.map((t,i)=>`<button data-tab="${t}" class="${i?'':'selected'}">${t}</button>`).join('')}${isFollow?'<small>说明：每日12点/24点会更新需跟进列表</small>':''}</div>`;

  const statusHtml=r=>`<span class="status ${r.status==='已入组'?'enrolled':r.status==='随访中'?'following':''}">${esc(r.status)}</span>`;
  const nameLink=r=>`<a href="项目参与者详情-Figma.html?${new URLSearchParams({name:r.name,id:r.id,status:r.status})}">${esc(r.name)}</a>`;
  const icon=(action,label,file,key)=>`<button class="icon-action" data-action="${action}" data-key="${key}" title="${label}" aria-label="${label}"><img src="figma-clinical-assets/${file}" alt=""></button>`;
  const dateValue=id=>($(id)?.value||'').trim().replaceAll('/','-');

  function renderFilters(){
    const calendarMode=isExec&&taskView==='calendar';
    const draftVisitDate=isDraft?`<div class="date-range draft-date-range"><span>访视日期</span><input type="text" id="date-from" placeholder="年/月/日" aria-label="访视日期开始时间"><span class="date-separator">–</span><input type="text" id="date-to" placeholder="年/月/日" aria-label="访视日期结束时间"></div>`:'';
    const common=isFollow
      ? select('kind','全部类型',data.map(r=>r.kind))
      : select('study','参与试验',data.map(r=>r.study))+draftVisitDate+select('cycle',isDraft?'当前访视周期':'访视周期',data.map(r=>r.cycle))+(isExec&&!calendarMode&&tab!=='待执行'?'':select('status','参与者状态',data.map(r=>r.status)))+`<input id="participant" type="search" placeholder="${isExec&&tab!=='待执行'?'参与者编号':'参与者编号'}" aria-label="参与者编号">`;
    const pendingControls=isExec&&!calendarMode&&tab==='待执行'?`<div class="segmented">${['全部','已提醒','未接听','未提醒'].map((s,i)=>`<button data-reminder="${s}" class="${i?'':'selected'}">${s}</button>`).join('')}</div><button id="overdue-filter" class="overdue ${overdue?'selected':''}">逾期 ${data.filter(r=>r.state==='待执行'&&r.overdue).length}</button><div class="date-range"><span>计划日期</span><input type="text" id="date-from" placeholder="年/月/日" aria-label="开始时间"><span class="date-separator">–</span><input type="text" id="date-to" placeholder="年/月/日" aria-label="结束时间"></div>`:'';
    $('task-filters').innerHTML=`<div class="filters">${pendingControls}${common}${isExec&&!calendarMode?'<label><input id="case-only" type="checkbox"> 仅个案可填</label>':''}${!isFollow?'<button class="reset" id="reset">重置</button>':''}${isExec&&!calendarMode?'<button id="batch-remind" class="text-action">智能体逾期提醒</button>':''}</div>`;
  }

  const configs={
    draft:{headers:['参与者','参与者编号','参与试验','当前访视','访视日期','访视窗口','访视内容','参与者状态','操作'],widths:[64,88,170,160,105,190,null,94,180]},
    follow:{headers:['参与者','参与者编号','参与试验','访视周期','访视日期','访视窗口','参与者状态','提醒事项','提醒时间','跟进类型','操作'],widths:[64,88,150,145,100,185,90,100,140,105,100]},
    followDone:{headers:['参与者','参与者编号','参与试验','访视周期','访视日期','访视窗口','参与者状态','提醒事项','提醒时间','跟进类型','处理时间','处理人','处理结果'],widths:[64,88,170,153,110,180,87,132,142,144,150,150,150]},
    pending:{headers:['参与者','参与者编号','参与试验','访视周期','访视日期','访视窗口','参与者状态','计划日期','提醒状态','计划内容','操作'],widths:[60,85,125,145,100,180,85,65,70,null,100]},
    executed:{headers:['参与者','参与者编号','参与试验','访视周期','访视日期','访视窗口','计划日期','完成时间','计划内容','操作'],widths:[76,96,184,150,118,202,92,146,260,90]},
    stopped:{headers:['参与者','参与者编号','参与试验','访视周期','访视日期','访视窗口','计划日期','计划内容','操作时间','原因','操作人'],widths:[76,96,184,150,118,202,92,260,146,253,135]}
  };
  const config=()=>isDraft?configs.draft:isFollow?(tab==='已处理提醒计划'?configs.followDone:configs.follow):tab==='已执行'?configs.executed:tab==='已终止'?configs.stopped:configs.pending;

  function updateTableHead(){
    const cfg=config();
    $('task-cols').innerHTML=cfg.widths.map(w=>`<col${w?' style="width:'+w+'px"':''}>`).join('');
    $('task-head').innerHTML='<tr>'+cfg.headers.map(h=>'<th>'+h+'</th>').join('')+'</tr>';
    const table=document.querySelector('.task-table');
    table.classList.toggle('terminated-table',isExec&&tab==='已终止');
    table.classList.toggle('executed-table',isExec&&tab==='已执行');
    table.classList.toggle('follow-done-table',isFollow&&tab==='已处理提醒计划');
  }

  function planDate(r){
    const value=(r.planDate||r.deadline||r.date).replaceAll('/','-');
    return /^\d{2}-\d{2}$/.test(value)?r.date.slice(0,4)+'-'+value:value.slice(0,10);
  }
  function visible(){
    return data.filter(r=>!r.removed)
      .filter(r=>!isExec||taskView==='calendar'||planDate(r)<=calendarToday)
      .filter(r=>!isExec||taskView==='calendar'||r.state===tab)
      .filter(r=>!isExec||taskView==='calendar'||tab!=='待执行'||((!overdue||r.overdue)&&(reminder==='全部'||r.remind===reminder)))
      .filter(r=>!isFollow||r.handled===(tab==='已处理提醒计划'))
      .filter(r=>['study','cycle','status','kind'].every(k=>!$(k)?.value||r[k]===$(k).value))
      .filter(r=>!$('participant')?.value||r.id.toLowerCase().includes($('participant').value.trim().toLowerCase()))
      .filter(r=>tab!=='待执行'||!dateValue('date-from')||(isExec?planDate(r):r.date)>=dateValue('date-from'))
      .filter(r=>tab!=='待执行'||!dateValue('date-to')||(isExec?planDate(r):r.date)<=dateValue('date-to'))
      .filter(r=>!$('case-only')?.checked||r.caseOnly);
  }


  let taskView='list',weekStart=null,calendarStatus=mode==='overdue'?'逾期':'';
  const dateISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monday=value=>{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);return d;};
  const shiftDay=(d,n)=>{const next=new Date(d);next.setDate(next.getDate()+n);return next;};
  if(isExec){
    const switcher=document.createElement('div');switcher.className='task-view-switch';switcher.setAttribute('aria-label','任务视图');
    switcher.innerHTML='<button type="button" data-view="list" aria-pressed="true" class="selected">列表</button><button type="button" data-view="calendar" aria-pressed="false">日历</button>';
    const controls=document.createElement('div');controls.id='calendar-controls';controls.hidden=true;$('task-tabs').append(controls,switcher);
    controls.addEventListener('click',e=>{const state=e.target.closest('[data-calendar-state]');if(state){calendarStatus=calendarStatus===state.dataset.calendarState?'':state.dataset.calendarState;render();return;}const b=e.target.closest('[data-week]');if(b){weekStart=['today','current'].includes(b.dataset.week)?monday(calendarToday):shiftDay(weekStart,Number(b.dataset.week));render();}});
    const calendar=document.createElement('section');calendar.id='task-calendar';calendar.hidden=true;calendar.setAttribute('aria-label','每周计划日历');document.querySelector('.task-table-shell').after(calendar);
    switcher.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;taskView=b.dataset.view;if(taskView==='calendar'&&!weekStart)weekStart=monday(calendarToday);switcher.querySelectorAll('button').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});renderFilters();render();});
    calendar.addEventListener('click',e=>{const b=e.target.closest('[data-week]');if(!b)return;weekStart=b.dataset.week==='today'?monday(calendarToday):shiftDay(weekStart,Number(b.dataset.week));render();});
    calendar.addEventListener('change',e=>{if(e.target.id==='calendar-date'&&e.target.value){weekStart=monday(e.target.value);render();}});
  }
  function calendarCard(r){
    const pending=r.state==='待执行';
    const future=pending&&planDate(r)>calendarToday;
    const late=pending&&!future&&(r.overdue||planDate(r)<calendarToday);
    const style=future?'is-future':pending?(late?'is-overdue':'is-pending'):r.state==='已执行'?'is-executed':'is-terminated';
    const label=pending?(late?'已逾期 · ':'待执行 · ')+r.remind:r.state;
    const status=future?'':`<div class="week-task-state ${late?'danger':''}">${pending&&r.remind==='未提醒'?esc(late?'已逾期 · ':'待执行 · ')+'<span class="danger">未提醒</span>':esc(label)}</div>`;
    const actions=pending&&!future?`<div class="week-task-actions"><button class="text-action" data-action="plan" data-key="${r.key}">处理计划</button>${icon('call','拨打电话','task-call.png',r.key)}${icon('more','更多操作','task-more.png',r.key)}</div>`:r.state==='已执行'?`<div class="week-task-actions"><button class="text-action" data-action="view" data-key="${r.key}">查看</button></div>`:'';
    return `<article class="week-task ${style}"><div class="week-task-person">${nameLink(r)}<span>${esc(r.id)}</span></div><div class="week-task-cycle">${esc(r.cycle)}</div><strong class="week-task-content">${esc(r.content)}</strong>${status}${actions}</article>`;
  }
  function renderCalendar(rows){
    if(!isExec)return;
    const active=taskView==='calendar';document.querySelector('#task-tabs .task-tabs').hidden=active;$('task-calendar').hidden=!active;document.querySelector('.task-table-shell').hidden=active;document.querySelector('.pagination').hidden=active;
    $('task-filters').hidden=active;$('calendar-controls').hidden=!active;document.body.classList.toggle('calendar-view',active);
    if(!active)return;
    const days=Array.from({length:7},(_,i)=>shiftDay(weekStart,i));
    const weekRows=rows.filter(r=>planDate(r)>=dateISO(days[0])&&planDate(r)<=dateISO(days[6]));
    const matches=(r,state)=>state==='逾期'?r.state==='待执行'&&planDate(r)<calendarToday:state==='待执行'?r.state===state&&planDate(r)===calendarToday:r.state===state;
    $('calendar-controls').innerHTML=`<div class="calendar-states">${['待执行','已执行','已终止','逾期'].map(state=>`<button data-calendar-state="${state}" aria-pressed="${calendarStatus===state}" class="${calendarStatus===state?'selected':''}">${state} ${data.filter(r=>!r.removed&&matches(r,state)).length}</button>`).join('')}</div><div class="calendar-navigation"><button data-week="today">今天</button><button data-week="current">本周</button><div class="calendar-range"><button data-week="-7" aria-label="上一周">‹</button><span>${dateISO(days[0]).replaceAll('-','/')} — ${dateISO(days[6]).replaceAll('-','/')}</span><button data-week="7" aria-label="下一周">›</button></div></div>`;
    $('task-calendar').innerHTML=`<div class="week-scroll"><div class="week-grid">${days.map((day,i)=>{
      const key=dateISO(day),tasks=weekRows.filter(r=>planDate(r)===key&&(!calendarStatus||matches(r,calendarStatus)));
      return `<section class="week-day ${key===calendarToday?'is-today':''}"><header><span>周${'一二三四五六日'[i]}</span><strong>${key.slice(5).replace('-','/')}</strong><small>${tasks.length} 项</small></header><div class="week-day-tasks">${tasks.map(calendarCard).join('')||'<p class="week-empty">暂无任务</p>'}</div></section>`;
    }).join('')}</div></div>`;
  }

  function render(){
    updateTableHead();
    const rows=visible();
    renderCalendar(rows);
    $('task-count').textContent=`共 ${rows.length} 条`;
    const cfg=config();
    $('task-rows').innerHTML=rows.map(r=>{
      let cells=[];
      if(isDraft){
        cells=[nameLink(r),r.id,esc(r.study),esc(r.cycle),r.date.replaceAll('-','/'),r.window,esc(r.content),statusHtml(r),`<button class="text-action" data-action="plan" data-key="${r.key}">制定访视计划</button><button class="text-action" data-action="skip" data-key="${r.key}">无需执行</button>`];
      }else if(isFollow){
        if(tab==='已处理提醒计划')cells=[nameLink(r),r.id,esc(r.study),esc(r.cycle),r.date.replaceAll('-','/'),r.window,statusHtml(r),esc(r.content),r.sent,r.kind,r.handledAt||'2025-08-12 18:02:15',esc(r.handler||'测试8'),esc(r.result||'患者操作确认')];
        else cells=[nameLink(r),r.id,esc(r.study),esc(r.cycle),r.date.replaceAll('-','/'),r.window,statusHtml(r),esc(r.content),r.sent,r.kind,icon('call','拨打电话','task-call.png',r.key)+icon('record','跟进记录','task-chat.png',r.key)+icon('more','更多操作','task-more.png',r.key)];
      }else if(tab==='已执行'){
        cells=[nameLink(r),r.id,esc(r.study),esc(r.cycle),r.date.replaceAll('-','/'),r.window,r.deadline||'09/29',r.executedAt||todayText,esc(r.content),`<button class="text-action" data-action="view" data-key="${r.key}">查看</button>`];
      }else if(tab==='已终止'){
        cells=[nameLink(r),r.id,esc(r.study),esc(r.cycle),r.date.replaceAll('-','/'),r.window,r.deadline||'09/29',esc(r.content),r.terminatedAt||todayText,esc(r.skipReason||'参与者状态调整'),esc(r.operator||operator)];
      }else{
        cells=[nameLink(r),r.id,esc(r.study),esc(r.cycle),r.date.replaceAll('-','/'),r.window,statusHtml(r),`<span class="${r.overdue?'danger':''}">${r.deadline}</span>`,`<span class="${r.remind==='未提醒'?'danger':''}">${r.remind}</span>`,esc(r.content),icon('plan','处理计划',/问卷/.test(r.content)?'task-edit.png':'task-form-edit.svg',r.key)+icon('call','拨打电话','task-call.png',r.key)+icon('more','更多操作','task-more.png',r.key)];
      }
      return '<tr>'+cells.map((c,i)=>`<td${i===cells.length-1?' class="actions"':''}>${c}</td>`).join('')+'</tr>';
    }).join('')||`<tr><td colspan="${cfg.headers.length}" class="empty">暂无匹配记录</td></tr>`;
  }

  function resetDialog(){
    const dialog=$('task-dialog'),confirm=$('dialog-confirm'),close=dialog.querySelector('header button'),cancel=dialog.querySelector('footer button[value="cancel"]');
    dialog.className='';confirm.onclick=null;confirm.hidden=false;$('dialog-body').innerHTML='';
    [close,cancel].forEach(button=>{if(button){button.onclick=null;button.removeAttribute('type');}});
    dialog.onclose=null;
  }
  function ask(title,body,confirm){
    const dialog=$('task-dialog');resetDialog();$('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-confirm').hidden=!confirm;
    dialog.showModal();dialog.onclose=()=>{if(dialog.returnValue==='confirm')confirm?.();resetDialog();};
  }
  function markExecuted(r){r.state='已执行';r.executedAt=todayText;r.removed=false;render();}
  function markStopped(r,reason){r.state='已终止';r.skipReason=reason;r.terminatedAt=todayText;r.operator=operator;r.removed=false;render();}

  function skipTask(r){
    const dialog=$('task-dialog'),confirm=$('dialog-confirm');resetDialog();dialog.className='skip-dialog';$('dialog-title').textContent='无需执行';
    $('dialog-body').innerHTML='<div class="skip-label"><span class="required">*</span><strong>原因</strong></div><div class="skip-field"><textarea id="skip-reason" maxlength="200" aria-label="无需执行原因"></textarea><span id="skip-count" class="skip-count">0/200</span></div><p id="skip-error" class="skip-error" hidden>请输入原因</p>';
    const textarea=$('skip-reason'),count=$('skip-count'),error=$('skip-error'),close=dialog.querySelector('header button'),cancel=dialog.querySelector('footer button[value="cancel"]');
    [close,cancel].forEach(button=>{if(button){button.type='button';button.onclick=()=>dialog.close('cancel');}});
    textarea.addEventListener('input',()=>{count.textContent=textarea.value.length+'/200';error.hidden=true;});
    confirm.onclick=e=>{e.preventDefault();const reason=textarea.value.trim();if(!reason){error.hidden=false;textarea.focus();return;}if(isExec)markStopped(r,reason);else r.removed=true;dialog.close('confirm');render();};
    dialog.onclose=resetDialog;dialog.showModal();textarea.focus();
  }
  function plan(r){const f=$('task-plan-frame');f.src='项目参与者-Figma.html?'+new URLSearchParams({planEmbed:'1',name:r.name,id:r.id,status:r.status});f.hidden=false;document.body.style.overflow='hidden';}
  window.addEventListener('message',e=>{if(e.source===$('task-plan-frame')?.contentWindow&&e.data?.type==='participant-plan-closed'){$('task-plan-frame').hidden=true;document.body.style.overflow='';}});

  function openQuestionnaire(r){
    const dialog=$('task-dialog'),confirm=$('dialog-confirm'),close=dialog.querySelector('header button'),cancel=dialog.querySelector('footer button[value="cancel"]');
    resetDialog();dialog.className='questionnaire-dialog';$('dialog-title').textContent='';
    $('dialog-body').innerHTML=`<div class="questionnaire-head"><span>${esc(r.name)}</span></div><div class="questionnaire-content"><h3>0721一页多题测试</h3><p class="questionnaire-desc">0721一页多题测试0721一页多题测试</p><section class="question-block"><h4>标题：</h4><label><input type="radio" name="q1">选项</label><label><input type="radio" name="q1">选项</label></section><section class="question-block"><h4>标题：</h4><input class="question-input" placeholder="请输入"></section><section class="question-block"><h4>请输入您的手机号码：</h4><input class="question-input"></section></div>`;
    [close,cancel].forEach(button=>{if(button){button.type='button';button.onclick=()=>dialog.close('cancel');}});
    confirm.onclick=e=>{e.preventDefault();markExecuted(r);dialog.close('confirm');};
    dialog.onclose=resetDialog;dialog.showModal();
  }
  function handlePlanAction(r){
    if(/问卷/.test(r.content))openQuestionnaire(r);
    else{uploadingRow=r;fileInput.value='';fileInput.click();}
  }
  fileInput.addEventListener('change',()=>{if(uploadingRow&&fileInput.files.length){markExecuted(uploadingRow);}uploadingRow=null;});
  function viewExecuted(r){location.href='项目参与者详情-Figma.html?'+new URLSearchParams({name:r.name,id:r.id,status:r.status,tab:'visit-plan',record:/问卷/.test(r.content)?'survey':'file'});}

  const actionPopover=document.createElement('div');
  actionPopover.id='task-action-popover';actionPopover.className='task-action-popover';actionPopover.hidden=true;
  actionPopover.innerHTML='';
  document.body.append(actionPopover);
  function hideActionPopover(){actionPopover.hidden=true;activeActionRow=null;}
  function showActionPopover(button,r){activeActionRow=r;actionPopover.innerHTML=isFollow?'<button type="button" data-popover-action="nofollow">无需跟踪</button><button type="button" data-popover-action="done">标记为已处理</button>':'<button type="button" data-popover-action="voice">语音提醒</button><button type="button" data-popover-action="message">发送消息</button><button type="button" data-popover-action="skip">无需执行</button>';actionPopover.classList.toggle('follow-popover',isFollow);const rect=button.getBoundingClientRect();const width=isFollow?108:80;actionPopover.style.left=Math.max(8,Math.min(window.innerWidth-width-8,rect.right-width))+'px';actionPopover.style.top=Math.min(window.innerHeight-112,rect.bottom+8)+'px';actionPopover.hidden=false;}
  actionPopover.addEventListener('click',e=>{const button=e.target.closest('[data-popover-action]');if(!button||!activeActionRow)return;const r=activeActionRow,action=button.dataset.popoverAction;hideActionPopover();if(action==='skip')skipTask(r);if(action==='nofollow'){r.handled=true;r.handledAt='2025-08-12 18:02:15';r.handler='测试8';r.result='无需跟踪-患者不愿确认-';render();}if(action==='done'){r.handled=true;r.handledAt='2025-08-12 18:02:15';r.handler='测试8';r.result='标记为已处理-微信处理-';render();}});
  document.addEventListener('click',e=>{if(!actionPopover.hidden&&!actionPopover.contains(e.target))hideActionPopover();});
  window.addEventListener('resize',hideActionPopover);window.addEventListener('scroll',hideActionPopover,true);

  document.querySelector('.task-page').addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;e.stopPropagation();
    const r=data.find(r=>r.key===Number(b.dataset.key));
    switch(b.dataset.action){
      case'plan': isExec?handlePlanAction(r):plan(r);break;
      case'view': viewExecuted(r);break;
      case'skip':skipTask(r);break;
      case'call':ask('拨打电话',`${esc(r.name)}（${r.id}）<p>暂未提供参与者联系电话。</p>`,null);break;
      case'record':ask('跟进记录',`${esc(r.name)} · ${esc(r.content)}<textarea id="follow-note" placeholder="请输入跟进记录" aria-label="跟进记录">${esc(r.note||'')}</textarea>`,()=>{r.note=$('follow-note').value;});break;
      case'more':showActionPopover(b,r);break;
    }
  });
  $('task-tabs')?.addEventListener('click',e=>{if(!e.target.dataset.tab)return;tab=e.target.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));if(tab!=='待执行')overdue=false;renderFilters();render();});
  $('task-filters').addEventListener('input',render);$('task-filters').addEventListener('change',render);
  $('task-filters').addEventListener('click',e=>{const b=e.target;if(b.dataset.reminder){reminder=b.dataset.reminder;document.querySelectorAll('[data-reminder]').forEach(el=>el.classList.toggle('selected',el===b));render();}if(b.id==='overdue-filter'){overdue=!overdue;b.classList.toggle('selected',overdue);render();}if(b.id==='reset'){document.querySelectorAll('.filters input,.filters select').forEach(e=>{e.value='';e.checked=false;});reminder='全部';overdue=mode==='overdue'&&tab==='待执行';renderFilters();render();}if(b.id==='batch-remind')ask('智能体逾期提醒','当前为页面原型，尚未接入提醒服务。',null);});
  document.querySelector('.nav-item.active')?.addEventListener('click',()=>location.href='临床试验工作台-Figma.html');

  renderFilters();render();
})();
