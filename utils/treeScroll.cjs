// Consume vertical wheel input only while the chart can move in that direction.
// At either edge, leave the event to the browser so the page can continue scrolling.
function scrollTreeWheel(container,event){
 if(event.ctrlKey||event.shiftKey||event.deltaX||!event.deltaY||event.defaultPrevented)return false;
 const unit=event.deltaMode===1?24:event.deltaMode===2?container.clientHeight:1;
 const maximum=Math.max(0,container.scrollHeight-container.clientHeight);
 const next=Math.min(maximum,Math.max(0,container.scrollTop+event.deltaY*unit));
 if(next===container.scrollTop)return false;
 container.scrollTop=next;
 event.preventDefault();
 return true;
}
module.exports={scrollTreeWheel};
