(() => {
 function init(){
 const params=new URLSearchParams(location.search);
 const directory=window.clinicalParticipantDirectory.create(),storageKey='journey-v2-added-participants';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey))||[];}catch{return [];}};
 const button=document.createElement('button');button.type='button';button.className='add-participant-entry';button.textContent='＋ 添加参与者';
 const filters=document.querySelector('section.filters');if(!filters)return;const toolbar=document.createElement('div');toolbar.className='participant-list-toolbar';filters.before(toolbar);toolbar.append(filters,button);
 const dialog=document.createElement('dialog');dialog.className='participant-action-dialog participant-add-dialog';dialog.setAttribute('aria-labelledby','participant-add-title');document.body.append(dialog);
 dialog.innerHTML=`<form novalidate><header><h2 id="participant-add-title">添加参与者</h2><button type="button" data-add-close aria-label="关闭添加参与者">×</button></header><div class="participant-action-body"><ol class="participant-add-steps" aria-label="添加步骤"><li aria-current="step"><span>1</span>确认患者</li><li><span>2</span>填写参与者试验信息</li></ol><section data-add-step="1"><div><label for="participant-lookup" data-required-field>患者唯一标示</label><div class="participant-lookup-row"><input id="participant-lookup" name="identifier" maxlength="64" placeholder="请输入患者唯一标示" autocomplete="off" required><button type="button" data-add-query>查询</button></div><p class="participant-add-hint">演示标识：PID2026001、PID2026002；也可查询现有参与者编号。</p></div><div data-add-result role="status" hidden></div></section><section data-add-step="2" hidden><div class="participant-selected-patient" data-selected-patient></div><label>参与试验<select name="project" required><option value="">请选择参与试验</option>${Object.entries(directory.projectCatalog).map(([id,name])=>`<option value="${escape(id)}">${escape(name)}</option>`).join('')}</select></label><label>参与者筛选号<input name="screening" maxlength="32" placeholder="请输入筛选号" required autocomplete="off"></label><label>参与者姓名缩写<input name="initials" maxlength="32" placeholder="请输入参与者姓名缩写" required autocomplete="off"><small>根据完整姓名自动生成，请核对。</small></label><label>知情同意书签署日期<input type="date" name="consentSignedDate" required></label><label>访视预约<input type="date" name="appointmentDate" required></label></section><p class="participant-add-error" data-add-error role="alert" hidden></p></div><footer><button type="button" data-add-close>取消</button><button type="button" data-add-back hidden>上一步</button><button type="submit" class="primary" disabled>下一步</button></footer></form>`;
 const form=dialog.querySelector('form'),result=dialog.querySelector('[data-add-result]'),error=dialog.querySelector('[data-add-error]'),submit=form.querySelector('[type=submit]');let match=null,step=1;
 let appointmentEdited=false;
 const syncAppointment=()=>{if(!appointmentEdited)form.elements.appointmentDate.value=form.elements.consentSignedDate.value;};
 form.elements.consentSignedDate.addEventListener('input',syncAppointment);form.elements.consentSignedDate.addEventListener('change',syncAppointment);
 form.elements.appointmentDate.addEventListener('input',()=>{appointmentEdited=Boolean(form.elements.appointmentDate.value);});
 const roster=[{uniqueIdentifier:'PID2026001',name:'ZXX',initials:'ZXX',sex:'女',age:42,hospital:'第一医院'},{uniqueIdentifier:'PID2026002',name:'XWN',initials:'XWN',sex:'男',age:56,hospital:'第二医院'}];
 const showError=message=>{error.textContent=message;error.hidden=false;};
 const duplicate=(person,project)=>window.clinicalParticipantDirectory.create().participants.find(p=>p.study===project&&(p.uniqueIdentifier||p.id).toUpperCase()===person.uniqueIdentifier.toUpperCase());
 const patientMarkup=person=>`<h3>已选患者</h3><dl>${[['姓名',person.fullName||person.name],['性别 / 年龄',[person.sex,person.age!=null?person.age+'岁':''].filter(Boolean).join(' / ')],['患者唯一标示',person.uniqueIdentifier],['病种',person.disease],['所属治疗组',person.treatmentGroup],['医院',person.hospital]].map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value||'未提供')}</dd></div>`).join('')}</dl>`;
 function setStep(next){step=next;error.hidden=true;dialog.querySelectorAll('[data-add-step]').forEach(el=>el.hidden=Number(el.dataset.addStep)!==step);dialog.querySelectorAll('.participant-add-steps li').forEach((el,i)=>{el.classList.toggle('is-complete',i+1<step);if(i+1===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});dialog.querySelector('[data-add-back]').hidden=step===1;submit.textContent=step===1?'下一步':'确认添加';submit.disabled=!match;if(step===2){dialog.querySelector('[data-selected-patient]').innerHTML=patientMarkup(match);form.elements.project.focus();}else form.elements.identifier.focus();}
 function query(){
  match=null;submit.disabled=true;error.hidden=true;result.hidden=true;
  const identifier=form.elements.identifier.value.trim().toUpperCase();if(!identifier){showError('请输入患者唯一标示。');form.elements.identifier.focus();return;}
  const found=roster.find(p=>p.uniqueIdentifier===identifier)||[...directory.participants,...read()].find(p=>(p.uniqueIdentifier||p.id).toUpperCase()===identifier);
  if(!found){showError('未查询到匹配信息，请核对患者唯一标示。');return;}
  match={...found,uniqueIdentifier:found.uniqueIdentifier||found.id};result.hidden=false;result.className='participant-selected-patient';result.innerHTML=patientMarkup(match);form.elements.initials.value=match.initials||match.name;submit.disabled=false;
 }
 button.addEventListener('click',()=>{form.reset();appointmentEdited=false;form.elements.project.value=window.sharedResearchScope?.project||'';match=null;result.hidden=true;setStep(1);window.showQuietDialog(dialog);form.elements.identifier.focus();});
 dialog.querySelectorAll('[data-add-close]').forEach(b=>b.addEventListener('click',()=>{dialog.close();button.focus();}));
 dialog.querySelector('[data-add-query]').addEventListener('click',query);
 dialog.querySelector('[data-add-back]').addEventListener('click',()=>setStep(1));
 form.elements.project.addEventListener('change',()=>{error.hidden=true;});
 form.elements.identifier.addEventListener('input',()=>{match=null;submit.disabled=true;result.hidden=true;error.hidden=true;});
 form.elements.identifier.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();query();}});
 form.addEventListener('submit',e=>{
  e.preventDefault();error.hidden=true;if(!match){showError('请先查询并核对患者信息。');return;}
  if(step===1){setStep(2);return;}
  const project=form.elements.project.value;if(!project){showError('请选择参与试验。');form.elements.project.focus();return;}
  const screening=form.elements.screening.value.trim();if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(screening)){showError('请输入筛选号，支持32位以内的字母、数字、短横线和下划线。');form.elements.screening.focus();return;}
  const initials=form.elements.initials.value.trim().toUpperCase();if(!/^[A-Z]{1,32}$/.test(initials)){showError('请输入32位以内的英文字母姓名缩写。');form.elements.initials.focus();return;}
  const consentSignedDate=form.elements.consentSignedDate.value;
  if(!consentSignedDate||!form.elements.consentSignedDate.validity.valid){showError('请选择有效的知情同意书签署日期。');form.elements.consentSignedDate.focus();return;}
  const appointmentDate=form.elements.appointmentDate.value;
  if(!appointmentDate||!form.elements.appointmentDate.validity.valid){showError('请选择有效的访视预约日期。');form.elements.appointmentDate.focus();return;}
  if(duplicate(match,project)){showError('该参与者已加入当前项目，请勿重复添加。');return;}
  const current=window.clinicalParticipantDirectory.create();if(current.participants.some(p=>p.study===project&&p.id.toUpperCase()===screening.toUpperCase())){showError('该筛选号已在当前项目使用，请更换。');return;}
  const rows=read();rows.push({...match,fullName:match.fullName||match.name,name:initials,initials,id:screening,screeningNumber:screening,consentSignedDate,appointmentDate,study:project,status:'筛选中',group:'',protocolVersion:window.visitProtocols.list(project)[0]?.version||'V1.0',addedAt:new Date().toISOString()});
  try{localStorage.setItem(storageKey,JSON.stringify(rows));}catch{showError('保存失败，请检查浏览器存储空间后重试。');return;}
  const next=new URL(location.href);next.searchParams.set('view','participants');next.searchParams.set('added','1');location.href=next.href;
 });
 if(params.get('added')==='1'){const notice=document.createElement('div');notice.className='participant-added-notice';notice.setAttribute('role','status');notice.textContent='参与者已添加，当前状态为筛选中。';document.querySelector('#participant-view').prepend(notice);const url=new URL(location.href);url.searchParams.delete('added');history.replaceState(null,'',url);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
