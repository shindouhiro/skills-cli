import type { SkillSource } from '~/sources/types'
import type { SkillSearchResult, SourceConfig } from '~/types'
import consola from 'consola'
import pc from 'picocolors'
import { truncate } from '~/commands/shared'
import { loadConfig } from '~/core/config'
import { createGitHubSource } from '~/sources/github'
import { createSkillsShSource } from '~/sources/skills-sh'

/** 默认不限制结果数（0 = 不限制） */
const DEFAULT_LIMIT = 0

/**
 * search 命令选项
 */
export interface SearchOptions {
  /** 最大显示结果数，不传或传 0 表示不限制 */
  limit?: number
}

/**
 * 单个数据源的搜索结果
 */
interface SourceSearchResult {
  source: SkillSource
  results: SkillSearchResult[]
  error?: Error
}

/**
 * 计算搜索相关度分数
 * - 名称精确匹配: 100
 * - 名称包含关键词: 50
 * - 描述包含关键词: 10
 */
function calcRelevance(item: SkillSearchResult, keyword: string): number {
  const lowerKeyword = keyword.toLowerCase()
  const lowerName = item.name.toLowerCase()

  if (lowerName === lowerKeyword)
    return 100
  if (lowerName.startsWith(lowerKeyword))
    return 75
  if (lowerName.includes(lowerKeyword))
    return 50
  if (item.description.toLowerCase().includes(lowerKeyword))
    return 10

  return 0
}

/**
 * 按相关度排序搜索结果
 */
function sortByRelevance(results: SkillSearchResult[], keyword: string): SkillSearchResult[] {
  return [...results].sort((a, b) => calcRelevance(b, keyword) - calcRelevance(a, keyword))
}

/**
 * 去重：同名 skill 只保留第一个出现的
 */
function deduplicateResults(results: SkillSearchResult[]): SkillSearchResult[] {
  const seen = new Set<string>()
  return results.filter((item) => {
    // 使用 name + source 作为唯一键，避免不同源的同名 skill 被误合并
    const key = `${item.name}@${item.source}`
    if (seen.has(key))
      return false
    seen.add(key)
    return true
  })
}

/**
 * 并行搜索单个数据源
 */
async function searchSource(source: SkillSource, keyword: string): Promise<SourceSearchResult> {
  try {
    const results = await source.search(keyword)
    return { source, results }
  }
  catch (err) {
    return { source, results: [], error: err instanceof Error ? err : new Error(String(err)) }
  }
}

/**
 * 打印搜索结果列表
 */
function printResults(results: SkillSearchResult[]): void {
  for (const item of results) {
    const name = pc.bold(pc.green(item.name))
    const desc = item.description
      ? pc.dim(` — ${truncate(item.description, 80)}`)
      : ''
    const version = item.meta?.version
      ? pc.yellow(` v${item.meta.version}`)
      : ''
    const source = pc.dim(` [${item.source}]`)

    consola.log(`  📦 ${name}${version}${desc}${source}`)
  }
}

/**
 * search 命令：搜索可用的 skills
 * 所有数据源并行搜索 → 合并 → 去重 → 排序 → 截断
 */
export async function searchCommand(keyword: string, options: SearchOptions = {}): Promise<void> {
  const config = loadConfig()
  const limit = options.limit ?? DEFAULT_LIMIT

  consola.start(`正在搜索: ${pc.cyan(keyword)}`)

  const sources = createSourcesFromConfig(config.sources)

  if (sources.length === 0) {
    consola.info('未配置任何数据源，请先运行 skills init')
    return
  }

  const sorted = await executeSearch(keyword, sources)

  // 截断
  const truncated = limit > 0 ? sorted.slice(0, limit) : sorted
  const hasMore = limit > 0 && sorted.length > limit

  consola.log('')
  if (truncated.length === 0) {
    consola.info(`未找到匹配 "${keyword}" 的 skills`)
  }
  else {
    printResults(truncated)
    consola.log('')

    if (hasMore) {
      consola.success(`显示前 ${pc.bold(String(limit))} 个结果（共 ${pc.bold(String(sorted.length))} 个）`)
    }
    else {
      consola.success(`找到 ${pc.bold(String(sorted.length))} 个 skills`)
    }
  }
}

/**
 * 根据配置创建数据源实例
 */
export function createSourcesFromConfig(configs: SourceConfig[]): SkillSource[] {
  return configs
    .map((c) => {
      if (c.type === 'github')
        return createGitHubSource(c.repo, c.path)
      if (c.type === 'skills-sh')
        return createSkillsShSource(c.url)
      return null
    })
    .filter((s): s is SkillSource => s !== null)
}

/**
 * 核心搜索逻辑
 */
export async function executeSearch(keyword: string, sources: SkillSource[]): Promise<SkillSearchResult[]> {
  // 并行搜索所有数据源
  const sourceResults = await Promise.allSettled(
    sources.map(source => searchSource(source, keyword)),
  )

  // 收集所有结果
  const allResults: SkillSearchResult[] = []
  for (const settled of sourceResults) {
    if (settled.status === 'rejected') {
      continue
    }
    const { error, results } = settled.value
    if (error) {
      continue
    }
    allResults.push(...results)
  }

  // 去重 → 排序
  const unique = deduplicateResults(allResults)
  return sortByRelevance(unique, keyword)
}
