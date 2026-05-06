import type { InstalledSkill, SkillsConfig, UploadTargetConfig } from '~/types'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { scanGlobalSkills, scanLocalSkills } from '~/core/scanner'
import { isSafeSkillName } from '~/core/skill-name'
import { getStoreSkillDir } from '~/core/store'

const DEFAULT_UPLOAD_PATH = 'skills'

export interface UploadSkill {
  name: string
  path: string
  sources: InstalledSkill[]
  warning?: string
}

export interface CollectUploadSkillsOptions {
  cwd: string
  global: boolean
  names?: string[]
}

export interface CollectUploadSkillsResult {
  skills: UploadSkill[]
  missing: string[]
  warnings: string[]
}

export interface UploadSkillsOptions {
  cwd: string
  global: boolean
  target: UploadTargetConfig
  skills: UploadSkill[]
  dryRun?: boolean
  message?: string
}

export interface UploadSkillsResult {
  target: UploadTargetConfig
  uploaded: string[]
  changed: boolean
  dryRun: boolean
  commit?: string
  repoDir?: string
}

export function getUploadTarget(
  config: SkillsConfig,
  targetName?: string,
): UploadTargetConfig | undefined {
  const targets = config.upload?.targets ?? []
  if (targets.length === 0)
    return undefined

  if (targetName)
    return targets.find(target => target.name === targetName)

  if (config.upload?.defaultTarget) {
    const defaultTarget = targets.find(target => target.name === config.upload?.defaultTarget)
    if (defaultTarget)
      return defaultTarget
  }

  return targets[0]
}

export function normalizeUploadTarget(
  target: UploadTargetConfig,
): UploadTargetConfig {
  const path = normalizeTargetPath(target.path)
  return {
    ...target,
    ...(path ? { path } : {}),
  }
}

export function normalizeTargetPath(path = DEFAULT_UPLOAD_PATH): string {
  return path
    .split('/')
    .filter(Boolean)
    .join('/') || DEFAULT_UPLOAD_PATH
}

export function collectUploadSkills(options: CollectUploadSkillsOptions): CollectUploadSkillsResult {
  const skillsMap = options.global
    ? scanGlobalSkills()
    : scanLocalSkills(options.cwd)
  const byName = new Map<string, InstalledSkill[]>()

  for (const skills of skillsMap.values()) {
    for (const skill of skills) {
      const entries = byName.get(skill.name) ?? []
      entries.push(skill)
      byName.set(skill.name, entries)
    }
  }

  const requestedNames = normalizeRequestedNames(options.names)
  const names = requestedNames ?? [...byName.keys()].sort((a, b) => a.localeCompare(b))
  const missing = requestedNames?.filter(name => !byName.has(name)) ?? []
  const warnings: string[] = []
  const skills: UploadSkill[] = []

  for (const name of names) {
    const entries = byName.get(name)
    if (!entries)
      continue

    const selected = selectUploadSkill(name, entries, options)
    if (selected.warning)
      warnings.push(selected.warning)
    skills.push(selected)
  }

  return { missing, skills, warnings }
}

export function addUploadTargetToConfig(
  config: SkillsConfig,
  target: UploadTargetConfig,
): { added: boolean, config: SkillsConfig } {
  const normalized = normalizeUploadTarget(target)
  const upload = config.upload ?? { targets: [] }
  const exists = upload.targets.some(item => item.name === normalized.name)

  if (exists)
    return { added: false, config }

  return {
    added: true,
    config: {
      ...config,
      upload: {
        defaultTarget: upload.defaultTarget ?? normalized.name,
        targets: [...upload.targets, normalized],
      },
    },
  }
}

