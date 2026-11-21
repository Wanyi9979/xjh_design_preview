const taskGroupFolds=new Map();
const taskTabs=['全部','待处理','未开放','已完成','已结束','已取消'];
function taskState(t){
 if(t.status==='已完成')return '已完成';
 if(t.cancelled||t.status==='已取消')return '已取消';
 if(DEMO_NOW<new Date(t.start))return '尚未开放';
 if(DEMO_NOW>new Date(t.end)||t.status==='已过期')return t.allowLate?'已逾期（可补填）':'已逾期（不可补填）';
 return t.executionAllowed===false?'已取消':'已开放';
}
function canExecuteTask(t){return t.executionAllowed!==false&&['已开放','已逾期（可补填）'].includes(taskState(t))}
function taskBucket(t){const state=taskState(t);return state==='已取消'?'已取消':state==='已完成'?'已完成':state==='尚未开放'?'未开放':['已开放','已逾期（可补填）'].includes(state)?'待处理':'已结束'}
function taskTimeText(t){const state=taskState(t),stamp=value=>{const date=value.slice(5,10).split('-').map(Number);return `${date[0]}月${String(date[1]).padStart(2,'0')}日`+(t.timePrecision==='minute'?' '+value.slice(11,16):'')};
 if(state==='已完成')return (t.type==='上传文件'?'上传时间：':'填写时间：')+String(t.date||'').replaceAll('.','/').replace(/\s+/g,' ');
 if(state==='已取消')return state;
 if(state==='尚未开放')return stamp(t.start)+'开放';
 if(state.startsWith('已逾期'))return stamp(t.end)+'截止（已逾期）';
 const ms=new Date(t.end)-DEMO_NOW;
 if(t.timePrecision==='minute'&&ms<=2*3600000)return ms>=3600000?'距截止还有'+Math.ceil(ms/3600000)+'小时':'距截止还有'+Math.max(1,Math.ceil(ms/60000))+'分钟';
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(DEMO_NOW);
 return t.timePrecision==='minute'&&t.end.slice(0,10)===today?'今日'+t.end.slice(11,16)+'截止':stamp(t.end)+'截止';
}
function groupedTaskCard(t){return questionnaireCard(t).replace('assets/questionnaire.png','assets/all-task-questionnaire.png').replace('assets/file-task.png','assets/all-task-file.png').replace('questionnaire-card ', 'questionnaire-card original-status-card ')}
function renderAllTaskGroups(){
 const all=tasks.filter(t=>!projectFilter||t.project===projectFilter),rows=all.filter(t=>filter==='全部'||taskBucket(t)===filter);
 const filters=document.querySelector('.filters');if(filters.parentElement.id==='tasks')document.querySelector('.phone').append(filters);filters.hidden=false;filters.setAttribute('role','tablist');filters.innerHTML=taskTabs.map(tab=>`<button role="tab" aria-selected="${filter===tab}" class="${filter===tab?'chosen':''}" data-task-filter="${tab}">${tab}${tab==='待处理'?`<span>${all.filter(t=>taskBucket(t)===tab).length}</span>`:''}</button>`).join('');
 filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.taskFilter;renderAllTaskGroups();document.querySelector('.screen-scroll').scrollTop=0});
 const html=[...new Set(rows.map(t=>t.project))].map((project,index)=>{const pt=rows.filter(t=>t.project===project),key=filter+':'+project;const visits=[...new Set(pt.map(t=>t.visit))].sort((a,b)=>Math.min(...pt.filter(t=>t.visit===a).map(t=>t.visitOrder??99))-Math.min(...pt.filter(t=>t.visit===b).map(t=>t.visitOrder??99)));
 const visitsMarkup=`${visits.map(visit=>{const vt=pt.filter(t=>t.visit===visit);return `<section class="organized-visit"><div class="organized-visit-heading"><img class="visit-node-icon" src="assets/all-task-visit.svg" alt=""><div><h3>${esc(visit)}</h3></div></div><div class="visit-tasks"><span class="visit-task-timeline" aria-hidden="true"></span>${vt.sort((a,b)=>Number(canExecuteTask(b))-Number(canExecuteTask(a))||new Date(a.end)-new Date(b.end)).map(groupedTaskCard).join('')}</div></section>`}).join('')}`;
 if(window.singleProjectPreview)return `<section class="single-project-tasks">${visitsMarkup}</section>`;
 return `<details class="organized-project" data-fold="${key}" ${taskGroupFolds.get(key)!==false?'open':''}><summary><div><span class="project-eyebrow">研究项目 ${String(index+1).padStart(2,'0')}</span><h2>${esc(pt[0].projectName)}</h2></div><i class="fold-chevron"></i></summary><div class="project-visits">${visitsMarkup}</div></details>`}).join('');
 document.querySelector('#taskList').innerHTML=html||`<div class="organized-empty"><div class="empty-illustration"><img src="assets/tasks-empty-latest.png" alt=""></div><h3>当前暂无${filter==='全部'?'':filter}任务</h3><p>${filter==='待处理'?'所有待办任务均已完成，可查看其他任务安排。':'可切换其他状态，查看任务安排和历史记录。'}</p><button data-reset-filter>查看全部任务</button></div>`;
 document.querySelectorAll('[data-fold]').forEach(d=>d.addEventListener('toggle',()=>taskGroupFolds.set(d.dataset.fold,d.open)));
 document.querySelector('[data-reset-filter]')?.addEventListener('click',()=>{filter='全部';renderAllTaskGroups()});
 document.querySelector('.list-end').hidden=!rows.length;document.querySelector('.list-end').textContent='— 已显示当前筛选下的全部任务 —';
}
