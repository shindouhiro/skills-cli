import type { AgentDefinition } from '~/types'
import process from 'node:process'

/**
 * 30+ AI 编码助手的 skills 目录映射表
 */
export const AGENTS: AgentDefinition[] = [
  { name: 'Antigravity', id: 'antigravity', projectDir: '.agent/skills/', globalDir: '~/.gemini/antigravity/skills/', icon: 'ai:antigravity-color' },
  { name: 'Claude Code', id: 'claude-code', projectDir: '.claude/skills/', globalDir: '~/.claude/skills/', icon: 'ai:claude' },
  { name: 'Moltbot', id: 'moltbot', projectDir: 'skills/', globalDir: '~/.moltbot/skills/', icon: 'lucide:bot' },
  { name: 'Cline', id: 'cline', projectDir: '.cline/skills/', globalDir: '~/.cline/skills/', icon: 'ai:cline' },
  { name: 'CodeBuddy', id: 'codebuddy', projectDir: '.codebuddy/skills/', globalDir: '~/.codebuddy/skills/', icon: 'lucide:users' },
  { name: 'Codex', id: 'codex', projectDir: '.codex/skills/', globalDir: '~/.codex/skills/', icon: 'ai:codex-color' },
  { name: 'Command Code', id: 'command-code', projectDir: '.commandcode/skills/', globalDir: '~/.commandcode/skills/', icon: 'lucide:command' },
  { name: 'Crush', id: 'crush', projectDir: '.crush/skills/', globalDir: '~/.config/crush/skills/', icon: 'lucide:hammer' },
  { name: 'Cursor', id: 'cursor', projectDir: '.cursor/skills/', globalDir: '~/.cursor/skills/', icon: 'ai:cursor' },
  { name: 'Droid', id: 'droid', projectDir: '.factory/skills/', globalDir: '~/.factory/skills/', icon: 'lucide:cpu' },
  { name: 'GitHub Copilot', id: 'github-copilot', projectDir: '.github/skills/', globalDir: '~/.copilot/skills/', icon: 'ai:githubcopilot' },
  { name: 'Goose', id: 'goose', projectDir: '.goose/skills/', globalDir: '~/.config/goose/skills/', icon: 'ai:goose' },
  { name: 'Junie', id: 'junie', projectDir: '.junie/skills/', globalDir: '~/.junie/skills/', icon: 'ai:junie-color' },
  { name: 'Kilo Code', id: 'kilo', projectDir: '.kilocode/skills/', globalDir: '~/.kilocode/skills/', icon: 'ai:kilocode' },
  { name: 'Kiro CLI', id: 'kiro-cli', projectDir: '.kiro/skills/', globalDir: '~/.kiro/skills/', icon: 'lucide:key' },
  { name: 'Kode', id: 'kode', projectDir: '.kode/skills/', globalDir: '~/.kode/skills/', icon: 'lucide:code-2' },
  { name: 'MCPJam', id: 'mcpjam', projectDir: '.mcpjam/skills/', globalDir: '~/.mcpjam/skills/', icon: 'lucide:music' },
  { name: 'Mux', id: 'mux', projectDir: '.mux/skills/', globalDir: '~/.mux/skills/', icon: 'lucide:layers' },
  { name: 'OpenCode', id: 'opencode', projectDir: '.opencode/skills/', globalDir: '~/.config/opencode/skills/', icon: 'ai:opencode' },
  { name: 'OpenHands', id: 'openhands', projectDir: '.openhands/skills/', globalDir: '~/.openhands/skills/', icon: 'ai:openclaw-color' },
  { name: 'Pi', id: 'pi', projectDir: '.pi/skills/', globalDir: '~/.pi/agent/skills/', icon: 'lucide:pi' },
  { name: 'Qoder', id: 'qoder', projectDir: '.qoder/skills/', globalDir: '~/.qoder/skills/', icon: 'ai:qoder-color' },
  { name: 'Qwen Code', id: 'qwen-code', projectDir: '.qwen/skills/', globalDir: '~/.qwen/skills/', icon: 'ai:qwen' },
  { name: 'Roo Code', id: 'roo', projectDir: '.roo/skills/', globalDir: '~/.roo/skills/', icon: 'ai:roocode' },
  { name: 'Trae', id: 'trae', projectDir: '.trae/skills/', globalDir: '~/.trae/skills/', icon: 'ai:trae-color' },
  { name: 'Windsurf', id: 'windsurf', projectDir: '.windsurf/skills/', globalDir: '~/.codeium/windsurf/skills/', icon: 'ai:windsurf' },
  { name: 'Zencoder', id: 'zencoder', projectDir: '.zencoder/skills/', globalDir: '~/.zencoder/skills/', icon: 'ai:zencoder-color' },
]

/**
 * 按 ID 查找 agent
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENTS.find(a => a.id === id)
}

/**
 * 按 ID 列表查找 agents
 */
export function getAgentsByIds(ids: string[]): AgentDefinition[] {
  return ids
    .map(id => getAgentById(id))
    .filter((a): a is AgentDefinition => a !== undefined)
}

/**
 * 展开 ~ 为用户主目录
 */
export function expandHome(dir: string): string {
  if (dir.startsWith('~/')) {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    return dir.replace('~', home)
  }
  return dir
}
