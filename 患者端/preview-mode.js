// Share one preview preference across pages, tabs and restored history entries.
(()=>{
 const key='clinical-demo-project-mode';
 const requested=new URLSearchParams(location.search).get('projectMode');
 const stored=localStorage.getItem(key)||sessionStorage.getItem(key);
 const mode=['single','multi'].includes(requested)?requested:stored==='single'?'single':'multi';
 localStorage.setItem(key,mode);sessionStorage.setItem(key,mode);
 window.singleProjectPreview=mode==='single';
 document.documentElement.dataset.projectMode=mode;
 // Carry the preference in navigation URLs as well, including newly opened tabs.
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!link)return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||!url.pathname.endsWith('.html')||link.hasAttribute('download'))return;
  url.searchParams.set('projectMode',localStorage.getItem(key)||mode);
  link.href=url.href;
 },true);
 // A restored page may have been rendered before a mode change in another page.
 const sync=()=>{
  const current=localStorage.getItem(key)||mode;
  if(current!==mode){const url=new URL(location.href);url.searchParams.set('projectMode',current);location.replace(url.href);}
 };
 addEventListener('pageshow',sync);addEventListener('storage',event=>{if(event.key===key)sync()});
})();

// All task actions share one explicit entry/return contract.
window.taskReturnPage=function(value){
 let url;try{url=new URL(value||'clinical.html',location.href)}catch{return 'clinical.html'}
 const page=url.pathname.split('/').pop();
 if(url.origin!==location.origin||!['clinical.html','all-tasks.html','visits.html'].includes(page))return 'clinical.html';
 const params=new URLSearchParams();
 if(page!=='clinical.html'&&/^p[12]$/.test(url.searchParams.get('project')))params.set('project',url.searchParams.get('project'));
 const mode=url.searchParams.get('projectMode')||(window.singleProjectPreview?'single':'multi');
 if(['single','multi'].includes(mode))params.set('projectMode',mode);
 return page+(params.size?'?'+params.toString():'');
};
window.taskOrigin=function(){
 const query=new URLSearchParams(location.search),origin=query.get('origin');
 if(['all-tasks','clinical','visits'].includes(origin)){
  const url=new URL(origin+'.html',location.href);
  for(const key of ['project','projectMode'])if(query.has(key))url.searchParams.set(key,query.get(key));
  return window.taskReturnPage(url.href);
 }
 return window.taskReturnPage(query.get('from')||document.referrer||'clinical.html');
};
window.taskFlowURL=function(page,params,source){
 const target=new URL(page,location.href),back=new URL(window.taskReturnPage(source),location.href);
 for(const [key,value] of Object.entries(params))target.searchParams.set(key,value);
 target.searchParams.set('from',window.taskReturnPage(source));
 target.searchParams.set('origin',back.pathname.split('/').pop().replace('.html',''));
 for(const key of ['project','projectMode'])if(back.searchParams.has(key))target.searchParams.set(key,back.searchParams.get(key));
 // A new navigation revision prevents older cached task pages from mixing return rules.
 target.searchParams.set('flow','2');
 return target.href;
};
