// Copies the skill from the repository root into this package.
//
// Why copy instead of commit: one SKILL.md in the repo, one copy in the built
// package. Keeping both in git would make `npx skills add` see the same skill
// twice, and the copy is generated so it never drifts by hand.
//
// Usage: node sync-skill.mjs

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(packageDir, '..')
const target = join(packageDir, 'skills', 'english-reading-analysis')

const required = ['SKILL.md', 'references', 'scripts', 'assets']
for (const entry of required) {
  if (!existsSync(join(repoRoot, entry))) {
    console.error(`error: ${entry} not found in ${repoRoot}`)
    process.exit(1)
  }
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const entry of required) {
  cpSync(join(repoRoot, entry), join(target, entry), { recursive: true })
}

// The screenshots only serve the README; keep the package lean.
rmSync(join(target, 'assets', 'screenshots'), { recursive: true, force: true })

console.log(`synced skill -> ${target}`)
