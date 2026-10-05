const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../utils/memoAutosave.js'),'utf8').replace('export function','function');
const context={setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(source+'\nthis.create=createMemoAutosave;',context);
(async()=>{
  const writes=[],statuses=[];let release;
  const autosave=context.create({save:async text=>{writes.push(text);if(text==='old')await new Promise(resolve=>release=resolve);if(text==='fail')throw Error('HTTP 500');},onStatus:text=>statuses.push(text),schedule:()=>1,cancel:()=>{}});
  autosave.change('old');const oldSave=autosave.flush();await Promise.resolve();
  const cleared=autosave.clear();
  assert.deepEqual(writes,['old']);release();await oldSave;await cleared;
  assert.deepEqual(writes,['old','']);assert.equal(statuses.at(-1),'초기화됨');
  console.log('PASS: clear waits for older in-flight writes and remains the final saved value');
  autosave.change('fail');await autosave.flush();assert.equal(statuses.at(-1),'저장 실패');
  autosave.change('retry');await autosave.flush();assert.equal(statuses.at(-1),'저장됨');
  console.log('PASS: failed writes do not report success and do not poison the write queue');
  autosave.change('final edit');const before=statuses.length;await autosave.dispose();
  assert.equal(writes.at(-1),'final edit');assert.equal(statuses.length,before);
  console.log('PASS: tab unmount flushes pending input without updating detached UI');
})().catch(error=>{console.error(error);process.exitCode=1;});
