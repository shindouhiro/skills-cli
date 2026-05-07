import type { AgentDefinition, InstalledSkill, SkillMeta } from '~/types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { AGENTS, expandHome } from '~/core/agents'

/**
 * 解析 SKILL.md 的 frontmatter
 */
export function parseSkillMeta(content: string): SkillMeta | undefined {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match)
    return undefined

  const frontmatter = match[1]
  const meta: Record<string, unknown> = {}

  for (const line of frontmatter.split(/\r?\n/u)) {
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
 * 从 skill 目录读取元信息
 */
function readSkillMeta(skillDir: string): SkillMeta | undefined {
  const skillMdPath = join(skillDir, 'SKILL.md')
  if (!existsSync(skillMdPath))
    return undefined

  const content = readFileSync(skillMdPath, 'utf-8')
  return parseSkillMeta(content)
}

/**
 * 扫描单个目录下的 skills
 */
function scanSkillsInDir(agent: AgentDefinition, skillsDir: string): InstalledSkill[] {
  if (!existsSync(skillsDir))
    return []

  const skills: InstalledSkill[] = []
  const entries = readdirSync(skillsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink())
      continue

    const skillDir = join(skillsDir, entry.name)

    // 符号链接目标不存在 → 标记为断裂但仍加入结果
    const isBroken = entry.isSymbolicLink() && !existsSync(skillDir)

    skills.push({
      name: entry.name,
      path: skillDir,
      agent,
      meta: isBroken ? undefined : readSkillMeta(skillDir),
      broken: isBroken || undefined,
    })
  }

  return skills
}

function scanAllAgents(
  resolveSkillsDir: (agent: AgentDefinition) => string,
): Map<string, InstalledSkill[]> {
  const result = new Map<string, InstalledSkill[]>()

  for (const agent of AGENTS) {
    const skills = scanSkillsInDir(agent, resolveSkillsDir(agent))
    if (skills.length > 0)
      result.set(agent.id, skills)
  }

  return result
}

/**
 * 扫描本地已安装的所有 skills（项目级）
 */
export function scanLocalSkills(cwd?: string): Map<string, InstalledSkill[]> {
  const baseDir = resolve(cwd || process.cwd())
  return scanAllAgents(agent => resolve(baseDir, agent.projectDir))
}

/**
 * 扫描全局已安装的 skills（用户级）
 */
export function scanGlobalSkills(): Map<string, InstalledSkill[]> {
  return scanAllAgents(agent => expandHome(agent.globalDir))
}
