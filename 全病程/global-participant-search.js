(() => {
 function init(){
  const topbar=document.querySelector('.research-topbar');if(!topbar)return;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const host=document.createElement('div');host.className='global-people-search';
  const searchIcon='<img src="figma-workbench-assets/global-search-focus.svg" alt="">';
  host.innerHTML=`<button type="button" class="global-people-trigger" aria-label="全局搜索参与者" aria-expanded="false" aria-controls="global-people-field"><img src="figma-workbench-assets/global-search.svg" alt=""><span>全局搜索参与者</span></button><div class="global-people-field" id="global-people-field" hidden>${searchIcon}<input id="participant-global-search" type="search" placeholder="参与者姓名缩写/编号" aria-label="全局搜索参与者姓名缩写或编号" aria-controls="participant-search-results" aria-expanded="false" autocomplete="off"><button type="button" id="participant-search-clear" aria-label="清空参与者搜索" hidden>×</button></div><div id="participant-search-results" class="participant-search-results" role="region" aria-label="参与者搜索结果" hidden></div>`;
  const actions=document.createElement('div');actions.className='research-topbar-actions';const returnEntry=topbar.querySelector('.research-topbar-return');actions.append(host,returnEntry);topbar.append(actions);
  const trigger=host.querySelector('.global-people-trigger'),field=host.querySelector('.global-people-field'),participantSearch=host.querySelector('input'),participantClear=host.querySelector('#participant-search-clear'),results=host.querySelector('.participant-search-results');
  let restoringFocus=false;
  function expand(){if(restoringFocus)return;host.classList.add('is-expanded');trigger.hidden=true;field.hidden=false;trigger.setAttribute('aria-expanded','true');participantSearch.focus();}
  function collapse(restoreFocus=false){host.classList.remove('is-expanded');field.hidden=true;trigger.hidden=false;trigger.setAttribute('aria-expanded','false');closeResults();if(restoreFocus){restoringFocus=true;trigger.focus();restoringFocus=false;}}
  trigger.addEventListener('focus',expand);
  trigger.addEventListener('click',expand);

 const closeResults=()=>{results.hidden=true;participantSearch.setAttribute('aria-expanded','false');};
 const statusClass=status=>({'已入组':'enrolled','筛选中':'screening','随访中':'following','筛选失败':'failed'}[status]||'neutral');
 function renderParticipants(){
  const q=participantSearch.value.trim().toUpperCase();participantClear.hidden=!participantSearch.value;
  if(!q){closeResults();return;}
  const {participants,projectCatalog}=window.clinicalParticipantDirectory.create();
  const people=participants.filter((p,i,a)=>a.findIndex(x=>x.study===p.study&&x.id===p.id)===i);
  const matches=people.filter(p=>[p.id,p.initials].some(v=>String(v||'').toUpperCase().includes(q)));
  results.innerHTML=`<div class="participant-search-caption" aria-live="polite">跨项目搜索 · ${matches.length} 位参与者</div>`+(matches.length?matches.map(p=>{
   const href='participant.html?'+new URLSearchParams({project:p.study,id:p.id,name:p.name,initials:p.initials||'',status:p.status});
   return `<a class="participant-search-result" href="${escape(href)}"><span class="participant-result-top"><strong>${escape(p.name)} <small>（${escape(p.initials)}）</small></strong><span class="participant-result-status ${statusClass(p.status)}">${escape(p.status)}</span></span><span class="participant-result-meta"><b>${escape(p.id)}</b><span>${escape(projectCatalog[p.study])}</span></span></a>`;
  }).join(''):'<div class="participant-search-empty">未找到参与者，请尝试其他姓名缩写或编号</div>');
  results.hidden=false;participantSearch.setAttribute('aria-expanded','true');
 }
 participantSearch.addEventListener('input',renderParticipants);participantSearch.addEventListener('focus',renderParticipants);
 participantClear.addEventListener('click',()=>{participantSearch.value='';renderParticipants();participantSearch.focus();});
 participantSearch.addEventListener('keydown',event=>{if(event.key==='Escape'){collapse(true);}else if(event.key==='ArrowDown'&&!results.hidden){event.preventDefault();results.querySelector('a')?.focus();}else if(event.key==='Enter'&&!results.hidden&&results.querySelectorAll('a').length===1){results.querySelector('a').click();}});
 results.addEventListener('keydown',event=>{const links=[...results.querySelectorAll('a')],index=links.indexOf(document.activeElement);if(event.key==='Escape'){collapse(true);}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const next=index+(event.key==='ArrowDown'?1:-1);if(next<0)participantSearch.focus();else links[Math.min(next,links.length-1)]?.focus();}});
 document.addEventListener('click',event=>{if(!host.contains(event.target))collapse();});
 document.addEventListener('focusin',event=>{if(!host.contains(event.target))collapse();});

 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
