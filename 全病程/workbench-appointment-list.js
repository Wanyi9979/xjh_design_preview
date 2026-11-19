/* Pending appointments stay visible beside the booked calendar. */
(() => {
  const P=window.workbenchTaskPolicy,D=window.workbenchTaskDialogs;
  const host=document.querySelector('.wb1-visit-panel');
  const body=document.createElement('div');body.className='wb-calendar-body';
  const calendar=host.querySelector('[data-visit-overview]');host.append(body);body.append(calendar);
  const pending=document.createElement('aside');pending.className='wb-pending-appointments';pending.setAttribute('aria-label','待预约访视');body.append(pending);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let items=[],scope='pending',keyword='';
  function render(){
    const project=document.querySelector('[data-wb1-project]').value,center=document.querySelector('[data-wb1-center]').value;
    const all=P.visits().filter(v=>['activated','partial'].includes(window.clinicalVisitStore.status(v))&&!v.appointmentDate&&(!project||v.trial===project)&&(!center||v.hospital===center)&&`${v.participant}${v.participantId}`.toLowerCase().includes(keyword));
    const waiting=all.filter(v=>!v.appointmentWaiver);items=all.filter(v=>scope==='pending'?!v.appointmentWaiver:!!v.appointmentWaiver).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate));
    pending.innerHTML=`<header><h3>待预约 <span>${waiting.length}</span></h3><span>${P.count(waiting)} 位参与者</span></header><div class="wb-pending-search"><input type="search" aria-label="搜索待预约参与者" placeholder="参与者姓名 / 编号" value="${esc(keyword)}"></div><div class="wb-pending-list">${items.map((v,i)=>`<article><div class="wb-pending-person"><strong>${esc(v.participant)}</strong><span>${esc(v.participantId)}</span>${v.windowEnd<P.today?'<em>已超窗</em>':''}</div><h4>${esc(v.name)}</h4><p class="wb-pending-project" title="${esc(v.trial)}">${esc(v.trial)}</p><dl><div><dt>计划日期</dt><dd>${esc(v.plannedDate)}</dd></div><div><dt>访视窗口</dt><dd>${esc(v.windowStart.slice(5).replace('-','/'))} – ${esc(v.windowEnd.slice(5).replace('-','/'))}</dd></div></dl><footer>${scope==='pending'?`<button type="button" data-book="${i}">预约</button><details class="wb-visit-more"><summary aria-label="更多" title="更多"><svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/></svg></summary><div><button type="button" data-terminate="${i}">终止访视</button><button type="button" data-waive="${i}">无需处理</button><button type="button" data-followup="${i}">添加跟进</button>${D.hasTasks(v)?`<button type="button" data-tasks="${i}">任务处理</button>`:''}<button type="button" data-detail="${i}">查看详情</button></div></details>`:`<button type="button" data-history="${i}">查看记录</button>`}</footer></article>`).join('')||'<div class="wb-pending-empty">暂无'+(scope==='pending'?'待预约访视':'无需处理记录')+'</div>'}</div>`;
  }
  pending.addEventListener('click',event=>{
    const tab=event.target.closest('[data-scope]');if(tab){scope=tab.dataset.scope;render();return;}
    for(const [attr,action] of [['book','book'],['terminate','terminate'],['waive','waive'],['history','history'],['followup','followup'],['tasks','tasks'],['detail','detail']]){const b=event.target.closest(`[data-${attr}]`);if(b){if(action==='detail')D.visitDetail(items[+b.dataset[attr]],true);else D.appointment(items[+b.dataset[attr]],action);return;}}
  });
  ['[data-wb1-project]','[data-wb1-center]'].forEach(selector=>document.querySelector(selector).addEventListener('change',render));
  pending.addEventListener('input',event=>{if(!event.target.matches('.wb-pending-search input'))return;keyword=event.target.value.trim().toLowerCase();const position=event.target.selectionStart;render();const input=pending.querySelector('input');input.focus();input.setSelectionRange(position,position);});
  window.addEventListener('workbench-tasks-changed',render);render();
})();
