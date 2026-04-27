/**
 * 安装模式
 */
export type InstallMode = 'copy' | 'link'

/**
 * Agent 助手定义
 */
export interface AgentDefinition {
  /** 显示名称 */
  name: string
  /** 唯一标识 */
  id: string
  /** 项目级 skills 目录（相对于项目根） */
  projectDir: string
  /** 用户级 skills 目录（绝对路径 ~ 展开） */
  globalDir: string
}

/**
 * Skill 元数据（从 SKILL.md frontmatter 解析）
 */
export interface SkillMeta {
  name: string
  description: string
  version?: string
  author?: string
  metadata?: Record<string, unknown>
}

/**
 * 搜索结果
 */
export interface SkillSearchResult {
  /** skill 名称（目录名） */
  name: string
  /** 来自 SKILL.md 的元数据 */
  meta?: SkillMeta
  /** 来源（github / npm / local） */
  source: string
  /** 来源详情（如 GitHub URL） */
  sourceUrl?: string
  /** 描述 */
  description: string
}

/**
 * 已安装的 skill 信息
 */
export interface InstalledSkill {
  name: string
  path: string
  agent: AgentDefinition
  meta?: SkillMeta
}

/**
 * 配置文件结构 (.skillsrc)
 */
export interface SkillsConfig {
  /** 默认安装到哪些助手 */
  defaultAgents: string[]
  /** 数据源配置 */
  sources: SourceConfig[]
  /** 安装范围：project 或 global */
  scope: 'project' | 'global'
  /** 安装模式：copy 会复制到每个助手目录，link 使用共享存储和符号链接 */
  installMode?: InstallMode
}

/**
 * 数据源配置
 */
export type SourceConfig
  = | { type: 'github', repo: string, path?: string }
    | { type: 'npm', keyword: string }
    | { type: 'url', url: string }
