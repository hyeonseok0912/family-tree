import { useEffect, useMemo } from "react";
import styles from "./ChartRenderer.module.css";
import treeLayout from "../../utils/treeLayout.cjs";

export default function ChartRenderer({ members, highlightedId, onSelect, onReady }) {
  const layout = useMemo(() => treeLayout.layoutTree(members), [members]);

  useEffect(() => { onReady(); }, [layout, onReady]);

  return (
    <div className={styles.chart} style={{ width: layout.width, height: layout.height }}>
      <svg className={styles.connectors} width={layout.width} height={layout.height} aria-hidden="true">
        {layout.edges.map(edge => <path key={edge.childId} d={edge.path} />)}
      </svg>
      {layout.nodes.map(node => {
        const member = node.member;
        const highlighted = member && String(highlightedId) === node.id;
        const position = { left: node.x, top: node.y, width: layout.nodeWidth, height: layout.nodeHeight };
        return member ? (
          <button key={node.id} type="button" data-id={node.id}
            aria-label={`${member.name} 상세정보`} title={`${member.name}${member.hanja ? ` (${member.hanja})` : ""}`}
            className={`${styles.orgNode} ${highlighted ? styles.highlightnode : ""}`}
            style={position} onClick={() => onSelect(member)}>
            <span className={styles.name}>{member.name}</span>
            {member.hanja && <span className={styles.hanja}>({member.hanja})</span>}
            <span className={styles.generation}>{member.generation}세</span>
          </button>
        ) : (
          <div key={node.id} data-tree-root className={`${styles.orgNode} ${styles.root}`} style={position}>
            <span>족보</span><span className={styles.rootLabel}>시작</span>
          </div>
        );
      })}
    </div>
  );
}
