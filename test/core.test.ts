import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSourceUrl, sourceAddCommand } from '~/commands/source'
import { uploadTargetAddCommand } from '~/commands/upload'
import { getAgentById } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { installSkill } from '~/core/installer'
import { parseSkillMeta, scanLocalSkills } from '~/core/scanner'
import { isSafeSkillName, parseSkillPath } from '~/core/skill-name'
import { getStoreSkillDir } from '~/core/store'
import { uninstallSkill } from '~/core/uninstaller'
import { collectUploadSkills, getUploadTarget, uploadSkills } from '~/core/upload'
import { findSkillPrefix, parseGitHubUrl } from '~/sources/github'
import { parseSkillsShSitemap, parseSkillsShSource, parseSkillsShUrl } from '~/sources/skills-sh'
import { testAgents as agents, createSource, createTempDir, installTestSkills } from './helpers'

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
      sources: [
        { type: 'skills-sh', url: 'https://skills.sh' },
        { type: 'github', repo: 'owner/repo', path: 'skills' },
      ],
    })
  })

  it('没有 .skillsrc 时返回默认配置', () => {
    const root = createTempDir()
    const config = loadConfig(root)
    expect(config.installMode).toBe('link')
    expect(config.scope).toBe('project')
    expect(config.sources).toEqual([
      { type: 'skills-sh', url: 'https://skills.sh' },
      { type: 'github', repo: 'antfu/skills', path: 'skills' },
    ])
  })

  it('加载 upload 配置并能解析默认上传目标', () => {
    const root = createTempDir()
    writeFileSync(
      join(root, '.skillsrc'),
      JSON.stringify({
        upload: {
          defaultTarget: 'personal',
          targets: [
            {
              name: 'personal',
              path: 'skills',
              type: 'git',
              url: 'git@github.com:owner/skills.git',
            },
          ],
        },
      }),
      'utf-8',
    )

    const config = loadConfig(root)
    expect(getUploadTarget(config)).toEqual({
      name: 'personal',
      path: 'skills',
      type: 'git',
      url: 'git@github.com:owner/skills.git',
    })
  })
})

// ───────────────────────────────────────────
// source command
// ───────────────────────────────────────────
describe('source command', () => {
  it('解析 github 仓库 URL 为可搜索下载的数据源', () => {
    expect(parseSourceUrl('https://github.com/owner/repo/tree/main/skills/vue')).toEqual({
      type: 'github',
      repo: 'owner/repo',
      path: 'skills/vue',
    })
  })

  it('解析 github 简写并支持 path 覆盖', () => {
    expect(parseSourceUrl('github:owner/repo/examples', { path: 'skills' })).toEqual({
      type: 'github',
      repo: 'owner/repo',
      path: 'skills',
    })
  })

  it('解析无协议 github URL', () => {
    expect(parseSourceUrl('github.com/owner/repo/tree/main/skills')).toEqual({
      type: 'github',
      repo: 'owner/repo',
      path: 'skills',
    })
  })

  it('解析 skills.sh URL 为搜索数据源', () => {
    expect(parseSourceUrl('https://skills.sh/picks')).toEqual({
      type: 'skills-sh',
      url: 'https://skills.sh',
    })
  })

  it('添加 source 会写入项目级 .skillsrc 并避免重复', async () => {
    const cwd = createTempDir()

    await sourceAddCommand('https://github.com/owner/repo/tree/main/skills', { cwd })
    await sourceAddCommand('github:owner/repo/skills', { cwd })

    const config = loadConfig(cwd)
    expect(config.sources.filter(source =>
      source.type === 'github'
      && source.repo === 'owner/repo'
      && source.path === 'skills',
    )).toHaveLength(1)
  })
})

