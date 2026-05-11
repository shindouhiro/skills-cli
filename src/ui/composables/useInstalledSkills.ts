import type { AgentDefinition, ConfirmType, InstalledSkill, ToastType } from '../types/ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { api } from '../services/api'

type Translate = (key: string, params?: Record<string, unknown>) => string

interface UseInstalledSkillsOptions {
  agents: () => AgentDefinition[]
  addToast: (message: string, type?: ToastType) => void
  openConfirm: (title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>) => void
  t: Translate
}

export interface InstalledSkillSection {
  key: 'local' | 'global'
  title: string
  emptyText: string
  accentClass: string
  glowClass: string
  scopeGlobal: boolean
  icon: string
  entries: Array<[string, InstalledSkill[]]>
}

export function useInstalledSkills(options: UseInstalledSkillsOptions) {
  const localSkills = ref<Record<string, InstalledSkill[]>>({})
  const globalSkills = ref<Record<string, InstalledSkill[]>>({})
  const isLoading = shallowRef(false)
  const selectedAgentId = shallowRef('all')

  const agentById = computed(() => new Map(options.agents().map(agent => [agent.id, agent])))

  const availableAgents = computed(() => {
    const agentIds = new Set<string>()
    for (const agentId of Object.keys(localSkills.value)) {
      if (localSkills.value[agentId].length > 0)
        agentIds.add(agentId)
    }
    for (const agentId of Object.keys(globalSkills.value)) {
      if (globalSkills.value[agentId].length > 0)
        agentIds.add(agentId)
    }

    return Array.from(agentIds)
      .map(id => getAgent(id))
      .filter((agent): agent is AgentDefinition => agent !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  const sections = computed<InstalledSkillSection[]>(() => {
    const filterEntries = (skillsObj: Record<string, InstalledSkill[]>) => {
      let entries = Object.entries(skillsObj)
      if (selectedAgentId.value !== 'all')
        entries = entries.filter(([agentId]) => agentId === selectedAgentId.value)
      return entries
    }

    return [
      {
        key: 'local',
        title: options.t('installed.localTitle'),
        emptyText: options.t('installed.localEmpty'),
        accentClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-emerald-500/5',
        glowClass: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
        scopeGlobal: false,
        icon: 'catppuccin:folder-src',
        entries: filterEntries(localSkills.value),
      },
      {
        key: 'global',
        title: options.t('installed.globalTitle'),
        emptyText: options.t('installed.globalEmpty'),
        accentClass: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10 shadow-cyan-500/5',
        glowClass: 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]',
        scopeGlobal: true,
        icon: 'catppuccin:folder-public',
        entries: filterEntries(globalSkills.value),
      },
    ]
  })

  async function fetchSkills(): Promise<void> {
    isLoading.value = true
    try {
      const data = await api.skills()
      localSkills.value = data.local
      globalSkills.value = data.global
    }
    catch (err) {
      options.addToast(String(err), 'error')
    }
    finally {
      isLoading.value = false
    }
  }

  function getAgent(agentId: string): AgentDefinition | undefined {
    return agentById.value.get(agentId)
  }

  function getSkillSourceLabel(skill: InstalledSkill, agentId: string): string | undefined {
    const agent = getAgent(agentId)
    if (!agent?.extraGlobalDirs?.length)
      return undefined

    return agent.extraGlobalDirs.find((extraDir) => {
      const expanded = extraDir.replace(/^~/, '')
      return skill.path.includes(expanded) || skill.path.includes('.agents/skills')
    })
  }

  function uninstallSkill(name: string, agentId: string, global: boolean): void {
    options.openConfirm(options.t('common.confirm'), options.t('installed.uninstallConfirm', { name, agent: agentId }), 'danger', async () => {
      try {
        await api.uninstall({ name, global, agents: [agentId] })
        options.addToast(options.t('common.success'), 'success')
        await fetchSkills()
      }
      catch (err) {
        options.addToast(String(err), 'error')
      }
    })
  }

  function uploadSkill(name: string, global: boolean): void {
    options.openConfirm(options.t('common.confirm'), options.t('installed.uploadConfirm', { name }), 'info', async () => {
      options.addToast(options.t('installed.uploading'), 'warning')
      try {
        const data = await api.upload({ name, global })
        options.addToast(data.message || options.t('common.success'), 'success')
      }
      catch (err) {
        options.addToast(String(err), 'error')
      }
    })
  }

  onMounted(fetchSkills)

  return {
    isLoading,
    selectedAgentId,
    availableAgents,
    sections,
    fetchSkills,
    getAgent,
    getSkillSourceLabel,
    uninstallSkill,
    uploadSkill,
  }
}
