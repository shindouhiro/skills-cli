import type { AgentDefinition } from '~/types'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import { AGENTS, getAgentsByIds } from '~/core/agents'

export interface SelectOption {
  value: string
  label: string
  hint: string
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
  return global ? agent.globalDir : agent.projectDir
}

export function createAgentSelectOptions(global?: boolean): SelectOption[] {
  return AGENTS.map(agent => ({
    value: agent.id,
    label: agent.name,
    hint: getAgentSkillDirLabel(agent, global),
  }))
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

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen)
    return str
  return `${str.slice(0, maxLen - 3)}...`
}
