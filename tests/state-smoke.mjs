import { readFileSync } from 'node:fs'
let factory = null
globalThis.window = { __ModuleLoader__: { load: (m) => { factory = m.factory } }, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), localStorage: { getItem: () => null } }
globalThis.document = { documentElement: { style: {} }, addEventListener() {}, createElement: () => ({ style: {} }) }
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' })
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  Fragment: 'Fragment',
  useState: (init) => { const i = seq++; if (!(i in seed)) seed[i] = typeof init === 'function' ? init() : init; return [seed[i], () => {}] },
  useEffect: () => {}, useRef: (v) => ({ current: v }), useMemo: (f) => f(), useCallback: (f) => f,
  useContext: () => ({}), useSyncExternalStore: (s, g) => g(),
}
let seq = 0
let seed = {}
const require = (n) => (n === 'react' ? React : {})
new Function('window', 'document', 'require', 'module', 'exports',
  readFileSync(new URL('../dsh-plugin/client.js', import.meta.url), 'utf8'))(globalThis.window, globalThis.document, require, {}, {})
const mod = factory(require)
const captured = {}
mod.apply({ locale: { getLocale: () => 'zh-CN' }, slots: { inject: (_n, f) => f(), register: (o, c) => { captured[o.name] = c; return () => {} } } })

const cases = {
  '空': {},
  '扫描件已载入': { 0: '', 1: 'scan.pdf', 2: { size: 2180000 }, 3: [{ mediaType: 'image/png', data: 'x' }], 4: false, 5: true, 6: false, 7: false, 8: 'input' },
  '文本已载入': { 0: 'Hello world.', 1: 'a.txt', 2: { size: 12 }, 3: [], 4: false, 5: true, 6: false, 7: false, 8: 'input' },
  '失败': { 0: '', 1: 'bad.pdf', 2: { size: 10 }, 3: [], 4: false, 5: false, 6: false, 7: true, 8: 'input' },
  '分析中': { 0: '', 1: 'scan.pdf', 2: { size: 2180000 }, 3: [{ mediaType: 'image/png', data: 'x' }], 4: false, 5: true, 6: false, 7: false, 8: 'running', 13: 42 },
}
for (const [label, s] of Object.entries(cases)) {
  seed = { ...s }; seq = 0
  try {
    const el = captured.main()
    const tree = el.type(el.props)
    // 打印框内子节点类型，确认渲染分支
    const find = (n, acc = []) => { if (!n || typeof n !== 'object') return acc; if (n.props && n.props.style && n.props.style.borderStyle === 'dashed') acc.push(n); (n.children || []).forEach((c) => find(c, acc)); return acc }
    const zones = find(tree)
    const flat = []
    const collect = (n) => {
      if (!n) return
      if (typeof n === 'string') { flat.push(n); return }
      if (Array.isArray(n)) { n.forEach(collect); return }
      ;(n.children || []).forEach(collect)
    }
    collect(tree)
    const expect = { '空': '把英文粘贴到这里', '扫描件已载入': '已载入', '失败': '读取失败', '分析中': '正在分析' }
    const forbid = { '分析中': '已载入' }
    const want = expect[label]
    const banned = forbid[label]
    const ok = (want ? flat.some((t) => String(t).includes(want)) : true) &&
      (!banned || !flat.some((t) => String(t).includes(banned)))
    console.log(`${label.padEnd(8)} ${ok ? '✓' : '✗ 期望包含'}${want || ''}`)
    if (!ok) process.exitCode = 1
  } catch (e) {
    console.log(`${label.padEnd(8)} ✗ 渲染抛错: ${e.message}`)
  }
}
