(()=>{
const panel=document.querySelector('main.page>.panel'),tabs=panel.querySelector('.tabs'),original=[...tabs.querySelectorAll('.tab')],tab=document.createElement('button');tab.className='tab';tab.id='visit-one-tab';tab.textContent='源数据';tab.type='button';(original.find(t=>t.textContent.trim()==='访视管理')||original[original.length-1]).after(tab);
const view=document.createElement('section');view.id='visit-one-workspace';view.className='visit-one';view.hidden=true;view.setAttribute('aria-label','源数据');panel.append(view);
const a='figma-clinical-assets/',names=['筛选期','第1周期第1天（C1D1）','第1周期第15天（C1D15）','第2周期第1天（C2D1）','第2周期第15天（C2D15）','第3周期第1天（C3D1）','第3周期第15天（C3D15）','第4周期第1天（C4D1）'];
const records=Array.from({length:9},(_,i)=>({id:i,cycle:0,type:[4,6].includes(i)?'表单':'文件',linked:[0,2,6].includes(i),method:i===8?'关联已有数据':[1,3,7].includes(i)?'直接上传':'访视任务采集',url:a+'v1-report.png',thumb:a+'v1-thumb.png',name:[4,6].includes(i)?'不良反应问卷':'访视资料 '+(i+1),history:[],questions:[{id:"symptoms",title:"是否出现不适症状？",options:["是","否"],answer:"否",history:[]}]}));
const plans=[{id:'labs',name:'筛选期检验资料收集'},{id:'survey',name:'不良反应问卷采集'}];records.forEach(r=>r.planId=r.method==='访视任务采集'?(r.type==='表单'?'survey':'labs'):null);
let active=2,expanded='all',zoom=1,angle=0;
const filters={linked:'',type:'',method:'',plan:'',query:''};
const scopeMemory=new Map();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function matches(r){return (!filters.linked||(filters.linked==='已关联')===r.linked)&&(!filters.type||r.type===filters.type)&&(!filters.method||r.method===filters.method)&&(!filters.plan||r.planId===filters.plan)&&(!filters.query||r.name.toLowerCase().includes(filters.query));}
function visible(){return records.filter(r=>matches(r)&&(expanded==='all'||r.cycle===expanded));}
function cycleName(cycle){return names[cycle]||'未关联访视';}
function format(r){return r.type==='表单'?'表单':r.pdf?'PDF':r.name.match(/\.([a-z0-9]+)$/i)?.[1].toUpperCase()||'PNG';}
function submitted(r){return r.submittedAt||'2025-11-10 17:08:13';}
view.innerHTML=`
  <div class="v1-toolbar">
    <button class="v1-nav-toggle" type="button" data-toggle-visits aria-label="收起访视导航" aria-expanded="true" aria-controls="v1-visit-navigation">☰</button>
    <input class="v1-search" type="search" data-source-search placeholder="搜索文件名称" aria-label="搜索文件名称">
    <div class="v1-filters">${[['type','全部类型',['文件','表单']],['linked','全部关联情况',['已关联','未关联']],['method','全部采集方式',['访视任务采集','直接上传','关联已有数据']]].map(([key,label,opts])=>`<select data-filter="${key}" aria-label="${label}"><option value="">${label}</option>${opts.map(o=>`<option>${o}</option>`).join('')}</select>`).join('')}</div>
    <button type="button" data-source-reset>重置</button>
  </div>
  <aside class="v1-sidebar" id="v1-visit-navigation" aria-label="源数据访视导航"><h3>访视</h3><nav class="v1-cycles" aria-label="按访视查看源数据"></nav></aside>
  <section class="v1-files" aria-label="文件缩略图"><header class="v1-files-heading"><span data-file-scope></span><span data-file-count aria-live="polite"></span></header><div class="v1-file-list" role="listbox" aria-label="源数据文件" tabindex="0"></div></section>
  <section class="v1-stage" aria-label="源数据预览"></section>`;
const fileList=view.querySelector('.v1-file-list');
function render(){
  const rows=visible();
  if(!rows.some(r=>r.id===active)){active=rows[0]?.id??null;zoom=1;angle=0;}
  const scopes=[['all','全部源数据'],...names.map((name,i)=>[i,name]),[-1,'未关联访视']];
  view.querySelector('.v1-cycles').innerHTML=scopes.map(([key,name])=>`<button type="button" class="v1-cycle-title" data-cycle="${key}" aria-current="${expanded===key?'true':'false'}" title="${esc(name)}"><span>${esc(name)}</span><span class="v1-cycle-count">${records.filter(r=>matches(r)&&(key==='all'||r.cycle===key)).length}</span></button>`).join('');
  view.querySelector('[data-file-scope]').textContent=expanded==='all'?'全部源数据':cycleName(expanded);
  view.querySelector('[data-file-count]').textContent=`${rows.length} 份`;
  const scroll=fileList.scrollTop;
  fileList.innerHTML=rows.length?rows.map(r=>`<button type="button" role="option" class="v1-card ${r.type==='表单'?'form':''}" data-record="${r.id}" aria-selected="${r.id===active}" tabindex="${r.id===active?'0':'-1'}" aria-label="${esc(r.name)}，${format(r)}，${r.linked?'已关联CRF':'未关联CRF'}"><span class="v1-thumbnail">${r.pdf?'<span class="v1-pdf-thumbnail">PDF</span>':`<img src="${esc(r.type==='表单'?a+'v1-form.svg':r.thumb)}" alt="" loading="lazy">`}</span><span class="v1-file-copy"><span class="v1-file-name" title="${esc(r.name)}">${esc(r.name)}</span><span class="v1-file-meta">${esc(r.method)}${r.linked?' · 已关联CRF':''}</span><time>${esc(submitted(r).slice(0,16))}</time>${expanded==='all'?`<span class="v1-file-visit">${esc(cycleName(r.cycle))}</span>`:''}</span></button>`).join(''):`<div class="v1-empty"><span>${Object.values(filters).some(Boolean)?'暂无匹配资料':'当前访视暂无资料'}</span>${Object.values(filters).some(Boolean)?'<button type="button" data-source-reset>重置筛选</button>':''}</div>`;
  fileList.scrollTop=scroll;
  renderDetail();
}
function renderDetail(){
  const rows=visible(),r=rows.find(r=>r.id===active),stage=view.querySelector('.v1-stage');
  if(!r){stage.innerHTML='<div class="v1-empty v1-preview-empty">暂无可预览资料</div>';return;}
  const index=rows.indexOf(r);
  const tool=(name,label,icon,disabled=false)=>`<button type="button" data-tool="${name}" aria-label="${label}" title="${label}" ${disabled?'disabled':''}>${icon?`<img src="${a+icon}" alt="">`:label}</button>`;
  stage.innerHTML=`<header class="v1-head"><div class="v1-file-heading"><h3 title="${esc(r.name)}">${esc(r.name)}</h3><div class="v1-source">${esc(cycleName(r.cycle))} · ${esc(submitted(r))}<span>来源：${esc(r.method==='访视任务采集'?r.method+' · '+(plans.find(p=>p.id===r.planId)?.name||'访视任务'):r.method)}</span></div></div><div class="v1-actions">${r.type==='文件'?`<a href="${esc(r.url)}" download="${esc(/\.[a-z0-9]+$/i.test(r.name)?r.name:r.name+'.'+format(r).toLowerCase())}">下载</a><button type="button" data-act="replace">更换</button><button type="button" data-act="audit">轨迹</button>`:''}</div><div class="v1-linked">${r.linked?'已关联CRF：<button class="v1-crf-link" data-crf-link="血常规">血常规</button> <button class="v1-crf-link" data-crf-link="生命体征">生命体征</button>':'未关联CRF'}</div></header>
  <div class="v1-preview">${r.type==='表单'?questionView(r):r.pdf?`<object data="${esc(r.url)}" type="application/pdf" aria-label="${esc(r.name)}"><p>如无法预览，<a href="${esc(r.url)}" target="_blank" rel="noopener">打开 PDF</a> 或下载文件查看</p></object>`:`<div class="v1-image-canvas"><img src="${esc(r.url)}" alt="${esc(r.name)}" style="transform:rotate(${angle}deg) scale(${zoom})" draggable="false"></div>`}</div>
  <div class="v1-tools" role="toolbar" aria-label="源数据预览工具">${tool('prev','上一个文件','v1-arrow.svg',index===0)}<span class="v1-file-position">${index+1} / ${rows.length}</span>${tool('next','下一个文件','v1-arrow.svg',index===rows.length-1)}${r.type==='文件'&&!r.pdf?`<span class="v1-tool-divider"></span>${tool('left','向左旋转','v1-rotate.svg')}${tool('right','向右旋转','v1-rotate.svg')}${tool('out','缩小','v1-out.svg',zoom<=.4)}<span class="v1-zoom-value">${Math.round(zoom*100)}%</span>${tool('in','放大','v1-in.svg',zoom>=3)}${tool('reset','适应窗口')}`:''}${tool('fullscreen',stage.classList.contains('is-expanded')?'退出放大':'放大查看')}</div>`;
}
function choose(id,reveal=false){
  active=id;zoom=1;angle=0;
  fileList.querySelectorAll('[data-record]').forEach(button=>{const selected=Number(button.dataset.record)===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  if(reveal){const button=fileList.querySelector(`[data-record="${id}"]`);if(button){if(button.offsetTop<fileList.scrollTop)fileList.scrollTop=button.offsetTop;else if(button.offsetTop+button.offsetHeight>fileList.scrollTop+fileList.clientHeight)fileList.scrollTop=button.offsetTop+button.offsetHeight-fileList.clientHeight;}}
  scopeMemory.set(expanded,{active,scroll:fileList.scrollTop});renderDetail();
}
function selectScope(scope){
  scopeMemory.set(expanded,{active,scroll:fileList.scrollTop});expanded=scope;
  const remembered=scopeMemory.get(scope);active=remembered?.active??visible()[0]?.id??null;zoom=1;angle=0;
  render();fileList.scrollTop=remembered?.scroll||0;
}
function resetFilters(){Object.keys(filters).forEach(key=>filters[key]='');view.querySelectorAll('[data-filter]').forEach(input=>input.value='');view.querySelector('[data-source-search]').value='';render();}
view.addEventListener('change',e=>{if(!e.target.dataset.filter)return;filters[e.target.dataset.filter]=e.target.value;if(e.target.dataset.filter==='method')filters.plan='';render();});
view.querySelector('[data-source-search]').addEventListener('input',e=>{filters.query=e.target.value.trim().toLowerCase();render();});
fileList.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const rows=visible(),i=rows.findIndex(r=>r.id===active),index=e.key==='Home'?0:e.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(e.key==='ArrowDown'?1:-1)));if(rows[index]){choose(rows[index].id,true);fileList.querySelector('[aria-selected=true]')?.focus({preventScroll:true});}});
view.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-source-reset')){resetFilters();return;}
  if(b.hasAttribute('data-toggle-visits')){const collapsed=view.classList.toggle('v1-nav-collapsed');b.setAttribute('aria-expanded',String(!collapsed));b.setAttribute('aria-label',collapsed?'展开访视导航':'收起访视导航');return;}
  if(b.dataset.crfLink){const r=records.find(r=>r.id===active);window.openLinkedCrf(r.cycle,b.dataset.crfLink);return;}
  if(b.dataset.record!==undefined){choose(+b.dataset.record);return;}
  if(b.dataset.cycle!==undefined){selectScope(b.dataset.cycle==='all'?'all':Number(b.dataset.cycle));return;}
  const t=b.dataset.tool;
  if(t==='prev'||t==='next'){const rows=visible(),i=rows.findIndex(r=>r.id===active),next=rows[i+(t==='next'?1:-1)];if(next)choose(next.id,true);return;}
  if(t==='left')angle-=90;if(t==='right')angle+=90;if(t==='in')zoom=Math.min(3,zoom+.2);if(t==='out')zoom=Math.max(.4,zoom-.2);if(t==='reset'){zoom=1;angle=0;}
  if(t==='fullscreen')view.querySelector('.v1-stage').classList.toggle('is-expanded');
  if(t)renderDetail();
  if(b.dataset.questionEdit)editQuestion(b.dataset.questionEdit);if(b.dataset.questionAudit)showQuestionAudit(b.dataset.questionAudit);
  if(b.dataset.act==='audit')showAudit();if(b.dataset.act==='replace')showReplace();
});
document.addEventListener('keydown',e=>{const stage=view.querySelector('.v1-stage.is-expanded');if(e.key==='Escape'&&stage&&!document.querySelector('dialog[open]')){stage.classList.remove('is-expanded');renderDetail();}});
const audit=document.createElement('dialog');audit.className='v1-audit';document.body.append(audit);function versionSnapshot(r,i,side){const h=r.history[i];if(side==='old')return {url:h.oldUrl,pdf:h.oldPdf};return {url:h.newUrl||(i?r.history[i-1].oldUrl:r.url),pdf:h.newPdf??(i?r.history[i-1].oldPdf:r.pdf)};}
function versionThumbnail(r,i,side){const v=versionSnapshot(r,i,side),label=side==='old'?'修改前':'修改后';return `<button class="v1-old-thumbnail" data-version="${i}" data-side="${side}" aria-label="查看${label}大图">${v.pdf?'<span class="v1-old-pdf">PDF</span>':`<img src="${esc(v.url)}" alt="${label}">`}</button>`;}
let auditRecord=null;
function showAudit(record){const r=record||records.find(r=>r.id===active);if(!r)return;auditRecord=r;audit.innerHTML='<header class="v1-audit-head"><h3>稽查轨迹</h3><button data-audit-close aria-label="关闭">×</button></header><ol class="v1-audit-timeline v1-file-timeline">'+r.history.map((h,i)=>`<li><div class="v1-audit-time">${esc(h.time)}</div><b>更换文件</b><div>修改人：${esc(h.actor||'个案姓名')}</div><div class="v1-version-comparison"><div class="v1-version-row"><span>修改前：</span>${versionThumbnail(r,i,'old')}</div><div class="v1-version-row"><span>修改后：</span>${versionThumbnail(r,i,'new')}</div></div><div class="v1-change-reason">变更原因：${esc(h.reason)}</div></li>`).join('')+'<li><div class="v1-audit-time">'+esc(r.submittedAt||'2025-11-10 17:08:13')+'</div><b>原始提交</b><div>提交人：个案姓名</div></li></ol>';audit.querySelector('[data-audit-close]').onclick=()=>audit.close();audit.showModal();}


