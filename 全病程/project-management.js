(() => {
 const {participants,projectCatalog}=window.clinicalParticipantDirectory.create();
 const people=participants.filter((p,i,a)=>a.findIndex(x=>x.study===p.study&&x.id===p.id)===i);
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const search=document.getElementById('project-search'), wrap=document.querySelector('.project-table-wrap');
 wrap.className='project-grid';
 const studies=Object.entries(projectCatalog);
 const syncTitleCount=()=>{const title=document.querySelector('.page-context h1');if(!title)return;let count=title.querySelector('.project-title-count');if(!count){count=document.createElement('span');count.className='project-title-count';title.append(count);}count.textContent=`（${wrap.querySelectorAll('.study-card').length}）`;};
 const searchClear=document.getElementById('project-search-clear');
 search.value=new URLSearchParams(location.search).get('q')||'';
 function render(){
  const q=search.value.trim().toLowerCase(), visible=studies.filter(([id,name])=>(id+' '+name).toLowerCase().includes(q));
  wrap.innerHTML=visible.map(([id,name])=>{const members=people.filter(p=>p.study===id);
   return `<article class="study-card"><div class="study-card-top"><span class="study-code">${escape(id)}</span></div><h2>${escape(name)}</h2><footer class="study-card-bottom"><span class="study-participant-count">参与者 <strong>${members.length}</strong> 人</span><a class="study-enter" href="participants.html?project=${encodeURIComponent(id)}&view=participants">进入项目 <span aria-hidden="true">→</span></a></footer></article>`;
  }).join('')||'<div class="project-empty">暂无匹配项目，请调整搜索条件。</div>';
  searchClear.hidden=!search.value;
  syncTitleCount();
  document.getElementById('project-count').textContent=`共 ${visible.length} 个研究项目`;
  const u=new URL(location.href);q?u.searchParams.set('q',search.value.trim()):u.searchParams.delete('q');history.replaceState(null,'',u);
 }
 document.addEventListener('DOMContentLoaded',syncTitleCount);
 search.addEventListener('input',render);searchClear.onclick=()=>{search.value='';render();search.focus();};render();
})();
