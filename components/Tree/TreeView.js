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
}) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomRender, setZoomRender] = useState(1);

  const zoomRef = useRef(1);
  const wrapperRef = useRef(null);
  const isDragging = useRef(false);
  const treeRef = useRef(null);

  useEffect(() => {
    setLoading(true);

    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/tablelist?sort=asc");
        const data = await res.json();
        setMembers(data);
        setLoading(false);
      } catch (err) {
        console.error("데이터 로딩 실패:", err);
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

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
      <ExportButtons targetRef={treeRef} fileName="family_tree" />

      <div ref={treeRef}>
        <div className={styles.treeWrapper}>
          <ZoomControls onZoom={handleZoom} />

          {loading ? (
            <LoadingOverlay />
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
                setMembers((prev) =>
                  prev.map((m) => (m.id === updated.id ? updated : m))
                );
                setSelectedMember(updated);
              }}
              isAdmin={isAdmin}
            />
          )}

          {loading && <LoadingOverlay />}
        </div>
      </div>
    </div>
  );
}
