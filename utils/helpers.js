// 각종 도움 함수들

export const formatGender = (gender) => {
  if (gender === "M") return "남";
  if (gender === "F") return "여";
  return "-";
};

export function formatInputDate(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  date.setHours(date.getHours() + 9);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-based
  const day = date.getDate();

  // 월일이 1월 1일이라면 실제 모르는 것으로 간주하고 연도만 표시
  if (month === 1 && day === 1) {
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
  formData.name && formData.parent_id;

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
