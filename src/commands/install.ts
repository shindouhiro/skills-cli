import type { InstallMode } from '~/types'
import process from 'node:process'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import { printAgentPlan, resolveTargetAgents } from '~/commands/shared'
import { loadConfig } from '~/core/config'
import { installSkill } from '~/core/installer'

interface InstallCommandOptions {
  agent?: string
  global?: boolean
  force?: boolean
  link?: boolean
  interactive?: boolean
}

/**
 * install 命令：安装 skill 到指定助手目录
 */
export async function installCommand(
  name: string,
  options: InstallCommandOptions,
): Promise<void> {
  const cwd = process.cwd()
  const config = loadConfig(cwd)
  const mode: InstallMode = options.link ? 'link' : config.installMode ?? 'copy'
  const shouldSelectAgents = options.interactive || !options.agent

  if (shouldSelectAgents)
    p.intro(pc.bgCyan(pc.black(' skills install ')))

  const agents = await resolveTargetAgents({
    agent: options.agent,
    defaultAgentIds: config.defaultAgents,
    global: options.global,
    interactive: shouldSelectAgents,
    cancelMode: shouldSelectAgents ? 'prompt' : 'log',
  })

  if (!agents)
    return

  // 显示安装计划
  if (!shouldSelectAgents)
    consola.log('')

  consola.info(`将以 ${pc.cyan(mode)} 模式安装 ${pc.cyan(name)} 到以下助手:`)
  printAgentPlan(agents, { global: options.global })

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
    const message = `已安装到 ${pc.bold(String(successCount))} 个助手目录`
    if (shouldSelectAgents)
      p.outro(pc.green(message))
    else
      consola.success(message)
  }
  else {
    consola.error('安装失败')
    process.exitCode = 1
  }
}
