import type { SkillSource } from '~/sources/types'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// 导入 mock 后的模块
import * as p from '@clack/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uninstallCommand } from '~/commands/uninstall'

import { AGENTS } from '~/core/agents'
import { installSkill } from '~/core/installer'

// Mock @clack/prompts
vi.mock('@clack/prompts', () => {
  const cancel = Symbol('cancel')
  return {
    multiselect: vi.fn(),
    confirm: vi.fn(),
    isCancel: (value: unknown) => value === cancel,
    __cancel: cancel,
  }
})

const agents = [
  AGENTS.find(agent => agent.id === 'antigravity'),
  AGENTS.find(agent => agent.id === 'claude-code'),
].filter(agent => agent !== undefined)

const tempDirs: string[] = []

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'skills-cli-uninstall-test-'))
  tempDirs.push(dir)
  return dir
}

function createSource(files: Record<string, string> = {}): SkillSource {
  return {
    name: 'test-source',
    async search() {
      return []
    },
    async download(skillName, destDir) {
      const skillDir = join(destDir, skillName)
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        [
          '---',
          `name: ${skillName}`,
          `description: Test skill ${skillName}`,
          'version: 1.0.0',
          '---',
          '',
          `# ${skillName}`,
          '',
        ].join('\n'),
        'utf-8',
      )

      for (const [relativePath, content] of Object.entries(files)) {
        const filePath = join(skillDir, relativePath)
        mkdirSync(join(filePath, '..'), { recursive: true })
        writeFileSync(filePath, content, 'utf-8')
      }

      return skillDir
    },
  }
}

/**
 * 在 cwd 下安装指定 skills 到指定 agents
 */
async function installSkills(cwd: string, skillNames: string[], targetAgents = agents): Promise<void> {
  for (const name of skillNames) {
    await installSkill({
      agents: targetAgents,
      cwd,
      global: false,
      mode: 'copy',
      name,
      source: createSource(),
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  for (const dir of tempDirs.splice(0)) {
    if (existsSync(dir))
      rmSync(dir, { recursive: true, force: true })
  }
})

// ───────────────────────────────────────────
// 交互式多选删除（无 name 参数）
// ───────────────────────────────────────────
describe('uninstallCommand — 交互式多选模式', () => {
  it('无已安装 skills 时显示提示并返回', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await uninstallCommand(undefined, {})

    // 没有调用 multiselect
    expect(p.multiselect).not.toHaveBeenCalled()

    cwdSpy.mockRestore()
  })

  it('用户在 multiselect 取消时正常退出', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['skill-a'])

    // 模拟用户按 Ctrl+C 取消
    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    await uninstallCommand(undefined, {})

    // skills 应未被删除
    for (const agent of agents) {
      expect(existsSync(join(cwd, agent.projectDir, 'skill-a'))).toBe(true)
    }

    cwdSpy.mockRestore()
  })

  it('用户在 confirm 拒绝时不删除', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['skill-a'])

    // 模拟用户选中了 skill
    vi.mocked(p.multiselect).mockResolvedValue([`antigravity::skill-a`])
    // 模拟用户拒绝确认
    vi.mocked(p.confirm).mockResolvedValue(false)

    await uninstallCommand(undefined, {})

    // skills 应未被删除
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-a'))).toBe(true)

    cwdSpy.mockRestore()
  })

  it('用户在 confirm 取消（Ctrl+C）时不删除', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['skill-a'])

    vi.mocked(p.multiselect).mockResolvedValue([`antigravity::skill-a`])
    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.confirm).mockResolvedValue(cancel as any)

    await uninstallCommand(undefined, {})

    // skills 应未被删除
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-a'))).toBe(true)

    cwdSpy.mockRestore()
  })

  it('确认删除后成功删除选中的 skills', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['skill-a', 'skill-b'])

    // 预检: 确认 4 个 skill 目录全部存在
    for (const agent of agents) {
      expect(existsSync(join(cwd, agent.projectDir, 'skill-a'))).toBe(true)
      expect(existsSync(join(cwd, agent.projectDir, 'skill-b'))).toBe(true)
    }

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 模拟用户选择删除 skill-a（只在 antigravity agent 下）
    vi.mocked(p.multiselect).mockResolvedValue([`antigravity::skill-a`])
    vi.mocked(p.confirm).mockResolvedValue(true)

    await uninstallCommand(undefined, {})

    // skill-a 应在 antigravity 下被删除
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-a'))).toBe(false)
    // skill-a 在 claude-code 下应保留（未选中）
    expect(existsSync(join(cwd, agents[1].projectDir, 'skill-a'))).toBe(true)
    // skill-b 应在所有 agent 下保留
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-b'))).toBe(true)
    expect(existsSync(join(cwd, agents[1].projectDir, 'skill-b'))).toBe(true)

    cwdSpy.mockRestore()
  })

  it('批量删除多个 agent 下的多个 skills', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['skill-x', 'skill-y', 'skill-z'])

    // 模拟用户选择删除多个 skills 跨多个 agents
    vi.mocked(p.multiselect).mockResolvedValue([
      `antigravity::skill-x`,
      `antigravity::skill-y`,
      `claude-code::skill-x`,
      `claude-code::skill-z`,
    ])
    vi.mocked(p.confirm).mockResolvedValue(true)

    await uninstallCommand(undefined, {})

    // antigravity: skill-x 和 skill-y 被删, skill-z 保留
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-x'))).toBe(false)
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-y'))).toBe(false)
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-z'))).toBe(true)

    // claude-code: skill-x 和 skill-z 被删, skill-y 保留
    expect(existsSync(join(cwd, agents[1].projectDir, 'skill-x'))).toBe(false)
    expect(existsSync(join(cwd, agents[1].projectDir, 'skill-z'))).toBe(false)
    expect(existsSync(join(cwd, agents[1].projectDir, 'skill-y'))).toBe(true)

    cwdSpy.mockRestore()
  })

  it('multiselect 中包含正确的选项格式', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['my-skill'], [agents[0]])

    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    await uninstallCommand(undefined, {})

    // 检查 multiselect 被调用时的参数格式
    expect(p.multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('选择要删除的 skills'),
        required: true,
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'antigravity::my-skill',
            label: expect.stringContaining('my-skill'),
            hint: 'Antigravity',
          }),
        ]),
      }),
    )

    cwdSpy.mockRestore()
  })
})

