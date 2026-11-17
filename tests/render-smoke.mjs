import { readFileSync } from 'node:fs'

let factory = null
globalThis.window = {
  __ModuleLoader__: { load: (mod) => { factory = mod.factory } },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {} },
  fetch: async () => ({ ok: true, json: async () => ({}), text: async () => '' }),
  location: { href: 'http://127.0.0.1/' },
  getComputedStyle: () => ({}),
}
globalThis.document = { documentElement: { style: {} }, addEventListener() {}, createElement: () => ({ style: {}, appendChild() {} }) }
globalThis.indexedDB = { open: () => ({ onsuccess: null, onerror: null, onupgradeneeded: null }) }
globalThis.fetch = globalThis.window.fetch
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64')
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)

// 极简 React 替身
const noop = () => {}
let stateIndex = 0
const stateQueue = []
const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'Fragment',
  useState: (init) => {
    const i = stateIndex++
    if (!(i in stateQueue)) stateQueue[i] = typeof init === 'function' ? init() : init
    return [stateQueue[i], (v) => { stateQueue[i] = typeof v === 'function' ? v(stateQueue[i]) : v }]
  },
  useEffect: noop, useLayoutEffect: noop, useRef: (v) => ({ current: v }),
  useMemo: (fn) => fn(), useCallback: (fn) => fn, useContext: () => ({}),
  useSyncExternalStore: (sub, get) => get(),
}
const require = (name) => (name === 'react' ? React : (name === 'react-dom' ? { createRoot: () => ({ render: noop }) } : {}))

const src = readFileSync(new URL('../dsh-plugin/client.js', import.meta.url), 'utf8')
new Function('window', 'document', 'require', 'module', 'exports', src)(globalThis.window, globalThis.document, require, {}, {})

if (!factory) { console.log('✗ 模块未注册'); process.exit(1) }
// 样式/文案键必须齐全：缺失只会静默降级，界面上看不出来
{
  const css = readFileSync(new URL('../dsh-plugin/client.js', import.meta.url), 'utf8')
  const block = css.slice(css.indexOf('const styles = {'))
  const defined = new Set([...block.matchAll(/^\s{6}([a-zA-Z]+):/gm)].map((m) => m[1]))
  const used = new Set([...css.matchAll(/styles\.([a-zA-Z]+)/g)].map((m) => m[1]))
  const missing = [...used].filter((k) => !defined.has(k))
  if (missing.length) { console.log('✗ 缺少样式键:', missing.join(', ')); process.exit(1) }
  const zhBlock = css.slice(css.indexOf('const TEXT_ZH = {'), css.indexOf('const TEXT_EN = {'))
  const zh = new Set([...zhBlock.matchAll(/^\s{6}([a-zA-Z]+):/gm)].map((m) => m[1]))
  const usedT = new Set([...css.matchAll(/(?<![A-Za-z0-9_])t\('([a-zA-Z]+)'\)/g)].map((m) => m[1]))
  const missingT = [...usedT].filter((k) => !zh.has(k))
  if (missingT.length) { console.log('✗ 缺少文案键:', missingT.join(', ')); process.exit(1) }
  console.log('✓ 样式与文案键齐全')
}
console.log('✓ 模块注册成功')

const mod = factory(require)
const exported = Object.keys(mod || {})
console.log('导出:', exported.join(', '))

// 找到 Panel 组件并渲染一次
const findPanel = (o, depth = 0) => {
  if (!o || depth > 3) return null
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (typeof v === 'function' && /Panel/.test(k)) return v
    if (v && typeof v === 'object') { const r = findPanel(v, depth + 1); if (r) return r }
  }
  return null
}
// 通过 apply() 拿到注册的槽位组件
const captured = {}
const context = {
  locale: { getLocale: () => 'zh-CN' },
  slots: {
    inject: (_name, fn) => fn(),
    register: (opts, comp) => { captured[opts.name] = comp; return () => {} },
  },
}
try {
  mod.apply(context)
  console.log('✓ apply 成功，槽位:', Object.keys(captured).join(', '))
} catch (error) {
  console.log('✗ apply 抛错:', error.message)
  process.exit(1)
}
try {
  stateIndex = 0
  const main = captured.main
  const el = main()
  const tree = el.type(el.props)
  console.log('✓ Panel 渲染成功，根节点:', tree && (tree.type === 'div' ? 'div' : tree.type))
} catch (error) {
  console.log('✗ Panel 渲染抛错:', error.message)
  process.exit(1)
  console.log((error.stack || '').split('\n').slice(1, 5).join('\n'))
}
