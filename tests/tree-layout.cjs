const assert = require('node:assert/strict');
const { layoutTree } = require('../utils/treeLayout.cjs');

function verify(members) {
  const tree = layoutTree(members);
  assert.equal(tree.nodes.length, members.length + 1);
  assert.equal(tree.edges.length, members.length);
  const nodes = new Map(tree.nodes.map(node => [node.id, node]));
  for (const edge of tree.edges) {
    const parent = nodes.get(edge.parentId), child = nodes.get(edge.childId);
    assert.equal(edge.x1, parent.x + tree.nodeWidth / 2);
    assert.equal(edge.y1, parent.y + tree.nodeHeight);
    assert.equal(edge.x2, child.x + tree.nodeWidth / 2);
    assert.equal(edge.y2, child.y);
    assert.equal(child.depth, parent.depth + 1);
  }
  const rows = new Map();
  for (const node of tree.nodes) {
    if (node.children.length) {
      const first = node.children[0], last = node.children[node.children.length - 1];
      assert.ok(Math.abs(node.x - (first.x + last.x) / 2) < 1e-8,
        'parent stays centered over immediate children, including single-child chains');
    }
    assert.ok(node.x >= 0 && node.x + tree.nodeWidth <= tree.width);
    assert.ok(node.y >= 0 && node.y + tree.nodeHeight <= tree.height);
    if (!rows.has(node.depth)) rows.set(node.depth, []);
    rows.get(node.depth).push(node);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) assert.ok(row[i].x >= row[i-1].x + tree.nodeWidth + 24 - 1e-8);
  }
  return tree;
}

const chain = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `손${i+1}`, parent_id: i || null }));
verify([]);
verify(chain);
// More than 1,000 table columns: broad branches plus the six-generation chain.
verify([...chain, ...Array.from({ length: 1200 }, (_, i) => ({ id: i + 10, parent_id: 2 }))]);
verify([{ id: 1, parent_id: 2 }, { id: 2, parent_id: 1 }, { id: 3, parent_id: 999 }]);
const siblings = verify([{ id: 1 }, { id: 2, parent_id: 1 }, { id: 3, parent_id: 1 }]);
assert.ok(siblings.nodes.find(n => n.id === '3').x < siblings.nodes.find(n => n.id === '2').x);
// A wide branch beside a childless sibling must use the empty lower rows,
// without reserving the wide branch's entire rectangle at every generation.
const asymmetric = verify([{ id: 1 }, { id: 2, parent_id: 1 }, { id: 3, parent_id: 1 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: i + 10, parent_id: 2 }))]);
const a = asymmetric.nodes.find(n => n.id === '2'), b = asymmetric.nodes.find(n => n.id === '3');
assert.equal(Math.abs(a.x - b.x), asymmetric.nodeWidth + 24);
// Mixed-depth, unequal branches exercise contour merging on many generations.
verify(Array.from({ length: 500 }, (_, i) => ({ id: i + 1,
  parent_id: i === 0 ? null : Math.max(1, Math.floor((i + 1) / 3)) })));
console.log('PASS: parent centering, compact asymmetric branches, six generations, 1,200 siblings, connector endpoints, spacing, sibling order and malformed relations');
