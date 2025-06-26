import { Chart } from "react-google-charts";
import { useMemo } from "react";
import styles from "./ChartRenderer.module.css";

export default function ChartRenderer({ members, highlightedId, chartEvents }) {
  const ROOT_NODE_ID = "Root";

  const chartData = useMemo(() => {
    const data = [
      [
        {
          v: ROOT_NODE_ID,
          f: "족보<div style='color:red; font-style:italic'>시작</div>",
        },
        "",
        "",
      ],
    ];
  
    members.forEach((member) => {
      const parent = member.parent_id ? member.parent_id.toString() : ROOT_NODE_ID;
      const isHighlighted = highlightedId?.toString() === member.id.toString();
  
      const node = {
        v: member.id.toString(),
        f: `
          <div data-id="${member.id}" class="${isHighlighted ? styles.highlightnode : ""}" style="text-align: center;">
            <div>${member.name}</div>
            ${member.hanja ? `<div>(${member.hanja})</div>` : ""}
            <div style="color:blue; font-style:italic;">${member.generation}세</div>
          </div>
        `,
      };
  
      data.push([node, parent, ""]);
    });
  
    return data;
  }, [members, highlightedId]);  

  return (
    <Chart
      chartType="OrgChart"
      data={chartData}
      options={{
        allowHtml: true,
        nodeClass: styles.orgNode,
        selectedNodeClass: styles.selectedOrgNode,
      }}
      width="100%"
      height="600px"
      chartEvents={chartEvents}
    />
  );
}
