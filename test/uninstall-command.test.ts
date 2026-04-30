import { existsSync } from 'node:fs'
import { join } from 'node:path'
// 导入 mock 后的模块
import * as p from '@clack/prompts'
import consola from 'consola'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uninstallCommand } from '~/commands/uninstall'
import { testAgents as agents, createTempDir, installTestSkills as installSkills } from './helpers'

// Mock @clack/prompts
vi.mock('@clack/prompts', () => {
  const cancel = Symbol('cancel')
  return {
    autocompleteMultiselect: vi.fn(),
    multiselect: vi.fn(),
    confirm: vi.fn(),
    text: vi.fn(),
    isCancel: (value: unknown) => value === cancel,
    __cancel: cancel,
  }
})

/**
 * Mock p.text 返回空字符串（跳过过滤）
 */
function mockSkipFilter(): void {
  vi.mocked(p.text).mockResolvedValue('')
}

function mockConsolaOutput(): void {
  vi.spyOn(consola, 'error').mockImplementation(() => {})
  vi.spyOn(consola, 'info').mockImplementation(() => {})
  vi.spyOn(consola, 'log').mockImplementation(() => {})
  vi.spyOn(consola, 'start').mockImplementation(() => {})
  vi.spyOn(consola, 'success').mockImplementation(() => {})
  vi.spyOn(consola, 'warn').mockImplementation(() => {})
}

