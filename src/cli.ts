#!/usr/bin/env node
import process from 'node:process'
import cac from 'cac'
import consola from 'consola'
import pc from 'picocolors'
import { initCommand } from '~/commands/init'
import { installCommand } from '~/commands/install'
import { listCommand } from '~/commands/list'
import { searchCommand } from '~/commands/search'
import { sourceAddCommand } from '~/commands/source'
import { uiCommand } from '~/commands/ui'
import { uninstallCommand } from '~/commands/uninstall'
import { uploadCommand, uploadTargetAddCommand } from '~/commands/upload'
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
  .option('-a, --agent [agents]', '目标助手，逗号分隔；不传值则弹出选择')
  .option('-g, --global', '安装到全局（用户级）目录')
  .option('-f, --force', '强制覆盖已存在的 skill')
  .option('-l, --link', '使用共享存储并在助手目录创建符号链接')
  .option('-i, --interactive', '显式进入交互式选择模式')
  .action(async (name: string, options: { agent?: string | boolean, global?: boolean, force?: boolean, link?: boolean, interactive?: boolean }) => {
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

// === source ===
cli
  .command('source add <url>', '手动添加搜索/下载数据源 URL')
  .option('-g, --global', '添加到全局配置')
  .option('-p, --path <path>', 'GitHub 仓库内 skills 所在子目录')
  .action(async (url: string, options: { global?: boolean, path?: string }) => {
    showBanner()
    await sourceAddCommand(url, options)
  })

// === upload ===
cli
  .command('upload target add <url>', '添加 Git 上传目标')
  .option('-g, --global', '添加到全局配置')
  .option('-n, --name <name>', '上传目标名称')
  .option('-p, --path <path>', '目标仓库内 skills 所在子目录（默认 skills）')
  .option('-b, --branch <branch>', '目标分支；省略时使用远端默认分支')
  .action(async (url: string, options: { branch?: string, global?: boolean, name?: string, path?: string }) => {
    showBanner()
    await uploadTargetAddCommand(url, options)
  })

cli
  .command('upload [...names]', '上传本地 skills 到配置的 Git 远端')
  .option('-a, --all', '上传全部本地 skills')
  .option('-t, --target <name>', '上传目标名称')
  .option('-g, --global', '上传全局（用户级）skills')
  .option('-d, --dry-run', '仅展示上传计划，不 clone、commit 或 push')
  .option('-m, --message <message>', '自定义 commit message')
  .action(async (names: string[] | undefined, options: { all?: boolean, dryRun?: boolean, global?: boolean, message?: string, target?: string }) => {
    showBanner()
    await uploadCommand(names, options)
  })

// === ui ===
cli
  .command('ui', '打开 Web 界面进行可视化操作')
  .option('-p, --port <port>', '指定服务器端口 (默认 3080)')
  .action(async (options: { port?: string }) => {
    showBanner()
    await uiCommand({ port: options.port ? Number(options.port) : undefined })
  })

// === Global options ===
cli.help()
cli.option('-v, --version', 'Display version number')

// === Run ===
async function main(): Promise<void> {
  try {
    if (isUploadTargetAddArgv(process.argv)) {
      await runUploadTargetAddFromArgv(process.argv.slice(5))
      return
    }

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

function isUploadTargetAddArgv(argv: string[]): boolean {
  return argv[2] === 'upload' && argv[3] === 'target' && argv[4] === 'add'
}

async function runUploadTargetAddFromArgv(argv: string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUploadTargetAddHelp()
    return
  }

  const parsed = parseUploadTargetAddArgv(argv)
  showBanner()
  await uploadTargetAddCommand(parsed.url, parsed.options)
}

function parseUploadTargetAddArgv(argv: string[]): {
  url: string
  options: { branch?: string, global?: boolean, name?: string, path?: string }
} {
  const options: { branch?: string, global?: boolean, name?: string, path?: string } = {}
  let url: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '-g' || arg === '--global') {
      options.global = true
      continue
    }

    if (arg === '-n' || arg === '--name') {
      options.name = readOptionValue(argv, ++i, arg)
      continue
    }

    if (arg === '-p' || arg === '--path') {
      options.path = readOptionValue(argv, ++i, arg)
      continue
    }

    if (arg === '-b' || arg === '--branch') {
      options.branch = readOptionValue(argv, ++i, arg)
      continue
    }

    if (arg.startsWith('-'))
      throw new Error(`未知选项: ${arg}`)

    if (url)
      throw new Error(`未知参数: ${arg}`)

    url = arg
  }

  if (!url)
    throw new Error('缺少 Git 远端 URL')

  return { options, url }
}

function readOptionValue(argv: string[], index: number, name: string): string {
  const value = argv[index]
  if (!value || value.startsWith('-'))
    throw new Error(`选项 ${name} 缺少值`)
  return value
}

function printUploadTargetAddHelp(): void {
  consola.log('skills')
  consola.log('')
  consola.log('Usage:')
  consola.log('  $ skills upload target add <url>')
  consola.log('')
  consola.log('Options:')
  consola.log('  -g, --global           添加到全局配置')
  consola.log('  -n, --name <name>      上传目标名称')
  consola.log('  -p, --path <path>      目标仓库内 skills 所在子目录（默认 skills）')
  consola.log('  -b, --branch <branch>  目标分支；省略时使用远端默认分支')
  consola.log('  -h, --help             Display this message')
}
