import type { AgentDefinition, InstalledSkill, SkillMeta } from '~/types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { AGENTS, expandHome } from '~/core/agents'

/**
 * 解析 SKILL.md 的 frontmatter
 */
export function parseSkillMeta(content: string): SkillMeta | undefined {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match)
    return undefined

  const frontmatter = match[1]
  const meta: Record<string, unknown> = {}

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1)
      continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
    meta[key] = value
  }

  return {
    name: (meta.name as string) || '',
    description: (meta.description as string) || '',
    version: meta.version as string | undefined,
    author: meta.author as string | undefined,
    metadata: meta.metadata as Record<string, unknown> | undefined,
  }
}

/**
 * 扫描单个 agent 目录下的已安装 skills
 */
function scanAgentSkills(agent: AgentDefinition, baseDir: string): InstalledSkill[] {
  const skillsDir = resolve(baseDir, agent.projectDir)

  if (!existsSync(skillsDir))
    return []

  const entries = readdirSync(skillsDir, { withFileTypes: true })
  const skills: InstalledSkill[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink())
      continue

    const skillDir = join(skillsDir, entry.name)
    if (!existsSync(skillDir))
      continue

    const skillMdPath = join(skillDir, 'SKILL.md')

    let meta: SkillMeta | undefined
    if (existsSync(skillMdPath)) {
      const content = readFileSync(skillMdPath, 'utf-8')
      meta = parseSkillMeta(content)
    }

    skills.push({
      name: entry.name,
      path: skillDir,
      agent,
      meta,
    })
  }

  return skills
}

/**
 * 扫描本地已安装的所有 skills（项目级）
 */
export function scanLocalSkills(cwd?: string): Map<string, InstalledSkill[]> {
  const baseDir = resolve(cwd || process.cwd())
  const result = new Map<string, InstalledSkill[]>()

  for (const agent of AGENTS) {
    const skills = scanAgentSkills(agent, baseDir)
    if (skills.length > 0) {
      result.set(agent.id, skills)
    }
  }

  return result
}

/**
 * 扫描全局已安装的 skills（用户级）
 */
export function scanGlobalSkills(): Map<string, InstalledSkill[]> {
  const result = new Map<string, InstalledSkill[]>()

  for (const agent of AGENTS) {
    const globalDir = expandHome(agent.globalDir)
    if (!existsSync(globalDir))
      continue

    const entries = readdirSync(globalDir, { withFileTypes: true })
    const skills: InstalledSkill[] = []

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink())
        continue

      const skillDir = join(globalDir, entry.name)
      if (!existsSync(skillDir))
        continue

      const skillMdPath = join(skillDir, 'SKILL.md')

      let meta: SkillMeta | undefined
      if (existsSync(skillMdPath)) {
        const content = readFileSync(skillMdPath, 'utf-8')
        meta = parseSkillMeta(content)
      }

      skills.push({
        name: entry.name,
        path: skillDir,
        agent,
        meta,
      })
    }

    if (skills.length > 0) {
      result.set(agent.id, skills)
    }
  }

  return result
}
