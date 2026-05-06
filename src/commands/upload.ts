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
  const target = getUploadTarget(config, options.target)

  if (!target) {
    consola.error(options.target
      ? `未找到上传目标: ${options.target}`
      : '未配置上传目标，请先运行 skills upload target add <url> --name <name>')
    process.exitCode = 1
    return
  }

  const collected = collectUploadSkills({
    cwd,
    global: options.global ?? false,
    names,
  })

  for (const warning of collected.warnings)
    consola.warn(warning)
  for (const missing of collected.missing)
    consola.warn(`未找到本地 skill: ${missing}`)

  let selectedSkills = collected.skills
  const shouldPrompt = !options.all && (!names || names.length === 0)

  if (shouldPrompt) {
    if (selectedSkills.length === 0) {
      consola.info(options.global ? '未找到全局已安装的 skills' : '未找到本地已安装的 skills')
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

  const normalizedTarget = normalizeUploadTarget(target)
  consola.info(`上传目标: ${pc.cyan(normalizedTarget.name)} ${pc.dim(normalizedTarget.url)}`)
  consola.info(`目标目录: ${pc.cyan(normalizedTarget.path ?? 'skills')}`)

  if (options.dryRun) {
    consola.info('dry-run 模式，不会 clone、commit 或 push')
    for (const skill of selectedSkills)
      consola.log(`  ${pc.green(skill.name)} ${pc.dim(skill.path)}`)
  }

  const result = uploadSkills({
    cwd,
    dryRun: options.dryRun,
    global: options.global ?? false,
    message: options.message,
    skills: selectedSkills,
    target: normalizedTarget,
  })

  if (!result.changed) {
    consola.info('无需上传：目标仓库没有文件变化')
    return
  }

  if (result.dryRun) {
    consola.success(`计划上传 ${pc.bold(String(result.uploaded.length))} 个 skills`)
    return
  }

  consola.success(`已上传 ${pc.bold(String(result.uploaded.length))} 个 skills`)
  if (result.commit)
    consola.info(`提交: ${pc.cyan(result.commit)}`)
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
