// 각종 도움 함수들

export const formatGender = (gender) => {
  if (gender === "M") return "남";
  if (gender === "F") return "여";
  return "-";
};

export function formatInputDate(dateStr) {
  if (!dateStr) return "";

  return String(dateStr).slice(0,10);
}

export function formatDate(dateStr, precision) {
  if (!dateStr || precision==='UNKNOWN') return "미상";

  const [year,month,day]=String(dateStr).slice(0,10).split('-').map(Number);

  // 월일이 1월 1일이라면 실제 모르는 것으로 간주하고 연도만 표시
  if (precision==='YEAR'||precision==='LEGACY'||(!precision&&month===1&&day===1)) {
    return `${year}`;
  }

  // 월일이 있으면 YYYY-MM-DD 전체 표시
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

export function toDateOnlyString(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

export const getParentLabel = (member) =>
  member ? `${member.name} (${formatDate(member.birth_date)})` : "";

export const filterMembersByName = (members, input) =>
  members.filter((m) => m.name.includes(input.trim()));

export const isRequiredFilled = (formData) =>
  formData.name?.trim() && (formData.parent_id || (formData.rootMember && Number(formData.generation)>0));

export const sanitizeFormData = (data) => {
  const sanitize = (val) => (val === "" || val === null ? "" : val);
  return {
    ...data,
    hanja: sanitize(data.hanja),
    birth_date: sanitize(data.birth_date),
    death_date: sanitize(data.death_date),
    mother_nm: sanitize(data.mother_nm),
    notes: sanitize(data.notes),
  };
};
