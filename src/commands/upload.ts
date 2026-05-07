import type { UploadTargetConfig } from '~/types'
import process from 'node:process'
import * as p from '@clack/prompts'
import consola from 'consola'
import pc from 'picocolors'
import {
  getGlobalConfigPath,
  getProjectConfigPathForWrite,
  loadConfig,
  loadConfigAtPath,
  saveConfig,
} from '~/core/config'
import {
  addUploadTargetToConfig,
  collectUploadSkills,
  getUploadTarget,
  normalizeUploadTarget,
  uploadSkills,
} from '~/core/upload'

interface UploadCommandOptions {
  all?: boolean
  dryRun?: boolean
  global?: boolean
  message?: string
  target?: string
}

interface UploadTargetAddOptions {
  branch?: string
  global?: boolean
  name?: string
  path?: string
  cwd?: string
}

export async function uploadCommand(
  names: string[] | undefined,
  options: UploadCommandOptions = {},
): Promise<void> {
  const cwd = process.cwd()
  const config = loadConfig(cwd)
  let target = getUploadTarget(config, options.target)

  // ── 1. 没有上传目标时，交互式引导配置 ──
  if (!target) {
    if (options.target) {
      consola.error(`未找到上传目标: ${options.target}`)
      process.exitCode = 1
      return
    }

    consola.info('未检测到上传目标配置，进入交互式配置流程...')
    consola.log('')

    const urlInput = await p.text({
      message: '请输入 Git 远端 URL',
      placeholder: 'https://github.com/user/skills-repo.git',
      validate: (value) => {
        return validateRequiredText(value, '请输入有效的 Git 远端 URL')
      },
    })

    if (p.isCancel(urlInput)) {
      p.cancel('已取消')
      return
    }

    const nameInput = await p.text({
      message: '为上传目标起个名字',
      placeholder: 'my-skills',
      initialValue: extractRepoName(urlInput as string),
      validate: (value) => {
        return validateRequiredText(value, '请输入上传目标名称')
      },
    })

    if (p.isCancel(nameInput)) {
      p.cancel('已取消')
      return
    }

    const pathInput = await p.text({
      message: '目标仓库内 skills 所在子目录',
      placeholder: 'skills',
      initialValue: 'skills',
    })

    if (p.isCancel(pathInput)) {
      p.cancel('已取消')
      return
    }

    const saveScope = await p.select({
      message: '将目标保存到哪个配置？',
      options: [
        { value: 'project', label: '项目级', hint: '.skillsrc' },
        { value: 'global', label: '全局级', hint: '~/.config/skills-cli/.skillsrc' },
      ],
    })

    if (p.isCancel(saveScope)) {
      p.cancel('已取消')
      return
    }

    const newTarget: UploadTargetConfig = {
      name: (nameInput as string).trim(),
      type: 'git',
      url: (urlInput as string).trim(),
      path: (pathInput as string).trim() || 'skills',
    }

    const isGlobal = saveScope === 'global'
    const configPath = isGlobal
      ? getGlobalConfigPath()
      : getProjectConfigPathForWrite(cwd)
    const existingConfig = loadConfigAtPath(configPath)
    const result = addUploadTargetToConfig(existingConfig, newTarget)

    if (result.added) {
      saveConfig(result.config, configPath)
      consola.success(`已保存上传目标: ${pc.cyan(newTarget.name)}`)
      consola.info(`配置文件: ${pc.dim(configPath)}`)
      consola.log('')
    }

    target = newTarget
  }

  // ── 2. 收集要上传的 skills ──
  const shouldPrompt = !options.all && (!names || names.length === 0)
  let uploadGlobal = options.global ?? false

  // 没有指定 skill names 时，先选择扫描范围
  if (shouldPrompt) {
    const scope = await p.select({
      message: '选择要上传的 skills 来源',
      options: [
        { value: 'project', label: '项目级 skills', hint: '当前项目目录' },
        { value: 'global', label: '全局 skills', hint: '用户目录' },
      ],
    })

    if (p.isCancel(scope)) {
      p.cancel('已取消')
      return
    }

    uploadGlobal = scope === 'global'
  }

  const collected = collectUploadSkills({
    cwd,
    global: uploadGlobal,
    names,
  })

  for (const warning of collected.warnings)
    consola.warn(warning)
  for (const missing of collected.missing)
    consola.warn(`未找到本地 skill: ${missing}`)

  let selectedSkills = collected.skills

  if (shouldPrompt) {
    if (selectedSkills.length === 0) {
      consola.info(uploadGlobal ? '未找到全局已安装的 skills' : '未找到本地已安装的 skills')
      return
    }

    const selectedNames = await p.autocompleteMultiselect({
      message: '选择要上传的 skills（输入过滤，空格选择，回车确认）',
      options: selectedSkills.map(skill => ({
        value: skill.name,
        label: skill.name,
        hint: skill.path,
      })),
      placeholder: '输入 skill 名称过滤',
      required: true,
    })

    if (p.isCancel(selectedNames)) {
      p.cancel('已取消')
      return
    }

    const selectedSet = new Set(selectedNames as string[])
    selectedSkills = selectedSkills.filter(skill => selectedSet.has(skill.name))
  }

  if (selectedSkills.length === 0) {
    consola.error('没有可上传的 skills')
    process.exitCode = 1
    return
  }

  // ── 3. 执行上传 ──
  const normalizedTarget = normalizeUploadTarget(target)
  consola.info(`上传目标: ${pc.cyan(normalizedTarget.name)} ${pc.dim(normalizedTarget.url)}`)
  consola.info(`目标目录: ${pc.cyan(normalizedTarget.path ?? 'skills')}`)

  if (options.dryRun) {
    consola.info('dry-run 模式，不会 clone、commit 或 push')
    for (const skill of selectedSkills)
      consola.log(`  ${pc.green(skill.name)} ${pc.dim(skill.path)}`)
  }

  const uploadResult = uploadSkills({
    cwd,
    dryRun: options.dryRun,
    global: uploadGlobal,
    message: options.message,
    skills: selectedSkills,
    target: normalizedTarget,
  })

  if (!uploadResult.changed) {
    consola.info('无需上传：目标仓库没有文件变化')
    return
  }

  if (uploadResult.dryRun) {
    consola.success(`计划上传 ${pc.bold(String(uploadResult.uploaded.length))} 个 skills`)
    return
  }

  consola.success(`已上传 ${pc.bold(String(uploadResult.uploaded.length))} 个 skills`)
  if (uploadResult.commit)
    consola.info(`提交: ${pc.cyan(uploadResult.commit)}`)
}

