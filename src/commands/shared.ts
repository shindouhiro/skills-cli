import type { AgentDefinition, InstalledSkill } from '~/types'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import { AGENTS, getAgentById, getAgentsByIds } from '~/core/agents'

export interface SelectOption {
  value: string
  label: string
  hint: string
}

export interface InstalledSkillLookupEntry {
  skill: InstalledSkill
  agentId: string
}

interface CreateInstalledSkillOptions {
  descriptionMaxLen?: number
}

interface PrintInstalledSkillsTreeOptions {
  descriptionMaxLen?: number
  global?: boolean
  showDescription?: boolean
}

interface CommandResultLine {
  agent: string
  path: string
  success: boolean
  error?: string
}

interface PrintCommandResultOptions<T extends CommandResultLine> {
  failureDetail?: (result: T) => string
  successDetail?: (result: T) => string
}

interface ResolveTargetAgentsOptions {
  agent?: string
  defaultAgentIds: string[]
  global?: boolean
  interactive?: boolean
  cancelMode?: 'prompt' | 'log'
}

export function parseAgentIds(value: string): string[] {
  return value
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
}

export function getAgentSkillDirLabel(agent: AgentDefinition, global?: boolean): string {
  const base = global ? agent.globalDir : agent.projectDir
  if (global && agent.extraGlobalDirs?.length) {
    return `${base} +${agent.extraGlobalDirs.length}`
  }
  return base
}

export function createAgentSelectOptions(global?: boolean): SelectOption[] {
  return AGENTS.map(agent => ({
    value: agent.id,
    label: agent.name,
    hint: getAgentSkillDirLabel(agent, global),
  }))
}

export function countInstalledSkills(skillsMap: Map<string, InstalledSkill[]>): number {
  let total = 0
  for (const skills of skillsMap.values()) {
    total += skills.length
  }
  return total
}

export function createInstalledSkillSelectOptions(
  skillsMap: Map<string, InstalledSkill[]>,
  options: CreateInstalledSkillOptions = {},
): { options: SelectOption[], lookup: Map<string, InstalledSkillLookupEntry> } {
  const selectOptions: SelectOption[] = []
  const lookup = new Map<string, InstalledSkillLookupEntry>()
  const descriptionMaxLen = options.descriptionMaxLen ?? 50

  for (const [agentId, skills] of skillsMap) {
    const agent = getAgentById(agentId)
    if (!agent)
      continue

    for (const skill of skills) {
      const key = createInstalledSkillKey(agentId, skill.name)
      lookup.set(key, { skill, agentId })

      selectOptions.push({
        value: key,
        label: formatSkillLabel(skill, { descriptionMaxLen }),
        hint: agent.name,
      })
    }
  }

  return { options: selectOptions, lookup }
}

export function filterSelectOptions(options: SelectOption[], keyword: string): SelectOption[] {
  const lowerKeyword = keyword.toLowerCase()
  return options.filter(opt =>
    opt.label.toLowerCase().includes(lowerKeyword)
    || opt.hint.toLowerCase().includes(lowerKeyword)
    || opt.value.toLowerCase().includes(lowerKeyword),
  )
}

export function groupInstalledSkillSelections(
  selectedKeys: string[],
  lookup: Map<string, InstalledSkillLookupEntry>,
): Map<string, string[]> {
  const grouped = new Map<string, string[]>()

  for (const key of selectedKeys) {
    const entry = lookup.get(key)
    if (!entry)
      continue

    const skills = grouped.get(entry.agentId) ?? []
    skills.push(entry.skill.name)
    grouped.set(entry.agentId, skills)
  }

  return grouped
}

export async function resolveTargetAgents(
  options: ResolveTargetAgentsOptions,
): Promise<AgentDefinition[] | undefined> {
  let agents = options.agent
    ? getAgentsByIds(parseAgentIds(options.agent))
    : getAgentsByIds(options.defaultAgentIds)

  if (options.interactive || agents.length === 0) {
    const selected = await p.autocompleteMultiselect({
      message: '选择目标助手（输入过滤，空格选择，回车确认）',
      options: createAgentSelectOptions(options.global),
      initialValues: agents.map(agent => agent.id),
      placeholder: '输入助手名称、ID 或目录过滤',
      required: true,
    })

    if (p.isCancel(selected)) {
      if (options.cancelMode === 'prompt')
        p.cancel('已取消')
      else
        consola.info('已取消')
      return undefined
    }

    agents = getAgentsByIds(selected as string[])
  }

  if (agents.length === 0) {
    consola.error('未选择任何目标助手')
    return undefined
  }

  return agents
}

export function printAgentPlan(agents: AgentDefinition[], options: { global?: boolean }): void {
  for (const agent of agents) {
    consola.log(`  ${pc.dim('→')} ${pc.bold(agent.name)} ${pc.dim(`(${getAgentSkillDirLabel(agent, options.global)})`)}`)
  }
  consola.log('')
}

export function printInstalledSkillsTree(
  skillsMap: Map<string, InstalledSkill[]>,
  options: PrintInstalledSkillsTreeOptions = {},
): void {
  const descriptionMaxLen = options.descriptionMaxLen ?? 60

  for (const [agentId, skills] of skillsMap) {
    const agent = getAgentById(agentId)
    if (!agent)
      continue

    consola.log(`  ${pc.bold(agent.name)} ${pc.dim(`(${getAgentSkillDirLabel(agent, options.global)})`)}`)

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i]
      const prefix = i === skills.length - 1 ? '└──' : '├──'
      const desc = options.showDescription && skill.meta?.description
        ? pc.dim(` — ${truncate(skill.meta.description, descriptionMaxLen)}`)
        : ''

      const version = skill.meta?.version
        ? pc.yellow(formatSkillVersionText(skill))
        : ''
      consola.log(`  ${pc.dim(prefix)} ${pc.green(skill.name)}${version}${desc}`)
    }

    consola.log('')
  }
}

export function printSkillDeletionPlan(deleteMap: Map<string, string[]>): void {
  for (const [agentId, skillNames] of deleteMap) {
    const agent = getAgentById(agentId)
    if (!agent)
      continue

    for (const skillName of skillNames) {
      consola.log(`  ${pc.dim('→')} ${pc.red(skillName)} ${pc.dim(`(${agent.name})`)}`)
    }
  }
}

export function printCommandResultLines<T extends CommandResultLine>(
  results: T[],
  options: PrintCommandResultOptions<T> = {},
): { failedCount: number, successCount: number } {
  let successCount = 0
  let failedCount = 0

  for (const result of results) {
    if (result.success) {
      successCount++
      const detail = options.successDetail?.(result) ?? pc.dim(result.path)
      consola.success(`${pc.green('✔')} ${result.agent} → ${detail}`)
    }
    else {
      failedCount++
      const detail = options.failureDetail?.(result) ?? result.error
      consola.warn(`${pc.yellow('⚠')} ${result.agent}: ${detail}`)
    }
  }

  return { failedCount, successCount }
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen)
    return str
  return `${str.slice(0, maxLen - 3)}...`
}

function createInstalledSkillKey(agentId: string, skillName: string): string {
  return `${agentId}::${skillName}`
}

function formatSkillLabel(
  skill: InstalledSkill,
  options: { descriptionMaxLen: number },
): string {
  const desc = skill.meta?.description
    ? ` — ${truncate(skill.meta.description, options.descriptionMaxLen)}`
    : ''

  return `${skill.name}${formatSkillVersionText(skill)}${desc}`
}

function formatSkillVersionText(skill: InstalledSkill): string {
  return skill.meta?.version
    ? ` v${skill.meta.version}`
    : ''
}