// ───────────────────────────────────────────
// 带 name 参数的原有逻辑
// ───────────────────────────────────────────
describe('uninstallCommand — 指定 name 模式', () => {
  it('指定 name 和 agent 直接删除', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['direct-delete'], [agents[0]])

    await uninstallCommand('direct-delete', { agent: 'antigravity' })

    expect(existsSync(join(cwd, agents[0].projectDir, 'direct-delete'))).toBe(false)

    // multiselect 不应在此分支被调用（因为 agent 已指定）
    expect(p.multiselect).not.toHaveBeenCalled()

    cwdSpy.mockRestore()
  })

  it('指定 name 但未找到 skill 时输出警告', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 不安装任何 skill，直接尝试删除
    await uninstallCommand('nonexistent', { agent: 'antigravity' })

    // 不应该抛错
    cwdSpy.mockRestore()
  })

  it('指定 name 但无 agent 配置时弹出 agent 选择', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 创建无 .skillsrc 的空目录（loadConfig 会返回空 defaultAgents）
    // Mock multiselect 返回选中的 agent
    vi.mocked(p.multiselect).mockResolvedValue(['antigravity'])

    await installSkills(cwd, ['prompt-agent'], [agents[0]])
    await uninstallCommand('prompt-agent', {})

    // multiselect 应被调用来选择 agent
    expect(p.multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('选择目标助手'),
      }),
    )

    cwdSpy.mockRestore()
  })
})

// ───────────────────────────────────────────
// 边界场景
// ───────────────────────────────────────────
describe('uninstallCommand — 边界场景', () => {
  it('只有一个 agent 安装了 skills 时也能正常工作', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 只给第一个 agent 安装
    await installSkills(cwd, ['solo-skill'], [agents[0]])

    vi.mocked(p.multiselect).mockResolvedValue([`antigravity::solo-skill`])
    vi.mocked(p.confirm).mockResolvedValue(true)

    await uninstallCommand(undefined, {})

    expect(existsSync(join(cwd, agents[0].projectDir, 'solo-skill'))).toBe(false)

    cwdSpy.mockRestore()
  })

  it('同名 skill 在多个 agent 下独立管理', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await installSkills(cwd, ['shared-name'])

    // 只选择 claude-code 下的 shared-name 删除
    vi.mocked(p.multiselect).mockResolvedValue([`claude-code::shared-name`])
    vi.mocked(p.confirm).mockResolvedValue(true)

    await uninstallCommand(undefined, {})

    // antigravity 下的应保留
    expect(existsSync(join(cwd, agents[0].projectDir, 'shared-name'))).toBe(true)
    // claude-code 下的应被删除
    expect(existsSync(join(cwd, agents[1].projectDir, 'shared-name'))).toBe(false)

    cwdSpy.mockRestore()
  })
})
