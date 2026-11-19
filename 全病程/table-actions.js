/* Keep action columns readable across lists, drawers and task tables. */
(() => {
 const states=new Map();let frame=0;
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;scan();});};
 function scrollHost(table){let parent=table.parentElement;while(parent&&parent!==document.body){if(/auto|scroll/.test(getComputedStyle(parent).overflowX))return parent;parent=parent.parentElement;}return table.parentElement;}
 function scan(){
  for(const [table,state] of states)if(!table.isConnected){observer.unobserve(state.host);states.delete(table);}
  document.querySelectorAll('table').forEach(table=>{
   if(!table.getClientRects().length||table.clientWidth===0)return;
   const headers=[...(table.tHead?.rows[0]?.cells||[])];
   const index=headers.findIndex(cell=>cell.textContent.trim()==='操作');
   if(index<0)return;
   let state=states.get(table);const signature=headers.map(c=>c.textContent.trim()).join('|');
   if(!state||state.signature!==signature){
    table.classList.remove('managed-action-table');table.style.removeProperty('--action-table-min-width');
    const width=table.getBoundingClientRect().width,actionWidth=headers[index].getBoundingClientRect().width;
    state={signature,index,host:scrollHost(table),fieldWidth:Math.max(0,width-actionWidth)};states.set(table,state);observer.observe(state.host);
   }
   const cells=[...table.rows].filter(row=>row.cells.length===headers.length&&row.cells[index]?.colSpan===1).map(row=>row.cells[index]);
   let width=80;
   cells.forEach(cell=>{
    cell.classList.add('managed-action-cell');
    const style=getComputedStyle(cell),controls=[...cell.querySelectorAll('button,a,summary')].filter(el=>el.getClientRects().length);
    const group=controls[0]?.parentElement,gap=parseFloat(group?getComputedStyle(group).columnGap:0)||10;
    const range=document.createRange();range.selectNodeContents(cell);
    const content=controls.length?controls.reduce((sum,el)=>sum+Math.max(el.scrollWidth,el.getBoundingClientRect().width),0)+gap*Math.max(0,controls.length-1):range.getBoundingClientRect().width;
    width=Math.max(width,Math.ceil(content+(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0)+4));
   });
   table.style.setProperty('--action-column-width',width+'px');
   table.style.setProperty('--action-table-min-width',Math.ceil(state.fieldWidth+width)+'px');
   const col=table.querySelector('colgroup')?.children[index];if(col)col.classList.add('managed-action-col');
   table.classList.add('managed-action-table');
   table.classList.toggle('has-action-overflow',state.host.scrollWidth>state.host.clientWidth+1);
  });
 }
 const observer=new ResizeObserver(schedule);
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
 window.addEventListener('resize',schedule);document.addEventListener('toggle',schedule,true);
 document.addEventListener('click',schedule,true);document.fonts?.ready.then(schedule);schedule();
})();
