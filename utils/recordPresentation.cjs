const operationKeys = ['created_by','updated_by','created_by_name','updated_by_name','created_at','updated_at','deleted_by','deleted_at','deletion_reason','merged_into'];
function hasManagementAccess(user) {
  return !!user && user.status === 'ACTIVE' && (user.role === 'SUPER_ADMIN' || (user.role === 'EDITOR' && ['create','update','delete'].some(key => user.permissions?.[key] === true)));
}
function formatRecordDate(value) {
  if (!value) return '-';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}(?:T|\s|$)/.test(text) ? text.slice(0,10) : '-';
}
function visibleMember(member, user) {
  if (hasManagementAccess(user)) return member;
  return Object.fromEntries(Object.entries(member).filter(([key]) => !operationKeys.includes(key)));
}
module.exports = {hasManagementAccess, formatRecordDate, visibleMember};
