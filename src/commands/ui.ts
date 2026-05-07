import { exec } from 'node:child_process'
import http from 'node:http'
import process from 'node:process'
import consola from 'consola'
import pc from 'picocolors'
import { createSourcesFromConfig, executeSearch } from '~/commands/search'
import { AGENTS, getAgentsByIds } from '~/core/agents'
import { getGlobalConfigPath, getProjectConfigPathForWrite, loadConfig, loadConfigAtPath, saveConfig } from '~/core/config'
import { installSkill } from '~/core/installer'
import { scanGlobalSkills, scanLocalSkills } from '~/core/scanner'
import { uninstallSkill } from '~/core/uninstaller'
import { addUploadTargetToConfig, collectUploadSkills, deleteRemoteSkill, getRemoteSkills, getUploadTarget, uploadSkills } from '~/core/upload'

import { HTML_CONTENT } from './ui.template'

function mapToObj<T>(map: Map<string, T>): Record<string, T> {
  const obj: Record<string, T> = {}
  for (const [k, v] of map) {
    obj[k] = v
  }
  return obj
}

function openBrowser(url: string) {
  const platform = process.platform
  if (platform === 'win32')
    exec(`start ${url}`)
  else if (platform === 'darwin')
    exec(`open ${url}`)
  else exec(`xdg-open ${url}`)
}

