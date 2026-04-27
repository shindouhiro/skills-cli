import type { InstallMode } from '~/types'
import process from 'node:process'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import { AGENTS, getAgentsByIds } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { installSkill } from '~/core/installer'

interface InstallCommandOptions {
  agent?: string
  global?: boolean
  force?: boolean
  link?: boolean
}

/**
 * install 命令：安装 skill 到指定助手目录
 */
export async function installCommand(
  name: string,
  options: InstallCommandOptions,
): Promise<void> {
  const config = loadConfig()
  const cwd = process.cwd()
  const mode: InstallMode = options.link ? 'link' : config.installMode ?? 'copy'

  // 确定目标 agents
  let agents = options.agent
    ? getAgentsByIds(options.agent.split(',').map(s => s.trim()))
    : getAgentsByIds(config.defaultAgents)

  // 如果没有指定也没有默认值，弹出交互选择
  if (agents.length === 0) {
    const selected = await p.multiselect({
      message: '选择目标助手（空格选择，回车确认）',
      options: AGENTS.map(a => ({
        value: a.id,
        label: a.name,
        hint: options.global ? a.globalDir : a.projectDir,
      })),
      required: true,
    })

    if (p.isCancel(selected)) {
      consola.info('已取消')
      return
    }

    agents = getAgentsByIds(selected as string[])
  }

  if (agents.length === 0) {
    consola.error('未选择任何目标助手')
    return
  }

  // 显示安装计划
  consola.log('')
  consola.info(`将以 ${pc.cyan(mode)} 模式安装 ${pc.cyan(name)} 到以下助手:`)
  for (const agent of agents) {
    const dir = options.global ? agent.globalDir : agent.projectDir
    consola.log(`  ${pc.dim('→')} ${pc.bold(agent.name)} ${pc.dim(`(${dir})`)}`)
  }
  consola.log('')

  // 执行安装
  const results = await installSkill({
    name,
    agents,
    global: options.global ?? false,
    cwd,
    force: options.force,
    mode,
  })

  // 输出结果
  consola.log('')
  let successCount = 0
  for (const result of results) {
    if (result.success) {
      successCount++
      consola.success(`${pc.green('✔')} ${result.agent} → ${pc.dim(result.path)} ${pc.dim(`(${result.mode})`)}`)
    }
    else {
      consola.warn(`${pc.yellow('⚠')} ${result.agent}: ${result.error}`)
    }
  }

  consola.log('')
  if (successCount > 0) {
    consola.success(`已安装到 ${pc.bold(String(successCount))} 个助手目录`)
  }
  else {
    consola.error('安装失败')
  }
}
