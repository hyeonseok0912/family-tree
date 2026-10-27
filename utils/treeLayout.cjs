const { sortTreeMembers } = require('./siblingOrder.cjs');

// Cards and connectors share coordinates, independent of table span limits.
function layoutTree(members) {
  const nodeWidth = 88, nodeHeight = 88, columnGap = 24, rowGap = 20, padding = 24;
  const root = { id: 'Root', member: null, children: [] };
  const byId = new Map(members.map(member => [String(member.id), {
    id: String(member.id), member, children: [],
  }]));
  for (const member of sortTreeMembers(members)) {
    const node = byId.get(String(member.id));
    const parent = byId.get(String(member.parent_id));
    (parent && parent !== node ? parent : root).children.push(node);
  }
  const visited = new Set();
  function visit(node, depth) {
    visited.add(node.id);
    node.depth = depth;
    node.children = node.children.filter(child => !visited.has(child.id));
    for (const child of node.children) visit(child, depth + 1);
  }
  visit(root, 0);
  // Keep disconnected records visible and break malformed cycles.
  for (const node of byId.values()) {
    if (!visited.has(node.id)) {
      root.children.push(node);
      visit(node, 1);
    }
  }
  // Pack branches by their occupied space at each generation. Empty space at
  // another generation need not push an entire branch sideways.
  function arrange(node) {
    const left = [], right = [], offsets = [];
    for (const child of node.children) {
      arrange(child);
      let offset = 0;
      for (let depth = 0; depth < child.leftContour.length; depth++) {
        if (right[depth] != null) {
          offset = Math.max(offset, right[depth] + nodeWidth + columnGap - child.leftContour[depth]);
        }
      }
      offsets.push(offset);
      for (let depth = 0; depth < child.leftContour.length; depth++) {
        const min = child.leftContour[depth] + offset;
        const max = child.rightContour[depth] + offset;
        left[depth] = left[depth] == null ? min : Math.min(left[depth], min);
        right[depth] = right[depth] == null ? max : Math.max(right[depth], max);
      }
    }
    // Center over the immediate children, not the extent of all descendants.
    // In particular, a single-child lineage always stays perfectly vertical.
    const center = offsets.length ? (offsets[0] + offsets[offsets.length - 1]) / 2 : 0;
    node.children.forEach((child, index) => { child.offset = offsets[index] - center; });
    node.leftContour = [0, ...left.map(x => x - center)];
    node.rightContour = [0, ...right.map(x => x - center)];
  }
  arrange(root);
  const minX = Math.min(...root.leftContour), maxX = Math.max(...root.rightContour);
  const nodes = [], edges = [];
  function place(node, centerX) {
    node.x = centerX - nodeWidth / 2;
    node.y = padding + node.depth * (nodeHeight + rowGap);
    nodes.push(node);
    for (const child of node.children) {
      place(child, centerX + child.offset);
      const x1 = node.x + nodeWidth / 2, y1 = node.y + nodeHeight;
      const x2 = child.x + nodeWidth / 2, y2 = child.y;
      const middle = y1 + rowGap / 2;
      edges.push({ parentId: node.id, childId: child.id, x1, y1, x2, y2,
        path: `M ${x1} ${y1} V ${middle} H ${x2} V ${y2}` });
    }
  }
  place(root, padding + nodeWidth / 2 - minX);
  return { nodes, edges, nodeWidth, nodeHeight, width: maxX - minX + nodeWidth + padding * 2,
    height: nodes.reduce((max, node) => Math.max(max, node.y), 0) + nodeHeight + padding };
}
module.exports = { layoutTree };
