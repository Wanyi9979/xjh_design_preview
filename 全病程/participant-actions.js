(() => {
 const params=new URLSearchParams(location.search),project=params.get('project')||'CT-2026-001',id=params.get('id')||'S001';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dialog=document.createElement('dialog');dialog.className='participant-action-dialog';document.body.append(dialog);
 const statusKey='journey-v2-person-status';let states={};try{states=JSON.parse(localStorage.getItem(statusKey))||{};}catch{}
 const transitions={'筛选中':['筛选失败','已入组'],'已入组':['随访中','研究结束'],'随访中':['研究结束']};
 const open=(mode,selectedPerson,preferredVisitId)=>{
  const directory=window.clinicalParticipantDirectory.create();
  const person=selectedPerson||directory.participants.find(p=>p.study===project&&p.id===id);
  if(!person||['研究结束','筛选失败'].includes(person.status))return;
  const personProject=person.study,personId=person.id;
  const allowedStates=transitions[person.status]||[];
  if(mode==='status'&&!allowedStates.length)return;
  const visits=window.clinicalVisitStore.directoryVisits(directory,directory.source.today).filter(v=>v.projectId===personProject&&v.participantId===personId&&window.clinicalVisitStore.status(v)==='inactive'&&v.protocolVersion===person.protocolVersion);
  dialog.innerHTML=`<form><header><h2>${mode==='status'?'参与者状态':'访视激活'}</h2><button type="button" data-close aria-label="关闭">×</button></header><div class="participant-action-body"><div class="participant-action-subject"><strong>${escape(person.name)}（${escape(personId)}）</strong><span>${escape(directory.projectCatalog[personProject])}</span><span>访视方案版本 ${escape(person.protocolVersion)}</span></div>${mode==='status'?`<label>参与者状态<select name="state" required><option value="">请选择状态</option>${allowedStates.map(s=>`<option>${s}</option>`).join('')}</select></label><label data-status-enrollment-number hidden>入组号<input type="text" name="enrollmentNumber" maxlength="100" placeholder="请输入入组号" value="${escape(person.enrollmentNumber||'')}"></label><label data-status-enrollment hidden>入组时间<input type="date" name="enrollmentDate" required value="${escape(person.enrollmentDate||'')}"></label><label data-status-group hidden>分组<select name="group" required><option value="">请选择分组</option>${['A组','B组'].map(group=>`<option ${person.group===group?'selected':''}>${group}</option>`).join('')}</select></label><label>变更原因<textarea name="reason" required maxlength="500" placeholder="请填写变更原因"></textarea></label>`:visits.length?`<label>选择访视<select name="visit" required>${visits.map(v=>`<option value="${escape(v.id)}">${escape(v.name)} · ${escape(v.protocolVersion)}</option>`).join('')}</select></label><label>计划日期<input name="date" type="date" required value="${escape(visits[0].plannedDate||directory.source.today)}"></label>`:'<p>当前没有待激活的访视。</p>'}</div><footer><button type="button" data-close>取消</button>${mode==='status'||visits.length?'<button class="primary" type="submit">保存</button>':''}</footer></form>`;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
  const form=dialog.querySelector('form');
  if(mode!=='status' && visits.length){
   if(preferredVisitId && visits.some(v=>v.id===preferredVisitId))form.elements.visit.value=preferredVisitId;
   const dateForVisit=()=>{form.elements.date.value=visits.find(v=>v.id===form.elements.visit.value)?.plannedDate||directory.source.today;};
   form.elements.visit.addEventListener('change',dateForVisit);dateForVisit();
  }
  if(mode==='status'){
   const syncGroup=()=>{const enrolled=form.elements.state.value==='已入组';form.querySelector('[data-status-group]').hidden=!enrolled;form.elements.group.disabled=!enrolled;form.querySelector('[data-status-enrollment]').hidden=!enrolled;form.elements.enrollmentDate.disabled=!enrolled;form.querySelector('[data-status-enrollment-number]').hidden=!enrolled;form.elements.enrollmentNumber.disabled=!enrolled;};
   form.elements.state.addEventListener('change',()=>{form.elements.state.setCustomValidity('');syncGroup();});syncGroup();
   form.elements.reason.addEventListener('input',()=>form.elements.reason.setCustomValidity(''));
  }
  form.onsubmit=e=>{e.preventDefault();if(mode==='status'){
   const current=window.clinicalParticipantDirectory.create().participants.find(p=>p.study===personProject&&p.id===personId);
   if(!(transitions[current?.status]||[]).includes(form.elements.state.value)){form.elements.state.setCustomValidity('当前状态不支持此变更，请重新打开弹窗选择。');form.elements.state.reportValidity();return;}
   const reason=form.elements.reason.value.trim();if(!reason){form.elements.reason.setCustomValidity('请填写变更原因');form.elements.reason.reportValidity();return;}
   try{states=JSON.parse(localStorage.getItem(statusKey))||{};}catch{}
   states[personProject+':'+personId]={status:form.elements.state.value,group:form.elements.state.value==='已入组'?form.elements.group.value:(person.group||''),enrollmentNumber:form.elements.state.value==='已入组'?form.elements.enrollmentNumber.value.trim():(person.enrollmentNumber||''),enrollmentDate:form.elements.state.value==='已入组'?form.elements.enrollmentDate.value:(person.enrollmentDate||''),reason,at:new Date().toISOString()};localStorage.setItem(statusKey,JSON.stringify(states));
   if(document.getElementById('person-status')){params.set('status',form.elements.state.value);location.search=params;}else location.reload();
  }else{const v=visits.find(v=>v.id===form.elements.visit.value);if(!v)return;v.state='已激活';v.visitStatus='已激活';v.plannedDate=form.elements.date.value;const shift=n=>{const d=new Date(v.plannedDate+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};v.windowStart=shift(-2);v.windowEnd=shift(2);window.clinicalVisitStore.save(v);location.reload();}};
  window.showQuietDialog(dialog);
 };
 window.openParticipantAction = open;
 document.querySelectorAll('.participant-header-actions .top-btn').forEach(b=>{if(b.textContent==='参与者状态')b.onclick=()=>open('status');if(b.textContent==='激活访视')b.onclick=()=>open('activate');});
 document.getElementById('rows')?.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button||!['参与者状态','访视激活'].includes(button.dataset.action))return;const row=button.closest('tr');const person=window.clinicalParticipantDirectory.create().participants.find(p=>p.study===row.dataset.study&&p.id===row.dataset.id);open(button.dataset.action==='参与者状态'?'status':'activate',person);});
 const search=document.querySelector('[aria-label="搜索访视或CRF"]');
 const filter=()=>{const q=search?.value.trim().toLowerCase()||'';document.querySelectorAll('.data-cycle-group').forEach(group=>{const match=group.querySelector('.data-cycle-head').textContent.toLowerCase().includes(q);let visible=0;group.querySelectorAll('.data-crf-card').forEach(card=>{card.hidden=!match&&!card.textContent.toLowerCase().includes(q);if(!card.hidden)visible++;});group.hidden=!visible;});};
 search?.addEventListener('input',filter);
 document.getElementById('data-cycle-list')?.addEventListener('click',event=>{const head=event.target.closest('.data-cycle-head');if(head){const collapsed=head.getAttribute('aria-expanded')==='true';head.setAttribute('aria-expanded',String(!collapsed));head.parentElement.querySelectorAll('.data-crf-card').forEach(card=>card.hidden=collapsed);}});
 const add=document.querySelector('.data-add-visit');if(add)add.onclick=()=>open('activate');
})();
