import type { SkillSource } from '~/sources/types'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AGENTS } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { installSkill } from '~/core/installer'
import { parseSkillMeta, scanLocalSkills } from '~/core/scanner'
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
})

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
})

describe('installer and uninstaller', () => {
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

    const storeSkillDir = getStoreSkillDir('linked-skill', { cwd, global: false })
    expect(existsSync(join(storeSkillDir, 'SKILL.md'))).toBe(true)

    for (const agent of agents) {
      const skillDir = join(cwd, agent.projectDir, 'linked-skill')
      expect(lstatSync(skillDir).isSymbolicLink()).toBe(true)
      expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true)
    }
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

  it('uninstall 会删除 agent 链接，并在无引用时清理 store', async () => {
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

  it('uninstall 会拒绝不安全的 skill 名称', async () => {
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
})

describe('github source helpers', () => {
  it('解析 github 简写和完整 URL', () => {
    expect(parseGitHubUrl('github:antfu/skills/vue')).toEqual({
      repo: 'antfu/skills',
      skill: 'vue',
    })
    expect(parseGitHubUrl('https://github.com/antfu/skills/tree/main/skills/vue')).toEqual({
      repo: 'antfu/skills',
      skill: 'skills/vue',
    })
    expect(parseGitHubUrl('not-a-github-url')).toBeNull()
  })
})
