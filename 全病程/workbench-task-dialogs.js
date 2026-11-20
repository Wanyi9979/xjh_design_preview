(() => {
  const P=window.workbenchTaskPolicy;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=document.createElement('dialog');dialog.className='wb-task-operation';document.body.append(dialog);
  let onSave=null,refresh=()=>{},returnTo=null;
  function close(){dialog.close();returnTo?.focus?.({preventScroll:true});}
  function open(title,body,save,label='保存'){
    dialog.classList.remove('is-item-execution');
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
    const labels={done:'完成',execute:'后续执行',followup:'持续跟进',none:'无需处理'};
    const previous=store.itemExecutionResults(visit),locked=new Set(items.filter(name=>previous[name]?.type==='done'));
    let plans=JSON.parse(JSON.stringify(previous)),selected=new Set(),confirmed=null;
    const optionMarkup=type=>'<option value="">设置处理</option>'+Object.entries(labels).map(([value,label])=>`<option value="${value}"${value===type?' selected':''}>${label}</option>`).join('');
    const fieldMarkup=(plan,prefix,batch=false)=>{
      const attr=key=>`data-plan-field="${key}" name="${prefix}-${key}"`;
      if(plan.type==='done')return `<label>完成日期 <em>*</em><input ${attr('actualDate')} type="date" max="${today}" value="${escape(plan.actualDate||today)}"${batch?'':' required'}></label><label data-done-reason${plan.actualDate&&(visit.noWindow||plan.actualDate>=visit.windowStart&&plan.actualDate<=visit.windowEnd)?' hidden':''}>超窗原因<textarea ${attr('reason')} maxlength="200" placeholder="完成日期超出访视窗口时必填">${escape(plan.reason||'')}</textarea></label>`;
      if(plan.type==='execute')return `<label>下次执行时间 <em>*</em><input ${attr('nextPlannedAt')} type="datetime-local" min="${today}T00:00" value="${escape(plan.nextPlannedAt||'')}"${batch?'':' required'}></label><label>原因 <em>*</em><textarea ${attr('reason')} maxlength="200" placeholder="请输入后续执行原因"${batch?'':' required'}>${escape(plan.reason||'')}</textarea></label>`;
      if(plan.type==='followup')return `<label>跟进时间 <em>*</em><input ${attr('followupAt')} type="datetime-local" min="${today}T00:00" value="${escape(plan.followupAt||'')}"${batch?'':' required'}></label><label>跟进内容 <em>*</em><textarea ${attr('content')} maxlength="200" placeholder="请输入跟进内容"${batch?'':' required'}>${escape(plan.content||'')}</textarea></label>`;
      if(plan.type==='none')return `<label class="is-full">无需处理原因 <em>*</em><textarea ${attr('reason')} maxlength="200" placeholder="请输入无需处理原因"${batch?'':' required'}>${escape(plan.reason||'')}</textarea></label>`;
      return '';
    };
    const detailsText=plan=>plan.type==='done'?`完成日期：${plan.actualDate||'未记录'}${plan.reason?'；超窗原因：'+plan.reason:''}`:plan.type==='execute'?`下次执行：${String(plan.nextPlannedAt||'').replace('T',' ')}；原因：${plan.reason||''}`:plan.type==='followup'?`跟进时间：${String(plan.followupAt||'').replace('T',' ')}；内容：${plan.content||''}`:plan.reason||'';
    open('访视执行',`<p class="wb-task-subject">${escape(visit.participant||visit.person?.name||'')} · ${escape(visit.participantId)} · ${escape(visit.name)}</p>${projectMarkup({...visit,projectId,trial:projectName})}
      <section data-item-editor><div class="wb-execution-label wb-execution-checklist-heading"><span>访视项处理</span><button type="button" data-item-select-all>全选</button><small data-item-selected-count>已选 0 项</small><input class="wb-item-search" data-item-search type="search" aria-label="按访视项名称搜索" placeholder="搜索访视项名称"></div>
      <div class="wb-item-batch" hidden><div class="wb-item-batch-actions"><strong>批量处理</strong>${Object.entries(labels).map(([type,label])=>`<button type="button" data-item-batch-action="${type}">${label}</button>`).join('')}</div></div>
      <div class="wb-item-list-head"><span>访视项</span><span>处理结果</span><span>操作</span></div><div class="wb-item-rows" data-item-rows></div><p class="wb-execution-progress" data-item-progress role="status"></p></section>
`,()=>{
        confirmed=store.validateItemExecutionResults(visit,plans,today);
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
      },'保存');
    dialog.classList.add('is-item-execution');
    const form=dialog.querySelector('form'),rows=form.querySelector('[data-item-rows]');
    form.noValidate=true;
    form.querySelector('footer').prepend(form.querySelector('[data-item-progress]'));
    const search=form.querySelector('[data-item-search]');
    const matchingIndexes=()=>items.flatMap((name,index)=>name.toLowerCase().includes(search.value.trim().toLowerCase())?[index]:[]);
    const selectableIndexes=()=>matchingIndexes().filter(index=>!locked.has(items[index]));
    search.addEventListener('input',()=>{const visible=new Set(matchingIndexes());selected=new Set([...selected].filter(index=>visible.has(index)));renderRows();});
    search.addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
    const readPlan=(root,type)=>Object.fromEntries([['type',type],...[...root.querySelectorAll('[data-plan-field]')].map(input=>[input.dataset.planField,input.value])]);
    function syncSelection(){
      form.querySelector('[data-item-selected-count]').textContent=`已选 ${selected.size} 项`;
      form.querySelector('.wb-item-batch').hidden=!selected.size;
      const selectable=selectableIndexes(),total=selectable.length;
      form.querySelector('[data-item-select-all]').textContent=total&&selectable.every(index=>selected.has(index))?'取消全选':'全选';
      form.querySelector('[data-item-select-all]').disabled=!total;
    }
    function updateProgress(){
      const set=items.filter(name=>plans[name]?.type).length,done=items.filter(name=>plans[name]?.type==='done').length;
      form.querySelector('[data-item-progress]').textContent=`已设置 ${set}/${items.length} 项 · 完成 ${done} 项 · 后续执行 ${items.filter(name=>plans[name]?.type==='execute').length} 项 · 持续跟进 ${items.filter(name=>plans[name]?.type==='followup').length} 项 · 无需处理 ${items.filter(name=>plans[name]?.type==='none').length} 项`;
    }
    function renderRows(){
      rows.innerHTML=matchingIndexes().map(index=>{
        const name=items[index];
        const plan=plans[name]||{},isLocked=locked.has(name);
        return `<section class="wb-item-row" data-item-row="${index}"><label class="wb-item-pick"><input type="checkbox" aria-label="选择${escape(name)}" data-item-pick="${index}"${selected.has(index)?' checked':''}${isLocked?' disabled':''}><strong>${escape(name)}</strong></label><div class="wb-item-result"><span class="wb-item-state ${plan.type||'unset'}">${labels[plan.type]||'待处理'}</span>${plan.type?`<p title="${escape(detailsText(plan))}">${escape(detailsText(plan))}</p>`:''}</div>${isLocked?'<span class="wb-item-locked">已完成</span>':`<select data-item-type aria-label="${escape(name)}处理方式">${optionMarkup(plan.type||'')}</select>`}</section>`;
      }).join('')||'<div class="wb-item-search-empty"><img src="shared-assets/empty-list.png" width="174" height="133" alt=""><span>暂无匹配的访视项</span></div>';
      syncSelection();updateProgress();
    }
    form.querySelector('[data-item-select-all]').onclick=()=>{const indexes=selectableIndexes(),all=indexes.length&&indexes.every(index=>selected.has(index));selected=new Set(all?[]:indexes);rows.querySelectorAll('[data-item-pick]').forEach(input=>input.checked=selected.has(Number(input.dataset.itemPick)));syncSelection();};
    function editItems(type,targets,origin){
      if(!targets.length)return;
      const batch=targets.length>1,initial=targets.length===1&&plans[items[targets[0]]]?.type===type?plans[items[targets[0]]]:{type,actualDate:type==='done'?today:undefined};
      const popup=document.createElement('dialog');popup.className='wb-task-operation wb-item-batch-dialog';
      popup.setAttribute('aria-label',(batch?'批量':'')+labels[type]);
      popup.innerHTML=`<form novalidate><header><h2>${batch?'批量':''}${labels[type]}</h2><button type="button" data-batch-cancel aria-label="关闭">×</button></header><div class="wb-task-operation-body"><p class="wb-task-help">${batch?'已选 '+targets.length+' 项：':''}${targets.map(index=>escape(items[index])).join('、')}</p><div class="wb-item-plan-fields">${fieldMarkup(initial,'batch')}</div><p class="wb-task-error" role="alert"></p></div><footer><button type="button" data-batch-cancel>取消</button><button type="submit" class="primary">确认</button></footer></form>`;
      document.body.append(popup);
      const dismiss=()=>popup.close();
      popup.querySelectorAll('[data-batch-cancel]').forEach(control=>control.onclick=dismiss);
      popup.addEventListener('close',()=>{popup.remove();renderRows();(origin?.isConnected?origin:rows.querySelector('[data-item-row="'+targets[0]+'"] [data-item-type]'))?.focus();},{once:true});
      const syncReason=()=>{
        if(type!=='done')return;
        const date=popup.querySelector('[data-plan-field=actualDate]').value;
        const outside=!visit.noWindow&&Boolean(date)&&(date<visit.windowStart||date>visit.windowEnd);
        const label=popup.querySelector('[data-done-reason]');label.hidden=!outside;
        label.querySelector('textarea').required=outside;
      };
      popup.addEventListener('input',syncReason);
      popup.querySelector('form').onsubmit=event=>{
        event.preventDefault();
        try{
          const value=readPlan(popup,type),updates={};
          targets.forEach(index=>{const name=items[index];updates[name]=store.validateItemExecutionPlan(visit,name,value,today);});
          Object.assign(plans,updates);selected.clear();renderRows();
          dialog.querySelector('[role=alert]').textContent='';dismiss();
        }catch(error){popup.querySelector('[role=alert]').textContent=error.message;}
      };
      syncReason();popup.showModal();popup.querySelector('[data-plan-field]')?.focus();
    }
    form.querySelectorAll('[data-item-batch-action]').forEach(button=>button.onclick=()=>editItems(button.dataset.itemBatchAction,[...selected],button));
    rows.addEventListener('change',event=>{
      const pick=event.target.closest('[data-item-pick]');if(pick){const index=Number(pick.dataset.itemPick);pick.checked?selected.add(index):selected.delete(index);syncSelection();return;}
      if(event.target.matches('[data-item-type]')&&event.target.value){
        const index=Number(event.target.closest('[data-item-row]').dataset.itemRow);
        editItems(event.target.value,[index],event.target);
      }
    });
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
