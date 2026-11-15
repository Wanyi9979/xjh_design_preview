document.addEventListener('DOMContentLoaded',()=>{
 const key='journey-v2-workbench-context',project=document.querySelector('[data-wb1-project]'),center=document.querySelector('[data-wb1-center]'),search=document.querySelector('[data-wb1-participant]');
 const save=()=>{try{sessionStorage.setItem(key,JSON.stringify({project:project.value,center:center.value,search:search.value,summary:document.querySelector('[data-wb1-summary][aria-pressed=true]')?.dataset.wb1Summary,tab:document.querySelector('[data-wb1-tab][aria-selected=true]')?.dataset.wb1Tab,scroll:window.scrollY}));}catch{}};
 document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link){const url=new URL(link.href,location.href);if(url.origin===location.origin&&['participants.html','participant.html'].includes(url.pathname.split('/').pop())){url.searchParams.set('from','workbench');link.href=url.href;save();}}else setTimeout(save,0);});
 [project,center].forEach(el=>el.addEventListener('change',save));search.addEventListener('input',save);window.addEventListener('pagehide',save);
 if(new URLSearchParams(location.search).get('restore')==='1'){
  let state;try{state=JSON.parse(sessionStorage.getItem(key));}catch{}
  if(state){project.value=state.project||'';center.value=state.center||'';search.value=state.search||'';project.dispatchEvent(new Event('change'));center.dispatchEvent(new Event('change'));search.dispatchEvent(new Event('input'));document.querySelector(`[data-wb1-summary="${['issue','execution','execution-overdue','followup','processing'].includes(state.summary)?state.summary:'issue'}"]`)?.click();const tab=[...document.querySelectorAll('[data-wb1-tab]')].find(button=>button.dataset.wb1Tab===state.tab&&!button.hidden);tab?.click();requestAnimationFrame(()=>window.scrollTo(0,state.scroll||0));}
  const url=new URL(location.href);url.searchParams.delete('restore');history.replaceState(null,'',url);
 }
 // Removed calendar URLs now resolve to the ordinary workbench.
 const url=new URL(location.href);if(url.searchParams.get('view')==='calendar'){url.searchParams.delete('view');history.replaceState(null,'',url);}
 const fields=[project,center,search];
 const refreshClearButtons=()=>fields.forEach(field=>{const wrapper=field.closest('.wb1-filter');wrapper.classList.toggle('has-value',Boolean(field.value));wrapper.querySelector('[data-wb1-clear]').hidden=!field.value;});
 fields.forEach(field=>['change','input'].forEach(name=>field.addEventListener(name,refreshClearButtons)));
 document.querySelectorAll('[data-wb1-clear]').forEach(button=>button.addEventListener('click',()=>{const field=button.closest('.wb1-filter').querySelector('select,input');field.value='';field.dispatchEvent(new Event(field===search?'input':'change',{bubbles:true}));field.focus();}));
 document.querySelector('[data-wb1-reset]').addEventListener('click',()=>{fields.forEach(field=>{field.value='';});fields.forEach(field=>field.dispatchEvent(new Event(field===search?'input':'change',{bubbles:true})));refreshClearButtons();});
 refreshClearButtons();

 const tableWrap=document.querySelector('.wb1-table-wrap'),taskTable=tableWrap.querySelector('.wb1-table');
 let overflowFrame=0;
 const refreshOverflow=()=>{
  let actionWidth=80;
  taskTable.querySelectorAll('.wb1-table-actions').forEach(group=>{
   const buttons=[...group.children].filter(button=>button.getClientRects().length);
   const gap=parseFloat(getComputedStyle(group).columnGap)||0;
   const cellStyle=getComputedStyle(group.parentElement);
   const width=buttons.reduce((sum,button)=>sum+button.getBoundingClientRect().width,0)+Math.max(0,buttons.length-1)*gap+(parseFloat(cellStyle.paddingLeft)||0)+(parseFloat(cellStyle.paddingRight)||0);
   actionWidth=Math.max(actionWidth,Math.ceil(width)+2);
  });
  const widthValue=actionWidth+'px';
  if(taskTable.style.getPropertyValue('--task-action-width')!==widthValue)taskTable.style.setProperty('--task-action-width',widthValue);
  const max=tableWrap.scrollWidth-tableWrap.clientWidth;
  tableWrap.classList.toggle('has-horizontal-overflow',max>1);
  tableWrap.classList.toggle('has-hidden-columns',max>1&&tableWrap.scrollLeft<max-1);
 };
 const scheduleOverflow=()=>{if(!overflowFrame)overflowFrame=requestAnimationFrame(()=>{overflowFrame=0;refreshOverflow();});};
 tableWrap.addEventListener('scroll',scheduleOverflow,{passive:true});
 const sizeObserver=new ResizeObserver(scheduleOverflow);sizeObserver.observe(tableWrap);sizeObserver.observe(taskTable);
 new MutationObserver(scheduleOverflow).observe(taskTable,{childList:true,subtree:true});
 refreshOverflow();

});
