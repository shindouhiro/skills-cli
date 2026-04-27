import type { SkillSource } from '~/sources/types'
import type { SkillSearchResult } from '~/types'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { ofetch } from 'ofetch'
import { parseSkillMeta } from '~/core/scanner'

interface GitHubContent {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url: string | null
}

interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  url: string
}

interface GitHubTreeResponse {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

/**
 * 创建 GitHub 数据源
 * @param repo - GitHub 仓库 (owner/repo)
 * @param subPath - 仓库内 skills 所在子目录（如 'skills'）
 */
export function createGitHubSource(repo: string, subPath?: string): SkillSource {
  const baseApi = `https://api.github.com/repos/${repo}`
  // skills 目录在仓库中的路径
  const skillsRoot = subPath || ''

  return {
    name: `github:${repo}${subPath ? `/${subPath}` : ''}`,

    async search(keyword: string): Promise<SkillSearchResult[]> {
      // 获取 skills 目录列表
      const contentsPath = skillsRoot ? `${baseApi}/contents/${skillsRoot}` : `${baseApi}/contents`
      const contents = await ofetch<GitHubContent[]>(contentsPath, {
        headers: getHeaders(),
      })

      // 筛选目录（每个目录是一个 skill）
      const skillDirs = contents.filter(c => c.type === 'dir')
      const results: SkillSearchResult[] = []

      // 并行获取每个 skill 的 SKILL.md
      const promises = skillDirs.map(async (dir) => {
        try {
          const skillMdPath = skillsRoot
            ? `${skillsRoot}/${dir.name}/SKILL.md`
            : `${dir.name}/SKILL.md`
          const skillMdUrl = `https://raw.githubusercontent.com/${repo}/main/${skillMdPath}`
          const content = await ofetch<string>(skillMdUrl, {
            headers: getHeaders(),
            responseType: 'text',
          })
          const meta = parseSkillMeta(content)

          return {
            name: dir.name,
            meta,
            source: `github:${repo}`,
            sourceUrl: `https://github.com/${repo}/tree/main/${skillsRoot ? `${skillsRoot}/` : ''}${dir.name}`,
            description: meta?.description || '',
          } satisfies SkillSearchResult
        }
        catch {
          // SKILL.md 不存在，跳过
          return null
        }
      })

      const settled = await Promise.all(promises)
      for (const result of settled) {
        if (result)
          results.push(result)
      }

      // 按关键词过滤
      const lowerKeyword = keyword.toLowerCase()
      return results.filter((r) => {
        return r.name.toLowerCase().includes(lowerKeyword)
          || r.description.toLowerCase().includes(lowerKeyword)
      })
    },

    async download(skillName: string, destDir: string): Promise<string> {
      const skillDir = join(destDir, skillName)
      mkdirSync(skillDir, { recursive: true })

      // 使用 Git Trees API 递归获取 skill 目录下所有文件
      const treeData = await ofetch<GitHubTreeResponse>(
        `${baseApi}/git/trees/main?recursive=1`,
        { headers: getHeaders() },
      )

      // 过滤出该 skill 目录下的所有文件
      const prefix = skillsRoot
        ? `${skillsRoot}/${skillName}/`
        : `${skillName}/`
      const files = treeData.tree.filter(
        item => item.type === 'blob' && item.path.startsWith(prefix),
      )

      if (files.length === 0) {
        throw new Error(`Skill "${skillName}" 在 ${repo} 中未找到`)
      }

      // 并行下载所有文件
      const downloadPromises = files.map(async (file) => {
        const relativePath = file.path.slice(prefix.length)
        const filePath = join(skillDir, relativePath)
        const fileDir = join(filePath, '..')

        mkdirSync(fileDir, { recursive: true })

        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${file.path}`
        const content = await ofetch<string>(rawUrl, {
          headers: getHeaders(),
          responseType: 'text',
        })
        writeFileSync(filePath, content, 'utf-8')
      })

      await Promise.all(downloadPromises)

      // 验证 SKILL.md 存在
      if (!existsSync(join(skillDir, 'SKILL.md'))) {
        throw new Error(`Skill "${skillName}" 没有 SKILL.md 文件`)
      }

      return skillDir
    },
  }
}

/**
 * 获取 GitHub API 请求头
 * 支持 GITHUB_TOKEN 和 GH_TOKEN 环境变量
 */
function getHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'skills-cli',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * 从 GitHub URL 解析 owner/repo 和 skill 名称
 * 支持格式：
 *   github:antfu/skills/vue
 *   https://github.com/antfu/skills/tree/main/vue
 */
export function parseGitHubUrl(url: string): { repo: string, skill?: string } | null {
  // github:owner/repo/skill
  const shortMatch = url.match(/^github:([^/]+\/[^/]+)(?:\/(.+))?$/)
  if (shortMatch) {
    return { repo: shortMatch[1], skill: shortMatch[2] }
  }

  // https://github.com/owner/repo/tree/branch/skill
  const fullMatch = url.match(/github\.com\/([^/]+\/[^/]+)(?:\/tree\/[^/]+\/(.+))?/)
  if (fullMatch) {
    return { repo: fullMatch[1], skill: fullMatch[2] }
  }

  return null
}
