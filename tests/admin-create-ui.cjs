const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const swc=require('next/dist/build/swc'),{renderToStaticMarkup}=require('react-dom/server');
(async()=>{
 const filename=path.join(__dirname,'../components/Admin/CreateAdminAccount.js');
 const {code}=await swc.transform(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2020'},module:{type:'commonjs'}});
 const state=[],requests=[];let cursor=0,wrongPassword=true,reloads=0;
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require(name){
  if(name==='react')return {useState(initial){const index=cursor++;if(!(index in state))state[index]=initial;return [state[index],value=>{state[index]=value;}];}};
  if(name.endsWith('.css'))return {};
  if(name.endsWith('useAuth'))return {authRequest:async(action,data)=>{requests.push({action,data});if(action==='verify'&&wrongPassword)throw Error('비밀번호가 일치하지 않습니다.');return action==='admin-create'?{temporary_password:'temporary-test-only'}:{success:true};}};
  return require(name);
 }});
 const render=()=>{cursor=0;return module.exports.default({onCreated:async()=>{reloads++;return true;}});};
 const nodes=element=>{if(!element||typeof element!=='object')return [];return [element,...[].concat(element.props?.children||[]).flatMap(nodes)];};
 const change=(name,value)=>nodes(render()).find(node=>node.type==='input'&&node.props.name===name).props.onChange({target:{value}});
 const submit=()=>render().props.onSubmit({preventDefault(){}});
 const html=()=>renderToStaticMarkup(render());
 await submit();assert.equal(requests.length,0);assert.ok(html().includes('아이디는 영문'));
 change('username','son_test');change('display_name','검증 사용자');await submit();assert.equal(requests.length,0);assert.ok(html().includes('아래에 현재 로그인한 상위 관리자'));
 change('admin_password','wrong-test-password');await submit();assert.equal(requests.at(-1).action,'verify');assert.equal(requests.some(r=>r.action==='admin-create'),false);assert.ok(html().includes('비밀번호가 일치하지 않습니다.'));
 wrongPassword=false;change('admin_password','valid-test-password');await submit();
 assert.equal(requests.at(-2).action,'verify');assert.equal(requests.at(-1).action,'admin-create');assert.equal(requests.at(-1).data.username,'son_test');assert.equal(requests.at(-1).data.display_name,'검증 사용자');assert.equal(reloads,1);
 assert.ok(html().includes('계정 등록 완료'));assert.ok(html().includes('temporary-test-only'));
 for(const name of ['username','display_name','admin_password'])assert.equal(nodes(render()).find(node=>node.type==='input'&&node.props.name===name).props.value,'');
 console.log('PASS: administrator form explains missing/invalid input locally, rejects wrong password, verifies before creation and displays temporary credentials at the form');
})().catch(error=>{console.error(error);process.exitCode=1;});
