// API 요청을 처리하는 함수들

export const fetchAllMembers = async (sort = "asc", query = {}) => {
    const params = new URLSearchParams({ sort, ...query });
    const res = await fetch(`/api/tablelist?${params.toString()}`);
    if (!res.ok) throw new Error("데이터 불러오기 실패");
    return await res.json();
  };
  
  export const fetchMemberById = async (id) => {
    const res = await fetch(`/api/member?id=${id}`);
    if (!res.ok) throw new Error("멤버 조회 실패");
    return await res.json();
  };
  
  export const updateMember = async (data) => {
    const res = await fetch(`/api/updatemember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("멤버 수정 실패");
    return await res.json();
  };
  
  export const createMember = async (data) => {
    const res = await fetch(`/api/createmember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("멤버 생성 실패");
    return await res.json();
  };
  