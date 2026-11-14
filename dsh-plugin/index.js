// Registers the english-reading-analysis skill into the Harness skill catalog.
//
// The skill body lives at ./skills/english-reading-analysis, populated by
// sync-skill.mjs from the repository root so this package can be published on
// its own without keeping a second copy of SKILL.md in version control.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))
const skillDir = join(packageDir, 'skills', 'english-reading-analysis')

export const inject = ['skills']

/** Split YAML frontmatter from the Markdown body without pulling in a parser. */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { meta: {}, body: raw }

  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!entry) continue
    let value = entry[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    meta[entry[1]] = value
  }
  return { meta, body: raw.slice(match[0].length) }
}

export function apply(ctx) {
  ctx.effect(() => {
    const raw = readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
    const { meta, body } = parseFrontmatter(raw)

    return ctx.skills.register({
      name: meta.name || 'english-reading-analysis',
      description: meta.description || '把英语阅读材料转成中文分析并输出可打印 A4 PDF。',
      content: body,
      source: 'custom',
      // Relative paths inside SKILL.md (references/, scripts/, assets/) resolve
      // against this directory, so the bundled copy must keep the same layout.
      resourceBase: { kind: 'directory', path: skillDir },
      invocation: { modelInvocable: true, userInvocable: true },
    })
  })
}
