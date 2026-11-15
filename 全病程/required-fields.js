// Required markers follow each dialog control's real validation state.
(() => {
 function sync(){
  document.querySelectorAll('dialog,[role="dialog"]').forEach(dialog=>{
   dialog.querySelectorAll('label').forEach(label=>{
    const controls=label.control?[label.control]:[...label.querySelectorAll('input,select,textarea')];
    const required=controls.some(control=>!control.disabled&&(control.required||control.getAttribute('aria-required')==='true'));
    if(required){
     if(!label.hasAttribute('data-required-field'))label.setAttribute('data-required-field','');
     // Older dialogs placed a literal star after the title; keep only the prefix.
     const walker=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);const nodes=[];
     while(walker.nextNode())nodes.push(walker.currentNode);
     nodes.forEach(node=>{if(node.parentElement.closest('input,select,textarea,button'))return;const text=node.textContent;if(text.includes('*')){const cleaned=text.replace(/\s*\*\s*/g,'');if(cleaned!==text)node.textContent=cleaned;}});
    }else if(label.hasAttribute('data-required-field'))label.removeAttribute('data-required-field');
   });
  });
 }
 window.syncDialogRequiredFields=sync;
 function init(){sync();new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['required','aria-required','disabled']});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