window.showClinicalFileAudit=showAudit;

const oldPreview=document.createElement('dialog');oldPreview.className='v1-old-preview';oldPreview.setAttribute('aria-label','旧版文件预览');document.body.append(oldPreview);
let previewScale=1,previewAngle=0,previewFlipX=1,previewFlipY=1,previewX=0,previewY=0;
function updateVersionPreview(){const img=oldPreview.querySelector('.v1-lightbox-image');if(img)img.style.transform=`translate(${previewX}px,${previewY}px) rotate(${previewAngle}deg) scale(${previewScale*previewFlipX},${previewScale*previewFlipY})`;const value=oldPreview.querySelector('[data-preview-scale]');if(value)value.textContent=Math.round(previewScale*100)+'%';}
function resetVersionPreview(){previewScale=1;previewAngle=0;previewFlipX=previewFlipY=1;previewX=previewY=0;updateVersionPreview();}
audit.addEventListener('click',e=>{const button=e.target.closest('[data-version]');if(!button)return;const r=auditRecord,i=Number(button.dataset.version);if(!r?.history[i])return;const v=versionSnapshot(r,i,button.dataset.side),label=button.dataset.side==='old'?'修改前':'修改后';if(!v.url)return;oldPreview.setAttribute('aria-label',label+'预览');oldPreview.innerHTML=`<span class="v1-lightbox-label">${label}</span><button class="v1-lightbox-close" data-preview-action="close" aria-label="关闭预览">×</button><div class="v1-lightbox-stage">${v.pdf?`<object data="${esc(v.url)}" type="application/pdf"><a href="${esc(v.url)}" target="_blank">打开 PDF</a></object>`:`<img class="v1-lightbox-image" src="${esc(v.url)}" alt="${label}" draggable="false">`}</div>${v.pdf?'':`<div class="v1-lightbox-tools" role="toolbar" aria-label="图片预览工具">${[['out','缩小','−'],['in','放大','＋'],['left','向左旋转','↶'],['right','向右旋转','↷'],['flipX','水平翻转','↔'],['flipY','垂直翻转','↕'],['reset','重置','重置']].map(([action,title,icon])=>`<button data-preview-action="${action}" aria-label="${title}" title="${title}">${icon}</button>`).join('')}<span data-preview-scale>100%</span></div>`}`;resetVersionPreview();oldPreview.showModal();});
oldPreview.addEventListener('click',e=>{const action=e.target.closest('[data-preview-action]')?.dataset.previewAction;if(action==='close'||e.target.classList.contains('v1-lightbox-stage')){oldPreview.close();return;}if(action==='in')previewScale=Math.min(5,previewScale+.2);if(action==='out')previewScale=Math.max(.2,previewScale-.2);if(action==='left')previewAngle-=90;if(action==='right')previewAngle+=90;if(action==='flipX')previewFlipX*=-1;if(action==='flipY')previewFlipY*=-1;if(action==='reset')resetVersionPreview();updateVersionPreview();});
oldPreview.addEventListener('wheel',e=>{if(!oldPreview.querySelector('.v1-lightbox-image'))return;e.preventDefault();previewScale=Math.max(.2,Math.min(5,previewScale+(e.deltaY<0?.1:-.1)));updateVersionPreview();},{passive:false});
let previewDrag=null;
oldPreview.addEventListener('pointerdown',e=>{if(!e.target.classList.contains('v1-lightbox-image'))return;previewDrag={x:e.clientX,y:e.clientY,baseX:previewX,baseY:previewY};e.target.setPointerCapture(e.pointerId);e.preventDefault();});
oldPreview.addEventListener('pointermove',e=>{if(!previewDrag)return;previewX=previewDrag.baseX+e.clientX-previewDrag.x;previewY=previewDrag.baseY+e.clientY-previewDrag.y;updateVersionPreview();});
oldPreview.addEventListener('pointerup',()=>previewDrag=null);oldPreview.addEventListener('pointercancel',()=>previewDrag=null);oldPreview.addEventListener('close',()=>previewDrag=null);

