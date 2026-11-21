const visitPlans={
p1:{name:'乳腺癌患者全程健康管理研究',visits:[{name:'基线访视',status:'已完成',period:'2026/10/15 — 2026/10/21',items:['基本信息采集','既往病史与治疗情况','基线健康状况评估']},{name:'第 2 周访视',status:'进行中',period:'2026/11/09 — 2026/11/15',items:['健康状况评估','用药情况记录','血常规检查']},{name:'第 4 周访视',status:'未激活',period:'2026/11/23 — 2026/11/29',items:['用药随访','生活质量评估','检查结果记录']}]},
p2:{name:'肿瘤患者生活质量随访研究',visits:[{name:'第 1 月访视',status:'已终止',period:'2026/11/01 — 2026/11/05',items:['日常活动评估','睡眠情况评估','情绪与生活质量评估']},{name:'第 2 月访视',status:'进行中',period:'2026/11/11 — 2026/11/18',items:['血常规检查','身体状况随访','生活质量评估']}]}}
function fitPrototype(){document.documentElement.style.setProperty('--device-scale',Math.min(1,(innerWidth-32)/399,(innerHeight-32)/836))}fitPrototype();addEventListener('resize',fitPrototype);
const statusClass={'已完成':'complete','进行中':'ongoing','已终止':'terminated','未激活':'inactive'};
function renderProjectDetails(projectKey,target,setTitle=false){
const plan=visitPlans[projectKey];
if(plan){
const names={'基线访视':'筛选期','第 2 周访视':'第1周期第1天（C1D1）','第 4 周访视':'第1周期第15天（C1D15）','第 1 月访视':'第1周期第1天（C1D1）','第 2 月访视':'第2周期第1天（C2D1）'};
if(projectKey==='p1'&&plan.visits.length===3)plan.visits.push({name:'第2周期第1天（C2D1）',status:'未激活',period:'2026/12/07 — 2026/12/13',items:['健康状况评估','用药情况记录','血常规检查']});
if(setTitle)document.title=plan.name+' · 项目详情';target.innerHTML=`<div class="project-detail-heading"><div><h2>${plan.name}</h2><p>加入时间：${participantProjects[projectKey].joined} <span class="${participantLabel(participantProjects[projectKey])==='已结束'?'participant-ended':''}">${participantLabel(participantProjects[projectKey],true)}</span></p></div><img src="assets/project-detail-research.png" alt=""></div><div class="project-cycle-list">${plan.visits.map((v,i)=>`<details class="project-cycle ${statusClass[v.status]}" ${v.status==='进行中'?'open':''}><summary><span class="project-cycle-number">${String(i+1).padStart(2,'0')}</span><div class="project-cycle-title"><h3>${names[v.name]||v.name}</h3><span class="project-cycle-state">${v.status}</span></div><p>${v.period.slice(0,10)} （${v.period.replace(' — ','～')}）</p></summary><div class="project-cycle-items"><ul>${v.items.map((item,n)=>`<li><span>${String(n+1).padStart(2,'0')}</span>${item}</li>`).join('')}</ul></div></details>`).join('')}</div>`;
target.querySelectorAll('.project-cycle').forEach(card=>card.addEventListener('click',e=>{if(!e.target.closest('summary'))card.open=!card.open}));
}else target.innerHTML='<p class="empty">未找到该项目的访视安排</p>';

}
if(document.querySelector('#visitPlan'))renderProjectDetails(new URLSearchParams(location.search).get('project'),document.querySelector('#visitPlan'),true);
if(window.singleProjectPreview&&document.querySelector('#projects')){document.querySelector('#projects').innerHTML='<section class="embedded-project-detail"></section>';renderProjectDetails('p1',document.querySelector('.embedded-project-detail'));}
