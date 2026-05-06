import type { SourceConfig } from '~/types'
import consola from 'consola'
import pc from 'picocolors'
import {
  getGlobalConfigPath,
  getProjectConfigPathForWrite,
  loadConfigAtPath,
  saveConfig,
} from '~/core/config'

interface SourceAddOptions {
  global?: boolean
  path?: string
  cwd?: string
}

/**
 * source add 命令：手动添加搜索/下载数据源 URL
 */
export async function sourceAddCommand(url: string, options: SourceAddOptions = {}): Promise<void> {
  const source = parseSourceUrl(url, { path: options.path })
  const configPath = options.global
    ? getGlobalConfigPath()
    : getProjectConfigPathForWrite(options.cwd)

  const config = loadConfigAtPath(configPath)
  const exists = config.sources.some(item => getSourceKey(item) === getSourceKey(source))

  if (exists) {
    consola.info(`数据源已存在: ${pc.cyan(formatSource(source))}`)
    return
  }

  config.sources = [...config.sources, source]
  saveConfig(config, configPath)

  consola.success(`已添加数据源: ${pc.cyan(formatSource(source))}`)
  consola.info(`配置文件: ${pc.dim(configPath)}`)
}

export function parseSourceUrl(value: string, options: { path?: string } = {}): SourceConfig {
  const input = value.trim()
  if (!input)
    throw new Error('请输入数据源 URL')

  const githubSource = parseGitHubSource(input, options.path)
  if (githubSource)
    return githubSource

  const skillsShSource = parseSkillsShSource(input)
  if (skillsShSource) {
    if (options.path)
      throw new Error('skills.sh 数据源不支持 --path')
    return skillsShSource
  }

  throw new Error('暂只支持 GitHub 仓库 URL、github:owner/repo[/path] 和 skills.sh URL')
}

function parseGitHubSource(value: string, overridePath?: string): SourceConfig | undefined {
  const shortMatch = value.match(/^github:([^/\s]+\/[^/\s]+)(?:\/(.+))?$/u)
  if (shortMatch) {
    return normalizeGitHubSource({
      repo: shortMatch[1],
      path: overridePath ?? shortMatch[2],
    })
  }

  const repoMatch = value.match(/^([^/\s]+\/[^/\s]+)(?:\/(.+))?$/u)
  if (repoMatch && !value.includes('://') && !value.startsWith('github.com/')) {
    return normalizeGitHubSource({
      repo: repoMatch[1],
      path: overridePath ?? repoMatch[2],
    })
  }

  const normalizedValue = value.startsWith('github.com/')
    ? `https://${value}`
    : value

  let parsed: URL
  try {
    parsed = new URL(normalizedValue)
  }
  catch {
    return undefined
  }

  if (parsed.hostname !== 'github.com')
    return undefined

  const segments = parsed.pathname
    .split('/')
    .filter(Boolean)
    .map(segment => decodeURIComponent(segment))

  const [owner, repo, marker, _branch, ...rest] = segments
  if (!owner || !repo)
    return undefined

  const path = marker === 'tree' ? rest.join('/') : undefined
  return normalizeGitHubSource({
    repo: `${owner}/${repo}`,
    path: overridePath ?? path,
  })
}

function parseSkillsShSource(value: string): SourceConfig | undefined {
  let parsed: URL
  try {
    parsed = new URL(value)
  }
  catch {
    return undefined
  }

  if (parsed.hostname !== 'skills.sh')
    return undefined

  return {
    type: 'skills-sh',
    url: parsed.origin,
  }
}

function normalizeGitHubSource(source: { repo: string, path?: string }): SourceConfig {
  const path = source.path
    ?.split('/')
    .filter(Boolean)
    .join('/')

  return path
    ? { type: 'github', repo: source.repo, path }
    : { type: 'github', repo: source.repo }
}

function getSourceKey(source: SourceConfig): string {
  if (source.type === 'github')
    return `github:${source.repo}:${source.path ?? ''}`
  if (source.type === 'skills-sh')
    return `skills-sh:${source.url ?? 'https://skills.sh'}`
  if (source.type === 'npm')
    return `npm:${source.keyword}`
  return `url:${source.url}`
}

function formatSource(source: SourceConfig): string {
  if (source.type === 'github')
    return `github:${source.repo}${source.path ? `/${source.path}` : ''}`
  if (source.type === 'skills-sh')
    return source.url ?? 'https://skills.sh'
  if (source.type === 'npm')
    return `npm:${source.keyword}`
  return source.url
}
