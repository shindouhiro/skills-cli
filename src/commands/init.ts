import type { SkillsConfig, SourceConfig } from '~/types'
import { join } from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import { AGENTS } from '~/core/agents'
import { getGlobalConfigPath, saveConfig } from '~/core/config'

interface InitCommandOptions {
  global?: boolean
}

/**
 * init 命令：初始化 .skillsrc 配置文件
 */
export async function initCommand(options: InitCommandOptions): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' skills init ')))

  // 1. 选择默认助手
  const selectedAgents = await p.multiselect({
    message: '选择默认目标助手',
    options: AGENTS.map(a => ({
      value: a.id,
      label: a.name,
      hint: a.projectDir,
    })),
    required: true,
  })

  if (p.isCancel(selectedAgents)) {
    p.cancel('已取消')
    return
  }

  // 2. 配置数据源
  const sourceRepo = await p.text({
    message: 'GitHub skills 仓库（owner/repo）',
    placeholder: 'antfu/skills',
    defaultValue: 'antfu/skills',
    validate: (value) => {
      if (!value)
        return '请输入仓库名称'
      if (!value.includes('/'))
        return '格式应为 owner/repo'
    },
  })

  if (p.isCancel(sourceRepo)) {
    p.cancel('已取消')
    return
  }

  // 3. 安装范围
  const scope = await p.select({
    message: '默认安装范围',
    options: [
      { value: 'project', label: '项目级', hint: '安装到当前项目目录' },
      { value: 'global', label: '全局', hint: '安装到用户目录' },
    ],
  })

  if (p.isCancel(scope)) {
    p.cancel('已取消')
    return
  }

  // 4. 安装模式
  const installMode = await p.select({
    message: '默认安装模式',
    options: [
      { value: 'copy', label: '复制', hint: '兼容性最好，每个助手目录保存一份' },
      { value: 'link', label: '链接', hint: '共享一份 store，助手目录使用符号链接' },
    ],
  })

  if (p.isCancel(installMode)) {
    p.cancel('已取消')
    return
  }

  // 构建配置
  const sources: SourceConfig[] = [
    { type: 'github', repo: sourceRepo },
  ]

  const config: SkillsConfig = {
    defaultAgents: selectedAgents as string[],
    installMode: installMode as 'copy' | 'link',
    sources,
    scope: scope as 'project' | 'global',
  }

  // 保存配置
  const configPath = options.global
    ? getGlobalConfigPath()
    : join(process.cwd(), '.skillsrc')

  saveConfig(config, configPath)

  p.outro(`${pc.green('✔')} 配置已写入 ${pc.dim(configPath)}`)

  // 显示配置摘要
  consola.log('')
  consola.info('配置摘要:')
  consola.log(`  默认助手: ${(selectedAgents as string[]).map(id => pc.cyan(id)).join(', ')}`)
  consola.log(`  数据源: ${pc.cyan(`github:${sourceRepo}`)}`)
  consola.log(`  安装范围: ${pc.cyan(scope as string)}`)
  consola.log(`  安装模式: ${pc.cyan(installMode as string)}`)
}
