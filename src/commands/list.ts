import consola from 'consola'
import pc from 'picocolors'
import { countInstalledSkills, printInstalledSkillsTree } from '~/commands/shared'
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

  printInstalledSkillsTree(skillsMap, {
    global: options.global,
    showDescription: true,
  })

  const totalSkills = countInstalledSkills(skillsMap)
  consola.info(`共 ${pc.bold(String(skillsMap.size))} 个助手, ${pc.bold(String(totalSkills))} 个 skills`)
}
