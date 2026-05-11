import type {
  AgentsResponse,
  ApiResult,
  ConfigResponse,
  ScopedUploadTargetConfig,
  SkillSearchResult,
  SkillsResponse,
  TargetSkillsResponse,
} from '../types/ui'

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json() as T

  if (!res.ok) {
    const error = typeof data === 'object' && data && 'error' in data
      ? String((data as { error?: unknown }).error)
      : `请求失败: ${res.status}`
    throw new Error(error)
  }

  return data
}

function jsonBody(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const api = {
  agents: () => requestJson<AgentsResponse>('/api/agents'),
  skills: () => requestJson<SkillsResponse>('/api/skills'),
  config: (scope: 'project' | 'global') => requestJson<ConfigResponse>(`/api/config?scope=${scope}`),
  search: (keyword: string) => requestJson<SkillSearchResult[]>(`/api/search?q=${encodeURIComponent(keyword)}`),
  install: (body: { name: string, global: boolean, agents: string[] }) => requestJson<ApiResult>(`/api/install`, jsonBody(body)),
  uninstall: (body: { name: string, global: boolean, agents: string[] }) => requestJson<ApiResult>(`/api/uninstall`, jsonBody(body)),
  upload: (body: { name: string, global: boolean }) => requestJson<ApiResult>(`/api/upload`, jsonBody(body)),
  saveConfig: (body: { path: string, content: string }) => requestJson<ApiResult>(`/api/config`, jsonBody(body)),
  targets: () => requestJson<ScopedUploadTargetConfig[]>('/api/targets'),
  addTarget: (body: { name: string, url: string, path: string, branch: string, global: boolean }) => requestJson<ApiResult>(`/api/targets`, jsonBody(body)),
  deleteTarget: (body: { name: string, global: boolean }) => requestJson<ApiResult>('/api/targets', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  targetSkills: (targetName: string, global: boolean) =>
    requestJson<TargetSkillsResponse>(`/api/targets/skills?targetName=${encodeURIComponent(targetName)}&global=${global}`),
  deleteTargetSkill: (body: { targetName: string, skillName: string, global: boolean }) => requestJson<ApiResult>('/api/targets/skills', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
}
