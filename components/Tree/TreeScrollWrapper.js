import treeScroll from "../../utils/treeScroll.cjs";
import { useEffect, useRef, useState } from "react";
import ChartRenderer from "./ChartRenderer";
import styles from "./TreeScrollWrapper.module.css";

export default function TreeScrollWrapper({
  wrapperRef,
  zoomRender,
  members,
  focusId,
  clearFocusId,
  highlightedId,
  setHighlightedId,
  setLoading,
  setSelectedMember,
  isDragging,
}) {
  const dragStart = useRef({ x: 0, y: 0 });
  const scrollStart = useRef({ left: 0, top: 0 });
  const [chartReady,setChartReady]=useState(false);

  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;
    const wheel = event => treeScroll.scrollTreeWheel(container, event);
    container.addEventListener('wheel', wheel, {passive:false});
    return () => container.removeEventListener('wheel', wheel);
  }, [wrapperRef]);

  const handleMouseDown = (e) => {
    const modalElement = document.querySelector(`.${styles.modal}`);
    if (modalElement && modalElement.contains(e.target)) {
      return;
    }

    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    scrollStart.current = {
      left: wrapperRef.current.scrollLeft,
      top: wrapperRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    wrapperRef.current.scrollLeft = scrollStart.current.left - dx;
    wrapperRef.current.scrollTop = scrollStart.current.top - dy;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    if (!chartReady || !focusId || !members.length || !wrapperRef.current) return;
        const container = wrapperRef.current;
        let attempt = 0;
        let frame;
        let pageTimer;
        let loadingTimer;
        let canceled = false;

        const tryScroll = () => {
          if (canceled) return;
          const targetDiv = container.querySelector(
            `div[data-id="${focusId}"]`
          );
          if (targetDiv) {
            const rect = targetDiv.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const centerX =
              rect.left +
              rect.width / 2 -
              containerRect.left +
              container.scrollLeft;
            const centerY =
              rect.top +
              rect.height / 2 -
              containerRect.top +
              container.scrollTop;

            container.scrollTo({
              left: centerX - container.clientWidth / 2,
              top: centerY - container.clientHeight / 2,
              behavior: "smooth",
            });

            pageTimer = setTimeout(() => {
              const containerRect = container.getBoundingClientRect();
              const scrollToY =
                window.scrollY +
                containerRect.top +
                container.clientHeight / 2 -
                window.innerHeight / 2;

              window.scrollTo({
                top: scrollToY,
                behavior: "smooth",
              });
            }, 100);

            setHighlightedId(focusId);

            loadingTimer = setTimeout(() => { setLoading(false); clearFocusId?.(); }, 500);
          } else if (attempt++ < 30) {
            frame = requestAnimationFrame(tryScroll);
          } else {
            setLoading(false);
          }
        };

    frame = requestAnimationFrame(tryScroll);
    return () => { canceled = true; cancelAnimationFrame(frame); clearTimeout(pageTimer); clearTimeout(loadingTimer); };
  }, [chartReady, focusId, members, wrapperRef, clearFocusId, setHighlightedId, setLoading]);

  const chartEvents = [
    {
      eventName: "select",
      callback: ({ chartWrapper }) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length > 0) {
          const row = selection[0].row;
          if (row == null) return;
          const nodeId = chartWrapper.getDataTable().getValue(row, 0);
          const member = members.find((item) => String(item.id) === String(nodeId));
          if (member) setSelectedMember(member);
        }
      },
    },
    {
      eventName: "ready",
      callback: () => { setChartReady(true); },
    },
  ];

  return (
    <div
      className={styles.treeContainer}
      ref={wrapperRef}
      onKeyDown={event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        const id=event.target.closest('[data-id]')?.dataset.id;
        const member=members.find(item=>String(item.id)===id);
        if(member){event.preventDefault();setSelectedMember(member);}
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      tabIndex={0}
      role="region"
      aria-label="가계도. 방향키 또는 손가락으로 스크롤할 수 있습니다."
      style={{ userSelect: "none" }}
    >
      <div
        className={styles.innerZoomContainer}
        style={{
          transform: `scale(${zoomRender})`,
          transformOrigin: "top left",
        }}
      >
        <ChartRenderer
          members={members}
          highlightedId={highlightedId}
          chartEvents={chartEvents}
        />
      </div>
    </div>
  );
}
