/* Shared project scope is applied before individual modules initialize. */
(() => {
 const key='journey-v3-shared-scope',url=new URL(location.href),page=url.pathname.split('/').pop()||'index.html';
 if(url.searchParams.has('planEmbed'))return;
 const modules=['index.html','participants.html','templates.html'];
 let saved={};try{saved=JSON.parse(sessionStorage.getItem(key))||{};}catch{}
 const explicitProjectChange=modules.includes(page)&&url.searchParams.has('project')&&url.searchParams.get('project')!==(saved.project||'');
 if(modules.includes(page)){
  if(!url.searchParams.has('project')&&saved.project)url.searchParams.set('project',saved.project);
  if(!url.searchParams.has('hospital')&&!explicitProjectChange&&saved.center)url.searchParams.set('hospital',saved.center);
  history.replaceState(null,'',url);
 }
 window.sharedResearchScope={key,project:page==='participant.html'?(saved.project||''):(url.searchParams.get('project')||''),center:url.searchParams.has('hospital')?url.searchParams.get('hospital'):(explicitProjectChange?'':saved.center||'')};
})();
