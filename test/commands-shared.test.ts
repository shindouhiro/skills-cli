import { describe, expect, it } from 'vitest'
import { createAgentSelectOptions, getAgentSkillDirLabel, parseAgentIds, truncate } from '~/commands/shared'
import { AGENTS } from '~/core/agents'

describe('commands shared helpers', () => {
  it('解析逗号分隔的 agent id', () => {
    expect(parseAgentIds('antigravity, claude-code,,codex ')).toEqual([
      'antigravity',
      'claude-code',
      'codex',
    ])
  })

  it('按安装范围返回 agent 目录标签', () => {
    const agent = AGENTS.find(agent => agent.id === 'codex')
    expect(agent).toBeDefined()

    expect(getAgentSkillDirLabel(agent!, false)).toBe('.codex/skills/')
    expect(getAgentSkillDirLabel(agent!, true)).toBe('~/.codex/skills/')
  })

  it('构建 agent 选择项', () => {
    expect(createAgentSelectOptions(false)).toContainEqual({
      value: 'codex',
      label: 'Codex',
      hint: '.codex/skills/',
    })
  })

  it('截断长文本', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
    expect(truncate('short', 8)).toBe('short')
  })
})
