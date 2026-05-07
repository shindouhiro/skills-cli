import type { AgentDefinition, InstalledSkill, SkillSearchResult, UploadTargetConfig } from '../../types'

export type AppTab = 'installed' | 'search' | 'targets' | 'config'
export type ToastType = 'success' | 'error' | 'warning'
export type ConfirmType = 'danger' | 'info'
export type SkillScope = 'local' | 'global'
export interface TargetSkill {
  name: string
  meta?: {
    name?: string
    description?: string
    version?: string
  }
}

export interface AgentsResponse {
  agents: AgentDefinition[]
  defaultAgents: string[]
}

export interface SkillsResponse {
  local: Record<string, InstalledSkill[]>
  global: Record<string, InstalledSkill[]>
}

export interface ConfigResponse {
  path: string
  content: string
  scope: 'project' | 'global'
}

export interface ApiResult<T = unknown> {
  success: boolean
  message?: string
  error?: string
  results?: T
}

export interface TargetSkillsResponse {
  success: boolean
  skills: TargetSkill[]
  error?: string
}

export interface TargetSkillsState {
  skills: TargetSkill[]
  loading: boolean
  error: string | null
}

export type { AgentDefinition, InstalledSkill, SkillSearchResult, UploadTargetConfig }
