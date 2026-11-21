(()=>{
 const toolbar=document.createElement('div');
 toolbar.style.cssText='position:fixed;top:16px;right:20px;z-index:9999;display:flex;align-items:center;gap:10px;font:13px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
 const modes=document.createElement('div');modes.setAttribute('role','group');modes.setAttribute('aria-label','项目展示模式');
 modes.style.cssText='display:flex;padding:3px;border:1px solid #dedbea;border-radius:22px;background:white;box-shadow:0 2px 8px #3024520a';
 for(const [value,label] of [['single','单项目'],['multi','多项目']]){
  const option=document.createElement('button');option.type='button';option.textContent=label;
  const selected=(window.singleProjectPreview?'single':'multi')===value;
  option.setAttribute('aria-pressed',String(selected));
  option.style.cssText='border:0;border-radius:18px;padding:7px 12px;font:inherit;cursor:pointer;background:'+(selected?'#7064df':'transparent')+';color:'+(selected?'white':'#7064df');
  option.onclick=()=>{
   if(selected)return;
   localStorage.setItem('clinical-demo-project-mode',value);
   sessionStorage.setItem('clinical-demo-project-mode',value);
   if(value==='single'&&location.pathname.endsWith('/visits.html')){
    location.replace('clinical.html?view=projects&projectMode=single');return;
   }
   const url=new URL(location.href);url.searchParams.set('projectMode',value);
   if(document.body.classList.contains('clinical-home')){
    const showingProjects=document.querySelector('[data-view="projects"]').getAttribute('aria-selected')==='true';
    if(showingProjects)url.searchParams.set('view','projects');else url.searchParams.delete('view');
   }
   if(value==='single'&&url.searchParams.has('project'))url.searchParams.set('project','p1');
   location.replace(url.href);
  };
  modes.append(option);
 }
 toolbar.append(modes);
 const button=document.createElement('button');
 button.type='button';button.textContent='重置预览';
 button.style.cssText='padding:9px 16px;border:1px solid #dedbea;border-radius:20px;background:white;color:#7064df;font:13px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;cursor:pointer;box-shadow:0 2px 8px #3024520a';
 button.onclick=()=>{
  button.disabled=true;button.textContent='正在重置…';
  sessionStorage.removeItem('clinical-demo-task-records');sessionStorage.removeItem('clinical-demo-schedule-view');
  const request=indexedDB.deleteDatabase('clinical-demo-reports');
  request.onsuccess=()=>location.href='index.html';
  request.onerror=()=>{button.disabled=false;button.textContent='重试重置预览'};
  request.onblocked=()=>{button.disabled=false;button.textContent='请关闭其他预览后重试'};
 };
 toolbar.append(button);document.body.append(toolbar);
})();
