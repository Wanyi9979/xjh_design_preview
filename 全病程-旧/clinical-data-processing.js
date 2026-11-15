(()=>{
  const $=id=>document.getElementById(id);
  const currentProject=new URLSearchParams(location.search).get('project');
  const rows=currentProject?clinicalTasks.processing.filter(task=>(task.projectId||'CT-2026-001')===currentProject):clinicalTasks.processing;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now='2026/09/08 15:30';
  if(!rows.some(r=>r.handled)){
    rows.slice(0,3).forEach((r,i)=>{rows.push({...r,key:rows.length,handled:true,handledAt:now,result:i?'数据录入已完成':'无需处理-回显原因',reason:'回显原因',historyType:i?'entry':'skip'});});
  }
  rows.forEach((r,i)=>r.key=i);
  let handled=false;

  $('task-tabs').hidden=true;
  $('task-filters').innerHTML='<div class="filters processing-filters"><div class="processing-tabs"><button class="selected" data-state="pending">待处理</button><button data-state="done">已处理</button></div><select id="study" aria-label="参与试验"><option value="">参与试验</option><option>这是试验项目名称～</option></select><select id="status" aria-label="参与者状态"><option value="">参与者状态</option><option>已入组</option><option>筛选中</option></select><input type="search" id="participant" placeholder="参与者姓名/编号" aria-label="参与者姓名或编号"><button class="reset" id="reset">重置</button></div>';

  const statusHtml=r=>`<span class="status ${r.status==='已入组'?'enrolled':''}">${esc(r.status)}</span>`;
  const detailUrl=(r,extra={})=>'项目参与者详情-Figma.html?'+new URLSearchParams({name:r.name,id:r.id,status:r.status,...extra});
  const setColumns=()=>{
    const widths=handled?[76,116,250,170,180,330,120]:[76,116,210,160,110,190,94,170,120];
    const headers=handled?['参与者','参与者编号','参与试验','访视周期','完成时间','处理结果','操作']:['参与者','参与者编号','参与试验','待录入访视','访视日期','访视窗口','参与者状态','待录入CRF','操作'];
    $('task-cols').innerHTML=widths.map(w=>`<col style="width:${w}px">`).join('');
    $('task-head').innerHTML='<tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr>';
    document.querySelector('.task-table').classList.toggle('processing-done-table',handled);
  };
  const visible=()=>{
    const q=$('participant').value.trim().toLowerCase();
    return rows.filter(r=>r.handled===handled)
      .filter(r=>!$('study').value||r.study===$('study').value)
      .filter(r=>!$('status').value||r.status===$('status').value)
      .filter(r=>!q||(r.name+r.id).toLowerCase().includes(q));
  };
  function render(){
    setColumns();
    const data=visible();
    $('task-count').textContent=`共 ${data.length} 条`;
    $('task-rows').innerHTML=data.map(r=>{
      const participant=`<a href="${detailUrl(r)}">${esc(r.name)}</a>`;
      const action=handled?`<button class="text-action" data-record="${r.key}">操作记录</button>`:`<a href="${detailUrl(r,{tab:'data-entry',visitIndex:r.visitIndex})}">数据录入</a><button class="text-action" data-skip="${r.key}">无需处理</button>`;
      const cells=handled
        ? [participant,r.id,esc(r.study),esc(r.cycle),r.handledAt||now,esc(r.result||'数据录入已完成'),action]
        : [participant,r.id,esc(r.study),esc(r.cycle),r.date,r.window,statusHtml(r),esc(r.content),action];
      return '<tr>'+cells.map((c,i)=>`<td${i===cells.length-1?' class="actions"':''}>${c}</td>`).join('')+'</tr>';
    }).join('')||`<tr><td colspan="${handled?7:9}" class="empty">暂无匹配记录</td></tr>`;
  }
  function resetDialog(){
    const dialog=$('task-dialog'),confirm=$('dialog-confirm'),close=dialog.querySelector('header button'),cancel=dialog.querySelector('footer button[value="cancel"]');
    dialog.className='';confirm.onclick=null;confirm.hidden=false;$('dialog-title').textContent='';$('dialog-body').innerHTML='';
    [close,cancel].forEach(button=>{if(button){button.onclick=null;button.removeAttribute('type');}});
    dialog.onclose=null;
  }
  function openSkip(r){
    const dialog=$('task-dialog'),confirm=$('dialog-confirm');resetDialog();dialog.className='skip-dialog';$('dialog-title').textContent='无需处理';
    $('dialog-body').innerHTML='<div class="skip-label"><span class="required">*</span><strong>原因</strong></div><div class="skip-field"><textarea id="skip-reason" maxlength="200" aria-label="无需处理原因"></textarea><span id="skip-count" class="skip-count">0/200</span></div><p id="skip-error" class="skip-error" hidden>请输入原因</p>';
    const textarea=$('skip-reason'),count=$('skip-count'),error=$('skip-error'),close=dialog.querySelector('header button'),cancel=dialog.querySelector('footer button[value="cancel"]');
    [close,cancel].forEach(button=>{if(button){button.type='button';button.onclick=()=>dialog.close('cancel');}});
    textarea.addEventListener('input',()=>{count.textContent=textarea.value.length+'/200';error.hidden=true;});
    confirm.onclick=e=>{e.preventDefault();const reason=textarea.value.trim();if(!reason){error.hidden=false;textarea.focus();return;}r.handled=true;r.handledAt=now;r.reason=reason;r.result='无需处理-'+reason;r.historyType='skip';dialog.close('confirm');render();};
    dialog.onclose=resetDialog;dialog.showModal();textarea.focus();
  }
  function recordItems(r){
    if(r.historyType==='skip')return [[`${r.name} 于 2026-08-19 14:37:29 无需处理`,r.reason||'这里回显填写的原因～','success'],['2026-08-19 14:34:58 创建任务','','brand']];
    return [[`${r.name} 于 2026-08-19 14:37:29 提交`,'雌激素调查表','success'],[`${r.name} 于 2026-08-25 09:31:24 提交`,'尿常规','brand'],[`${r.name} 于 2026-08-23 16:54:21 提交`,'体格检查','brand'],[`${r.name} 于 2026-08-21 14:11:02 提交`,'血生化、生命特征','brand'],['2026-08-19 14:34:58 创建任务','','brand']];
  }
  function openRecord(r){
    const dialog=$('task-dialog'),confirm=$('dialog-confirm'),close=dialog.querySelector('header button'),cancel=dialog.querySelector('footer button[value="cancel"]');resetDialog();dialog.className='record-dialog';$('dialog-title').textContent='操作记录';confirm.hidden=true;cancel.hidden=true;
    $('dialog-body').innerHTML='<div class="record-timeline">'+recordItems(r).map(([title,desc,type],i,arr)=>`<div class="record-timeline-item ${i===arr.length-1?'last':''}"><i class="${type}"></i><strong>${esc(title)}</strong>${desc?`<span>${esc(desc)}</span>`:''}</div>`).join('')+'</div>';
    close.type='button';close.onclick=()=>dialog.close('cancel');dialog.onclose=()=>{cancel.hidden=false;resetDialog();};dialog.showModal();
  }
  $('task-filters').addEventListener('input',render);
  $('task-filters').addEventListener('change',render);
  $('task-filters').addEventListener('click',e=>{
    if(e.target.dataset.state){handled=e.target.dataset.state==='done';document.querySelectorAll('[data-state]').forEach(b=>b.classList.toggle('selected',b===e.target));render();}
    if(e.target.id==='reset'){['study','status','participant'].forEach(id=>$(id).value='');render();}
  });
  $('task-rows').addEventListener('click',e=>{
    const skip=e.target.closest('[data-skip]'),record=e.target.closest('[data-record]');
    if(skip){openSkip(rows.find(r=>r.key===Number(skip.dataset.skip)));}
    if(record){openRecord(rows.find(r=>r.key===Number(record.dataset.record)));}
  });
  document.querySelector('.nav-item.active').addEventListener('click',()=>location.href='临床试验工作台-Figma.html');
  render();
})();
