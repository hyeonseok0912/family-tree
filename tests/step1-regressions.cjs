const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const swc = require('next/dist/build/swc');

async function load(relativePath, overrides = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const { code } = await swc.transform(fs.readFileSync(filename, 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2020' },
    module: { type: 'commonjs' },
  });
  const module = { exports: {} };
  const mockReact = {
    useMemo: (callback) => callback(),
    useCallback: (callback) => callback,
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, () => {}],
  };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.endsWith('treeScroll.cjs')) return require('../utils/treeScroll.cjs');
      if (name === 'react') return mockReact;
      if (name.endsWith('.css')) return {};
      if (name === 'react-google-charts') return { Chart: () => null };
      if (name === './ChartRenderer') return { default: () => null, __esModule: true };
      if (name.includes('utils/helpers')) return { getParentLabel: () => '', filterMembersByName: (items) => items };
      return require(name);
    },
  });
  return module.exports.default;
}

(async () => {
  const members = [
    { id: 10, name: '<img src=x onerror=alert(1)>', hanja: '孫&<', generation: 1 },
    { id: 20, name: '둘째', generation: 2, parent_id: 10 },
  ];
  const ChartRenderer = await load('components/Tree/ChartRenderer.js');
  const chart = ChartRenderer({ members, chartEvents: [] });
  const data = chart.props.data;
  assert.equal(data[0][0].v, 'Root');
  assert.equal(data[1][0].v, '10');
  assert.ok(data[1][0].f.includes('&lt;img'));
  assert.ok(data[1][0].f.includes('孫&amp;&lt;'));
  assert.ok(!data[1][0].f.includes('<img'));
  console.log('PASS: chart values escape HTML while preserving node IDs');

  let selected = null;
  const Wrapper = await load('components/Tree/TreeScrollWrapper.js');
  const wrapper = Wrapper({ members, wrapperRef: { current: null }, isDragging: { current: false }, setSelectedMember: (member) => { selected = member; } });
  const select = wrapper.props.children.props.children.props.chartEvents[0].callback;
  const choose = (row) => select({ chartWrapper: {
    getChart: () => ({ getSelection: () => [{ row }] }),
    getDataTable: () => ({ getValue: (index) => data[index][0].v }),
  } });
  choose(0);
  assert.equal(selected, null);
  choose(1);
  assert.equal(selected.id, 10);
  choose(2);
  assert.equal(selected.id, 20);
  console.log('PASS: root ignored and first/last nodes select the correct member');

  let formData = { parent_id: 10, generation: '2', mother_nm: '기존 모', name: '자녀' };
  const useParentSelection = await load('components/hooks/useParentSelection.js');
  const parent = useParentSelection((update) => { formData = update(formData); });
  parent.handleParentInputChange({ target: { value: '다른 부모' } });
  assert.equal(formData.parent_id, '');
  assert.equal(formData.generation, '');
  assert.equal(formData.mother_nm, '');
  assert.equal(formData.name, '자녀');
  parent.handleParentSelect({ id: 30, generation: 5 });
  assert.equal(formData.parent_id, 30);
  assert.equal(formData.generation, '6');
  console.log('PASS: editing parent text clears stale relation; selecting recalculates generation');

  const FormField = await load('components/Form/FormField.js');
  for (const variant of [{}, { multiline: true }, { type: 'select', options: [] }]) {
    const field = FormField({ label: '이름', name: 'name', value: '', required: true, maxLength: 20, ...variant });
    const input = field.props.children[1];
    assert.equal(input.props.required, true);
    if (variant.type !== 'select') assert.equal(input.props.maxLength, 20);
  }
  console.log('PASS: required and maxLength reach actual form controls');

  let prompts = 0;
  let closes = 0;
  let confirmed = false;
  const useConfirmOnClose = await load('components/hooks/useConfirmOnClose.js', {
    sweetalert2: { fire: async () => { prompts++; return { isConfirmed: confirmed }; } },
  });
  const baseline = { formData: { name: '선조' }, spouses: [], newSpouse: '' };
  await useConfirmOnClose(baseline, baseline, () => { closes++; })();
  assert.equal(prompts, 0);
  assert.equal(closes, 1);
  await useConfirmOnClose(baseline, { ...baseline, spouses: [{ spouse_nm: '배우자', order_no: 1 }] }, () => { closes++; })();
  assert.equal(prompts, 1);
  assert.equal(closes, 1);
  confirmed = true;
  await useConfirmOnClose(baseline, { ...baseline, newSpouse: '입력 중' }, () => { closes++; })();
  assert.equal(prompts, 2);
  assert.equal(closes, 2);
  console.log('PASS: spouse-only and pending input changes prompt; cancellation preserves the modal');

  const Pagination = await load('components/UI/Pagination.js');
  const pagination = Pagination({ currentPage: 1, totalPages: 0, itemsPerPage: 10 });
  const controls = pagination.props.children[0].props.children;
  assert.equal(controls[3].props.disabled, true);
  assert.equal(controls[4].props.disabled, true);
  console.log('PASS: zero results disable next and last page controls');
})().catch((error) => { console.error(error); process.exitCode = 1; });
