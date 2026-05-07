import type { AgentDefinition } from '~/types'
import { existsSync, lstatSync, rmSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expandHome } from '~/core/agents'
import { isSafeSkillName } from '~/core/skill-name'
import { cleanupEmptyStore, getStoreSkillDir, hasStoreReferences } from '~/core/store'

export interface UninstallOptions {
  /** skill 名称（目录名） */
  name: string
  /** 目标 agent 列表 */
  agents: AgentDefinition[]
  /** 删除全局（用户级）还是项目级 */
  global: boolean
  /** 当前工作目录 */
  cwd: string
}

export interface UninstallResult {
  skill: string
  agent: string
  path: string
  success: boolean
  error?: string
}

/**
 * 从指定 agents 目录删除 skill
 */
export async function uninstallSkill(options: UninstallOptions): Promise<UninstallResult[]> {
  const { name, agents, cwd } = options
  const results: UninstallResult[] = []

  if (!isSafeSkillName(name)) {
    return agents.map(agent => ({
      skill: name,
      agent: agent.name,
      path: '',
      success: false,
      error: 'skill 名称不合法',
    }))
  }

  for (const agent of agents) {
    const targetBase = options.global
      ? expandHome(agent.globalDir)
      : resolve(cwd, agent.projectDir)

    const targetDir = join(targetBase, name)

    try {
      // lstatSync 不跟随符号链接，能检测到断裂的 symlink
      let stat: ReturnType<typeof lstatSync> | null = null
      try {
        stat = lstatSync(targetDir)
      }
      catch {}

      if (!stat) {
        results.push({
          skill: name,
          agent: agent.name,
          path: targetDir,
          success: false,
          error: '未找到该 skill',
        })
        continue
      }

      // 符号链接（含断裂链接）用 unlinkSync 直接删除链接自身
      // rmSync 对断裂符号链接会因 stat 失败 + force:true 而静默跳过
      if (stat.isSymbolicLink()) {
        unlinkSync(targetDir)
      }
      else {
        rmSync(targetDir, { recursive: true, force: true })
      }

      results.push({
        skill: name,
        agent: agent.name,
        path: targetDir,
        success: true,
      })
    }
    catch (err) {
      results.push({
        skill: name,
        agent: agent.name,
        path: targetDir,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (results.some(result => result.success) && !hasStoreReferences(name, { cwd, global: options.global })) {
    const storeSkillDir = getStoreSkillDir(name, { cwd, global: options.global })
    if (existsSync(storeSkillDir))
      rmSync(storeSkillDir, { recursive: true, force: true })
    cleanupEmptyStore({ cwd, global: options.global })
  }

  return results
}
