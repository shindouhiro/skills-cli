import type { SkillSource } from '~/sources/types'
import type { SourceConfig } from '~/types'
import consola from 'consola'
import pc from 'picocolors'
import { truncate } from '~/commands/shared'
import { loadConfig } from '~/core/config'
import { createGitHubSource } from '~/sources/github'

/**
 * search 命令：搜索可用的 skills
 */
export async function searchCommand(keyword: string): Promise<void> {
  const config = loadConfig()
  consola.start(`正在搜索: ${pc.cyan(keyword)}`)

  const sources = createSourcesFromConfig(config.sources)
  let totalResults = 0

  for (const source of sources) {
    try {
      const results = await source.search(keyword)

      if (results.length === 0)
        continue

      totalResults += results.length
      consola.log('')
      consola.log(pc.dim(`  来源: ${source.name}`))
      consola.log('')

      for (const result of results) {
        const name = pc.bold(pc.green(result.name))
        const desc = result.description
          ? pc.dim(` — ${truncate(result.description, 80)}`)
          : ''
        const version = result.meta?.version
          ? pc.yellow(` v${result.meta.version}`)
          : ''

        consola.log(`  📦 ${name}${version}${desc}`)
      }
    }
    catch (err) {
      consola.warn(`数据源 ${source.name} 查询失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  consola.log('')
  if (totalResults === 0) {
    consola.info(`未找到匹配 "${keyword}" 的 skills`)
  }
  else {
    consola.success(`找到 ${pc.bold(String(totalResults))} 个 skills`)
  }
}

/**
 * 根据配置创建数据源实例
 */
function createSourcesFromConfig(configs: SourceConfig[]): SkillSource[] {
  return configs
    .map((c) => {
      if (c.type === 'github')
        return createGitHubSource(c.repo, c.path)
      // TODO: npm source, url source
      return null
    })
    .filter((s): s is SkillSource => s !== null)
}
