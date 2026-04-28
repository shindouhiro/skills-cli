import type { SkillSource } from '~/sources/types'
import type { AgentDefinition } from '~/types'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'vitest'
import { AGENTS } from '~/core/agents'
import { installSkill } from '~/core/installer'

const tempDirs: string[] = []

export const testAgents = [
  AGENTS.find(agent => agent.id === 'antigravity'),
  AGENTS.find(agent => agent.id === 'claude-code'),
].filter((agent): agent is AgentDefinition => agent !== undefined)

export function createTempDir(prefix = 'skills-cli-test-'): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

export function createSource(files: Record<string, string> = {}): SkillSource {
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

export async function installTestSkills(
  cwd: string,
  skillNames: string[],
  agents = testAgents,
): Promise<void> {
  for (const name of skillNames) {
    await installSkill({
      agents,
      cwd,
      global: false,
      mode: 'copy',
      name,
      source: createSource(),
    })
  }
}

export function cleanupTempDirs(): void {
  for (const dir of tempDirs.splice(0)) {
    if (existsSync(dir))
      rmSync(dir, { recursive: true, force: true })
  }
}

afterEach(cleanupTempDirs)
