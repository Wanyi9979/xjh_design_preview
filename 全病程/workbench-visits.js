(() => {
  const root = document.querySelector('[data-visit-overview]');
  if (!root) return;
  const today = '2026-10-29';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parse = value => new Date(`${value}T12:00:00`);
  const addDays = (value, count) => { const date = parse(value); date.setDate(date.getDate() + count); return dateKey(date); };
  const shortDate = value => value.slice(5).replace('-', '/');
  const studies = ['HER2 阳性晚期乳腺癌真实世界研究', '非小细胞肺癌 II 期研究', '消化道肿瘤 III 期研究'];
  const projectIds = ['CT-2026-001', 'HX-LC-II-06', 'HX-GI-III-01'];
  const directory=window.clinicalParticipantDirectory.create();
  const store=window.clinicalVisitStore;
  const visits=store.directoryVisits(directory,today).map(visit=>{
    const person=directory.participants.find(p=>p.study===visit.projectId&&p.id===visit.participantId);
    return {...visit,participant:person?.name||visit.participantId,initials:person?.initials||'',study:projectIds.indexOf(visit.projectId),center:visit.hospital||person?.hospital||'未分配'};
  }).filter(visit=>['activated','completed'].includes(store.status(visit)));
  const projectFilter = document.querySelector('[data-wb1-project]');
  const centerFilter = document.querySelector('[data-wb1-center]');
  const search = document.querySelector('[data-wb1-participant]');
  const mask = document.querySelector('[data-calendar-drawer]');
  const detail = mask.querySelector('[data-calendar-detail]');
  const drawer = mask.querySelector('.wvc-drawer');
  let activeVisit = null;
  let returnFocus = null;
  let previousOverflow = '';
  // 关注范围由方案计划日期确定，预约不等于完成，也不移出原关注分组。
  const displayDate = visit => visit.plannedDate;
  const status = visit => visit.actualDate ? 'completed' : visit.windowEnd < today ? 'overdue' : visit.appointmentDate ? 'booked' : 'unbooked';
  const labels = { booked: '已预约', unbooked: '未预约', completed: '已完成', overdue: '超窗未访' };
  const filtered = () => visits.filter(visit => (!projectFilter.value || directory.projectCatalog[visit.projectId] === projectFilter.value) && (!centerFilter.value || visit.center === centerFilter.value) && `${visit.participantId}${visit.participant}${visit.initials}`.toLowerCase().includes(search.value.trim().toLowerCase()));
  // 工作台1每次进入都从全部项目开始，用户仍可手动筛选。
  projectFilter.innerHTML='<option value="">全部项目</option>'+Object.values(directory.projectCatalog).map(name=>'<option>'+escape(name)+'</option>').join('');
  projectFilter.value = '';
  const initialURL = new URL(location.href);
  if (initialURL.searchParams.has('project')) {
    initialURL.searchParams.delete('project');
    history.replaceState(null, '', initialURL);
  }

  const pending=visit=>store.status(visit)==='activated';
  const overdue=visit=>pending(visit)&&visit.windowEnd<today;
  function recentCard(visit,isLate=false){
    const day=visit.plannedDate;
    const days=Math.round((parse(today)-parse(visit.windowEnd))/86400000);
    const delta=Math.round((parse(day)-parse(today))/86400000);
    const dateLabel=isLate?'已超窗':delta===0?'今日':delta===1?'明天':delta===2?'后天':delta>0?delta+'天后':shortDate(day);
    const appointmentState=visit.appointmentDate?'已预约':'未预约';
    const state=appointmentState+(isLate?` · 超窗 ${days} 天`:'');
    return `<button type="button" class="recent-visit${isLate?' is-overdue':''}" data-calendar-visit="${escape(visit.id)}" aria-label="${escape(`${visit.participant} ${visit.participantId} ${visit.name} ${state}`)}"><span class="visit-date-rail">${isLate?`<span class="overdue-rail-label">已超窗</span><strong class="overdue-rail-days">${days}</strong><span>天</span>`:escape(dateLabel)}</span><span class="recent-visit-content"><span class="recent-visit-head"><strong>${escape(visit.participant)}<small>${escape(visit.participantId)}</small></strong><span class="recent-visit-states"><em class="${visit.appointmentDate?'booked':'unbooked'}">${appointmentState}</em></span></span><span class="recent-visit-name">${escape(visit.name)} <span class="protocol-tag">${escape(visit.protocolVersion)}</span></span><span class="recent-visit-project" title="${escape(directory.projectCatalog[visit.projectId])}">${escape(directory.projectCatalog[visit.projectId])}</span><span class="recent-visit-date"><span class="visit-primary-date">${'计划日 '+shortDate(day)}</span><span>窗口 ${shortDate(visit.windowStart)}–${shortDate(visit.windowEnd)}</span></span>${visit.appointmentDate?`<span class="recent-appointment-date">预约日 ${escape(visit.appointmentDate.replaceAll('-','/'))}</span>`:''}</span></button>`;
  }
  let focusTab='today';
  function render(){
    visits.forEach(visit=>Object.assign(visit,store.apply(visit)));
    const all=filtered().filter(pending),end=addDays(today,6);
    const groups={overdue:all.filter(overdue).sort((a,b)=>a.windowEnd.localeCompare(b.windowEnd)),today:all.filter(v=>!overdue(v)&&displayDate(v)<=today),future:all.filter(v=>!overdue(v)&&displayDate(v)>today&&displayDate(v)<=end).sort((a,b)=>displayDate(a).localeCompare(displayDate(b)))};
    const tabs=`<div class="focus-tabs" role="tablist" aria-label="访视关注分类">${[['today','今日访视'],['overdue','超窗访视'],['future','未来访视']].map(([key,label])=>`<button type="button" data-focus-tab="${key}" role="tab" aria-selected="${focusTab===key}">${label}<span>${groups[key].length}</span></button>`).join('')}</div>`;
    const items=groups[focusTab];
    const label=focusTab==='future'?`明天起未来6天 · ${shortDate(addDays(today,1))}–${shortDate(end)}`:focusTab==='today'?'今天需要到访或仍待到访的参与者':'超过方案窗口，尚未记录实际到访';
    root.innerHTML=tabs+`<div class="focus-list-caption"><span>${label}</span></div><div class="focus-list" role="tabpanel" aria-label="${{overdue:'已超窗',today:'今日访视',future:'未来访视'}[focusTab]}">${items.map(v=>recentCard(v,focusTab==='overdue')).join('')||'<div class="focus-list-empty">暂无符合条件的访视</div>'}</div>`;
  }
  root.addEventListener('click',event=>{
    const tab=event.target.closest('[data-focus-tab]');if(tab){focusTab=tab.dataset.focusTab;render();}
  });

  function showDrawer(title, markup, trigger) {
    if (mask.hidden) { returnFocus = trigger; previousOverflow = document.body.style.overflow; }
    mask.querySelector('h2').textContent = title;
    detail.innerHTML = markup;
    mask.hidden = false;
    document.body.style.overflow = 'hidden';
    window.focusDialogFrame(drawer);
  }

  function showVisit(visit, trigger) {
    activeVisit = visit;
    const params = new URLSearchParams({ project: visit.projectId, id: visit.participantId, name: visit.participant, tab: 'participant-tasks', from:'workbench' });
    mask.querySelector('[data-calendar-participant]').href='participant.html?'+params;
    showDrawer(`${visit.participant}（${visit.participantId}）`, `<div class="wvc-detail-heading"><h3>${escape(visit.name)}</h3><span class="wvc-state is-${status(visit)}">${labels[status(visit)]}</span></div><dl class="wvc-detail-fields">${[['参与试验', directory.projectCatalog[visit.projectId]], ['访视方案版本', visit.protocolVersion], ['研究中心', visit.center], ['计划日期', visit.plannedDate], ['访视窗口', `${visit.windowStart} 至 ${visit.windowEnd}`], ['预约日期', visit.appointmentDate || '未预约'], ['实际日期', visit.actualDate || '未记录']].map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><form class="wvc-date-form" data-calendar-form><h3>访视日期管理</h3><label>预约访视日期<input type="date" name="appointment" value="${escape(visit.appointmentDate)}"></label><label>实际访视日期<input type="date" name="actual" max="${today}" value="${escape(visit.actualDate)}"></label><label>调整原因<textarea name="reason" maxlength="500" placeholder="超窗安排、取消预约或修改实际日期时必填"></textarea></label><p class="wvc-form-error" role="alert"></p><button type="submit">保存日期</button></form>`, trigger);
  }

  function closeDrawer() {
    mask.hidden = true;
    document.body.style.overflow = previousOverflow;
    activeVisit = null;
    if (returnFocus?.isConnected) returnFocus.focus();
    else document.querySelector('.wb1-visit-panel h2').focus();
  }

  root.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.calendarVisit) showVisit(visits.find(visit => visit.id === target.dataset.calendarVisit), target);
  });
  mask.addEventListener('click', event => {
    if (event.target === mask || event.target.closest('[data-calendar-close]')) closeDrawer();
  });
  detail.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const appointmentDate = form.elements.appointment.value;
    const actualDate = form.elements.actual.value;
    const reason = form.elements.reason.value.trim();
    const fail = message => { form.querySelector('[role="alert"]').textContent = message; };
    if (actualDate > today) { fail('实际访视日期不能晚于今天'); return; }
    const outside = value => value && (value < activeVisit.windowStart || value > activeVisit.windowEnd);
    if (((appointmentDate !== activeVisit.appointmentDate && (outside(appointmentDate) || !appointmentDate && activeVisit.appointmentDate)) || (actualDate !== activeVisit.actualDate && (outside(actualDate) || activeVisit.actualDate))) && !reason) { fail('请填写本次调整原因'); return; }
    if (appointmentDate === activeVisit.appointmentDate && actualDate === activeVisit.actualDate) { fail('访视日期未发生变化'); return; }
    const at=new Date().toLocaleString('sv-SE');
    const record=(action,from,to)=>({action,from:from||'',to:to||'',reason,operator:'当前个案',at});
    if(appointmentDate!==activeVisit.appointmentDate)(activeVisit.appointmentHistory||=[]).push(record(appointmentDate?'调整预约':'取消预约',activeVisit.appointmentDate,appointmentDate));
    if(actualDate!==activeVisit.actualDate)(activeVisit.actualHistory||=[]).push(record('记录实际访视日期',activeVisit.actualDate,actualDate));
    Object.assign(activeVisit,{appointmentDate,actualDate});store.save(activeVisit);
    render();
    showVisit(activeVisit, returnFocus);
    detail.querySelector('[role="alert"]').textContent = '日期已保存，访视列表已更新';
  });
  document.addEventListener('keydown', event => {
    if (mask.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
    if (event.key === 'Tab') {
      const controls = [...drawer.querySelectorAll('button, a, input, textarea')].filter(control => !control.disabled && !control.hidden);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawer)) { event.preventDefault(); first.focus(); }
    }
  });
  [projectFilter, centerFilter].forEach(filter => filter.addEventListener('change', render));
  search.addEventListener('input', render);
  render();
})();
