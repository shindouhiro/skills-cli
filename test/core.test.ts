import type { SkillSource } from '~/sources/types'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AGENTS } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { installSkill } from '~/core/installer'
import { isSafeSkillName, parseSkillPath } from '~/core/skill-name'
import { getStoreSkillDir } from '~/core/store'
import { uninstallSkill } from '~/core/uninstaller'
import { parseGitHubUrl } from '~/sources/github'

const agents = [
  AGENTS.find(agent => agent.id === 'antigravity'),
  AGENTS.find(agent => agent.id === 'claude-code'),
].filter(agent => agent !== undefined)

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    if (existsSync(dir))
      rmSync(dir, { recursive: true, force: true })
  }
})

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'skills-cli-test-'))
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
          'description: Test skill',
          'version: 1.0.0',
          '---',
          '',
          '# Test Skill',
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

// ───────────────────────────────────────────
// config
// ───────────────────────────────────────────
describe('config', () => {
  it('从当前项目向上查找并合并 .skillsrc', () => {
    const root = createTempDir()
    const child = join(root, 'packages', 'demo')
    mkdirSync(child, { recursive: true })
    writeFileSync(
      join(root, '.skillsrc'),
      JSON.stringify({
        defaultAgents: ['antigravity'],
        installMode: 'link',
        sources: [{ type: 'github', repo: 'owner/repo', path: 'skills' }],
      }),
      'utf-8',
    )

    expect(loadConfig(child)).toEqual({
      defaultAgents: ['antigravity'],
      installMode: 'link',
      scope: 'project',
      sources: [{ type: 'github', repo: 'owner/repo', path: 'skills' }],
    })
  })

  it('没有 .skillsrc 时返回默认配置', () => {
    const root = createTempDir()
    const config = loadConfig(root)
    expect(config.installMode).toBe('link')
    expect(config.scope).toBe('project')
    expect(config.sources).toHaveLength(1)
  })
})

// ───────────────────────────────────────────
// scanner
// ───────────────────────────────────────────
describe('scanner', () => {
  it('解析 SKILL.md frontmatter', () => {
    expect(parseSkillMeta([
      '---',
      'name: vue-testing-best-practices',
      'description: Vue testing guidance',
      'version: 1.0.0',
      'author: test',
      '---',
      '',
    ].join('\n'))).toEqual({
      author: 'test',
      description: 'Vue testing guidance',
      metadata: undefined,
      name: 'vue-testing-best-practices',
      version: '1.0.0',
    })
  })

  it('解析缺少可选字段的 frontmatter', () => {
    const result = parseSkillMeta([
      '---',
      'name: minimal-skill',
      'description: Minimal',
      '---',
    ].join('\n'))
    expect(result?.name).toBe('minimal-skill')
    expect(result?.version).toBeUndefined()
    expect(result?.author).toBeUndefined()
  })

  it('无效 frontmatter 返回 undefined', () => {
    expect(parseSkillMeta('# No frontmatter here')).toBeUndefined()
  })

  it('支持 CRLF frontmatter', () => {
    expect(parseSkillMeta([
      '---\r',
      'name: windows-skill\r',
      'description: from windows\r',
      'version: 2.0.0\r',
      '---\r',
      '',
    ].join('\n'))).toEqual({
      author: undefined,
      description: 'from windows',
      metadata: undefined,
      name: 'windows-skill',
      version: '2.0.0',
    })
  })
})

describe('skill name', () => {
  it('校验合法 skill 名称', () => {
    expect(isSafeSkillName('vue-testing')).toBe(true)
    expect(isSafeSkillName('nested/path')).toBe(false)
    expect(isSafeSkillName('..')).toBe(false)
    expect(isSafeSkillName('  ')).toBe(false)
  })

  it('解析 skill 路径为子目录与名称', () => {
    expect(parseSkillPath('skills/vue')).toEqual({
      skillName: 'vue',
      subPath: 'skills',
    })
    expect(parseSkillPath('vue')).toEqual({
      skillName: 'vue',
    })
  })
})