export function uploadSkills(options: UploadSkillsOptions): UploadSkillsResult {
  const target = normalizeUploadTarget(options.target)
  const uploaded = options.skills.map(skill => skill.name)

  if (options.dryRun) {
    return {
      changed: uploaded.length > 0,
      dryRun: true,
      target,
      uploaded,
    }
  }

  const tmpDir = join(tmpdir(), `skills-cli-upload-${Date.now()}`)
  const repoDir = join(tmpDir, 'repo')
  mkdirSync(tmpDir, { recursive: true })

  try {
    cloneTarget(target, repoDir, options.cwd)
    checkoutBranch(target, repoDir)
    ensureGitIdentity(repoDir)

    const targetRoot = join(repoDir, normalizeTargetPath(target.path))
    mkdirSync(targetRoot, { recursive: true })

    for (const skill of options.skills) {
      const destination = join(targetRoot, skill.name)
      rmSync(destination, { recursive: true, force: true })
      cpSync(skill.path, destination, {
        dereference: true,
        force: true,
        recursive: true,
      })
    }

    runGit(repoDir, ['add', normalizeTargetPath(target.path)])
    const changed = hasChanges(repoDir)
    if (!changed) {
      return {
        changed: false,
        dryRun: false,
        repoDir,
        target,
        uploaded,
      }
    }

    runGit(repoDir, ['commit', '-m', options.message ?? buildDefaultCommitMessage(uploaded)])
    const commit = runGit(repoDir, ['rev-parse', '--short', 'HEAD'])
    runGit(repoDir, ['push', 'origin', 'HEAD'])

    return {
      changed: true,
      commit,
      dryRun: false,
      repoDir,
      target,
      uploaded,
    }
  }
  finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

function normalizeRequestedNames(names?: string[]): string[] | undefined {
  const normalized = names
    ?.map(name => name.trim())
    .filter(Boolean)

  return normalized && normalized.length > 0
    ? [...new Set(normalized)]
    : undefined
}

function selectUploadSkill(
  name: string,
  entries: InstalledSkill[],
  options: CollectUploadSkillsOptions,
): UploadSkill {
  validateSkillName(name)
  const storeDir = getStoreSkillDir(name, {
    cwd: options.cwd,
    global: options.global,
  })
  const selectedPath = existsSync(join(storeDir, 'SKILL.md'))
    ? storeDir
    : entries[0].path

  validateSkillDir(name, selectedPath)

  const warning = entries.length > 1 && hasDifferentContents(entries.map(entry => entry.path))
    ? `检测到多个助手中存在不同内容的 ${name}，将上传 ${formatPath(selectedPath, options.cwd)}`
    : undefined

  return {
    name,
    path: selectedPath,
    sources: entries,
    ...(warning ? { warning } : {}),
  }
}

function validateSkillName(name: string): void {
  if (!isSafeSkillName(name))
    throw new Error(`skill 名称不合法: ${name}`)
}

function validateSkillDir(name: string, dir: string): void {
  if (!existsSync(join(dir, 'SKILL.md')))
    throw new Error(`skill "${name}" 缺少 SKILL.md`)
}

function hasDifferentContents(paths: string[]): boolean {
  const fingerprints = new Set(paths.map(createDirectoryFingerprint))
  return fingerprints.size > 1
}

function createDirectoryFingerprint(dir: string): string {
  const files = listFiles(dir)
  return files
    .map((file) => {
      const abs = join(dir, file)
      const hash = createHash('sha256').update(readFileSync(abs)).digest('hex')
      return `${file}\0${hash}`
    })
    .join('\0')
}

function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(join(dir, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      const abs = join(dir, relativePath)
      if (statSync(abs).isDirectory())
        return listFiles(dir, relativePath)
      if (statSync(abs).isFile())
        return [relativePath]
      return []
    })
    .sort((a, b) => a.localeCompare(b))
}

function cloneTarget(target: UploadTargetConfig, repoDir: string, cwd: string): void {
  runGit(cwd, ['clone', target.url, repoDir])
}

function checkoutBranch(target: UploadTargetConfig, repoDir: string): void {
  if (!target.branch)
    return

  try {
    runGit(repoDir, ['checkout', target.branch])
  }
  catch {
    runGit(repoDir, ['checkout', '-b', target.branch])
  }
}

function ensureGitIdentity(repoDir: string): void {
  try {
    runGit(repoDir, ['config', 'user.email'])
  }
  catch {
    runGit(repoDir, ['config', 'user.email', 'skills-cli@example.local'])
  }

  try {
    runGit(repoDir, ['config', 'user.name'])
  }
  catch {
    runGit(repoDir, ['config', 'user.name', 'Skills CLI'])
  }
}

function hasChanges(repoDir: string): boolean {
  return runGit(repoDir, ['status', '--porcelain']).trim().length > 0
}

function buildDefaultCommitMessage(names: string[]): string {
  if (names.length === 1)
    return `upload skill: ${names[0]}`
  return `upload skills: ${names.join(', ')}`
}

function runGit(cwd: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  }
  catch (err) {
    const error = err as { stderr?: { toString: () => string }, message?: string }
    const stderr = error.stderr?.toString().trim()
    throw new Error(stderr || error.message || `git ${args.join(' ')} 执行失败`)
  }
}

function formatPath(path: string, cwd: string): string {
  const abs = resolve(path)
  const rel = relative(cwd, abs)
  return rel && !rel.startsWith('..')
    ? rel
    : abs
}
