import { exec } from 'node:child_process'
import http from 'node:http'
import process from 'node:process'
import consola from 'consola'
import pc from 'picocolors'
import { createSourcesFromConfig, executeSearch } from '~/commands/search'
import { AGENTS, getAgentsByIds } from '~/core/agents'
import { loadConfig } from '~/core/config'
import { installSkill } from '~/core/installer'
import { scanGlobalSkills, scanLocalSkills } from '~/core/scanner'
import { uninstallSkill } from '~/core/uninstaller'

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
      return jsonResponse(AGENTS)
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
