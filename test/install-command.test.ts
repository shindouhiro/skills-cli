import * as p from '@clack/prompts'
import consola from 'consola'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installCommand } from '~/commands/install'
import { installSkill } from '~/core/installer'

vi.mock('@clack/prompts', () => {
  const cancel = Symbol('cancel')
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    autocompleteMultiselect: vi.fn(),
    multiselect: vi.fn(),
    isCancel: (value: unknown) => value === cancel,
  }
})

vi.mock('~/core/config', () => ({
  loadConfig: vi.fn(() => ({
    defaultAgents: ['antigravity', 'claude-code'],
    installMode: 'link',
    scope: 'project',
    sources: [],
  })),
}))

vi.mock('~/core/installer', () => ({
  installSkill: vi.fn(async () => [
    {
      agent: 'Antigravity',
      mode: 'link',
      path: '/tmp/.agent/skills/demo-skill',
      skill: 'demo-skill',
      success: true,
    },
  ]),
}))

function mockConsolaOutput(): void {
  vi.spyOn(consola, 'error').mockImplementation(() => {})
  vi.spyOn(consola, 'info').mockImplementation(() => {})
  vi.spyOn(consola, 'log').mockImplementation(() => {})
  vi.spyOn(consola, 'success').mockImplementation(() => {})
  vi.spyOn(consola, 'warn').mockImplementation(() => {})
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConsolaOutput()
  process.exitCode = undefined
})

describe('installCommand', () => {
  it('未指定 agent 时每次弹出助手选择，并用默认助手作为预选项', async () => {
    vi.mocked(p.autocompleteMultiselect).mockResolvedValue(['antigravity'])

    await installCommand('demo-skill', {})

    expect(p.intro).toHaveBeenCalled()
    expect(p.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValues: ['antigravity', 'claude-code'],
        placeholder: expect.stringContaining('过滤'),
      }),
    )
    expect(installSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        agents: [
          expect.objectContaining({
            id: 'antigravity',
          }),
        ],
      }),
    )
  })

  it('指定 agent 时不弹出助手选择', async () => {
    await installCommand('demo-skill', { agent: 'antigravity' })

    expect(p.autocompleteMultiselect).not.toHaveBeenCalled()
    expect(installSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        agents: [
          expect.objectContaining({
            id: 'antigravity',
          }),
        ],
      }),
    )
  })

  it('agent 选项不带值时进入助手选择', async () => {
    vi.mocked(p.autocompleteMultiselect).mockResolvedValue(['claude-code'])

    await installCommand('demo-skill', { agent: true, global: true })

    expect(p.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValues: ['antigravity', 'claude-code'],
      }),
    )
    expect(installSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        agents: [
          expect.objectContaining({
            id: 'claude-code',
          }),
        ],
        global: true,
      }),
    )
  })
})