// ───────────────────────────────────────────
// installer
// ───────────────────────────────────────────
describe('installer', () => {
  it('copy 模式会向每个 agent 目录复制完整 skill', async () => {
    const cwd = createTempDir()

    const results = await installSkill({
      agents,
      cwd,
      global: false,
      mode: 'copy',
      name: 'demo-skill',
      source: createSource({ 'nested/file.txt': 'hello' }),
    })

    expect(results).toMatchObject([
      { agent: 'Antigravity', mode: 'copy', success: true },
      { agent: 'Claude Code', mode: 'copy', success: true },
    ])

    for (const agent of agents) {
      const skillDir = join(cwd, agent.projectDir, 'demo-skill')
      expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true)
      expect(readFileSync(join(skillDir, 'nested/file.txt'), 'utf-8')).toBe('hello')
      expect(lstatSync(skillDir).isSymbolicLink()).toBe(false)
    }

    // copy 模式不应创建 store
    expect(existsSync(getStoreSkillDir('demo-skill', { cwd, global: false }))).toBe(false)
  })

  it('link 模式只保存一份 store，并在每个 agent 目录创建链接', async () => {
    const cwd = createTempDir()

    const results = await installSkill({
      agents,
      cwd,
      global: false,
      mode: 'link',
      name: 'linked-skill',
      source: createSource(),
    })

    expect(results.every(result => result.success && result.mode === 'link')).toBe(true)

    // store 中应有唯一真实副本
    const storeSkillDir = getStoreSkillDir('linked-skill', { cwd, global: false })
    expect(existsSync(join(storeSkillDir, 'SKILL.md'))).toBe(true)

    // 每个 agent 目录应是 symlink
    for (const agent of agents) {
      const skillDir = join(cwd, agent.projectDir, 'linked-skill')
      expect(lstatSync(skillDir).isSymbolicLink()).toBe(true)
      expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true)
    }
  })

  it('link 模式已存在时不会重复下载 store', async () => {
    const cwd = createTempDir()

    // 先安装一个 agent
    await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'link',
      name: 'shared-skill',
      source: createSource(),
    })

    const storeMtimeBefore = existsSync(
      getStoreSkillDir('shared-skill', { cwd, global: false }),
    )

    // 再安装另一个 agent（store 已存在，不应再复制）
    await installSkill({
      agents: [agents[1]],
      cwd,
      global: false,
      mode: 'link',
      name: 'shared-skill',
      source: createSource({ 'extra.txt': 'new' }),
    })

    // store 内容应与第一次安装相同（无 extra.txt）
    expect(storeMtimeBefore).toBe(true)
    expect(existsSync(join(
      getStoreSkillDir('shared-skill', { cwd, global: false }),
      'extra.txt',
    ))).toBe(false)
  })

  it('force 模式会强制覆盖已存在的 skill', async () => {
    const cwd = createTempDir()

    await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'overwrite-skill',
      source: createSource({ 'v1.txt': 'v1' }),
    })

    await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'overwrite-skill',
      source: createSource({ 'v2.txt': 'v2' }),
      force: true,
    })

    const skillDir = join(cwd, agents[0].projectDir, 'overwrite-skill')
    expect(existsSync(join(skillDir, 'v2.txt'))).toBe(true)
  })

  it('不加 force 时不会覆盖已存在的 skill', async () => {
    const cwd = createTempDir()

    await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'no-overwrite',
      source: createSource(),
    })

    const results = await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'no-overwrite',
      source: createSource(),
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toContain('已存在')
  })

  it('scanLocalSkills 能识别 link 模式安装的 skill', async () => {
    const cwd = createTempDir()

    await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'link',
      name: 'scanned-skill',
      source: createSource(),
    })

    const skills = scanLocalSkills(cwd)
    expect(skills.get(agents[0].id)?.[0]).toMatchObject({
      meta: {
        description: 'Test skill',
        name: 'scanned-skill',
        version: '1.0.0',
      },
      name: 'scanned-skill',
    })
  })

  it('拒绝包含路径分隔符的 skill 名称', async () => {
    const cwd = createTempDir()

    const results = await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'bad/path',
      source: createSource(),
    })

    expect(results).toEqual([
      {
        agent: 'Antigravity',
        error: 'skill 名称不合法',
        mode: 'copy',
        path: '',
        skill: 'bad/path',
        success: false,
      },
    ])
  })

  it('github 地址缺少 skill 路径时返回错误', async () => {
    const cwd = createTempDir()

    const results = await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'github:antfu/skills',
    })

    expect(results).toEqual([
      {
        agent: 'Antigravity',
        error: 'GitHub 地址缺少 skill 路径',
        mode: 'copy',
        path: '',
        skill: 'github:antfu/skills',
        success: false,
      },
    ])
  })
})

