// API 요청을 처리하는 함수들

export const fetchAdminMemo = async () => {
  const res = await fetch("/api/adminmemo", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "get" }),
  });
  if (!res.ok) throw new Error("메모 조회 실패");
  const data = await res.json();
  if (typeof data.content !== "string") throw new Error("잘못된 메모 응답");
  return data.content;
};

export const saveAdminMemo = async (content) => {
  const res = await fetch("/api/adminmemo", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", content }),
  });
  if (!res.ok) throw new Error("메모 저장 실패");
  const data = await res.json();
  if (data.success !== true) throw new Error("메모 저장 실패");
};

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

// 배우자 목록 조회
export async function fetchSpousesByMemberId(memberId) {
  const res = await fetch("/api/getspouses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member_id: memberId }),
  });

  if (!res.ok) throw new Error("배우자 정보를 불러올 수 없습니다.");
  return res.json();
}


// 날짜 전처리
const sanitizeDates = (data) => ({
  ...data,
  birth_date: data.birth_date === "" ? null : data.birth_date,
  death_date: data.death_date === "" ? null : data.death_date,
});

// 수정
export const updatemember = async (data) => {
  const sanitized = sanitizeDates(data);
  const res = await fetch(`/api/updatemember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitized),
  });
  if (!res.ok) {const error=await res.json();throw new Error(error.message||"멤버 수정 실패");}
  return await res.json();
};

// 생성
export const createmember = async (data) => {
  const sanitized = sanitizeDates(data);
  const res = await fetch(`/api/createmember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sanitized),
  });
  if (!res.ok) {const error=await res.json();throw new Error(error.message||"멤버 생성 실패");}
  return await res.json();
};

