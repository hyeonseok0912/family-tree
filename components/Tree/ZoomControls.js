import styles from "./ZoomControls.module.css";

export default function ZoomControls({ onZoom }) {
  return (
    <div className={styles.zoomControls}>
      <button
        onClick={(e) =>
          onZoom(0.2, window.innerWidth / 2, window.innerHeight / 2)
        }
      >
        ＋
      </button>
      <button
        onClick={(e) =>
          onZoom(-0.2, window.innerWidth / 2, window.innerHeight / 2)
        }
      >
        －
      </button>
    </div>
  );
}