// ───────────────────────────────────────────
// uninstaller
// ───────────────────────────────────────────
describe('uninstaller', () => {
  it('删除 agent 链接，并在无引用时清理 store', async () => {
    const cwd = createTempDir()

    await installSkill({
      agents,
      cwd,
      global: false,
      mode: 'link',
      name: 'remove-me',
      source: createSource(),
    })

    const results = await uninstallSkill({
      agents,
      cwd,
      global: false,
      name: 'remove-me',
    })

    expect(results.every(result => result.success)).toBe(true)
    expect(existsSync(join(cwd, agents[0].projectDir, 'remove-me'))).toBe(false)
    expect(existsSync(join(cwd, agents[1].projectDir, 'remove-me'))).toBe(false)
    expect(existsSync(join(cwd, '.skills'))).toBe(false)
  })

  it('部分 agent 卸载时 store 应保留', async () => {
    const cwd = createTempDir()

    await installSkill({
      agents,
      cwd,
      global: false,
      mode: 'link',
      name: 'partial-remove',
      source: createSource(),
    })

    // 只卸载第一个 agent
    await uninstallSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      name: 'partial-remove',
    })

    expect(existsSync(join(cwd, agents[0].projectDir, 'partial-remove'))).toBe(false)
    // 第二个 agent 还在引用，store 应保留
    expect(existsSync(getStoreSkillDir('partial-remove', { cwd, global: false }))).toBe(true)
  })

  it('copy 模式卸载不存在的 skill 返回错误', async () => {
    const cwd = createTempDir()

    const results = await uninstallSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      name: 'not-exist',
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toContain('未找到')
  })

  it('拒绝不安全的 skill 名称', async () => {
    const cwd = createTempDir()

    const results = await uninstallSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      name: '../bad',
    })

    expect(results).toEqual([
      {
        agent: 'Antigravity',
        error: 'skill 名称不合法',
        path: '',
        skill: '../bad',
        success: false,
      },
    ])
  })

  it('拒绝空的 skill 名称', async () => {
    const cwd = createTempDir()

    const results = await uninstallSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      name: '  ',
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toBe('skill 名称不合法')
  })
})

// ───────────────────────────────────────────
// github source helpers
// ───────────────────────────────────────────
describe('github source helpers', () => {
  it('解析 github 简写', () => {
    expect(parseGitHubUrl('github:antfu/skills/vue')).toEqual({
      repo: 'antfu/skills',
      skill: 'vue',
    })
  })

  it('解析完整 GitHub URL', () => {
    expect(parseGitHubUrl('https://github.com/antfu/skills/tree/main/skills/vue')).toEqual({
      repo: 'antfu/skills',
      skill: 'skills/vue',
    })
  })

  it('不带 skill 路径的简写', () => {
    expect(parseGitHubUrl('github:antfu/skills')).toEqual({
      repo: 'antfu/skills',
      skill: undefined,
    })
  })

  it('非 GitHub URL 返回 null', () => {
    expect(parseGitHubUrl('not-a-github-url')).toBeNull()
    expect(parseGitHubUrl('npm:some-package')).toBeNull()
  })
})