export async function uploadTargetAddCommand(
  url: string,
  options: UploadTargetAddOptions = {},
): Promise<void> {
  const name = options.name?.trim()
  if (!name)
    throw new Error('请使用 --name 指定上传目标名称')

  const target: UploadTargetConfig = {
    name,
    type: 'git',
    url: url.trim(),
    ...(options.path ? { path: options.path } : {}),
    ...(options.branch ? { branch: options.branch } : {}),
  }

  const configPath = options.global
    ? getGlobalConfigPath()
    : getProjectConfigPathForWrite(options.cwd)
  const config = loadConfigAtPath(configPath)
  const result = addUploadTargetToConfig(config, target)

  if (!result.added) {
    consola.info(`上传目标已存在: ${pc.cyan(name)}`)
    return
  }

  saveConfig(result.config, configPath)
  consola.success(`已添加上传目标: ${pc.cyan(name)}`)
  consola.info(`配置文件: ${pc.dim(configPath)}`)
}

/**
 * 从 Git URL 提取仓库名作为默认目标名称
 */
function extractRepoName(url: string): string {
  const cleaned = url.replace(/\.git$/, '').replace(/\/+$/, '')
  const lastSegment = cleaned.split('/').pop() ?? ''
  return lastSegment || 'my-skills'
}

function validateRequiredText(value: string | undefined, message: string): string | undefined {
  if (!value?.trim())
    return message
  return undefined
}
