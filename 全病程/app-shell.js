(() => {
 const params=new URLSearchParams(location.search); if(params.has('planEmbed'))return;
 document.documentElement.dataset.clinicalModule='research';
 document.documentElement.dataset.projectScope=params.get('project')?'single':'all';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const projects={'CT-2026-001':'HER2 阳性晚期乳腺癌真实世界研究','HX-LC-II-06':'非小细胞肺癌 II 期研究','HX-BC-III-02':'乳腺癌 III 期临床研究','HX-GI-III-01':'消化道肿瘤 III 期研究'};
 const page=location.pathname.split('/').pop()||'index.html', workbench=page==='index.html';
 if(workbench)document.documentElement.dataset.workbenchStyle='figma';
 const project=params.get('project')||'';
 const view=params.get('view')==='visits'?'visits':'participants';
 const route=(file,extra={})=>file+'?'+new URLSearchParams({...extra,...(project?{project}:{}),...(params.get('from')==='workbench'?{from:'workbench'}:{})});
 function init(){
  const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${name==='work'?'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>':name==='project'?'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/><path d="M3 11h18"/>':'<path d="m14 7-5 5 5 5"/><path d="M4 4v16"/>'}</svg>`;
  const shell=document.createElement('aside');shell.className='app-rail';shell.id='research-navigation';
  shell.innerHTML=`<a class="rail-brand" href="index.html" aria-label="临床研究平台"><img src="figma-clinical-assets/sidebar-logo.png" alt=""><strong>全病程<span>临床研究管理平台</span></strong></a><nav aria-label="主导航" class="rail-navigation"><a href="index.html" title="工作台" ${workbench?'aria-current="page"':''}>${icon('work')}<span>工作台</span></a><a href="participants.html?view=participants" title="参与者管理" ${!workbench?'aria-current="page"':''}>${icon('project')}<span>参与者管理</span></a></nav><div class="rail-bottom"><a class="rail-return" href="#" aria-label="返回全病程" title="返回全病程"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5H5v14h5M14 8l-4 4 4 4M10 12h11"/></svg><span>返回全病程</span></a><button class="rail-toggle" type="button" aria-controls="research-navigation" aria-expanded="true" aria-label="收起导航" title="收起导航">${icon('collapse')}</button></div>`;
  {
   shell.querySelector('.rail-brand>img').src='figma-workbench-assets/brand.png';
   shell.querySelector('.rail-brand strong').textContent='临床研究平台';
   [['.rail-navigation>a[title="工作台"]','work'],['.rail-navigation>a[title="参与者管理"]','project'],['.rail-return','return'],['.rail-toggle','collapse']].forEach(([selector,name])=>{
    const old=shell.querySelector(selector+' svg');const img=document.createElement('img');const target=shell.querySelector(selector);const state=(name==='work'||name==='project')?(target.hasAttribute('aria-current')?'-active':'-inactive'):'';img.src='figma-workbench-assets/'+name+state+'.svg';img.alt='';img.className='rail-design-icon';if(old)old.replaceWith(img);
   });
  }
  document.body.prepend(shell);
  const returnEntry=shell.querySelector('.rail-return');
  const businessPages=new Set(['index.html','projects.html','participants.html','participant.html','templates.html']);
  const validReturn=value=>{try{const url=new URL(value,location.href);if(!['http:','https:'].includes(url.protocol))return '';if(url.origin===location.origin&&url.pathname.slice(0,url.pathname.lastIndexOf('/')+1)===location.pathname.slice(0,location.pathname.lastIndexOf('/')+1)&&(businessPages.has(url.pathname.split('/').pop())||url.pathname.endsWith('/')))return '';return url.href;}catch{return '';}};
  let returnUrl=validReturn(params.get('returnUrl')||'');
  if(!returnUrl)returnUrl=validReturn(document.referrer||'');
  try{if(returnUrl)sessionStorage.setItem('journey-v2-care-return',returnUrl);else returnUrl=validReturn(sessionStorage.getItem('journey-v2-care-return')||'');}catch{}
  if(returnUrl)returnEntry.href=returnUrl;
  else returnEntry.addEventListener('click',event=>{event.preventDefault();window.dispatchEvent(new CustomEvent('care:return-request'));let notice=document.querySelector('.rail-return-notice');if(!notice){notice=document.createElement('div');notice.className='rail-return-notice';notice.setAttribute('role','status');document.body.append(notice);}notice.textContent='当前为独立演示；从全病程平台进入后，可返回来源平台。';notice.hidden=false;clearTimeout(notice.dismissTimer);notice.dismissTimer=setTimeout(()=>{notice.hidden=true;},3500);});
  const toggle=shell.querySelector('.rail-toggle');
  const toggleLabel=document.createElement('span');toggleLabel.className='rail-toggle-label';toggleLabel.textContent='收起导航';toggle.append(toggleLabel);
  const collapse=value=>{document.documentElement.dataset.railCollapsed=String(value);toggle.setAttribute('aria-expanded',String(!value));toggle.setAttribute('aria-label',value?'展开导航':'收起导航');toggle.title=value?'展开导航':'收起导航';};
  try{collapse(localStorage.getItem('journey-v2-rail-collapsed')==='true');}catch{collapse(false);}
  toggle.addEventListener('click',()=>{const next=document.documentElement.dataset.railCollapsed!=='true';collapse(next);try{localStorage.setItem('journey-v2-rail-collapsed',String(next));}catch{}});
  const main=document.querySelector('main.page');if(!main)return;
  const context=document.createElement('section');context.className='page-context';
  let title=workbench?'工作台':page==='templates.html'?'任务模板':page==='participant.html'?'参与者研究档案':view==='visits'?'访视管理':'参与者';
  let desc=workbench?'汇集各项目待办与近期访视，按优先级推进今日工作。':page==='templates.html'?'查看当前项目的模板版本、采集要求及执行规则。':page==='participant.html'?'研究数据、采集任务与完整访视历程。':view==='visits'?'查看当前项目的全部访视、到访安排及历史记录。':'查看入组进展，进入参与者档案处理任务与研究数据。';
  const projectModule=page==='participants.html'||page==='templates.html';
  const heading=projectModule?projects[project]:title;
  if(projectModule)context.classList.add('is-project-heading');
  context.innerHTML=`<div class="eyebrow">${workbench?'RESEARCH WORKSPACE':`<a href="participants.html?view=participants">参与者管理</a><span> / </span>${escape(project||'全部项目')}`}</div><div class="context-row"><div><h1>${escape(heading)}</h1>${projectModule?'':`<p>${desc}</p>`}</div>${workbench?'<div class="date-block"><span>演示工作日</span><strong>2026.10.29</strong><small>星期四</small></div>':`<label class="project-switch">切换项目<select aria-label="切换研究项目">${Object.entries(projects).map(([id,name])=>`<option value="${id}" ${id===project?'selected':''}>${escape(name)}</option>`).join('')}</select></label>`}</div>`;
  if(projectModule){
   const oldSwitch=context.querySelector('.project-switch'),select=oldSwitch.querySelector('select'),headingEl=context.querySelector('h1');
   const titleSwitch=document.createElement('div');titleSwitch.className='project-switch project-title-switch';
   const switchControl=document.createElement('div');switchControl.className='project-title-control';
   const switchText=document.createElement('span');switchText.textContent='切换';switchControl.append(switchText,select);
   headingEl.before(titleSwitch);titleSwitch.append(headingEl,switchControl);oldSwitch.remove();
  }
  main.prepend(context);
  const topbar=document.createElement('header');topbar.className='research-topbar';
  const locationTrail=workbench?`<span aria-current="page">${escape(title)}</span>`:`<a href="participants.html?view=participants">参与者管理</a><span class="location-separator" aria-hidden="true">›</span>${page==='participant.html'?`<a href="${route('participants.html',{view:'participants'})}">参与者管理</a><span class="location-separator" aria-hidden="true">›</span><span aria-current="page">参与者详情</span>`:`<span aria-current="page">${escape(title)}</span>`}`;
  topbar.innerHTML=`<nav class="research-location" aria-label="当前位置"><img src="figma-workbench-assets/topbar-home.svg" alt=""><span>当前位置：</span>${locationTrail}</nav>`;
  returnEntry.className='research-topbar-return';returnEntry.innerHTML='<img src="figma-workbench-assets/topbar-return.svg" alt=""><span>返回全病程</span>';
  topbar.append(returnEntry);context.before(topbar);

  if(workbench){const toolbar=main.querySelector('.wb1-toolbar');context.querySelector('.date-block')?.remove();if(toolbar)context.querySelector('.context-row').append(toolbar);}
  if(params.get('from')==='workbench'){const back=document.createElement('a');back.className='workbench-return';back.href='index.html?restore=1';back.textContent='‹ 返回工作台';context.prepend(back);}
  context.querySelector('.project-switch select')?.addEventListener('change',e=>{const u=new URL(location.href);e.target.value?u.searchParams.set('project',e.target.value):u.searchParams.delete('project');if(page==='participant.html')u.pathname=u.pathname.replace('participant.html','participants.html');location.href=u;});
  if(projectModule){
   const nav=document.createElement('nav');nav.className='project-module-tabs';nav.setAttribute('aria-label','项目业务导航');
   nav.innerHTML=`<a href="${route('participants.html',{view:'participants'})}" ${(page==='participants.html'&&view==='participants')||page==='participant.html'?'aria-current="page"':''}>参与者</a><a href="${route('participants.html',{view:'visits'})}" ${page==='participants.html'&&view==='visits'?'aria-current="page"':''}>访视管理</a><a href="${route('templates.html')}" ${page==='templates.html'?'aria-current="page"':''}>任务模板</a>`;
   context.after(nav);
   if(projectModule){
    const surface=document.createElement('section');surface.className='project-content-surface';surface.setAttribute('aria-label','业务管理内容');
    const contents=[...main.children].filter(node=>node!==topbar&&node!==context);
    nav.before(surface);contents.forEach(node=>surface.append(node));
   }
  }
  if(page==='participant.html')context.remove();
  if(workbench){document.querySelector('.wb1-toolbar-title')?.remove();}
  document.title=title+' · 全病程';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
