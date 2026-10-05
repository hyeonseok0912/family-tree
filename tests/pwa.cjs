const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const handlers={},deleted=[];
const scope={location:{origin:'https://family.example'},addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
let failNetwork=false;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8'),{self:scope,URL,Promise,fetch:async()=>{if(failNetwork)throw Error('offline');return 'network';},caches:{open:async()=>({addAll:async()=>{}}),match:async()=> 'offline-page',keys:async()=>['unrelated-cache','family-tree-shell-old','family-tree-shell-v1'],delete:async key=>deleted.push(key)}});
(async()=>{
 let response;
 handlers.fetch({request:{method:'POST',url:'https://family.example/api/createmember'},respondWith:()=>{throw Error('Mutation must never be intercepted');}});
 handlers.fetch({request:{method:'GET',url:'https://family.example/api/auth/session'},respondWith:()=>{throw Error('Session must never be cached');}});
 handlers.fetch({request:{method:'GET',url:'https://family.example/',mode:'navigate'},respondWith:value=>response=value});assert.equal(await response,'network');
 failNetwork=true;handlers.fetch({request:{method:'GET',url:'https://family.example/',mode:'navigate'},respondWith:value=>response=value});assert.equal(await response,'offline-page');
 let active;handlers.activate({waitUntil:value=>active=value});await active;assert.deepEqual(deleted,['family-tree-shell-old']);
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/manifest.webmanifest'),'utf8'));
 for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(__dirname,'../public',icon.src)));
 console.log('PASS: PWA API/session/mutation cache exclusion, live navigation, offline fallback, scoped cache cleanup and icon assets');
})().catch(error=>{console.error(error);process.exitCode=1;});
