(() => {
 const initialParams=new URLSearchParams(location.search);
 function init(){
  const root=document.querySelector('.workbench-one'),layout=root?.querySelector('.wb1-layout'),workspace=layout?.querySelector('.wb1-task-workspace'),panel=workspace?.querySelector('.wb1-task-panel');
  if(!root||!layout||!workspace||!panel)return;
  const sideHeading=document.createElement('h2');sideHeading.className='wb-overview-task-title';sideHeading.textContent='任务中心';workspace.prepend(sideHeading);
  const drill=document.createElement('section');drill.className='wb-task-drill';drill.hidden=true;drill.setAttribute('aria-label','任务列表');
  drill.innerHTML='<header class="wb-task-drill-head"><button type="button" data-back-overview>‹ 返回工作台</button><h2 tabindex="-1"></h2><span class="wb-today-scope" data-today-scope hidden>今日待办</span></header>';
  drill.append(panel);root.append(drill);panel.hidden=false;
  const buttons=[...workspace.querySelectorAll('[data-wb1-summary]')],title=drill.querySelector('h2'),back=drill.querySelector('[data-back-overview]');
  const context=document.querySelector('main.page>.page-context'),breadcrumb=document.querySelector('.research-location');
  const originalBreadcrumb=breadcrumb?.innerHTML,overviewTitle=document.title;
  function updateLocation(label){
   if(context)context.hidden=Boolean(label);
   if(!breadcrumb)return;
   breadcrumb.innerHTML=originalBreadcrumb;
   if(label){
    const current=breadcrumb.querySelector('[aria-current="page"]');
    const home=document.createElement('a');home.href='index.html';home.textContent='工作台';home.addEventListener('click',event=>{event.preventDefault();overview();});
    const separator=document.createElement('span');separator.className='location-separator';separator.setAttribute('aria-hidden','true');separator.textContent='›';
    const position=document.createElement('span');position.setAttribute('aria-current','page');position.textContent=label;
    current?.replaceWith(home,separator,position);
   }
   document.title=label?label+' · 工作台':overviewTitle;
  }
  let lastButton=null;
  const writeURL=key=>{const url=new URL(location.href);if(key)url.searchParams.set('taskView',key);else{url.searchParams.delete('taskView');url.searchParams.delete('workDate');}if(url.href!==location.href)history.pushState(null,'',url);};
  function show(key,update=true,focus=true){
   const button=buttons.find(b=>b.dataset.wb1Summary===key);if(!button)return;
   if(drill.hidden)window.workbenchListFilters?.inherit();
   lastButton=button;title.textContent=button.querySelector('.wb1-stat-label').textContent;
   drill.querySelector('[data-today-scope]').hidden=new URLSearchParams(location.search).get('workDate')!=='today';
   layout.hidden=true;drill.hidden=false;updateLocation(title.textContent);
   if(update)writeURL(key);
   try{sessionStorage.setItem('journey-v2-workbench-drill',key);}catch{}
   if(focus)title.focus({preventScroll:true});
  }
  function overview(update=true,focus=true){
   drill.hidden=true;layout.hidden=false;updateLocation('');
   buttons.forEach(button=>{button.classList.remove('is-active');button.setAttribute('aria-pressed','false');});
   if(update)writeURL('');
   try{sessionStorage.removeItem('journey-v2-workbench-drill');}catch{}
   if(focus)lastButton?.focus({preventScroll:true});
  }
  buttons.forEach(button=>button.addEventListener('click',()=>show(button.dataset.wb1Summary)));
  back.addEventListener('click',()=>overview());
  window.addEventListener('popstate',()=>{const key=new URLSearchParams(location.search).get('taskView');const button=buttons.find(b=>b.dataset.wb1Summary===key);if(button){button.click();}else overview(false);});
  let requested=initialParams.get('taskView');
  if(!requested&&initialParams.get('restore')==='1'){try{requested=sessionStorage.getItem('journey-v2-workbench-drill');}catch{}}
  if(requested==='visits'){requested=null;writeURL('');}
  const requestedButton=buttons.find(b=>b.dataset.wb1Summary===requested);
  if(requestedButton)requestedButton.click();else overview(false,false);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
