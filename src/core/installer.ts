import type { SkillSource } from '~/sources/types'
import type { AgentDefinition, InstallMode, SourceConfig } from '~/types'
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import consola from 'consola'
import { expandHome } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { isSafeSkillName, parseSkillPath } from '~/core/skill-name'
import { getStoreSkillDir, getSymlinkTarget } from '~/core/store'
import { createGitHubSource, parseGitHubUrl } from '~/sources/github'
import { createSkillsShSource, parseSkillsShSource, parseSkillsShUrl } from '~/sources/skills-sh'

export interface InstallOptions {
  /** skill 名称或 URL */
  name: string
  /** 目标 agent 列表 */
  agents: AgentDefinition[]
  /** 安装到全局（用户级）还是项目级 */
  global: boolean
  /** 当前工作目录 */
  cwd: string
  /** 数据源 */
  source?: SkillSource
  /** 强制覆盖 */
  force?: boolean
  /** 安装模式：复制完整目录或共享存储后创建链接 */
  mode?: InstallMode
}

export interface InstallResult {
  skill: string
  agent: string
  path: string
  mode: InstallMode
  success: boolean
  error?: string
}

/**
 * 安装 skill 到指定 agents 的目录
 */
export async function installSkill(options: InstallOptions): Promise<InstallResult[]> {
  const { agents, cwd } = options
  const name = unwrapSourceToken(options.name)
  const results: InstallResult[] = []
  const mode = options.mode ?? 'copy'

  // 解析来源：GitHub URL 或使用配置中的默认源
  let source = options.source
  let skillName = name
  let configSources: SourceConfig[] | undefined
  let canUseSkillsShFallback = false

  const parsed = parseGitHubUrl(name)
  if (parsed) {
    if (!parsed.skill) {
      return agents.map(agent => ({
        skill: name,
        agent: agent.name,
        path: '',
        mode,
        success: false,
        error: 'GitHub 地址缺少 skill 路径',
      }))
    }

    const parsedPath = parseSkillPath(parsed.skill)
    source = createGitHubSource(parsed.repo, parsedPath.subPath)
    skillName = parsedPath.skillName
  }

  const skillsShEntry = parseSkillsShUrl(name) ?? parseSkillsShSource(name)
  if (skillsShEntry) {
    source = createGitHubSource(`${skillsShEntry.owner}/${skillsShEntry.repo}`)
    skillName = skillsShEntry.skill
  }

  if (!source) {
    // 从配置加载默认数据源
    const config = loadConfig(cwd)
    configSources = config.sources
    canUseSkillsShFallback = true
    const firstGitHub = config.sources.find(s => s.type === 'github')
    if (firstGitHub && firstGitHub.type === 'github') {
      source = createGitHubSource(firstGitHub.repo, firstGitHub.path)
    }
    else {
      source = createGitHubSource('antfu/skills', 'skills')
    }
  }

  if (!isSafeSkillName(skillName)) {
    return agents.map(agent => ({
      skill: skillName,
      agent: agent.name,
      path: '',
      mode,
      success: false,
      error: 'skill 名称不合法',
    }))
  }

  // 下载到临时目录
  const tmpDir = join(tmpdir(), `skills-cli-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })

  try {
    consola.start(`正在下载 skill: ${skillName}`)
    const downloadedDir = await downloadWithFallback({
      configSources,
      destDir: tmpDir,
      originalSource: source,
      skillName,
      useSkillsShFallback: canUseSkillsShFallback,
    })
    consola.success(`下载完成: ${skillName}`)

    let storeSkillDir: string | undefined
    if (mode === 'link') {
      storeSkillDir = getStoreSkillDir(skillName, {
        cwd,
        global: options.global,
      })

      if (existsSync(storeSkillDir) && options.force)
        rmSync(storeSkillDir, { recursive: true, force: true })

      if (!existsSync(storeSkillDir)) {
        mkdirSync(resolve(storeSkillDir, '..'), { recursive: true })
        cpSync(downloadedDir, storeSkillDir, { recursive: true, force: true })
      }
    }

    // 复制到每个 agent 的目录
    for (const agent of agents) {
      const targetBase = options.global
        ? expandHome(agent.globalDir)
        : resolve(cwd, agent.projectDir)

      const targetDir = join(targetBase, skillName)

      try {
        // 检查是否已存在
        if (existsSync(targetDir) && !options.force) {
          results.push({
            skill: skillName,
            agent: agent.name,
            path: targetDir,
            mode,
            success: false,
            error: '已存在（使用 --force 覆盖）',
          })
          continue
        }

        if (existsSync(targetDir) && options.force)
          rmSync(targetDir, { recursive: true, force: true })

        mkdirSync(targetBase, { recursive: true })
        if (mode === 'link') {
          if (!storeSkillDir)
            throw new Error('共享存储目录未初始化')

          symlinkSync(
            getSymlinkTarget(targetDir, storeSkillDir),
            targetDir,
            process.platform === 'win32' ? 'junction' : 'dir',
          )
        }
        else {
          cpSync(downloadedDir, targetDir, { recursive: true, force: true })
        }

        results.push({
          skill: skillName,
          agent: agent.name,
          path: targetDir,
          mode,
          success: true,
        })
      }
      catch (err) {
        results.push({
          skill: skillName,
          agent: agent.name,
          path: targetDir,
          mode,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return agents.map(agent => ({
      skill: skillName,
      agent: agent.name,
      path: '',
      mode,
      success: false,
      error: message,
    }))
  }
  finally {
    // 清理临时目录
    rmSync(tmpDir, { recursive: true, force: true })
  }

  return results
}

interface DownloadWithFallbackOptions {
  originalSource: SkillSource
  skillName: string
  destDir: string
  configSources?: SourceConfig[]
  useSkillsShFallback: boolean
}

async function downloadWithFallback(options: DownloadWithFallbackOptions): Promise<string> {
  try {
    return await options.originalSource.download(options.skillName, options.destDir)
  }
  catch (err) {
    if (!options.useSkillsShFallback)
      throw err

    const fallbackSource = await resolveSkillsShFallbackSource(
      options.skillName,
      options.configSources ?? [],
    )
    if (!fallbackSource)
      throw err

    consola.info(`已从 skills.sh 匹配到来源: ${fallbackSource.name}`)
    return await fallbackSource.download(options.skillName, options.destDir)
  }
}

async function resolveSkillsShFallbackSource(
  skillName: string,
  configSources: SourceConfig[],
): Promise<SkillSource | undefined> {
  const skillsShConfigs = configSources.filter(source => source.type === 'skills-sh')

  for (const config of skillsShConfigs) {
    const source = createSkillsShSource(config.url)
    const results = await source.search(skillName)
    const exact = results.find(result => result.name === skillName && result.sourceUrl)
    if (!exact?.sourceUrl)
      continue

    const entry = parseSkillsShUrl(exact.sourceUrl)
    if (!entry)
      continue

    return createGitHubSource(`${entry.owner}/${entry.repo}`)
  }

  return undefined
}

function unwrapSourceToken(name: string): string {
  return name.trim().replace(/^\[(github:|skills\.sh:)(.+)\]$/u, '$1$2')
}
