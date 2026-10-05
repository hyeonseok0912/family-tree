const assert=require('node:assert/strict');
const {scrollTreeWheel}=require('../utils/treeScroll.cjs');
const box={scrollHeight:1200,clientHeight:400,scrollTop:100};
function wheel(deltaY,extra={}) {return {deltaY,deltaX:0,deltaMode:0,prevented:false,preventDefault(){this.prevented=true;},...extra};}
let event=wheel(120);assert.equal(scrollTreeWheel(box,event),true);assert.equal(box.scrollTop,220);assert.equal(event.prevented,true);
event=wheel(-60);scrollTreeWheel(box,event);assert.equal(box.scrollTop,160);
event=wheel(2,{deltaMode:1});scrollTreeWheel(box,event);assert.equal(box.scrollTop,208);
event=wheel(1,{deltaMode:2});scrollTreeWheel(box,event);assert.equal(box.scrollTop,608);
event=wheel(1000);scrollTreeWheel(box,event);assert.equal(box.scrollTop,800);
event=wheel(80);assert.equal(scrollTreeWheel(box,event),false);assert.equal(event.prevented,false,'at the bottom the page may scroll');
box.scrollTop=0;event=wheel(-80);assert.equal(scrollTreeWheel(box,event),false);assert.equal(event.prevented,false,'at the top the page may scroll');
for(const extra of [{ctrlKey:true},{shiftKey:true},{deltaX:20},{defaultPrevented:true}]) {event=wheel(100,extra);assert.equal(scrollTreeWheel(box,event),false);assert.equal(event.prevented,false);assert.equal(box.scrollTop,0);}
assert.equal(scrollTreeWheel({scrollHeight:300,clientHeight:400,scrollTop:0},wheel(100)),false);
console.log('PASS: vertical wheel in pixel/line/page units, edge handoff, short charts, horizontal input and browser zoom preserved');
