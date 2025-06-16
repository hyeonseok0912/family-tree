// 각종 도움 함수들

export const formatGender = (gender) => (gender === "M" ? "남" : "여");

export const formatDate = (dateStr) => (dateStr ? dateStr : "-");

export const getParentLabel = (member) =>
  member ? `${member.name} (${member.birth_date || "?"})` : "";

export const filterMembersByName = (members, input) =>
  members.filter((m) => m.name.includes(input.trim()));

export const isRequiredFilled = (formData) =>
  formData.name && formData.gender && formData.birth_date && formData.parent_id;