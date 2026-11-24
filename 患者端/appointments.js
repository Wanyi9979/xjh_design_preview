const appointments=[{id:'a1',name:'筛选期',project:'乳腺癌患者全程健康管理研究',date:'2026/11/20',week:'周五',time:'09:30',status:'已预约',hospital:'浙江大学第一附属医院',room:'xxxxx科室',items:['方案知情同意','子课题知情同意','人口学资料','女性生育状态','入组 PIK3CA 监测','入排标准']},{id:'a2',name:'第 2 月访视',project:'肿瘤患者生活质量随访研究',date:'2026/11/25',week:'周三',time:'',status:'时间待确认',items:['血常规检查','身体状况随访','生活质量评估']}];
appointments[0].visitState='已来院';
appointments[0].date='2026/10/21';
appointments[1].name='第1周期第1天（C1D1）';appointments[1].date='2026/11/23';appointments[1].status='已取消';appointments[1].visitState='已取消';
const scheduleProject=appointments[0].project,scheduleItems=['血常规检查','健康状况评估','用药情况记录'];
appointments.push(
{id:'a3',name:'第2周期第1天（C2D1）',project:scheduleProject,date:'2026/11/21',week:'周六',time:'09:30',status:'已预约',visitState:'待到院',hospital:'浙江大学第一附属医院',room:'xxxxx科室',items:scheduleItems},
{id:'a4',name:'第2周期第15天（C2D15）',project:scheduleProject,date:'2026/12/06',week:'周日',time:'09:30',status:'已预约',visitState:'待到院',hospital:'浙江大学第一附属医院',room:'xxxxx科室',items:scheduleItems},
{id:'a5',name:'第3周期第1天（C3D1）',project:scheduleProject,date:'2026/12/21',week:'周一',time:'09:30',status:'已预约',visitState:'待到院',hospital:'浙江大学第一附属医院',room:'xxxxx科室',items:scheduleItems});
// The home preview and historical screening visit are separate appointments.
appointments.push({...appointments[0],id:'history-a1',visitState:'已来院',status:'已来院',week:'周三'});
Object.assign(appointments[0],{visitState:'待到院',status:'待到院',date:'2026/11/20',week:'周五',hiddenFromSchedule:true});
function fitPrototype(){document.documentElement.style.setProperty('--device-scale',Math.min(1,(innerWidth-32)/399,(innerHeight-32)/836))}fitPrototype();addEventListener('resize',fitPrototype);
const bookedAppointments=appointments.filter(a=>a.status==='已预约').sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));
const container=document.querySelector('#appointmentContent');const detail=location.pathname.endsWith('/appointment.html');
function card(a){return `<a class="appointment-preview appointment-list-card" href="appointment.html?id=${a.id}&from=all"><span class="appointment-phase">${a.name}</span><span class="appointment-status">${a.status}</span><img class="appointment-orbit" src="assets/msg-imgEllipse1940.svg" alt=""><div class="appointment-date-row"><img src="assets/msg-imgFrame.svg" alt=""><div><div class="appointment-day"><b>${Number(a.date.slice(5,7))}月${Number(a.date.slice(8))}日</b><span class="list-date-divider"></span><span>${a.week}</span>${a.time?`<strong class="list-visit-time">${a.time}</strong>`:''}</div><p>${a.project}</p>${!a.time?'<small class="list-time-pending">具体时间待 CRC 确认</small>':''}</div></div><div class="appointment-figma-footer"><span>本次访视：${a.items.slice(0,2).map(x=>x.replace('检查','')).join('、')}等${a.items.length}项</span><span>›</span></div></a>`}

if(detail){const a=appointments.find(a=>a.id===new URLSearchParams(location.search).get('id'));if(new URLSearchParams(location.search).get('from')==='all'){const back=document.querySelector('.subpage-nav a');back.href='appointments.html';back.setAttribute('aria-label','返回全部待到院')}container.innerHTML=a?`<div class="appointment-detail-heading"><div><h2>${a.name}</h2><span>${scheduleStatus(a)}</span></div><p>${a.project}</p></div><section class="appointment-arrangement"><div class="arrangement-date"><p>来院时间</p><img src="assets/appointment-clock.svg" alt=""><strong>${Number(a.date.slice(5,7))}月${Number(a.date.slice(8))}日</strong><p>${a.week}</p></div><img class="arrangement-separator" src="assets/appointment-separator.svg" alt=""><div class="arrangement-location"><p>来院地点</p><img src="assets/appointment-hospital.svg" alt=""><strong>${a.hospital||'待 CRC 确认'}</strong><p>${a.room||'具体地点待确认'}</p></div></section><section class="appointment-detail-items"><h3>本次检查项</h3><ol>${a.items.map((item,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${item}</li>`).join('')}</ol></section>`:'<p class="empty">未找到该预约</p>'}
function scheduleStatus(a){return a.visitState==='待到院'&&a.date==='2026/11/21'?'今日到院':a.visitState||a.status}
let savedSchedule={};try{savedSchedule=JSON.parse(sessionStorage.getItem('clinical-demo-schedule-view')||'{}')}catch{}

function saveScheduleView(){if(!detail)sessionStorage.setItem('clinical-demo-schedule-view',JSON.stringify({version:2,scroll:document.querySelector('.screen-scroll').scrollTop}))}

function scheduleCard(a){const today=a.date==='2026/11/21'&&a.visitState==='待到院',status=scheduleStatus(a);const week=['周日','周一','周二','周三','周四','周五','周六'][new Date(a.date.replaceAll('/','-')+'T12:00:00+08:00').getDay()];return `<div class="schedule-row"><div class="schedule-date"><b>${a.date.slice(5)}</b><span>${week}</span></div><a class="schedule-card" href="appointment.html?id=${a.id}&from=all"><h2>${a.name}</h2><p>${a.project}</p><i class="schedule-arrow" aria-hidden="true">›</i><span class="schedule-state ${today?'schedule-today':a.visitState==='已来院'?'schedule-arrived':a.visitState==='未确认'?'schedule-unconfirmed':a.visitState==='已取消'?'schedule-cancelled':''}">${status}</span></a></div>`}
function renderSchedule(){
 const pendingStates=['待到院','待到院','已预约'];
 const byAppointmentTime=(a,b)=>(a.date+' '+(a.time||'23:59')).localeCompare(b.date+' '+(b.time||'23:59'));
 const visible=appointments.filter(a=>!a.hiddenFromSchedule);
 const pending=visible.filter(a=>pendingStates.includes(a.visitState||a.status)).sort(byAppointmentTime);
 const other=visible.filter(a=>!pendingStates.includes(a.visitState||a.status)).sort(byAppointmentTime);
 container.innerHTML=`${pending.length?`<section class="schedule-pending" aria-label="待到访">${pending.map(scheduleCard).join('')}</section>`:''}${other.length?`<section class="schedule-history" aria-label="其他记录"><h2 class="schedule-section-title">其他记录</h2>${other.map(scheduleCard).join('')}</section>`:''}${visible.length?'':'<p class="calendar-empty">当前暂无访视安排</p>'}`;
}
if(!detail){renderSchedule();document.querySelector('.screen-scroll').scrollTop=savedSchedule.version===2?Number(savedSchedule.scroll)||0:0;container.addEventListener('click',e=>{if(e.target.closest('.schedule-card'))saveScheduleView()});addEventListener('pagehide',saveScheduleView)}
