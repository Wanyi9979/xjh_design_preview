(() => {
  const P=window.workbenchTaskPolicy;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=document.createElement('dialog');dialog.className='wb-task-operation';document.body.append(dialog);
  let onSave=null,refresh=()=>{},returnTo=null;
  function close(){dialog.close();returnTo?.focus?.({preventScroll:true});}
  function open(title,body,save,label='保存'){
    dialog.classList.remove('is-item-execution','is-two-step-execution');
    returnTo=document.activeElement;onSave=save;
    dialog.innerHTML=`<form><header><h2>${escape(title)}</h2><button type="button" data-close aria-label="关闭">×</button></header><div class="wb-task-operation-body">${body}<p role="alert" class="wb-task-error"></p></div><footer><button type="button" data-close>${save?'取消':'关闭'}</button>${save?`<button class="primary" type="submit">${label}</button>`:''}</footer></form>`;
    dialog.showModal();dialog.querySelector('h2').tabIndex=-1;dialog.querySelector('h2').focus();
  }
  dialog.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close();});
  dialog.addEventListener('submit',e=>{e.preventDefault();try{if(onSave?.(new FormData(e.target))===false)return;window.saveResearchDemo();close();refresh();window.dispatchEvent(new Event('workbench-tasks-changed'));}catch(error){dialog.querySelector('[role=alert]').textContent=error.message;}});
  const reasonField=(label='原因',required=true)=>`<label>${label}${required?' <em>*</em>':''}<textarea name="reason" ${required?'required':''} maxlength="200" placeholder="请输入${label}，最多200字"></textarea></label>`;
  const validReason=form=>{const text=String(form.get('reason')||'').trim();if(!text||text.length>200)throw Error('请填写200字以内的原因');return text;};
  function projectMarkup(visit){
    const id=visit.projectId||P.project(visit);
    const name=visit.trial||window.clinicalParticipantDirectory?.create().projectCatalog[id]||id;
    return `<div class="wb-execution-project"><span>临床项目</span><strong>${escape(id)}</strong><span>${escape(name)}</span></div>`;
  }
  function markTodayHandled(visit){
    if(!visit.id)return;
    const current=window.clinicalVisitStore.apply(visit);
    current.todayHandledDate=visit.referenceDate||P.today;
    window.clinicalVisitStore.save(current);
  }
  function appointmentReference(visit){
    const project=visit.projectId||P.project(visit),record=window.clinicalVisitStore.apply(visit),items=window.clinicalVisitStore.executionItems(record),completed=new Set(record.completedItems||[]);
    const tasks=window.loadParticipantTasks?.(project,visit.participantId)||[];
    const label=task=>task.state==='none'?'无需处理':task.state==='done'?'已完成':task.kind==='draft'?(task.state==='issued'?'已发放':'待发放'):task.kind==='follow'?'待完成':task.date<P.today?'已逾期':'待执行';
    return `<section class="wb-appointment-reference"><h3>本次访视项 <small>${items.filter(name=>completed.has(name)).length}/${items.length} 已完成</small></h3><ul class="wb-appointment-items">${items.map(name=>`<li><span>${escape(name)}</span><span class="${completed.has(name)?'is-done':''}">${completed.has(name)?'已完成':({execute:'后续执行',followup:'持续跟进',none:'无需处理'})[record.itemResults?.[name]?.type]||'未完成'}</span></li>`).join('')}</ul></section><section class="wb-appointment-reference"><h3>参与者任务清单 <small>共 ${tasks.length} 条</small></h3>${tasks.length?`<div class="wb-appointment-task-scroll"><table><thead><tr><th>任务名称 / 类型</th><th>关联访视</th><th>计划时间</th><th>状态</th></tr></thead><tbody>${tasks.map(task=>`<tr><td>${escape(task.name)}<small>${{draft:'任务发放',execute:'任务执行',follow:'跟进任务'}[task.kind]||''}</small></td><td>${escape(task.visit||'—')}</td><td>${escape(task.plannedAt||task.date||'—')}</td><td>${label(task)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="wb-task-help">暂无任务</p>'}</section>`;
  }
  function appointment(task,action){
    if(action==='followup'){followup(task);return;}
    if(action==='tasks'){location.href=participantURL(task,'participant-tasks');return;}
    const info=`<p class="wb-task-subject">${escape(task.participant)} · ${escape(task.participantId)} · ${escape(task.name)}</p>${projectMarkup(task)}<div class="wb-task-context">计划日期：${escape(task.plannedDate)}<br>访视窗口：${task.noWindow?'暂无窗口':`${escape(task.windowStart)} ～ ${escape(task.windowEnd)}`}</div>`;
    if(action==='history'){open('预约处理记录',info+`<ol>${(task.appointmentHistory||[]).map(h=>`<li>${escape(h.action)} · ${escape(h.to||'—')}<p>${escape(h.reason||'无备注')}</p><small>${escape(h.at||h.time||'')}</small></li>`).join('')}${task.appointmentWaiver?`<li>无需处理：${escape(task.appointmentWaiver.reason)}</li>`:''}</ol>`,null);return;}
    if(action==='book'){
      task=window.clinicalVisitStore.apply(task);
      open(task.appointmentDate?'调整预约':'访视预约',info+`<label>预约日期 <em>*</em><input type="date" name="date" value="${escape(task.appointmentDate||task.plannedDate)}" required></label><div data-appointment-reason hidden>${reasonField('原因')}</div>${appointmentReference(task)}`,form=>{
        const date=String(form.get('date')||'');if(!date)throw Error('请选择预约日期');
        const outside=!task.noWindow&&(date<task.windowStart||date>task.windowEnd);
        const reason=outside?validReason(form):'';
        (task.appointmentHistory ||= []).push({action:task.appointmentDate?'调整预约':'访视预约',from:task.appointmentDate||'',to:date,reason,at:P.now(),operator:'当前个案'});task.appointmentDate=date;task.appointmentWaiver=null;window.clinicalVisitStore.save(task);markTodayHandled(task);
      },'确认');
      const form=dialog.querySelector('form');
      const sync=()=>{const date=form.elements.date.value;const outside=!task.noWindow&&Boolean(date)&&(date<task.windowStart||date>task.windowEnd);form.querySelector('[data-appointment-reason]').hidden=!outside;form.elements.reason.disabled=!outside;form.elements.reason.required=outside;dialog.querySelector('[role=alert]').textContent='';};
      form.elements.date.addEventListener('change',sync);form.elements.date.addEventListener('input',sync);sync();
    }
    else if(action==='terminate')open('访视终止',info+reasonField('终止原因'),form=>P.terminate(task,validReason(form)),'确认');
    else open('预约无需处理',info+reasonField('无需处理原因')+'<p class="wb-task-help">仅关闭这条预约待办，访视与关联任务继续保留。</p>',form=>{task.appointmentWaiver={reason:validReason(form),at:P.now(),operator:'当前个案'};window.clinicalVisitStore.save(task);},'确认无需处理');
  }
  function adjust(task,children){
    const targets=children?children.filter(t=>!P.closed(t)):[task];
    if(!targets.length){open('调整任务日期','<p>此任务包没有可调整的未执行任务。</p>',null);return;}
    open(children?'调整任务包日期':'调整执行日期',`<p class="wb-task-subject">${escape(task.participant||task[6])} · ${escape(task.task||task[1])}</p>${projectMarkup(task)}${targets.map((t,i)=>`<div class="wb-task-adjust-row"><strong>${escape(t.sequence||'执行任务')} · ${escape(t.task)}</strong><label>计划日期 <em>*</em><input type="date" name="date${i}" required value="${escape(t.plannedAt.slice(0,10))}"></label>${/\d{2}:\d{2}/.test(t.plannedAt)?`<label>采集时间 <em>*</em><input type="time" name="time${i}" required value="${escape(t.plannedAt.slice(11,16))}"></label>`:'<small>模板未指定采集时间</small>'}</div>`).join('')}${reasonField('调整原因')}`,form=>{const reason=validReason(form);targets.forEach((t,i)=>{if(!form.get('date'+i))throw Error('请选择所有任务日期');});targets.forEach((t,i)=>P.adjust(t,String(form.get('date'+i)),String(form.get('time'+i)||''),reason));},'确认');
  }
  const entryURL=task=>`participant.html?${new URLSearchParams({project:P.project(task),id:task.participantId,name:task.participant,status:task.participantStatus,tab:'data-entry',visitIndex:String(task.visitIndex),from:'workbench'})}`;
  function processing(task){
    const items=P.crfs(task),labels={'待录入':'去录入','待核对':'确认核对','待提交':'提交数据','待同步':'同步数据','已完成':'已完成'};
    open('访视数据处理',`<p class="wb-task-subject">${escape(task.participant)} · ${escape(task.participantId)} · ${escape(task.visit)}</p><p class="wb-task-help">全部 CRF 完成录入、核对、提交及同步后，这条访视待办才会关闭。</p><div class="wb-task-crfs">${items.map((c,i)=>`<article><div><strong>${escape(c.name)}</strong><span>${escape(c.state)}</span></div>${c.state==='待录入'?`<a href="${escape(entryURL(task))}&crf=${encodeURIComponent(c.name)}">去录入</a>`:c.state==='已完成'?'<span class="wb-task-done">已完成</span>':`<button type="button" data-crf-phase="${i}">${labels[c.state]}</button>`}</article>`).join('')}</div><details><summary>处理记录</summary><ol>${(task.history||[]).map(h=>`<li>${escape(h.name)} · ${escape(h.action)} · ${escape(h.at)}</li>`).join('')||'<li>暂无记录</li>'}</ol></details>`,null);
    dialog.querySelectorAll('[data-crf-phase]').forEach(b=>b.addEventListener('click',()=>{
      const c=items[+b.dataset.crfPhase];if(!c.record.values?.length||c.record.values.some(v=>!String(v).trim())){dialog.querySelector('[role=alert]').textContent='必填数据不完整，请先进入 CRF 补齐录入';return;}
      const next={'待核对':'待提交','待提交':'待同步','待同步':'已完成'}[c.state];if(!next)return;
      localStorage.setItem(c.key,JSON.stringify({...c.record,state:next}));(task.history ||= []).push({name:c.name,action:labels[c.state],at:P.now(),operator:'当前个案'});P.syncProcessing(task);window.saveResearchDemo();refresh();processing(task);
    }));
  }
  function history(task){const rows=task.adjustmentHistory||[];open('任务调整记录',`<p class="wb-task-subject">${escape(task.task)}</p><ol>${rows.map(h=>`<li>${escape(h.before.plannedAt)} → ${escape(h.after.plannedAt)}<p>${escape(h.reason)}</p><small>${escape(h.at)} · ${escape(h.operator)}</small></li>`).join('')||'<li>暂无日期调整记录</li>'}</ol>`,null);}
  const store=window.clinicalVisitStore;
  function relatedTaskCount(visit) {
    const { executionTasks, taskSets } = window.researchDemo;
    const related = [...executionTasks, ...Object.values(taskSets).flat()].filter(task => P.matchesVisit(task, visit));
    return new Set(related.map(task => Array.isArray(task) ? task[1] : task.task)).size;
  }
  const hasTasks = visit => relatedTaskCount(visit) > 0;
  function participantURL(visit,tab='participant-visits'){return 'participant.html?'+new URLSearchParams({project:visit.projectId,id:visit.participantId,name:visit.participant||visit.person?.name||'',status:visit.participantStatus||visit.person?.status||'',tab,visitId:visit.id,from:'workbench'});}
  function followup(visit){open('添加跟进',`<p class="wb-task-subject">${escape(visit.participant)} · ${escape(visit.participantId)} · ${escape(visit.name)}</p>${projectMarkup(visit)}<label>跟进日期 <em>*</em><input name="date" type="date" value="${P.today}" required></label>${reasonField('跟进内容')}`,form=>{const content=validReason(form);window.researchDemo.followupTasks.push({id:'visit-followup-'+crypto.randomUUID(),projectId:visit.projectId||P.project(visit),participantId:visit.participantId,participant:visit.participant,participantStatus:visit.participantStatus,trial:visit.trial,visit:visit.name,visitId:visit.id,content,date:String(form.get('date')),scope:'pending',createdAt:P.now(),operator:'当前个案',history:[{action:'新增跟进任务',at:P.now(),operator:'当前个案',scope:'pending',date:String(form.get('date')),content}]});markTodayHandled(visit);},'确认');}
  function executeVisit(original){
    const visit=store.apply(original),items=store.executionItems(visit),today=visit.referenceDate||P.today;
    const projectId=visit.projectId||P.project(visit),projectName=visit.trial||window.clinicalParticipantDirectory?.create().projectCatalog[projectId]||projectId;
    const previous=store.itemExecutionResults(visit),locked=new Set(items.filter(name=>previous[name]?.type==='done'));
    const states=Object.fromEntries(items.map(name=>[name,previous[name]?.type==='done'?'done':previous[name]?.type==='none'?'none':['execute','followup'].includes(previous[name]?.type)?'pending':'']));
    const noneReasons=Object.fromEntries(items.map(name=>[name,previous[name]?.type==='none'?previous[name].reason||'':'']));
    const pendingTypes=[...new Set(items.filter(name=>states[name]==='pending').map(name=>previous[name]?.type).filter(Boolean))];
    let selected=new Set(),searchText='',mode=pendingTypes.length===1?pendingTypes[0]:'execute',doneDate=today,
      doneReason='',pendingDate='',pendingReason='',confirmed=null;
    const existingDone=items.find(name=>!locked.has(name)&&states[name]==='done'&&previous[name]?.actualDate);
    if(existingDone)doneDate=previous[existingDone].actualDate;
    const existingPending=items.find(name=>states[name]==='pending');
    if(existingPending){pendingDate=String(previous[existingPending]?.nextPlannedAt||previous[existingPending]?.followupAt||'').slice(0,10);pendingReason=previous[existingPending]?.reason||previous[existingPending]?.content||'';}
    const grouped=()=>({done:items.filter(name=>states[name]==='done'&&!locked.has(name)),pending:items.filter(name=>states[name]==='pending'),none:items.filter(name=>states[name]==='none')});
    const makePlans=()=>Object.fromEntries(items.map(name=>{
      if(locked.has(name))return [name,previous[name]];
      if(states[name]==='done')return [name,{type:'done',actualDate:doneDate,reason:doneReason}];
      if(states[name]==='none')return [name,{type:'none',reason:noneReasons[name]}];
      return [name,mode==='followup'?{type:'followup',followupAt:pendingDate,content:pendingReason}:{type:'execute',nextPlannedAt:pendingDate,reason:pendingReason}];
    }));
    function persist(){
        confirmed=store.validateItemExecutionResults(visit,makePlans(),today);
        const latest=store.apply(visit);
        store.recordItemExecutionResults(latest,confirmed,today);
        const at=P.now();
        items.forEach(name=>{
          const plan=confirmed[name];
          const existing=window.researchDemo.followupTasks.find(task=>task.source==='visit-item-execution'&&task.projectId===projectId&&task.participantId===visit.participantId&&task.visitId===visit.id&&task.visitItem===name&&task.scope==='pending');
          if(plan.type==='followup'){
            const content=name+'：'+plan.content;
            if(existing){if(existing.plannedAt===plan.followupAt&&existing.content===content)return;existing.plannedAt=plan.followupAt;existing.date=plan.followupAt.slice(0,10);existing.content=content;(existing.history||=[]).push({action:'调整访视项跟进',date:existing.date,content,at,operator:'当前个案'});}
            else window.researchDemo.followupTasks.push({id:'visit-item-followup-'+crypto.randomUUID(),source:'visit-item-execution',visitItem:name,projectId,participantId:visit.participantId,participant:visit.participant||visit.person?.name||'',participantStatus:visit.participantStatus||visit.person?.status||'',trial:projectName,visit:visit.name,visitId:visit.id,protocolVersion:visit.protocolVersion,content,date:plan.followupAt.slice(0,10),plannedAt:plan.followupAt,scope:'pending',createdAt:at,operator:'当前个案',history:[{action:'访视项持续跟进',date:plan.followupAt.slice(0,10),content,scope:'pending',at,operator:'当前个案'}]});
          }else if(existing){existing.scope=plan.type==='done'?'completed':'none';existing.operatedAt=at;existing.record=plan.type==='done'?'对应访视项已完成':'';existing.noProcessReason=plan.type==='done'?'':'访视项处理方式已调整';(existing.history||=[]).push({action:existing.scope==='completed'?'访视项已完成':'调整访视项处理方式',at,operator:'当前个案',scope:existing.scope});}
        });
        markTodayHandled(latest);
    }
    open('访视执行',`<p class="wb-task-subject">${escape(visit.participant||visit.person?.name||'')} · ${escape(visit.participantId)} · ${escape(visit.name)}</p>${projectMarkup({...visit,projectId,trial:projectName})}
      <section data-step-one><div class="wb-execution-label wb-execution-checklist-heading"><span>访视项处理</span><small data-item-selected-count>已选 0 项</small><input class="wb-item-search" data-item-search type="search" aria-label="按访视项名称搜索" placeholder="搜索访视项名称"></div>
      <div class="wb-item-batch" hidden><div class="wb-item-batch-actions"><strong>批量处理</strong><button type="button" data-batch-status="done">已完成</button><button type="button" data-batch-status="pending">未完成</button><button type="button" data-batch-status="none">无需处理</button></div></div>
      <div class="wb-item-list-head"><label class="wb-item-check-all"><input type="checkbox" data-item-select-all aria-label="全选当前访视项"><span>访视项</span></label><span>状态</span></div><div class="wb-item-rows" data-item-rows></div></section>`,()=>{
        validateStates();
        const g=grouped();
        if(g.done.length||g.pending.length){openDetails();return false;}
        persist();
      },'保存');
    dialog.classList.add('is-item-execution','is-two-step-execution');
    const form=dialog.querySelector('form'),rows=form.querySelector('[data-item-rows]'),footer=form.querySelector('footer');
    form.noValidate=true;
    const summary=document.createElement('p');summary.className='wb-execution-progress';summary.setAttribute('role','status');footer.prepend(summary);
    const alert=form.querySelector('[role=alert]');
    function updateSummary(){const g=grouped();summary.textContent=`已完成 ${g.done.length+locked.size} 项 · 未完成 ${g.pending.length} 项 · 无需处理 ${g.none.length} 项`;}
    function syncSelected(){
      form.querySelector('[data-item-selected-count]').textContent=`已选 ${selected.size} 项`;
      form.querySelector('.wb-item-batch').hidden=!selected.size;
      const visible=items.flatMap((name,index)=>!locked.has(name)&&name.toLowerCase().includes(searchText)?[index]:[]);
      const all=form.querySelector('[data-item-select-all]'),count=visible.filter(index=>selected.has(index)).length;
      all.checked=visible.length>0&&count===visible.length;all.indeterminate=count>0&&count<visible.length;all.disabled=!visible.length;
    }
    function renderRows(){
      rows.innerHTML=items.flatMap((name,index)=>name.toLowerCase().includes(searchText)?[(()=>{
        const prior=previous[name]||{},isLocked=locked.has(name),state=states[name];
        return `<section class="wb-item-row" data-row-index="${index}"><label class="wb-item-pick"><input type="checkbox" data-item-pick="${index}" aria-label="选择${escape(name)}"${selected.has(index)?' checked':''}${isLocked?' disabled':''}><strong>${escape(name)}</strong></label>${isLocked?`<span class="wb-item-locked">已完成 · ${escape(prior.actualDate||'未记录')}</span>`:`<div class="wb-item-status-control"><select data-item-state="${index}" class="${state?'':'is-placeholder'}" aria-label="${escape(name)}状态"><option value=""${state?'':' selected'}>请选择</option><option value="done"${state==='done'?' selected':''}>已完成</option><option value="pending"${state==='pending'?' selected':''}>未完成</option><option value="none"${state==='none'?' selected':''}>无需处理</option></select>${state==='none'?`<textarea data-none-reason="${index}" maxlength="200" placeholder="填写无需处理原因" aria-label="${escape(name)}无需处理原因">${escape(noneReasons[name])}</textarea>`:''}</div>`}</section>`;
      })()]:[]).join('')||'<div class="wb-item-search-empty"><img src="shared-assets/empty-list.png" width="174" height="133" alt=""><span>暂无匹配的访视项</span></div>';
      syncSelected();updateSummary();
    }
    function renderSecond(target){
      const g=grouped();
      target.querySelector('[data-done-section]').innerHTML=g.done.length?`<section class="wb-item-step-section"><h3>已完成 · 统一填写完成日期</h3><p>适用访视项：${g.done.map(escape).join('、')}</p><label><span class="wb-item-field-title"><em>*</em>完成日期</span><input type="date" data-done-date max="${today}" value="${escape(doneDate)}"></label><label data-done-reason${visit.noWindow||doneDate>=visit.windowStart&&doneDate<=visit.windowEnd?' hidden':''}><span class="wb-item-field-title"><em>*</em>超窗原因</span><textarea data-done-reason-input maxlength="200" placeholder="完成日期超出访视窗口时必填">${escape(doneReason)}</textarea></label></section>`:'';
      target.querySelector('[data-pending-section]').innerHTML=g.pending.length?`<section class="wb-item-step-section"><h3>未完成 · 统一选择处理方式</h3><p>适用访视项：${g.pending.map(escape).join('、')}</p><div class="wb-item-mode"><label><input type="radio" name="pending-mode" value="execute"${mode==='execute'?' checked':''}>后续执行</label><label><input type="radio" name="pending-mode" value="followup"${mode==='followup'?' checked':''}>持续跟进</label></div><div class="wb-item-step-fields"${mode?'':' hidden'}><label><span class="wb-item-field-title"><em>*</em>${mode==='followup'?'跟进日期':'下次执行日期'}</span><input type="date" data-pending-date min="${today}" value="${escape(pendingDate)}"></label><label><span class="wb-item-field-title"><em>*</em>${mode==='followup'?'跟进内容':'原因'}</span><textarea data-pending-reason maxlength="200" placeholder="请输入统一${mode==='followup'?'跟进内容':'原因'}">${escape(pendingReason)}</textarea></label></div></section>`:'';
      updateSummary();
    }
    function validateStates(){
      if(items.some(name=>!states[name]))throw Error('请为每个访视项选择状态');
      const missing=grouped().none.find(name=>!noneReasons[name]?.trim());
      if(missing)throw Error(missing+'：请填写无需处理原因');
    }
    function openDetails(){
      const popup=document.createElement('dialog');popup.className='wb-task-operation wb-item-details-dialog';
      popup.innerHTML=`<form novalidate><header><h2>填写处理信息</h2><button type="button" data-details-close aria-label="关闭">×</button></header><div class="wb-task-operation-body"><div data-done-section></div><div data-pending-section></div><p role="alert" class="wb-task-error"></p></div><footer><button type="button" data-details-close>取消</button><button type="submit" class="primary">确认保存</button></footer></form>`;
      document.body.append(popup);
      popup.querySelectorAll('[data-details-close]').forEach(button=>button.addEventListener('click',()=>popup.close()));
      popup.addEventListener('close',()=>popup.remove(),{once:true});
      popup.addEventListener('input',event=>{
        if(event.target.matches('[data-done-date]')){doneDate=event.target.value;const label=popup.querySelector('[data-done-reason]');if(label)label.hidden=visit.noWindow||!doneDate||doneDate>=visit.windowStart&&doneDate<=visit.windowEnd;}
        if(event.target.matches('[data-done-reason-input]'))doneReason=event.target.value;
        if(event.target.matches('[data-pending-date]'))pendingDate=event.target.value;
        if(event.target.matches('[data-pending-reason]'))pendingReason=event.target.value;
      });
      popup.addEventListener('change',event=>{if(event.target.name==='pending-mode'){mode=event.target.value;renderSecond(popup);}});
      popup.querySelector('form').addEventListener('submit',event=>{
        event.preventDefault();
        try{
          if(grouped().pending.length&&!mode)throw Error('请选择未完成项的处理方式');
          persist();window.saveResearchDemo();popup.close();close();refresh();window.dispatchEvent(new Event('workbench-tasks-changed'));
        }catch(error){popup.querySelector('[role=alert]').textContent=error.message;}
      });
      renderSecond(popup);popup.showModal();popup.querySelector('h2').tabIndex=-1;popup.querySelector('h2').focus();
    }
    form.querySelector('[data-item-search]').addEventListener('input',event=>{searchText=event.target.value.trim().toLowerCase();selected=new Set([...selected].filter(index=>items[index].toLowerCase().includes(searchText)));renderRows();});
    form.querySelector('[data-item-search]').addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
    form.querySelector('[data-item-select-all]').addEventListener('click',()=>{const visible=items.flatMap((name,index)=>!locked.has(name)&&name.toLowerCase().includes(searchText)?[index]:[]);const every=visible.every(index=>selected.has(index));visible.forEach(index=>every?selected.delete(index):selected.add(index));renderRows();});
    form.querySelectorAll('[data-batch-status]').forEach(button=>button.addEventListener('click',()=>{selected.forEach(index=>{states[items[index]]=button.dataset.batchStatus});selected.clear();alert.textContent='';renderRows();}));
    rows.addEventListener('change',event=>{
      const pick=event.target.closest('[data-item-pick]');if(pick){const index=Number(pick.dataset.itemPick);pick.checked?selected.add(index):selected.delete(index);syncSelected();return;}
      const stateInput=event.target.closest('[data-item-state]');if(stateInput){states[items[Number(stateInput.dataset.itemState)]]=stateInput.value;alert.textContent='';renderRows();}
    });
    rows.addEventListener('input',event=>{if(event.target.matches('[data-none-reason]'))noneReasons[items[Number(event.target.dataset.noneReason)]]=event.target.value;});
    renderRows();
  }
  function visitDetail(visit,readOnly=false){
    const state=store.status(visit),ongoing=['activated','partial'].includes(state);
    const info=`<p class="wb-task-subject">${escape(visit.participant)} · ${escape(visit.participantId)} · ${escape(visit.name)}</p><dl class="wb-visit-summary">${[['访视状态',store.statusLabels[state]],['预约状态',visit.appointmentDate?'已预约':'未预约'],['计划日期',visit.plannedDate],['访视窗口',visit.windowStart+' ～ '+visit.windowEnd],['预约日期',visit.appointmentDate||'未预约'],['实际访视日期',visit.actualDate||'未记录']].map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`;
    const operations=ongoing&&!readOnly?[['book',visit.appointmentDate?'调整预约':'访视预约'],...(visit.appointmentDate?[['execute','访视执行']]:[]),['followup','添加跟进'],...(hasTasks(visit)?[['tasks','任务处理']]:[]),['waive','无需处理'],['terminate','终止访视']]:[];
    const records=[...(visit.appointmentHistory||[]),...(visit.executionHistory||[]),...(visit.terminationHistory||[])];
    open(ongoing?'访视管理':'访视详情',info+(visit.incompleteItems?.length?`<div class="wb-task-context">未完成项：${visit.incompleteItems.map(escape).join('、')}</div>`:'')+(state==='terminated'?`<div class="wb-task-context">终止原因：${escape(visit.terminationReason)}</div>`:'')+(visit.appointmentWaiver?`<div class="wb-task-context">无需处理原因：${escape(visit.appointmentWaiver.reason)}</div>`:'')+`<div class="wb-visit-operations">${operations.map(([key,label])=>`<button type="button" data-visit-operation="${key}" class="${key==='terminate'?'danger':''}">${label}</button>`).join('')}</div><details><summary>访视记录（${records.length}）</summary><ol>${records.map(r=>`<li>${escape(r.action)} · ${escape(r.to||r.actualDate||'')}<p>${escape(r.reason||'无备注')}</p>${r.incomplete?.length?`<p>未完成：${r.incomplete.map(escape).join('、')}</p>`:''}<small>${escape(r.at)}</small></li>`).join('')||'<li>暂无记录</li>'}</ol></details><p><a href="${escape(participantURL(visit))}">参与者详情 ›</a></p>`,null);
    dialog.querySelectorAll('[data-visit-operation]').forEach(b=>b.onclick=()=>{const action=b.dataset.visitOperation;if(action==='execute')executeVisit(visit);else appointment(visit,action);});
  }

  window.workbenchTaskDialogs={projectMarkup,addFollowup:followup,appointment,adjust,processing,history,hasTasks,relatedTaskCount,visitDetail,executeVisit,setRefresh:callback=>refresh=callback};
})();
