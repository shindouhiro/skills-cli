import type { InstalledSkill } from '~/types'
import process from 'node:process'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import { AGENTS, getAgentsByIds } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { scanGlobalSkills, scanLocalSkills } from '~/core/scanner'
import { uninstallSkill } from '~/core/uninstaller'

interface UninstallCommandOptions {
  agent?: string
  global?: boolean
  filter?: string
}

interface SelectOption {
  value: string
  label: string
  hint: string
}

interface SkillLookupEntry {
  skill: InstalledSkill
  agentId: string
}

/**
 * 构建 skill 选项和查找表
 */
function buildSkillOptions(
  skillsMap: Map<string, InstalledSkill[]>,
): { options: SelectOption[], lookup: Map<string, SkillLookupEntry> } {
  const options: SelectOption[] = []
  const lookup = new Map<string, SkillLookupEntry>()

  for (const [agentId, skills] of skillsMap) {
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent)
      continue

    for (const skill of skills) {
      const key = `${agentId}::${skill.name}`
      lookup.set(key, { skill, agentId })

      const desc = skill.meta?.description
        ? ` — ${truncate(skill.meta.description, 50)}`
        : ''
      const version = skill.meta?.version ? ` v${skill.meta.version}` : ''

      options.push({
        value: key,
        label: `${skill.name}${version}${desc}`,
        hint: agent.name,
      })
    }
  }

  return { options, lookup }
}

/**
 * 按关键字过滤选项（大小写不敏感，匹配 skill 名称、描述、agent 名）
 */
function filterOptions(options: SelectOption[], keyword: string): SelectOption[] {
  const lowerKeyword = keyword.toLowerCase()
  return options.filter(opt =>
    opt.label.toLowerCase().includes(lowerKeyword)
    || opt.hint.toLowerCase().includes(lowerKeyword)
    || opt.value.toLowerCase().includes(lowerKeyword),
  )
}

/**
 * 显示已安装 skills 的概览列表
 */
function printSkillsOverview(
  skillsMap: Map<string, InstalledSkill[]>,
  options: { global?: boolean },
): void {
  for (const [agentId, skills] of skillsMap) {
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent)
      continue

    const dir = options.global ? agent.globalDir : agent.projectDir
    consola.log(`  ${pc.bold(agent.name)} ${pc.dim(`(${dir})`)}`)
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i]
      const isLast = i === skills.length - 1
      const prefix = isLast ? '└──' : '├──'
      const name = pc.green(skill.name)
      const version = skill.meta?.version
        ? pc.yellow(` v${skill.meta.version}`)
        : ''
      consola.log(`  ${pc.dim(prefix)} ${name}${version}`)
    }
    consola.log('')
  }
}

/**
 * 执行批量删除并输出结果
 */
async function executeBatchDelete(
  deleteMap: Map<string, string[]>,
  options: { global?: boolean },
  cwd: string,
): Promise<void> {
  let totalSuccess = 0
  let totalFailed = 0

  for (const [agentId, skillNames] of deleteMap) {
    const agents = getAgentsByIds([agentId])
    if (agents.length === 0)
      continue

    for (const skillName of skillNames) {
      const results = await uninstallSkill({
        name: skillName,
        agents,
        global: options.global ?? false,
        cwd,
      })

      for (const result of results) {
        if (result.success) {
          totalSuccess++
          consola.success(`${pc.green('✔')} ${result.agent} → ${pc.dim(skillName)}`)
        }
        else {
          totalFailed++
          consola.warn(`${pc.yellow('⚠')} ${result.agent}: ${skillName} — ${result.error}`)
        }
      }
    }
  }

  consola.log('')
  if (totalSuccess > 0) {
    consola.success(`已成功删除 ${pc.bold(String(totalSuccess))} 个 skills`)
  }
  if (totalFailed > 0) {
    consola.warn(`${pc.bold(String(totalFailed))} 个删除失败`)
  }
}

/**
 * 交互式多选删除：列出所有已安装 skills，支持关键字过滤后多选删除
 */