function questionView(r){return `<div class="v1-form-view"><h3>${esc(r.name)}</h3><p>提交时间：2025-11-10 17:08:13</p>${r.questions.map(q=>`<section class="v1-question"><header><h3>${esc(q.title)}</h3><div><button data-question-edit="${q.id}">编辑</button><button data-question-audit="${q.id}">轨迹${q.history.length?'（'+q.history.length+'）':''}</button></div></header>${q.options.map(o=>`<label><input type="radio" disabled ${q.answer===o?'checked':''}> ${esc(o)}</label>`).join('')}</section>`).join('')}</div>`;}
function auditEntry(h,title){return `<article><b>${esc(title)}</b><div>${esc(h.time)}　操作人：${esc(h.actor)}</div><div>修改前：${esc(h.from)}</div><div>修改后：${esc(h.to)}</div><div>变更原因：${esc(h.reason)}</div></article>`;}
function showQuestionAudit(id){const q=records.find(r=>r.id===active)?.questions.find(q=>q.id===id);if(!q)return;const initial=q.history.length?q.history[q.history.length-1].from:q.answer;audit.innerHTML='<header class="v1-audit-head"><h3>稽查轨迹</h3><button data-audit-close aria-label="关闭">×</button></header><p>'+esc(q.title)+'</p><ol class="v1-audit-timeline">'+q.history.map(h=>`<li><div class="v1-audit-time">${esc(h.time)}</div><b>修改答案</b><div>修改人：${esc(h.actor)}</div><div>修改前：${esc(h.from)}</div><div>修改后：${esc(h.to)}</div><div>变更原因：${esc(h.reason)}</div></li>`).join('')+'<li><div class="v1-audit-time">2025-11-10 17:08:13</div><b>原始提交</b><div>答案：'+esc(initial)+'</div><div>提交人：个案姓名</div></li></ol>';audit.querySelector('[data-audit-close]').onclick=()=>audit.close();audit.showModal();}
const questionDialog=document.createElement('dialog');questionDialog.className='entry-replacement v1-question-dialog';questionDialog.setAttribute('aria-label','编辑题目');document.body.append(questionDialog);
function editQuestion(id){const r=records.find(r=>r.id===active),q=r?.questions.find(q=>q.id===id);if(!q)return;questionDialog.innerHTML=`<form><header><h3>编辑题目</h3><button type="button" data-close aria-label="关闭">×</button></header><div class="entry-replace-body"><h4>${esc(q.title)}</h4><div class="v1-edit-options">${q.options.map(o=>`<label><input type="radio" name="question-answer" value="${esc(o)}" ${o===q.answer?'checked':''} required> ${esc(o)}</label>`).join('')}</div><label class="entry-replace-label" for="v1-question-reason">变更原因 <em>*</em></label><textarea id="v1-question-reason" maxlength="500" placeholder="请输入变更原因" required></textarea><div class="entry-replace-error" role="alert"></div></div><footer><button type="button" data-close>取消</button><button type="submit" class="primary">保存</button></footer></form>`;questionDialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>questionDialog.close());questionDialog.querySelector('form').onsubmit=e=>{e.preventDefault();const answer=questionDialog.querySelector('input:checked')?.value,reason=questionDialog.querySelector('textarea').value.trim(),error=questionDialog.querySelector('.entry-replace-error');if(!answer||!reason){error.textContent='请选择答案并填写变更原因';return;}if(answer===q.answer){error.textContent='答案未发生变化';return;}q.history.unshift({from:q.answer,to:answer,reason,actor:'个案姓名',time:new Date().toLocaleString('zh-CN'),at:Date.now()});q.answer=answer;questionDialog.close();renderDetail();};questionDialog.showModal();}

