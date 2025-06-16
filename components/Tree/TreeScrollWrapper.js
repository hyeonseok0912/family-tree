import { useEffect, useRef } from "react";
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
  const hasFocused = useRef(false);

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
    const container = wrapperRef.current;
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp);
    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);
      container.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const chartEvents = [
    {
      eventName: "select",
      callback: ({ chartWrapper }) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length > 0) {
          setSelectedMember(members[selection[0].row]);
        }
      },
    },
    {
      eventName: "ready",
      callback: () => {
        if (
          !focusId ||
          members.length === 0 ||
          !wrapperRef.current ||
          hasFocused.current
        )
          return;

        hasFocused.current = true;
        const container = wrapperRef.current;
        let attempt = 0;

        const tryScroll = () => {
          const targetDiv = container.querySelector(
            `div[data-id="${focusId}"]`
          );
          if (targetDiv) {
            const rect = targetDiv.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const centerX =
              rect.left +
              rect.width / 2 - containerRect.left +
              container.scrollLeft;
            const centerY =
              rect.top +
              rect.height / 2 - containerRect.top +
              container.scrollTop;

            container.scrollTo({
              left: centerX - container.clientWidth / 2,
              top: centerY - container.clientHeight / 2,
              behavior: "smooth",
            });

            setHighlightedId(focusId);
            clearFocusId?.();
            setTimeout(() => setLoading(false), 500);
          } else if (attempt++ < 30) {
            requestAnimationFrame(tryScroll);
          } else {
            setLoading(false);
          }
        };

        setTimeout(() => requestAnimationFrame(tryScroll), 100);
      },
    },
  ];

  return (
    <div
      className={styles.treeContainer}
      ref={wrapperRef}
      onMouseDown={handleMouseDown}
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