async function interactiveUninstall(options: UninstallCommandOptions): Promise<void> {
  const cwd = process.cwd()

  // 扫描已安装的 skills
  const skillsMap = options.global
    ? scanGlobalSkills()
    : scanLocalSkills()

  if (skillsMap.size === 0) {
    consola.info(options.global
      ? '未找到全局已安装的 skills'
      : '未找到本地已安装的 skills',
    )
    return
  }

  const { options: allOptions, lookup: skillLookup } = buildSkillOptions(skillsMap)

  if (allOptions.length === 0) {
    consola.info('未找到可删除的 skills')
    return
  }

  // 显示已安装的 skills 概览
  consola.log('')
  consola.info(`共发现 ${pc.bold(String(allOptions.length))} 个已安装的 skills:`)
  consola.log('')
  printSkillsOverview(skillsMap, options)

  // 获取过滤关键字（CLI --filter 优先，否则交互式输入）
  let keyword = options.filter?.trim() || ''

  if (!keyword) {
    const filterInput = await p.text({
      message: '输入关键字过滤（直接回车跳过，显示全部）',
      placeholder: '如: vue, testing, nuxt...',
      defaultValue: '',
    })

    if (p.isCancel(filterInput)) {
      consola.info('已取消')
      return
    }

    keyword = (filterInput as string).trim()
  }

  // 应用过滤
  let filteredOptions = allOptions
  if (keyword) {
    filteredOptions = filterOptions(allOptions, keyword)

    if (filteredOptions.length === 0) {
      consola.warn(`没有匹配 ${pc.cyan(keyword)} 的 skills`)
      return
    }

    consola.info(`匹配 ${pc.cyan(keyword)} 的 skills: ${pc.bold(String(filteredOptions.length))} 个`)
    consola.log('')
  }

  // 多选要删除的 skills
  const selected = await p.multiselect({
    message: '选择要删除的 skills（空格选择，回车确认）',
    options: filteredOptions,
    required: true,
  })

  if (p.isCancel(selected)) {
    consola.info('已取消')
    return
  }

  const selectedKeys = selected as string[]

  if (selectedKeys.length === 0) {
    consola.info('未选择任何 skill')
    return
  }

  // 按 agentId 分组要删除的 skills
  const deleteMap = new Map<string, string[]>()
  for (const key of selectedKeys) {
    const entry = skillLookup.get(key)
    if (!entry)
      continue
    const existing = deleteMap.get(entry.agentId) || []
    existing.push(entry.skill.name)
    deleteMap.set(entry.agentId, existing)
  }

  // 确认删除
  consola.log('')
  consola.warn(`即将删除以下 ${pc.bold(String(selectedKeys.length))} 个 skills:`)
  for (const [agentId, skillNames] of deleteMap) {
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent)
      continue
    for (const skillName of skillNames) {
      consola.log(`  ${pc.dim('→')} ${pc.red(skillName)} ${pc.dim(`(${agent.name})`)}`)
    }
  }
  consola.log('')

  const confirmed = await p.confirm({
    message: `确认删除 ${selectedKeys.length} 个 skills？`,
    initialValue: false,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    consola.info('已取消')
    return
  }

  // 执行批量删除
  await executeBatchDelete(deleteMap, options, cwd)
}

/**
 * uninstall 命令：从指定助手目录删除 skill
 *
 * - 传入 name：直接删除指定 skill（原有逻辑）
 * - 不传 name：进入交互模式，列出所有已安装 skills 并支持多选删除
 */
export async function uninstallCommand(
  name: string | undefined,
  options: UninstallCommandOptions,
): Promise<void> {
  // 无参数 → 交互式多选删除
  if (!name) {
    await interactiveUninstall(options)
    return
  }

  // 有参数 → 原有的单 skill 删除逻辑
  const config = loadConfig()
  const cwd = process.cwd()

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

  // 显示删除计划
  consola.log('')
  consola.info(`将删除 ${pc.cyan(name)}（若存在）:`)
  for (const agent of agents) {
    const dir = options.global ? agent.globalDir : agent.projectDir
    consola.log(`  ${pc.dim('→')} ${pc.bold(agent.name)} ${pc.dim(`(${dir})`)}`)
  }
  consola.log('')

  // 执行删除
  const results = await uninstallSkill({
    name,
    agents,
    global: options.global ?? false,
    cwd,
  })

  // 输出结果
  consola.log('')
  let successCount = 0
  for (const result of results) {
    if (result.success) {
      successCount++
      consola.success(`${pc.green('✔')} ${result.agent} → ${pc.dim(result.path)}`)
    }
    else {
      consola.warn(`${pc.yellow('⚠')} ${result.agent}: ${result.error}`)
    }
  }

  consola.log('')
  if (successCount > 0) {
    consola.success(`已删除 ${pc.bold(String(successCount))} 个助手目录中的 skill`)
  }
  else {
    consola.warn('未删除任何 skill')
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen)
    return str
  return `${str.slice(0, maxLen - 3)}...`
}
