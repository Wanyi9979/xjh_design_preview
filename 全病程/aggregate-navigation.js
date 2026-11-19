(() => {
 function init(){
  const scope=window.sharedResearchScope;if(!scope||new URLSearchParams(location.search).has('planEmbed'))return;
  const projects={'CT-2026-001':'HER2 阳性晚期乳腺癌真实世界研究','HX-LC-II-06':'非小细胞肺癌 II 期研究','HX-BC-III-02':'乳腺癌 III 期临床研究','HX-GI-III-01':'消化道肿瘤 III 期研究'};
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page=location.pathname.split('/').pop()||'index.html',params=new URLSearchParams(location.search),detail=page==='participant.html',template=page==='templates.html',work=page==='index.html';
  const module=work?'work':template?'templates':'participants';
  const routes=[['work','工作台','index.html'],['participants','参与者管理','participants.html?view=participants'],['templates','任务模板','templates.html']];
  const shapes={work:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',participants:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>',visits:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/>',templates:'<path d="M14 3H5v18h14V8Z M14 3v5h5 M8 12h8 M8 16h6"/>'};
  const nav=document.querySelector('.rail-navigation');
  function links(){nav.innerHTML=routes.map(([key,label,href])=>{const u=new URL(href,location.href);if(scope.project)u.searchParams.set('project',scope.project);if(scope.center)u.searchParams.set('hospital',scope.center);return `<a href="${esc(u.pathname.split('/').pop()+u.search)}" title="${label}" ${module===key?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[key]}</svg><span>${label}</span></a>`;}).join('');}
  links();document.querySelectorAll('.project-module-tabs,.rail-project-navigation').forEach(e=>e.remove());
  if(detail){const trail=document.querySelector('.research-location');if(trail)trail.innerHTML='<img src="figma-workbench-assets/topbar-home.svg" alt=""><span>当前位置：</span><a href="participants.html">参与者管理</a><span class="location-separator" aria-hidden="true">›</span><span aria-current="page">参与者详情</span>';}
  document.documentElement.dataset.projectScope='all';document.documentElement.dataset.aggregateModules='true';
  const title=routes.find(r=>r[0]===module)[1],context=document.querySelector('.page-context');
  if(context){context.classList.remove('is-project-heading');const row=context.querySelector('.context-row');if(row){const toolbar=row.querySelector('.wb1-toolbar');if(toolbar)row.before(toolbar);row.innerHTML=`<h1>${title}</h1>`;}}
  const trail=document.querySelector('.research-location');if(trail&&!detail&&!params.has('taskView'))trail.innerHTML=`<img src="figma-workbench-assets/topbar-home.svg" alt=""><span>当前位置：</span><span aria-current="page">${title}</span>`;
  const bar=document.createElement('section');bar.className='global-scope-bar';bar.setAttribute('aria-label','公共项目与中心筛选');bar.innerHTML='<span class="global-scope-label">当前范围</span>';
  let project=work?document.querySelector('[data-wb1-project]'):document.querySelector('#project-filter'),center=work?document.querySelector('[data-wb1-center]'):document.querySelector('#hospital-filter');
  if(!project){project=document.createElement('select');project.innerHTML='<option value="">全部项目</option>'+Object.entries(projects).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');}
  if(!center){center=document.createElement('select');center.innerHTML='<option value="">全部中心</option>';}
  if(detail){project.disabled=true;center.disabled=true;project.title='参与者详情中不可切换项目';center.title='参与者详情中不可切换中心';}
  project.hidden=false;center.hidden=false;project.setAttribute('aria-label','公共项目筛选');center.setAttribute('aria-label','公共中心筛选');
  project.value=work?(projects[scope.project]||''):scope.project;
  bar.append(project,center);
  const topbar=document.querySelector('.research-topbar');topbar.classList.add('has-global-scope');topbar.querySelector('.research-topbar-return').before(bar);bar.querySelector('.global-scope-label').remove();
  const people=window.clinicalParticipantDirectory?.create().participants||[];
  function centers(){const options=[...new Set(people.filter(p=>!scope.project||p.study===scope.project).map(p=>p.hospital).filter(Boolean))];center.innerHTML='<option value="">全部中心</option>'+options.map(v=>`<option>${esc(v)}</option>`).join('');if(!options.includes(scope.center))scope.center='';center.value=scope.center;}
  centers();
  function persist(){try{sessionStorage.setItem(scope.key,JSON.stringify(scope));}catch{}const u=new URL(location.href);if(!detail){scope.project?u.searchParams.set('project',scope.project):u.searchParams.delete('project');}scope.center?u.searchParams.set('hospital',scope.center):u.searchParams.delete('hospital');history.replaceState(null,'',u);links();}
  let applying=false;
  function apply(){
   if(applying)return;applying=true;
   if(work){const form=document.querySelector('.wb-list-filters');if(form){form.elements.project.value=project.value;form.elements.center.value=center.value;}window.dispatchEvent(new Event('workbench-list-filter-change'));}
   else if(!template&&!detail){project.dispatchEvent(new Event('change'));center.dispatchEvent(new Event('change'));}
   persist();applying=false;
  }
  // Track edits from the actual open editor rather than treating prefilled values as dirty.
  const dirtyEditors=new Set();
  const visible=element=>element?.isConnected&&element.getClientRects().length&&(!element.matches('dialog')||element.open);
  const editorFor=element=>element.closest('dialog,[role="dialog"][aria-modal="true"],#data-entry-workspace');
  function recordEdit(event){const editor=editorFor(event.target);if(editor&&visible(editor))dirtyEditors.add(editor);}
  document.addEventListener('input',recordEdit,true);document.addEventListener('change',recordEdit,true);
  document.addEventListener('close',event=>dirtyEditors.delete(event.target),true);
  window.addEventListener('crf-state-change',()=>dirtyEditors.delete(document.querySelector('#data-entry-workspace')));
  new MutationObserver(()=>{dirtyEditors.forEach(editor=>{if(!editor.isConnected||editor.id!=='data-entry-workspace'&&!visible(editor))dirtyEditors.delete(editor);});}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','open']});
  function closeEditors(){
    document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
    document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach(dialog=>{
      if(!visible(dialog))return;
      let mask=dialog;
      for(let parent=dialog;parent&&parent!==document.body;parent=parent.parentElement){if([...parent.classList].some(name=>name.endsWith('-mask'))){mask=parent;break;}}
      mask.hidden=true;
    });
    document.querySelectorAll('[role="menu"]').forEach(menu=>{menu.hidden=true;});
    document.querySelectorAll('details[open]').forEach(item=>item.removeAttribute('open'));
    document.body.style.overflow='';dirtyEditors.clear();
  }
  function detailDestination(next){
    if(!detail)return null;
    const actualProject=params.get('project'),id=params.get('id');
    const person=people.find(p=>p.study===actualProject&&p.id===id);
    const included=(!next.project||next.project===actualProject)&&(!next.center||person?.hospital===next.center);
    if(included)return null;
    // Screening numbers are project-scoped. Only a stable patient identifier can link projects.
    const counterpart=person?.uniqueIdentifier&&people.find(p=>p.uniqueIdentifier===person.uniqueIdentifier&&(!next.project||p.study===next.project)&&(!next.center||p.hospital===next.center));
    if(counterpart){const url=new URL('participant.html',location.href);Object.entries({project:counterpart.study,id:counterpart.id,name:counterpart.name,status:counterpart.status,tab:'participant-visits',hospital:next.center,from:params.get('from')||''}).forEach(([key,value])=>{if(value)url.searchParams.set(key,value);});return url;}
    const url=new URL('participants.html',location.href);url.searchParams.set('view','participants');
    if(next.project)url.searchParams.set('project',next.project);if(next.center)url.searchParams.set('hospital',next.center);if(params.get('from'))url.searchParams.set('from',params.get('from'));
    try{sessionStorage.setItem('journey-v3-scope-notice','当前参与者不在所选项目或中心范围内，已返回参与者列表。');}catch{}
    return url;
  }
  function changeScope(kind,event){
    if(applying)return;
    event.stopImmediatePropagation();
    const previous={project:scope.project,center:scope.center};
    const next={project:kind==='project'?(work?(Object.keys(projects).find(id=>projects[id]===project.value)||''):project.value):scope.project,center:kind==='project'?'':center.value};
    if(next.project===previous.project&&next.center===previous.center)return;
    const hasEdits=[...dirtyEditors].some(editor=>visible(editor)||editor.id==='data-entry-workspace'&&editor.isConnected);
    if(hasEdits&&!window.confirm('切换项目或中心将关闭当前编辑，未保存的内容将丢失。确定切换吗？')){
      project.value=work?(projects[previous.project]||''):previous.project;center.value=previous.center;return;
    }
    closeEditors();scope.project=next.project;scope.center=next.center;centers();window.participantVisits?.clearContext?.();
    const destination=detailDestination(next);
    if(destination){persist();location.href=destination.href;return;}
    if(template){persist();location.reload();}else apply();
  }
  window.prepareGlobalParticipantNavigation=person=>{
    const hasEdits=[...dirtyEditors].some(editor=>visible(editor)||editor.id==='data-entry-workspace'&&editor.isConnected);
    if(hasEdits&&!window.confirm('打开参与者将关闭当前编辑，未保存的内容将丢失。确定继续吗？'))return false;
    closeEditors();
    if(scope.project&&scope.project!==person.study){scope.project='';scope.center='';}
    else if(scope.center&&scope.center!==person.hospital)scope.center='';
    project.value=work?(projects[scope.project]||''):scope.project;centers();persist();return true;
  };
  project.addEventListener('change',event=>changeScope('project',event),true);
  center.addEventListener('change',event=>changeScope('center',event),true);
  let notice='';try{notice=sessionStorage.getItem('journey-v3-scope-notice')||'';sessionStorage.removeItem('journey-v3-scope-notice');}catch{}
  if(notice){const message=document.createElement('div');message.className='global-scope-notice';message.setAttribute('role','status');message.textContent=notice;document.body.append(message);setTimeout(()=>message.remove(),6000);}
  document.querySelector('[data-list-reset]')?.addEventListener('click',apply);
  document.querySelector('#reset')?.addEventListener('click',()=>{project.value=scope.project;center.value=scope.center;apply();});
  if(work)document.querySelector('.wb1-toolbar')?.remove();
  apply();context?.remove();if(!work)document.title=(detail?'参与者详情':title)+' · 全病程';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
