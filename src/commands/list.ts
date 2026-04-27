import consola from 'consola'
import pc from 'picocolors'
import { AGENTS } from '~/core/agents'
import { scanGlobalSkills, scanLocalSkills } from '~/core/scanner'

interface ListCommandOptions {
  global?: boolean
}

/**
 * list 命令：列出本地已安装的 skills
 */
export async function listCommand(options: ListCommandOptions): Promise<void> {
  const skillsMap = options.global
    ? scanGlobalSkills()
    : scanLocalSkills()

  if (skillsMap.size === 0) {
    consola.info(options.global
      ? '未找到全局已安装的 skills'
      : '未找到本地已安装的 skills',
    )
    return
  }

  consola.log('')

  for (const [agentId, skills] of skillsMap) {
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent)
      continue

    const dir = options.global ? agent.globalDir : agent.projectDir
    consola.log(`  ${pc.bold(agent.name)} ${pc.dim(`(${dir})`)}`)

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i]
      const isLast = i === skills.length - 1
      const prefix = isLast ? '└──' : '├──'

      const name = pc.green(skill.name)
      const version = skill.meta?.version
        ? pc.yellow(` v${skill.meta.version}`)
        : ''
      const desc = skill.meta?.description
        ? pc.dim(` — ${truncate(skill.meta.description, 60)}`)
        : ''

      consola.log(`  ${pc.dim(prefix)} ${name}${version}${desc}`)
    }

    consola.log('')
  }

  // 统计
  let totalSkills = 0
  for (const skills of skillsMap.values()) {
    totalSkills += skills.length
  }
  consola.info(`共 ${pc.bold(String(skillsMap.size))} 个助手, ${pc.bold(String(totalSkills))} 个 skills`)
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen)
    return str
  return `${str.slice(0, maxLen - 3)}...`
}
