import { readFileSync } from 'node:fs'

let factory = null
const calls = []
globalThis.window = {
  __ModuleLoader__: { load: (m) => { factory = m.factory } },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {} },
}
globalThis.document = { documentElement: { style: {} }, addEventListener() {}, createElement: () => ({ style: {} }) }
globalThis.indexedDB = { open: () => ({}) }
globalThis.fetch = async (url, init) => {
  calls.push({ url, body: init && init.body })
  return { ok: true, status: 200, json: async () => ({ text: 'Hello world.', kind: 'text' }), blob: async () => new Blob() }
}
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64')

const effects = []
let stateIndex = 0
const stateQueue = []
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  Fragment: 'Fragment',
  useState: (init) => {
    const i = stateIndex++
    if (!(i in stateQueue)) stateQueue[i] = typeof init === 'function' ? init() : init
    const set = (v) => { stateQueue[i] = typeof v === 'function' ? v(stateQueue[i]) : v }
    return [stateQueue[i], set]
  },
  useEffect: (fn) => { effects.push(fn) },
  useLayoutEffect: (fn) => { effects.push(fn) },
  useRef: (v) => ({ current: v }),
  useMemo: (fn) => fn(), useCallback: (fn) => fn, useContext: () => ({}),
  useSyncExternalStore: (s, g) => g(),
}
const require = (n) => (n === 'react' ? React : {})

new Function('window', 'document', 'require', 'module', 'exports',
  readFileSync(new URL('../dsh-plugin/client.js', import.meta.url), 'utf8'))(
  globalThis.window, globalThis.document, require, {}, {})

const mod = factory(require)
const captured = {}
mod.apply({
  locale: { getLocale: () => 'zh-CN' },
  slots: { inject: (_n, fn) => fn(), register: (o, c) => { captured[o.name] = c; return () => {} } },
})

stateIndex = 0
const el = captured.main()
const tree = el.type(el.props)

// 找到带 ref 的框节点
let zoneEl = null
const walk = (node) => {
  if (!node || typeof node !== 'object') return
  if (node.props && node.props.ref) zoneEl = node
  ;(node.children || []).forEach(walk)
}
walk(tree)
console.log('框节点找到:', Boolean(zoneEl))

if (!zoneEl) { console.log('✗ 找不到投放框'); process.exit(1) }
if (zoneEl) {
  const listeners = {}
  zoneEl.props.ref.current = {
    contains: () => true,
    addEventListener: (type, fn) => { listeners[type] = fn },
    removeEventListener: () => {},
  }
  effects.forEach((fn) => fn())
  console.log('已注册监听:', Object.keys(listeners).join(', '))

  const file = { name: 'article.txt', size: 12, arrayBuffer: async () => new ArrayBuffer(12) }
  const event = {
    dataTransfer: { types: ['Files'], files: [file], items: [], dropEffect: '' },
    preventDefault() {}, stopPropagation() {},
  }
  const drop = listeners.drop
  if (drop) {
    await drop(event)
    await new Promise((r) => setTimeout(r, 30))
    console.log('fetch 调用:', calls.map((c) => c.url).join(', ') || '(无)')
    console.log('请求体片段:', (calls[0] && calls[0].body || '').slice(0, 60))
    const wrote = Boolean(stateQueue.find((v) => v === 'Hello world.'))
    console.log('文本状态:', wrote ? '已写入 ✓' : '未写入 ✗')
    if (!calls.some((c) => c.url.endsWith('/extract')) || !wrote) process.exit(1)
  } else {
    console.log('✗ drop 监听未注册')
    process.exit(1)
  }
}
