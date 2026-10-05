const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc');
const presentation=require('../utils/recordPresentation.cjs');
async function load(file,user){
 const filename=path.join(__dirname,'..',file);
 const {code}=await swc.transform(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2020'},module:{type:'commonjs'}});
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require(name){
  if(name.endsWith('.css'))return new Proxy({},{get:(_,key)=>String(key)});
  if(name.endsWith('recordPresentation.cjs'))return presentation;
  if(name.endsWith('useAuth'))return {__esModule:true,default:()=>({user,refresh:()=>{}}),authRequest:()=>{}};
  if(name.endsWith('useDialogFocus'))return {__esModule:true,default:()=>({current:null})};
  if(name.endsWith('CreateAdminAccount'))return {__esModule:true,default:()=>null};
  if(name.endsWith('ModalEdit'))return {__esModule:true,default:()=>null};
  if(name.endsWith('DeletedMembers'))return {memberAction:()=>{}};
  if(name.endsWith('utils/helpers'))return {formatGender:()=>'-',formatDate:()=> '미상'};
  return require(name);
 }});return module.exports.default;
}
(async()=>{
 const member={id:9,name:'손덕증',created_by:1,created_by_name:'숨겨야 할 등록자',updated_by_name:'숨겨야 할 수정자',created_at:'2025-07-11T08:19:14.127Z',updated_at:'2025-07-12T08:19:14.127Z'};
 const viewer={id:2,role:'EDITOR',status:'ACTIVE',permissions:{create:false,update:false,delete:false}};
 const manager={id:1,role:'SUPER_ADMIN',status:'ACTIVE'};
 for(const user of [null,viewer,manager]){
  const Detail=await load('components/Modal/ModalDetail.js',user);
  const html=renderToStaticMarkup(React.createElement(Detail,{member,isAdmin:true,onClose(){}}));
  assert.ok(html.includes('손덕증'));
  if(user===manager){assert.ok(html.includes('#9'));assert.ok(html.includes('숨겨야 할 등록자'));assert.ok(html.includes('2025-07-11'));assert.ok(html.includes('2025-07-12'));assert.ok(!html.includes('T08:'));}
  else {assert.ok(!html.includes('#9'));assert.ok(!html.includes('등록자:'));assert.ok(!html.includes('숨겨야 할 등록자'));assert.ok(!html.includes('2025-07-11'));}
 }
 const EditorDetail=await load('components/Modal/ModalDetail.js',{...viewer,permissions:{create:true,update:true,delete:true}});
 const editorHtml=renderToStaticMarkup(React.createElement(EditorDetail,{member,isAdmin:true,onClose(){}}));
 assert.ok(editorHtml.includes('#9'),'lower administrators see the member ID');
 const LegacyDetail=await load('components/Modal/ModalDetail.js',manager);
 const legacyHtml=renderToStaticMarkup(React.createElement(LegacyDetail,{member:{...member,created_by:null,created_by_name:null,updated_by_name:null},isAdmin:true,onClose(){}}));
 assert.ok(legacyHtml.includes('등록자: 상위관리자'));assert.ok(legacyHtml.includes('최종 수정자: 상위관리자'));assert.ok(!legacyHtml.includes('등록자 미상'));
 const Accounts=await load('components/Admin/AdminAccounts.js',viewer);
 const html=renderToStaticMarkup(React.createElement(Accounts));
 assert.ok(html.includes('내 비밀번호'));assert.ok(!html.includes('최근 작업 이력'));assert.ok(!html.includes('관리자 목록'));
 console.log('PASS: rendered detail hides audit metadata for guests/viewers and formats manager dates; viewer account screen retains password controls');
})().catch(error=>{console.error(error);process.exitCode=1;});
