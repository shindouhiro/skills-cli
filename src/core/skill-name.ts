export function isSafeSkillName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed)
    return false

  if (trimmed === '.' || trimmed === '..')
    return false

  return !trimmed.includes('/') && !trimmed.includes('\\')
}

export interface ParsedSkillPath {
  skillName: string
  subPath?: string
}

/**
 * 将远程路径（如 skills/vue）拆解为 skill 名称与仓库子目录。
 */
export function parseSkillPath(path: string): ParsedSkillPath {
  const segments = path
    .trim()
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)

  if (segments.length <= 1) {
    return {
      skillName: segments[0] ?? path.trim(),
    }
  }

  return {
    skillName: segments[segments.length - 1],
    subPath: segments.slice(0, -1).join('/'),
  }
}
