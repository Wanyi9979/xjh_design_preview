(()=>{
  const tree=[
    {name:'第一医院',departments:[{name:'乳腺肿瘤科',groups:['乳腺肿瘤一组','乳腺肿瘤二组']},{name:'胸部肿瘤科',groups:['胸部肿瘤二组','肺癌综合治疗组']}]},
    {name:'第二医院',departments:[{name:'内分泌科',groups:['内分泌治疗组','糖尿病管理组']}]}
  ];
  const all=tree.flatMap(h=>h.departments.flatMap(d=>d.groups));
  const trigger=document.querySelector('.group-filter');
  const picker=document.createElement('section');
  picker.id='group-picker';picker.className='group-picker';picker.hidden=true;
  picker.setAttribute('role','dialog');picker.setAttribute('aria-label','选择医院、科室和治疗组');
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',picker.id);
  trigger.after(picker);
  let hospital=0,department=0,draft=new Set(selectedGroups);
  function checkState(input,groups){const n=groups.filter(g=>draft.has(g)).length;input.checked=n===groups.length;input.indeterminate=n>0&&n<groups.length;}
  function updateChecks(){
    picker.querySelectorAll('input[data-groups]').forEach(input=>checkState(input,JSON.parse(input.dataset.groups)));
    picker.querySelector('.group-picker-count').textContent=`已选 ${draft.size} 个治疗组`;
  }
  function checkbox(groups,label){const input=document.createElement('input');input.type='checkbox';input.dataset.groups=JSON.stringify(groups);input.setAttribute('aria-label',label);return input;}
  function draw(){
    picker.innerHTML='<div class="group-picker-head"><strong>选择治疗组</strong><label class="group-picker-all">全选</label></div><div class="group-picker-columns"></div><div class="group-picker-footer"><span class="group-picker-count" aria-live="polite"></span><div class="group-picker-actions"><button type="button" data-action="cancel">取消</button><button type="button" class="confirm" data-action="confirm">确定</button></div></div>';
    picker.querySelector('.group-picker-all').prepend(checkbox(all,'全选治疗组'));
    const columns=picker.querySelector('.group-picker-columns');
    const lists=[tree,tree[hospital].departments,tree[hospital].departments[department].groups];
    ['医院','科室','治疗组'].forEach((title,level)=>{
      const column=document.createElement('div');column.className='group-picker-column';
      column.innerHTML=`<h3>${title}</h3><div class="group-picker-options"></div>`;
      const options=column.lastElementChild;
      lists[level].forEach((item,index)=>{
        const name=level===2?item:item.name;
        const groups=level===0?item.departments.flatMap(d=>d.groups):level===1?item.groups:[item];
        const row=document.createElement('div');row.className='group-picker-row'+((level===0&&index===hospital||level===1&&index===department)?' active':'');
        const input=checkbox(groups,`选择${name}`);row.append(input);
        if(level<2){const button=document.createElement('button');button.type='button';button.innerHTML=`<span>${name}</span><span class="group-picker-arrow" aria-hidden="true">›</span>`;button.addEventListener('click',()=>{if(level===0){hospital=index;department=0;}else department=index;draw();picker.querySelectorAll('.group-picker-column')[level].querySelectorAll('button')[index].focus();});row.append(button);}
        else {const label=document.createElement('label');input.id=`group-option-${index}`;label.htmlFor=input.id;label.textContent=name;row.append(label);}
        options.append(row);
      });columns.append(column);
    });updateChecks();
  }
  function close(restoreFocus=false){picker.hidden=true;trigger.setAttribute('aria-expanded','false');if(restoreFocus)trigger.focus();}
  trigger.addEventListener('click',()=>{if(!picker.hidden){close();return;}draft=new Set(selectedGroups);draw();picker.hidden=false;trigger.setAttribute('aria-expanded','true');picker.querySelector('input').focus();});
  picker.addEventListener('change',event=>{if(!event.target.matches('input[data-groups]'))return;const checked=event.target.checked;JSON.parse(event.target.dataset.groups).forEach(g=>checked?draft.add(g):draft.delete(g));updateChecks();});
  picker.addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action==='confirm'){selectedGroups=new Set(draft);trigger.textContent=selectedGroups.size===all.length?'全部医院/科室/治疗组':`已选 ${selectedGroups.size} 个治疗组`;render();close(true);}else if(action==='cancel')close(true);});
  // 切换列会重建按钮；使用事件原始路径，避免把已移除的按钮误判为浮窗外点击。
  document.addEventListener('click',event=>{
    const path=event.composedPath();
    if(!picker.hidden&&!path.includes(picker)&&!path.includes(trigger))close();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!picker.hidden){event.preventDefault();close(true);}});
})();