beforeEach(() => {
  vi.clearAllMocks()
  // 默认跳过过滤（多数测试不关心过滤步骤）
  mockSkipFilter()
  mockConsolaOutput()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ───────────────────────────────────────────
// 交互式多选删除（无 name 参数）
// ───────────────────────────────────────────
describe('uninstallCommand — 交互式多选模式', () => {
  it('无已安装 skills 时显示提示并返回', async () => {
    const cwd = createTempDir()
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    await uninstallCommand(undefined, {})

    // 没有调用 text 或 multiselect
    expect(p.text).not.toHaveBeenCalled()
    expect(p.multiselect).not.toHaveBeenCalled()

    cwdSpy.mockRestore()
  })

  it('用户在过滤输入时取消则退出', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['skill-a'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.text).mockResolvedValue(cancel as any)

    await uninstallCommand(undefined, {})

    // multiselect 不应被调用
    expect(p.multiselect).not.toHaveBeenCalled()
    // skills 应保留
    expect(existsSync(join(cwd, agents[0].projectDir, 'skill-a'))).toBe(true)

    cwdSpy.mockRestore()
  })

  it('用户在 multiselect 取消时正常退出', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['skill-a'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

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

    await installSkills(cwd, ['skill-a'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

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

    await installSkills(cwd, ['skill-a'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

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

    await installSkills(cwd, ['skill-x', 'skill-y', 'skill-z'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

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

    await installSkills(cwd, ['my-skill'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

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
// 关键字过滤
// ───────────────────────────────────────────
describe('uninstallCommand — 关键字过滤', () => {
  it('交互式输入关键字过滤后只显示匹配的 skills', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['vue-testing', 'vue-router', 'react-hooks'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 模拟用户输入过滤关键字 "vue"
    vi.mocked(p.text).mockResolvedValue('vue')
    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    await uninstallCommand(undefined, {})

    // multiselect 应只包含 vue 相关的选项
    const multiselectCall = vi.mocked(p.multiselect).mock.calls[0][0] as { options: { value: string }[] }
    const values = multiselectCall.options.map(o => o.value)

    expect(values).toContain('antigravity::vue-testing')
    expect(values).toContain('antigravity::vue-router')
    expect(values).not.toContain('antigravity::react-hooks')

    cwdSpy.mockRestore()
  })

  it('--filter CLI 选项跳过交互式过滤输入', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['vue-testing', 'react-hooks'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    // 通过 --filter 选项传入关键字
    await uninstallCommand(undefined, { filter: 'vue' })

    // p.text 不应被调用（跳过交互式过滤）
    expect(p.text).not.toHaveBeenCalled()

    // multiselect 应只包含 vue 相关的选项
    const multiselectCall = vi.mocked(p.multiselect).mock.calls[0][0] as { options: { value: string }[] }
    const values = multiselectCall.options.map(o => o.value)

    expect(values).toContain('antigravity::vue-testing')
    expect(values).not.toContain('antigravity::react-hooks')

    cwdSpy.mockRestore()
  })

  it('过滤无匹配结果时显示提示并退出', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['vue-testing'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 使用 --filter 传入不存在的关键字
    await uninstallCommand(undefined, { filter: 'nonexistent-keyword' })

    // multiselect 不应被调用
    expect(p.multiselect).not.toHaveBeenCalled()

    cwdSpy.mockRestore()
  })

  it('过滤支持大小写不敏感匹配', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['Vue-Testing', 'react-hooks'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    // 小写输入应匹配大写 skill 名
    await uninstallCommand(undefined, { filter: 'vue' })

    const multiselectCall = vi.mocked(p.multiselect).mock.calls[0][0] as { options: { value: string }[] }
    const values = multiselectCall.options.map(o => o.value)

    expect(values).toContain('antigravity::Vue-Testing')
    expect(values).not.toContain('antigravity::react-hooks')

    cwdSpy.mockRestore()
  })

  it('过滤匹配 agent 名称', async () => {
    const cwd = createTempDir()

    // 只给 antigravity 安装
    await installSkills(cwd, ['my-skill'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    // 用 agent 名过滤
    await uninstallCommand(undefined, { filter: 'antigravity' })

    expect(p.multiselect).toHaveBeenCalled()

    cwdSpy.mockRestore()
  })

  it('过滤后确认删除的完整流程', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['vue-testing', 'react-hooks'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 用 --filter 过滤出 vue 相关
    vi.mocked(p.multiselect).mockResolvedValue([`antigravity::vue-testing`])
    vi.mocked(p.confirm).mockResolvedValue(true)

    await uninstallCommand(undefined, { filter: 'vue' })

    // vue-testing 应被删除
    expect(existsSync(join(cwd, agents[0].projectDir, 'vue-testing'))).toBe(false)
    // react-hooks 应保留
    expect(existsSync(join(cwd, agents[0].projectDir, 'react-hooks'))).toBe(true)

    cwdSpy.mockRestore()
  })

  it('空过滤关键字显示全部选项', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['skill-a', 'skill-b'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    // 模拟用户直接回车（空过滤）
    vi.mocked(p.text).mockResolvedValue('')
    const cancel = (p as unknown as { __cancel: symbol }).__cancel
    vi.mocked(p.multiselect).mockResolvedValue(cancel as any)

    await uninstallCommand(undefined, {})

    // multiselect 应包含所有选项
    const multiselectCall = vi.mocked(p.multiselect).mock.calls[0][0] as { options: { value: string }[] }
    const values = multiselectCall.options.map(o => o.value)

    expect(values).toContain('antigravity::skill-a')
    expect(values).toContain('antigravity::skill-b')

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

    // Mock autocompleteMultiselect 返回选中的 agent
    vi.mocked(p.autocompleteMultiselect).mockResolvedValue(['antigravity'])

    await installSkills(cwd, ['prompt-agent'], [agents[0]])
    await uninstallCommand('prompt-agent', {})

    // autocompleteMultiselect 应被调用来选择 agent
    expect(p.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('选择目标助手'),
        placeholder: expect.stringContaining('过滤'),
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

    // 只给第一个 agent 安装
    await installSkills(cwd, ['solo-skill'], [agents[0]])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    vi.mocked(p.multiselect).mockResolvedValue([`antigravity::solo-skill`])
    vi.mocked(p.confirm).mockResolvedValue(true)

    await uninstallCommand(undefined, {})

    expect(existsSync(join(cwd, agents[0].projectDir, 'solo-skill'))).toBe(false)

    cwdSpy.mockRestore()
  })

  it('同名 skill 在多个 agent 下独立管理', async () => {
    const cwd = createTempDir()

    await installSkills(cwd, ['shared-name'])

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

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
