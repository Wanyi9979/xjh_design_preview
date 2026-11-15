// Opening a dialog never selects a field or button. Keep focus within its frame
// without a focus ring, so keyboard users can still Tab into the controls.
(() => {
  const bound=new WeakSet();
  function frame(element) {
    window.syncDialogRequiredFields?.();
    const target=element.matches('dialog,[role="dialog"]')?element:element.querySelector('dialog,[role="dialog"]')||element;
    if(!bound.has(target)){
      bound.add(target);
      target.addEventListener('keydown',event=>{
        if(event.key!=='Tab'||document.activeElement!==target)return;
        const controls=[...target.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(control=>!control.disabled&&control.tabIndex>=0&&control.getClientRects().length);
        if(controls.length){event.preventDefault();(event.shiftKey?controls.at(-1):controls[0]).focus();}
      });
    }
    target.setAttribute('tabindex','-1');
    target.setAttribute('data-quiet-dialog','');
    target.focus({preventScroll:true});
    return target;
  }
  window.focusDialogFrame=frame;
  window.showQuietDialog=dialog=>{
    dialog.setAttribute('tabindex','-1');
    dialog.setAttribute('data-quiet-dialog','');
    const hadAutofocus=dialog.hasAttribute('autofocus');
    dialog.setAttribute('autofocus','');
    if(!dialog.open)dialog.showModal();
    if(!hadAutofocus)dialog.removeAttribute('autofocus');
    frame(dialog);
  };
})();
