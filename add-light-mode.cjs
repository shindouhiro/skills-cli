const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

const dir = path.join(__dirname, 'src/ui')

function walk(directory) {
  let results = []
  const list = fs.readdirSync(directory)
  list.forEach((file) => {
    const filePath = path.join(directory, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath))
    }
    else if (filePath.endsWith('.vue')) {
      results.push(filePath)
    }
  })
  return results
}

const vueFiles = walk(dir)

vueFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8')

  const replacements = [
    // 文本颜色
    ['text-slate-100', 'text-slate-900 dark:text-slate-100'],
    ['text-slate-200', 'text-slate-800 dark:text-slate-200'],
    ['text-slate-300', 'text-slate-700 dark:text-slate-300'],
    ['text-slate-400', 'text-slate-500 dark:text-slate-400'],
    ['text-slate-500', 'text-slate-400 dark:text-slate-500'],

    // 背景色
    ['bg-slate-900/95', 'bg-white/95 dark:bg-slate-900/95'],
    ['bg-slate-900/50', 'bg-slate-50/50 dark:bg-slate-900/50'],
    ['bg-slate-900', 'bg-white dark:bg-slate-900'],
    ['bg-slate-800/20', 'bg-slate-100/80 dark:bg-slate-800/20'],
    ['bg-slate-800/30', 'bg-slate-100 dark:bg-slate-800/30'],
    ['bg-slate-800/50', 'bg-slate-200/50 dark:bg-slate-800/50'],
    ['bg-slate-800', 'bg-slate-100 dark:bg-slate-800'],
    ['bg-slate-700/30', 'bg-slate-200 dark:bg-slate-700/30'],
    ['bg-slate-700/50', 'bg-slate-200/80 dark:bg-slate-700/50'],

    // hover 背景色
    ['hover:bg-slate-800', 'hover:bg-slate-100 dark:hover:bg-slate-800'],
    ['hover:bg-slate-700/50', 'hover:bg-slate-200 dark:hover:bg-slate-700/50'],
    ['hover:bg-slate-700/30', 'hover:bg-slate-200/80 dark:hover:bg-slate-700/30'],

    // 边框
    ['border-slate-800', 'border-slate-200 dark:border-slate-800'],
    ['border-slate-700/50', 'border-slate-200 dark:border-slate-700/50'],
    ['border-slate-700', 'border-slate-300 dark:border-slate-700'],
    ['border-slate-600', 'border-slate-300 dark:border-slate-600'],

    // hover 边框
    ['hover:border-slate-600/50', 'hover:border-slate-300 dark:hover:border-slate-600/50'],
    ['hover:border-slate-600', 'hover:border-slate-400 dark:hover:border-slate-600'],
  ]

  // 避免重复替换已经带有 dark: 前缀的类名。

  replacements.forEach(([from, to]) => {
    // 仅替换没有 dark: 前缀且不是其他类名片段的精确匹配。
    const escapedFrom = from.replace(/\//g, '\\/')
    const regex = new RegExp(`(?<!dark:)(?<!-)\\b${escapedFrom}\\b`, 'g')
    content = content.replace(regex, to)
  })

  fs.writeFileSync(file, content, 'utf8')
})

process.stdout.write('Replacements complete.\n')
