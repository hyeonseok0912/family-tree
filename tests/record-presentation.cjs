const assert=require('node:assert/strict');
const {hasManagementAccess,formatRecordDate,visibleMember}=require('../utils/recordPresentation.cjs');
const viewer={role:'EDITOR',status:'ACTIVE',permissions:{create:false,update:false,delete:false}};
const editor={...viewer,permissions:{update:true}};
const superAdmin={role:'SUPER_ADMIN',status:'ACTIVE'};
for(const user of [null,viewer,{...editor,status:'SUSPENDED'},{...superAdmin,status:'PENDING'}]) assert.equal(hasManagementAccess(user),false);
for(const user of [editor,superAdmin,{...viewer,permissions:{create:true}},{...viewer,permissions:{delete:true}}]) assert.equal(hasManagementAccess(user),true);
assert.equal(formatRecordDate('2025-07-11T08:19:14.127Z'),'2025-07-11');
assert.equal(formatRecordDate('2025-07-11 08:19:14'),'2025-07-11');
assert.equal(formatRecordDate('2025-07-11'),'2025-07-11');
assert.equal(formatRecordDate(null),'-');
assert.equal(formatRecordDate('invalid'),'-');
const member={id:4,name:'손덕증',birth_date:'1932-01-01',notes:'족보 정보',created_by:1,created_by_name:'관리자',created_at:'2025-07-11T08:19:14.127Z',updated_by:1,updated_by_name:'관리자',updated_at:'2025-07-11T08:19:14.127Z',spouseList:[]};
for(const user of [null,viewer]){
 const publicMember=visibleMember(member,user);
 for(const key of ['created_by','created_by_name','created_at','updated_by','updated_by_name','updated_at']) assert.equal(Object.hasOwn(publicMember,key),false);
 assert.equal(publicMember.name,member.name);assert.equal(publicMember.birth_date,member.birth_date);assert.equal(publicMember.notes,member.notes);
}
assert.deepEqual(visibleMember(member,editor),member);assert.deepEqual(visibleMember(member,superAdmin),member);
assert.ok(member.created_by,'filter does not mutate the original record');
console.log('PASS: management permissions, public metadata filtering and date-only display');
