import type { SkillsConfig, SourceConfig } from '~/types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'

const CONFIG_FILENAME = '.skillsrc'

/**
 * 默认配置
 */
export function getDefaultConfig(): SkillsConfig {
  return {
    defaultAgents: [],
    sources: [
      { type: 'skills-sh', url: 'https://skills.sh' },
      { type: 'github', repo: 'antfu/skills', path: 'skills' },
    ],
    installMode: 'link',
    scope: 'project',
  }
}

/**
 * 查找项目级配置文件路径
 * 从当前目录往上找 .skillsrc
 */
export function findProjectConfigPath(cwd?: string): string | undefined {
  let dir = resolve(cwd || process.cwd())
  const root = resolve('/')

  while (dir !== root) {
    const configPath = join(dir, CONFIG_FILENAME)
    if (existsSync(configPath)) {
      return configPath
    }
    dir = resolve(dir, '..')
  }

  return undefined
}

/**
 * 获取项目级配置文件写入路径
 * 优先复用向上找到的 .skillsrc，否则写入当前目录
 */
export function getProjectConfigPathForWrite(cwd?: string): string {
  return findProjectConfigPath(cwd) ?? join(resolve(cwd || process.cwd()), CONFIG_FILENAME)
}

/**
 * 获取用户级配置文件路径
 */
export function getGlobalConfigPath(): string {
  return join(homedir(), '.config', 'skills-cli', CONFIG_FILENAME)
}

/**
 * 加载配置（项目级 > 用户级 > 默认）
 */
export function loadConfig(cwd?: string): SkillsConfig {
  const defaultConfig = getDefaultConfig()

  // 优先项目级
  const projectPath = findProjectConfigPath(cwd)
  if (projectPath) {
    return mergeConfig(defaultConfig, readConfigFile(projectPath))
  }

  // 其次用户级
  const globalPath = getGlobalConfigPath()
  if (existsSync(globalPath)) {
    return mergeConfig(defaultConfig, readConfigFile(globalPath))
  }

  return defaultConfig
}

/**
 * 加载指定路径的配置；文件不存在时返回默认配置
 */
export function loadConfigAtPath(path: string): SkillsConfig {
  const defaultConfig = getDefaultConfig()
  if (!existsSync(path))
    return defaultConfig

  return mergeConfig(defaultConfig, readConfigFile(path))
}

/**
 * 读取配置文件
 */
function readConfigFile(path: string): Partial<SkillsConfig> {
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return {}
  }
}

/**
 * 合并配置
 */
function mergeConfig(base: SkillsConfig, override: Partial<SkillsConfig>): SkillsConfig {
  return {
    ...base,
    ...override,
    sources: withDefaultSkillsShSource(override.sources ?? base.sources),
    defaultAgents: override.defaultAgents ?? base.defaultAgents,
  }
}

function withDefaultSkillsShSource(sources: SourceConfig[]): SourceConfig[] {
  if (sources.some(source => source.type === 'skills-sh'))
    return sources

  return [
    { type: 'skills-sh', url: 'https://skills.sh' },
    ...sources,
  ]
}

/**
 * 保存配置文件
 */
export function saveConfig(config: SkillsConfig, path: string): void {
  const dir = resolve(path, '..')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
}
