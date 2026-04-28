import type { SkillSource } from '~/sources/types'
import type { SkillSearchResult } from '~/types'
import { ofetch } from 'ofetch'
import { withCache } from '~/core/cache'

const DEFAULT_BASE_URL = 'https://skills.sh'
const DEFAULT_MAX_RESULTS = 50

interface SkillsShEntry {
  owner: string
  repo: string
  skill: string
  url: string
}

export function createSkillsShSource(baseUrl = DEFAULT_BASE_URL): SkillSource {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, '')

  return {
    name: `skills.sh:${normalizedBaseUrl}`,

    async search(keyword: string): Promise<SkillSearchResult[]> {
      // 缓存 sitemap，5 分钟内不重复请求
      const cacheKey = `skills-sh:sitemap:${normalizedBaseUrl}`
      const sitemap = await withCache(cacheKey, () =>
        ofetch<string>(`${normalizedBaseUrl}/sitemap.xml`, {
          parseResponse: txt => txt,
        }))

      const entries = parseSkillsShSitemap(sitemap)
      const lowerKeyword = keyword.toLowerCase()

      return entries
        .filter((entry) => {
          const source = `${entry.owner}/${entry.repo}`
          return entry.skill.toLowerCase().includes(lowerKeyword)
            || source.toLowerCase().includes(lowerKeyword)
            || entry.url.toLowerCase().includes(lowerKeyword)
        })
        .slice(0, DEFAULT_MAX_RESULTS)
        .map(entry => ({
          name: entry.skill,
          source: `skills.sh:${entry.owner}/${entry.repo}`,
          sourceUrl: entry.url,
          description: `Published by ${entry.owner}/${entry.repo}`,
        }))
    },

    async download(): Promise<string> {
      throw new Error('skills.sh 数据源仅支持搜索；安装请使用搜索结果对应的 GitHub 仓库地址')
    },
  }
}

export function parseSkillsShSitemap(sitemap: string): SkillsShEntry[] {
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/skills\.sh\/[^<]+)<\/loc>/gu)]
    .map(match => match[1])

  return urls
    .map(parseSkillsShUrl)
    .filter((entry): entry is SkillsShEntry => entry !== null)
}

export function parseSkillsShUrl(url: string): SkillsShEntry | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  }
  catch {
    return null
  }

  if (parsed.hostname !== 'skills.sh')
    return null

  const segments = parsed.pathname
    .split('/')
    .filter(Boolean)
    .map(segment => decodeURIComponent(segment))

  if (segments.length !== 3)
    return null

  const [owner, repo, skill] = segments
  if (!owner || !repo || !skill)
    return null

  return {
    owner,
    repo,
    skill,
    url: parsed.toString(),
  }
}