export async function uiCommand(options: { port?: number } = {}) {
  const port = options.port || 3080
  const cwd = process.cwd()

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = parsedUrl.pathname
    const query = Object.fromEntries(parsedUrl.searchParams.entries())

    const jsonResponse = (data: any, statusCode = 200) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    }

    if (req.method === 'GET' && pathname === '/api/agents') {
      const config = loadConfig(cwd)
      return jsonResponse({ agents: AGENTS, defaultAgents: config.defaultAgents || [] })
    }

    if (req.method === 'GET' && pathname === '/api/skills') {
      const local = mapToObj(scanLocalSkills(cwd))
      const global = mapToObj(scanGlobalSkills())
      return jsonResponse({ local, global })
    }

    if (req.method === 'GET' && pathname === '/api/search') {
      const keyword = (query.q as string) || ''
      const config = loadConfig(cwd)
      const sources = createSourcesFromConfig(config.sources)
      const results = await executeSearch(keyword, sources)
      return jsonResponse(results)
    }

    if (req.method === 'POST' && pathname === '/api/install') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { name, global, agents: agentIds } = JSON.parse(body)
          const targetAgents = agentIds && agentIds.length > 0 ? getAgentsByIds(agentIds) : AGENTS
          const results = await installSkill({ name, global, agents: targetAgents, cwd })
          jsonResponse({ success: true, results })
        }
        catch (err) {
          jsonResponse({ success: false, error: String(err) }, 500)
        }
      })
      return
    }

    if (req.method === 'POST' && pathname === '/api/uninstall') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { name, global, agents: agentIds } = JSON.parse(body)
          const targetAgents = agentIds && agentIds.length > 0 ? getAgentsByIds(agentIds) : AGENTS
          const results = await uninstallSkill({ name, global, agents: targetAgents, cwd })
          jsonResponse({ success: true, results })
        }
        catch (err) {
          jsonResponse({ success: false, error: String(err) }, 500)
        }
      })
      return
    }

    if (req.method === 'POST' && pathname === '/api/upload') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { name, global } = JSON.parse(body)
          const config = loadConfig(cwd)
          const target = getUploadTarget(config)

          if (!target) {
            return jsonResponse({ success: false, error: '未检测到上传目标，请先在终端运行 skills upload 配置 Git 远端' }, 400)
          }

          const collected = collectUploadSkills({
            cwd,
            global: !!global,
            names: [name],
          })

          if (collected.skills.length === 0) {
            return jsonResponse({ success: false, error: '找不到要上传的 skill' }, 400)
          }

          const uploadResult = uploadSkills({
            cwd,
            dryRun: false,
            global: !!global,
            skills: collected.skills,
            target,
          })

          if (!uploadResult.changed) {
            return jsonResponse({ success: true, message: '目标仓库没有文件变化，无需上传' })
          }

          jsonResponse({ success: true, message: `已成功上传 ${name} 到 ${target.name}` })
        }
        catch (err) {
          jsonResponse({ success: false, error: String(err) }, 500)
        }
      })
      return
    }

    if (req.method === 'GET' && pathname === '/api/targets') {
      const config = loadConfig(cwd)
      return jsonResponse(config.upload?.targets || [])
    }

    if (req.method === 'POST' && pathname === '/api/targets') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { name, url, path, branch, global } = JSON.parse(body)
          if (!name || !url) {
            return jsonResponse({ success: false, error: '名称和 URL 是必填项' }, 400)
          }

          const target = {
            name,
            type: 'git' as const,
            url,
            ...(path ? { path } : {}),
            ...(branch ? { branch } : {}),
          }

          const configPath = global ? getGlobalConfigPath() : getProjectConfigPathForWrite(cwd)
          const config = loadConfigAtPath(configPath)
          const result = addUploadTargetToConfig(config, target)

          if (!result.added) {
            return jsonResponse({ success: false, error: '上传目标名称已存在' }, 400)
          }

          saveConfig(result.config, configPath)
          jsonResponse({ success: true, message: '添加成功' })
        }
        catch (err) {
          jsonResponse({ success: false, error: String(err) }, 500)
        }
      })
      return
    }

    if (req.method === 'DELETE' && pathname === '/api/targets') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { name, global } = JSON.parse(body)
          const configPath = global ? getGlobalConfigPath() : getProjectConfigPathForWrite(cwd)
          const config = loadConfigAtPath(configPath)

          if (!config.upload || !config.upload.targets) {
            return jsonResponse({ success: false, error: '未找到上传配置' }, 400)
          }

          const initialLength = config.upload.targets.length
          config.upload.targets = config.upload.targets.filter(t => t.name !== name)

          if (config.upload.targets.length === initialLength) {
            return jsonResponse({ success: false, error: '目标不存在于该配置中' }, 404)
          }

          saveConfig(config, configPath)
          jsonResponse({ success: true, message: '删除成功' })
        }
        catch (err) {
          jsonResponse({ success: false, error: String(err) }, 500)
        }
      })
      return
    }

    if (req.method === 'GET' && pathname === '/api/targets/skills') {
      try {
        const targetName = parsedUrl.searchParams.get('targetName')
        const isGlobal = parsedUrl.searchParams.get('global') === 'true'
        if (!targetName) {
          return jsonResponse({ success: false, error: 'targetName is required' }, 400)
        }

        const configPath = isGlobal ? getGlobalConfigPath() : getProjectConfigPathForWrite(cwd)
        const config = loadConfigAtPath(configPath)
        const target = config.upload?.targets?.find(t => t.name === targetName)

        if (!target) {
          return jsonResponse({ success: false, error: 'Target not found' }, 404)
        }

        const skills = getRemoteSkills(target, cwd)
        return jsonResponse({ success: true, skills })
      }
      catch (err) {
        return jsonResponse({ success: false, error: String(err) }, 500)
      }
    }

    if (req.method === 'DELETE' && pathname === '/api/targets/skills') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => {
        try {
          const { targetName, skillName, global } = JSON.parse(body)
          if (!targetName || !skillName) {
            return jsonResponse({ success: false, error: 'targetName and skillName are required' }, 400)
          }

          const configPath = global ? getGlobalConfigPath() : getProjectConfigPathForWrite(cwd)
          const config = loadConfigAtPath(configPath)
          const target = config.upload?.targets?.find(t => t.name === targetName)

          if (!target) {
            return jsonResponse({ success: false, error: 'Target not found' }, 404)
          }

          const deleted = deleteRemoteSkill(target, skillName, cwd)
          if (deleted) {
            jsonResponse({ success: true, message: '删除成功' })
          }
          else {
            jsonResponse({ success: false, error: '无法删除技能或技能不存在' }, 400)
          }
        }
        catch (err) {
          jsonResponse({ success: false, error: String(err) }, 500)
        }
      })
      return
    }

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(HTML_CONTENT)
      return
    }

    res.writeHead(404)
    res.end('Not Found')
  })

  server.listen(port, () => {
    const url = `http://localhost:${port}`
    consola.success(`Web UI 已启动在 ${pc.cyan(url)}`)
    openBrowser(url)
  })
}
