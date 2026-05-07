import { describe, expect, it } from 'vitest'
import {
  countInstalledSkills,
  createAgentSelectOptions,
  createInstalledSkillSelectOptions,
  filterSelectOptions,
  getAgentSkillDirLabel,
  groupInstalledSkillSelections,
  parseAgentIds,
  truncate,
} from '~/commands/shared'
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

  it('构建已安装 skill 选择项和查找表', () => {
    const agent = AGENTS.find(agent => agent.id === 'codex')!
    const skillsMap = new Map([
      [agent.id, [
        {
          agent,
          meta: {
            description: 'A reusable skill description',
            name: 'demo-skill',
            version: '1.0.0',
          },
          name: 'demo-skill',
          path: '/tmp/demo-skill',
        },
      ]],
    ])

    const { lookup, options } = createInstalledSkillSelectOptions(skillsMap)

    expect(countInstalledSkills(skillsMap)).toBe(1)
    expect(options).toContainEqual(expect.objectContaining({
      hint: 'Codex',
      label: expect.stringContaining('demo-skill'),
      value: 'codex::demo-skill',
    }))
    expect(lookup.get('codex::demo-skill')?.skill.path).toBe('/tmp/demo-skill')
  })

  it('过滤选择项并按助手分组选中的 skills', () => {
    const options = [
      { value: 'codex::vue-skill', label: 'vue-skill', hint: 'Codex' },
      { value: 'claude-code::react-skill', label: 'react-skill', hint: 'Claude Code' },
    ]
    const filtered = filterSelectOptions(options, 'claude')
    const lookup = new Map([
      ['codex::vue-skill', {
        agentId: 'codex',
        skill: {
          agent: AGENTS.find(agent => agent.id === 'codex')!,
          name: 'vue-skill',
          path: '/tmp/vue-skill',
        },
      }],
      ['claude-code::react-skill', {
        agentId: 'claude-code',
        skill: {
          agent: AGENTS.find(agent => agent.id === 'claude-code')!,
          name: 'react-skill',
          path: '/tmp/react-skill',
        },
      }],
    ])

    expect(filtered.map(option => option.value)).toEqual(['claude-code::react-skill'])
    expect(groupInstalledSkillSelections(options.map(option => option.value), lookup)).toEqual(new Map([
      ['codex', ['vue-skill']],
      ['claude-code', ['react-skill']],
    ]))
  })
})
