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
