import type { AgentDefinition, SkillSearchResult, ToastType } from '../types/ui'
import { computed, reactive, ref, shallowRef } from 'vue'
import { api } from '../services/api'

type Translate = (key: string, params?: Record<string, unknown>) => string

interface UseSkillSearchOptions {
  agents: () => AgentDefinition[]
  defaultAgentIds: () => string[]
  addToast: (message: string, type?: ToastType) => void
  installed: () => void
  t: Translate
}

export function useSkillSearch(options: UseSkillSearchOptions) {
  const keyword = shallowRef('')
  const searchResults = ref<SkillSearchResult[]>([])
  const isSearching = shallowRef(false)
  const showInstallModal = shallowRef(false)
  const isInstalling = shallowRef(false)
  const agentFilter = shallowRef('')
  const selectedAgents = ref<string[]>([])
  const installData = reactive({ name: '', global: false })

  const installableAgents = computed(() => options.agents().filter(agent => agent.icon))

  async function search(): Promise<void> {
    const q = keyword.value.trim()
    if (!q)
      return

    isSearching.value = true
    try {
      searchResults.value = await api.search(q)
    }
    catch (err) {
      options.addToast(String(err), 'error')
    }
    finally {
      isSearching.value = false
    }
  }

  function openInstallModal(name: string, global: boolean): void {
    installData.name = name
    installData.global = global

    const defaults = options.defaultAgentIds().filter(id => installableAgents.value.some(agent => agent.id === id))
    selectedAgents.value = defaults.length > 0
      ? defaults
      : installableAgents.value.slice(0, 1).map(agent => agent.id)
    agentFilter.value = ''
    showInstallModal.value = true
  }

  async function confirmInstall(): Promise<void> {
    if (selectedAgents.value.length === 0) {
      options.addToast(options.t('search.noAgents'), 'warning')
      return
    }

    isInstalling.value = true
    try {
      await api.install({
        name: installData.name,
        global: installData.global,
        agents: selectedAgents.value,
      })
      options.addToast(options.t('search.installSuccess'), 'success')
      showInstallModal.value = false
      options.installed()
    }
    catch (err) {
      options.addToast(String(err), 'error')
    }
    finally {
      isInstalling.value = false
    }
  }

  return {
    keyword,
    searchResults,
    isSearching,
    showInstallModal,
    isInstalling,
    agentFilter,
    selectedAgents,
    installData,
    installableAgents,
    search,
    openInstallModal,
    confirmInstall,
  }
}
