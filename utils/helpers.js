// 각종 도움 함수들

export const formatGender = (gender) => (gender === "M" ? "남" : "여");

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export const getParentLabel = (member) =>
  member ? `${member.name} (${member.birth_date || "?"})` : "";

export const filterMembersByName = (members, input) =>
  members.filter((m) => m.name.includes(input.trim()));

export const isRequiredFilled = (formData) =>
  formData.name && formData.gender && formData.birth_date && formData.parent_id;

export const sanitizeFormData = (data) => {
  const sanitize = (val) => (val === "" ? null : val);
  return {
    ...data,
    hanja: sanitize(data.hanja),
    birth_date: sanitize(data.birth_date),
    death_date: sanitize(data.death_date),
    mother_nm: sanitize(data.mother_nm),
    notes: sanitize(data.notes),
  };
};
