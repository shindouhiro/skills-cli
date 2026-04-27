import type { SkillSearchResult } from '~/types'

/**
 * 数据源接口
 */
export interface SkillSource {
  /** 数据源名称 */
  name: string
  /** 搜索 skills */
  search: (keyword: string) => Promise<SkillSearchResult[]>
  /** 下载 skill 到临时目录，返回目录路径 */
  download: (skillName: string, destDir: string) => Promise<string>
}
