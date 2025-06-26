// API 요청을 처리하는 함수들

export const fetchAllMembers = async (sort = "asc", query = {}) => {
  const res = await fetch(`/api/tablelist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sort, ...query }),
  });
  if (!res.ok) throw new Error("데이터 불러오기 실패");
  return await res.json();
};

export const fetchMemberById = async (id) => {
  const res = await fetch(`/api/member`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("멤버 조회 실패");
  return await res.json();
};
  
// 날짜 전처리
const sanitizeDates = (data) => ({
  ...data,
  birth_date: data.birth_date === "" ? null : data.birth_date,
  death_date: data.death_date === "" ? null : data.death_date,
});

// 수정
export const updateMember = async (data) => {
  const sanitized = sanitizeDates(data);
  const res = await fetch(`/api/updatemember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitized),
  });
  if (!res.ok) throw new Error("멤버 수정 실패");
  return await res.json();
};

// 생성
export const createMember = async (data) => {
  const sanitized = sanitizeDates(data);
  const res = await fetch(`/api/createmember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitized),
  });
  if (!res.ok) throw new Error("멤버 생성 실패");
  return await res.json();
};

  