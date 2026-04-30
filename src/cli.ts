#!/usr/bin/env node
import process from 'node:process'
import cac from 'cac'
import consola from 'consola'
import pc from 'picocolors'
import { initCommand } from '~/commands/init'
import { installCommand } from '~/commands/install'
import { listCommand } from '~/commands/list'
import { searchCommand } from '~/commands/search'
import { uninstallCommand } from '~/commands/uninstall'
import { version } from '../package.json'

const cli = cac('skills')

// === Banner ===
function showBanner(): void {
  consola.log('')
  consola.log(`${pc.bold(pc.cyan('  ⚡ Skills CLI'))} ${pc.dim(`v${version}`)}`)
  consola.log(pc.dim('  AI Agent Skills 管理工具'))
  consola.log('')
}

// === search ===
cli
  .command('search <keyword>', '搜索可用的 skills')
  .alias('s')
  .option('-l, --limit <count>', '最大显示结果数（默认 25，0 表示不限制）')
  .action(async (keyword: string, options: { limit?: string }) => {
    showBanner()
    await searchCommand(keyword, {
      limit: options.limit !== undefined ? Number(options.limit) : undefined,
    })
  })

// === install ===
cli
  .command('install <name>', '安装 skill')
  .alias('i')
  .alias('add')
  .option('-a, --agent <agents>', '目标助手，逗号分隔（如 antigravity,claude-code）')
  .option('-g, --global', '安装到全局（用户级）目录')
  .option('-f, --force', '强制覆盖已存在的 skill')
  .option('-l, --link', '使用共享存储并在助手目录创建符号链接')
  .option('-i, --interactive', '强制进入交互式选择模式')
  .action(async (name: string, options: { agent?: string, global?: boolean, force?: boolean, link?: boolean, interactive?: boolean }) => {
    showBanner()
    await installCommand(name, options)
  })

// === list ===
cli
  .command('list', '列出已安装的 skills')
  .alias('ls')
  .option('-g, --global', '列出全局已安装的 skills')
  .action(async (options: { global?: boolean }) => {
    showBanner()
    await listCommand(options)
  })

// === uninstall ===
cli
  .command('uninstall [name]', '删除已安装的 skill（不传 name 进入多选模式）')
  .alias('u')
  .alias('remove')
  .alias('rm')
  .alias('delete')
  .option('-a, --agent <agents>', '目标助手，逗号分隔（如 antigravity,claude-code）')
  .option('-g, --global', '从全局（用户级）目录删除')
  .option('-f, --filter <keyword>', '按关键字过滤 skills 列表')
  .action(async (name: string | undefined, options: { agent?: string, global?: boolean, filter?: string }) => {
    showBanner()
    await uninstallCommand(name, options)
  })

// === init ===
cli
  .command('init', '初始化 .skillsrc 配置文件')
  .option('-g, --global', '初始化全局配置')
  .action(async (options: { global?: boolean }) => {
    await initCommand(options)
  })

// === Global options ===
cli.help()
cli.option('-v, --version', 'Display version number')

// === Run ===
async function main(): Promise<void> {
  try {
    const parsed = cli.parse(process.argv, { run: false })

    if (parsed.options.version) {
      consola.log(version)
      return
    }

    if (parsed.options.help)
      return

    await cli.runMatchedCommand()

    // 没有子命令时显示帮助
    if (!cli.matchedCommand) {
      showBanner()
      cli.outputHelp()
    }
  }
  catch (err) {
    consola.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
