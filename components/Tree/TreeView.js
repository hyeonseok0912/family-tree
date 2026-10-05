import { useState, useRef, useEffect } from "react";
import ZoomControls from "./ZoomControls";
import TreeScrollWrapper from "./TreeScrollWrapper";
import LoadingOverlay from "./LoadingOverlay";
import ModalDetail from "../Modal/ModalDetail";
import styles from "./TreeView.module.css";
import ExportButtons from "../UI/ExportButtons";

export default function TreeView({
  searchQuery,
  focusId,
  clearFocusId,
  highlightedId,
  setHighlightedId,
  isAdmin,
  onShowInTree,
}) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomRender, setZoomRender] = useState(1);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const zoomRef = useRef(1);
  const wrapperRef = useRef(null);
  const isDragging = useRef(false);
  const treeRef = useRef(null);
  const hasSearch=!!(searchQuery?.name||searchQuery?.startYear||searchQuery?.endYear);
  const matches=hasSearch?members.filter(member=>{
    const year=member.birth_date?Number(String(member.birth_date).slice(0,4)):null;
    return (!searchQuery.name||member.name.includes(searchQuery.name)) &&
      (!searchQuery.startYear||(year!=null&&year>=Number(searchQuery.startYear))) &&
      (!searchQuery.endYear||(year!=null&&year<=Number(searchQuery.endYear)));
  }):[];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
  
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/tablelist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort: "asc" }),
        });
        if (!res.ok) throw new Error("가계도 조회 실패");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("잘못된 가계도 응답");
        if (!active) return;
        setMembers(data);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error("데이터 로딩 실패:", err);
        setError("가계도를 불러오지 못했습니다.");
        setLoading(false);
      }
    };
  
    fetchMembers();
    return () => { active = false; };
  }, [loadAttempt]);

  const handleZoom = (delta, clientX, clientY) => {
    const container = wrapperRef.current;
    if (!container) return;

    const prevZoom = zoomRef.current;
    const nextZoom = Math.min(Math.max(prevZoom + delta, 0.5), 2);
    if (nextZoom === prevZoom) return;

    const rect = container.getBoundingClientRect();
    const offsetX = clientX - rect.left + container.scrollLeft;
    const offsetY = clientY - rect.top + container.scrollTop;

    zoomRef.current = nextZoom;

    requestAnimationFrame(() => {
      setZoomRender(nextZoom);
      container.scrollLeft =
        offsetX * (nextZoom / prevZoom) - (clientX - rect.left);
      container.scrollTop =
        offsetY * (nextZoom / prevZoom) - (clientY - rect.top);
    });
  };

  const handleModalClose = () => {
    setSelectedMember(null);
    isDragging.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = "auto";
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  return (
    <div className={styles.treeContainer}>
      {hasSearch&&!loading&&<section className={styles.searchResults} aria-label="가계도 검색 결과"><p>검색 결과 {matches.length}명 · 인물을 선택하면 가계도에서 강조합니다.</p>{matches.slice(0,50).map(member=><button key={member.id} onClick={()=>onShowInTree(member.id)}>{member.name} · {member.generation}세 · #{member.id}</button>)}{matches.length>50&&<p>앞의 50명을 표시했습니다. 이름 또는 연도 범위를 좁혀주세요.</p>}</section>}
      <ExportButtons targetRef={treeRef} fileName="family_tree" />

      <div ref={treeRef}>
        <div className={styles.treeWrapper}>
          <ZoomControls onZoom={handleZoom} />

          {loading ? (
            <LoadingOverlay />
          ) : error ? (
            <div role="alert">{error} <button onClick={() => setLoadAttempt((value) => value + 1)}>다시 불러오기</button></div>
          ) : (
            <TreeScrollWrapper
              wrapperRef={wrapperRef}
              zoomRender={zoomRender}
              members={members}
              focusId={focusId}
              clearFocusId={clearFocusId}
              highlightedId={highlightedId}
              setHighlightedId={setHighlightedId}
              setLoading={setLoading}
              setSelectedMember={setSelectedMember}
              isDragging={isDragging}
            />
          )}

          {selectedMember && (
            <ModalDetail
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
              onUpdated={(updated) => {
                setLoadAttempt(value=>value+1);
                setSelectedMember(updated);
              }}
              isAdmin={isAdmin}
              onShowInTree={(id)=>{setSelectedMember(null);onShowInTree(id);}}
              onDeleted={(id)=>{setMembers(prev=>prev.filter(m=>m.id!==id));setSelectedMember(null);}}
            />
          )}

        </div>
      </div>
    </div>
  );
}