// ───────────────────────────────────────────
// upload
// ───────────────────────────────────────────
describe('upload', () => {
  it('添加 upload target 会写入项目级 .skillsrc 并避免重复名称', async () => {
    const cwd = createTempDir()

    await uploadTargetAddCommand('git@github.com:owner/skills.git', {
      cwd,
      name: 'personal',
      path: 'skills',
    })
    await uploadTargetAddCommand('git@github.com:owner/other.git', {
      cwd,
      name: 'personal',
      path: 'other',
    })

    const config = loadConfig(cwd)
    expect(config.upload).toEqual({
      defaultTarget: 'personal',
      targets: [
        {
          name: 'personal',
          path: 'skills',
          type: 'git',
          url: 'git@github.com:owner/skills.git',
        },
      ],
    })
  })

  it('收集本地 skills 时按名称过滤并报告缺失项', async () => {
    const cwd = createTempDir()
    await installTestSkills(cwd, ['upload-one', 'upload-two'])

    const result = collectUploadSkills({
      cwd,
      global: false,
      names: ['upload-two', 'missing-skill'],
    })

    expect(result.skills.map(skill => skill.name)).toEqual(['upload-two'])
    expect(result.missing).toEqual(['missing-skill'])
  })

  it('同名 skill 内容不同且存在 store 时优先上传 store 版本', async () => {
    const cwd = createTempDir()

    await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'link',
      name: 'duplicated-skill',
      source: createSource({ 'store.txt': 'store' }),
    })
    await installSkill({
      agents: [agents[1]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'duplicated-skill',
      source: createSource({ 'copy.txt': 'copy' }),
    })

    const result = collectUploadSkills({
      cwd,
      global: false,
      names: ['duplicated-skill'],
    })

    expect(result.skills[0].path).toBe(getStoreSkillDir('duplicated-skill', { cwd, global: false }))
    expect(result.warnings[0]).toContain('检测到多个助手中存在不同内容')
  })

  it('dry-run 不会访问 Git 远端', async () => {
    const cwd = createTempDir()
    await installTestSkills(cwd, ['dry-run-skill'])
    const collected = collectUploadSkills({ cwd, global: false, names: ['dry-run-skill'] })

    const result = uploadSkills({
      cwd,
      dryRun: true,
      global: false,
      skills: collected.skills,
      target: {
        name: 'broken',
        type: 'git',
        url: 'ssh://invalid.example.com/repo.git',
      },
    })

    expect(result).toMatchObject({
      changed: true,
      dryRun: true,
      uploaded: ['dry-run-skill'],
    })
  })

  it('能上传 skill 到本地 Git 远端，且无变化时不创建提交', async () => {
    const cwd = createTempDir()
    const remote = join(cwd, 'remote.git')
    const checkout = join(cwd, 'checkout')

    execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' })
    await installTestSkills(cwd, ['git-upload-skill'])
    const collected = collectUploadSkills({ cwd, global: false, names: ['git-upload-skill'] })

    const first = uploadSkills({
      cwd,
      global: false,
      skills: collected.skills,
      target: {
        name: 'local',
        path: 'skills',
        type: 'git',
        url: remote,
      },
    })

    expect(first.changed).toBe(true)
    expect(first.commit).toBeTruthy()

    execFileSync('git', ['clone', remote, checkout], { stdio: 'ignore' })
    expect(existsSync(join(checkout, 'skills', 'git-upload-skill', 'SKILL.md'))).toBe(true)

    const second = uploadSkills({
      cwd,
      global: false,
      skills: collected.skills,
      target: {
        name: 'local',
        path: 'skills',
        type: 'git',
        url: remote,
      },
    })

    expect(second.changed).toBe(false)
    expect(second.commit).toBeUndefined()
  })
})

// ───────────────────────────────────────────
// agents
// ───────────────────────────────────────────
describe('agents', () => {
  it('antigravity 全局 skills 路径使用官方目录', () => {
    expect(getAgentById('antigravity')?.globalDir).toBe('~/.gemini/config/skills/')
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

  it('下载失败时返回每个 agent 的失败结果而不是抛出异常', async () => {
    const cwd = createTempDir()

    const results = await installSkill({
      agents: [agents[0]],
      cwd,
      global: false,
      mode: 'copy',
      name: 'missing-skill',
      source: {
        name: 'broken-source',
        async search() {
          return []
        },
        async download() {
          throw new Error('远程 skill 未找到')
        },
      },
    })

    expect(results).toEqual([
      {
        agent: 'Antigravity',
        error: '远程 skill 未找到',
        mode: 'copy',
        path: '',
        skill: 'missing-skill',
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

  it('能定位嵌套目录中的 skill 前缀', () => {
    expect(findSkillPrefix([
      {
        mode: '100644',
        path: 'skills/vue-ui-skills/element-plus-vue3/SKILL.md',
        sha: 'sha',
        type: 'blob',
        url: 'url',
      },
      {
        mode: '100644',
        path: 'skills/vue-ui-skills/element-plus-vue3/examples/button.md',
        sha: 'sha',
        type: 'blob',
        url: 'url',
      },
    ], 'skills', 'element-plus-vue3')).toBe('skills/vue-ui-skills/element-plus-vue3/')
  })
})

describe('skills.sh source helpers', () => {
  it('解析 skills.sh skill 页面 URL', () => {
    expect(parseSkillsShUrl('https://skills.sh/vercel-labs/agent-skills/web-design-guidelines')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      skill: 'web-design-guidelines',
      url: 'https://skills.sh/vercel-labs/agent-skills/web-design-guidelines',
    })
  })

  it('解析 skills.sh 来源标记', () => {
    expect(parseSkillsShSource('[skills.sh:teachingai/full-stack-skills/element-plus-vue3]')).toEqual({
      owner: 'teachingai',
      repo: 'full-stack-skills',
      skill: 'element-plus-vue3',
      url: 'https://skills.sh/teachingai/full-stack-skills/element-plus-vue3',
    })
  })

  it('忽略非 skill 页面 URL', () => {
    expect(parseSkillsShUrl('https://skills.sh/picks')).toBeNull()
    expect(parseSkillsShUrl('https://example.com/owner/repo/skill')).toBeNull()
  })

  it('从 sitemap 解析 skill 列表', () => {
    const sitemap = [
      '<urlset>',
      '<url><loc>https://skills.sh/picks</loc></url>',
      '<url><loc>https://skills.sh/anthropics/skills/frontend-design</loc></url>',
      '<url><loc>https://skills.sh/vercel-labs/agent-skills/web-design-guidelines</loc></url>',
      '</urlset>',
    ].join('')

    expect(parseSkillsShSitemap(sitemap)).toEqual([
      {
        owner: 'anthropics',
        repo: 'skills',
        skill: 'frontend-design',
        url: 'https://skills.sh/anthropics/skills/frontend-design',
      },
      {
        owner: 'vercel-labs',
        repo: 'agent-skills',
        skill: 'web-design-guidelines',
        url: 'https://skills.sh/vercel-labs/agent-skills/web-design-guidelines',
      },
    ])
  })
})
