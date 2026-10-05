import {useEffect,useRef} from 'react';
export default function useDialogFocus(onClose,active=true){
  const ref=useRef(null),closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    if(!active)return;
    const previous=document.activeElement;
    const selectors='button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]';
    const dialog=ref.current;
    const first=dialog?.querySelector('[data-initial-focus]')||dialog?.querySelector(selectors);
    first?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current?.();}
      if(event.key==='Tab'){
        const elements=Array.from(dialog?.querySelectorAll(selectors)||[]).filter(element=>element.getClientRects().length);
        if(!elements.length){event.preventDefault();return;}
        const first=elements[0],last=elements[elements.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    dialog?.addEventListener('keydown',keydown);
    return()=>{dialog?.removeEventListener('keydown',keydown);if(previous?.isConnected)previous.focus();};
  },[active]);
  return ref;
}
