import type { AgentDefinition } from '~/types'
import process from 'node:process'

/**
 * 30+ AI 编码助手的 skills 目录映射表
 */
export const AGENTS: AgentDefinition[] = [
  { name: 'Amp / Kimi Code CLI', id: 'amp', projectDir: '.agents/skills/', globalDir: '~/.config/agents/skills/' },
  { name: 'Antigravity', id: 'antigravity', projectDir: '.agent/skills/', globalDir: '~/.gemini/antigravity/global_skills/' },
  { name: 'Claude Code', id: 'claude-code', projectDir: '.claude/skills/', globalDir: '~/.claude/skills/' },
  { name: 'Moltbot', id: 'moltbot', projectDir: 'skills/', globalDir: '~/.moltbot/skills/' },
  { name: 'Cline', id: 'cline', projectDir: '.cline/skills/', globalDir: '~/.cline/skills/' },
  { name: 'CodeBuddy', id: 'codebuddy', projectDir: '.codebuddy/skills/', globalDir: '~/.codebuddy/skills/' },
  { name: 'Codex', id: 'codex', projectDir: '.codex/skills/', globalDir: '~/.codex/skills/' },
  { name: 'Command Code', id: 'command-code', projectDir: '.commandcode/skills/', globalDir: '~/.commandcode/skills/' },
  { name: 'Continue', id: 'continue', projectDir: '.continue/skills/', globalDir: '~/.continue/skills/' },
  { name: 'Crush', id: 'crush', projectDir: '.crush/skills/', globalDir: '~/.config/crush/skills/' },
  { name: 'Cursor', id: 'cursor', projectDir: '.cursor/skills/', globalDir: '~/.cursor/skills/' },
  { name: 'Droid', id: 'droid', projectDir: '.factory/skills/', globalDir: '~/.factory/skills/' },
  { name: 'Gemini CLI', id: 'gemini-cli', projectDir: '.gemini/skills/', globalDir: '~/.gemini/skills/' },
  { name: 'GitHub Copilot', id: 'github-copilot', projectDir: '.github/skills/', globalDir: '~/.copilot/skills/' },
  { name: 'Goose', id: 'goose', projectDir: '.goose/skills/', globalDir: '~/.config/goose/skills/' },
  { name: 'Junie', id: 'junie', projectDir: '.junie/skills/', globalDir: '~/.junie/skills/' },
  { name: 'Kilo Code', id: 'kilo', projectDir: '.kilocode/skills/', globalDir: '~/.kilocode/skills/' },
  { name: 'Kiro CLI', id: 'kiro-cli', projectDir: '.kiro/skills/', globalDir: '~/.kiro/skills/' },
  { name: 'Kode', id: 'kode', projectDir: '.kode/skills/', globalDir: '~/.kode/skills/' },
  { name: 'MCPJam', id: 'mcpjam', projectDir: '.mcpjam/skills/', globalDir: '~/.mcpjam/skills/' },
  { name: 'Mux', id: 'mux', projectDir: '.mux/skills/', globalDir: '~/.mux/skills/' },
  { name: 'OpenCode', id: 'opencode', projectDir: '.opencode/skills/', globalDir: '~/.config/opencode/skills/' },
  { name: 'OpenHands', id: 'openhands', projectDir: '.openhands/skills/', globalDir: '~/.openhands/skills/' },
  { name: 'Pi', id: 'pi', projectDir: '.pi/skills/', globalDir: '~/.pi/agent/skills/' },
  { name: 'Qoder', id: 'qoder', projectDir: '.qoder/skills/', globalDir: '~/.qoder/skills/' },
  { name: 'Qwen Code', id: 'qwen-code', projectDir: '.qwen/skills/', globalDir: '~/.qwen/skills/' },
  { name: 'Roo Code', id: 'roo', projectDir: '.roo/skills/', globalDir: '~/.roo/skills/' },
  { name: 'Trae', id: 'trae', projectDir: '.trae/skills/', globalDir: '~/.trae/skills/' },
  { name: 'Windsurf', id: 'windsurf', projectDir: '.windsurf/skills/', globalDir: '~/.codeium/windsurf/skills/' },
  { name: 'Zencoder', id: 'zencoder', projectDir: '.zencoder/skills/', globalDir: '~/.zencoder/skills/' },
  { name: 'Neovate', id: 'neovate', projectDir: '.neovate/skills/', globalDir: '~/.neovate/skills/' },
  { name: 'Pochi', id: 'pochi', projectDir: '.pochi/skills/', globalDir: '~/.pochi/skills/' },
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