const modal=document.getElementById('entry-file-replacement').cloneNode(true);modal.id='v1-file-replacement';modal.querySelector('h3').textContent='更换文件';modal.querySelector('h3').id='v1-replace-title';modal.setAttribute('aria-labelledby','v1-replace-title');modal.querySelector('textarea').id='v1-reason';modal.querySelector('label[for]').htmlFor='v1-reason';document.body.append(modal);let nextFile=null,targetId=null;const input=modal.querySelector('input'),reason=modal.querySelector('textarea'),error=modal.querySelector('.entry-replace-error');function showReplace(){targetId=active;nextFile=null;input.value='';reason.value='';error.textContent='';modal.querySelector('.entry-replace-file').textContent='';modal.showModal();}function receive(files){nextFile=null;modal.querySelector('.entry-replace-file').textContent='';if(files.length!==1){error.textContent='请选择一个文件';return;}const f=files[0];if(!/\.(png|jpe?g|pdf)$/i.test(f.name)||f.size>=5*1024*1024){error.textContent='支持 JPG、PNG、PDF，单个文件须小于 5MB';return;}nextFile=f;error.textContent='';modal.querySelector('.entry-replace-file').textContent=f.name;}
input.onchange=()=>receive(input.files);const drop=modal.querySelector('.entry-replace-drop');drop.onclick=()=>input.click();drop.ondragover=e=>e.preventDefault();drop.ondrop=e=>{e.preventDefault();receive(e.dataTransfer.files);};modal.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>modal.close());modal.querySelector('form').onsubmit=e=>{e.preventDefault();if(!nextFile||!reason.value.trim()){error.textContent='请上传文件并填写变更原因';return;}const r=records.find(r=>r.id===targetId),newUrl=URL.createObjectURL(nextFile),newPdf=/\.pdf$/i.test(nextFile.name);r.history.unshift({actor:'个案姓名',newUrl,newPdf,time:new Date().toLocaleString('zh-CN'),from:r.name,to:nextFile.name,reason:reason.value.trim(),oldUrl:r.url,oldPdf:Boolean(r.pdf)});r.name=nextFile.name;r.url=newUrl;r.pdf=newPdf;r.thumb=r.pdf?a+'v1-thumb.png':r.url;modal.close();render();if(visible().some(item=>item.id===r.id))choose(r.id);};
const sourceParams=new URLSearchParams(location.search),linkedPlan=sourceParams.get('sourcePlan'),linkedRecord=sourceParams.get('sourceRecord');
if(plans.some(plan=>plan.id===linkedPlan))filters.plan=linkedPlan;
const linkedRecordItem=linkedRecord===null?null:records.find(record=>record.id===Number(linkedRecord));
if(linkedRecordItem&&(!filters.plan||linkedRecordItem.planId===filters.plan)){active=linkedRecordItem.id;expanded=linkedRecordItem.cycle;}else{const firstLinked=visible()[0];if(firstLinked)active=firstLinked.id;}
original.forEach(t=>t.addEventListener('click',()=>{view.hidden=true;tab.classList.remove('active');tab.setAttribute('aria-selected','false');}));tab.addEventListener('click',()=>{original.forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false');});for(const s of panel.children)if(s!==tabs)s.hidden=s!==view;tab.classList.add('active');tab.setAttribute('aria-selected','true');render();});render();if(['visit-data-1','source-data'].includes(sourceParams.get('tab')))tab.click();
})();
