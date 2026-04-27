import { existsSync, readdirSync, rmdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { AGENTS, expandHome } from '~/core/agents'

export function getStoreDir(options: { cwd: string, global: boolean }): string {
  return options.global
    ? join(homedir(), '.skills', 'store')
    : resolve(options.cwd, '.skills', 'store')
}

export function getStoreSkillDir(name: string, options: { cwd: string, global: boolean }): string {
  return join(getStoreDir(options), name)
}

export function getAgentSkillDir(agentProjectOrGlobalDir: string, skillName: string, options: { cwd: string, global: boolean }): string {
  const baseDir = options.global
    ? expandHome(agentProjectOrGlobalDir)
    : resolve(options.cwd, agentProjectOrGlobalDir)

  return join(baseDir, skillName)
}

export function getSymlinkTarget(targetDir: string, storeSkillDir: string): string {
  if (process.platform === 'win32')
    return storeSkillDir

  return relative(dirname(targetDir), storeSkillDir) || storeSkillDir
}

export function hasStoreReferences(skillName: string, options: { cwd: string, global: boolean }): boolean {
  return AGENTS.some((agent) => {
    const agentBaseDir = options.global
      ? expandHome(agent.globalDir)
      : resolve(options.cwd, agent.projectDir)

    if (!existsSync(agentBaseDir))
      return false

    return readdirSync(agentBaseDir).includes(skillName)
  })
}

export function cleanupEmptyStore(options: { cwd: string, global: boolean }): void {
  const storeDir = getStoreDir(options)
  if (!existsSync(storeDir) || readdirSync(storeDir).length > 0)
    return

  rmdirSync(storeDir)

  const rootDir = dirname(storeDir)
  if (existsSync(rootDir) && readdirSync(rootDir).length === 0)
    rmdirSync(rootDir)
}
