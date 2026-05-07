<script setup lang="ts">
import type { AgentDefinition, SkillSearchResult, ToastType } from '../types/ui'
import { computed, reactive, ref, shallowRef } from 'vue'
import InstallModal from '../components/InstallModal.vue'
import { api } from '../services/api'

const props = defineProps<{
  agents: AgentDefinition[]
  defaultAgentIds: string[]
  addToast: (message: string, type?: ToastType) => void
}>()

const emit = defineEmits<{
  installed: []
}>()

const keyword = shallowRef('')
const searchResults = ref<SkillSearchResult[]>([])
const isSearching = shallowRef(false)
const showInstallModal = shallowRef(false)
const isInstalling = shallowRef(false)
const agentFilter = shallowRef('')
const selectedAgents = ref<string[]>([])
const installData = reactive({ name: '', global: false })

const installableAgents = computed(() => props.agents.filter(agent => agent.icon))

async function search(): Promise<void> {
  const q = keyword.value.trim()
  if (!q)
    return

  isSearching.value = true
  try {
    searchResults.value = await api.search(q)
  }
  catch (err) {
    props.addToast(String(err), 'error')
  }
  finally {
    isSearching.value = false
  }
}

function openInstallModal(name: string, global: boolean): void {
  installData.name = name
  installData.global = global

  const defaults = props.defaultAgentIds.filter(id => installableAgents.value.some(agent => agent.id === id))
  selectedAgents.value = defaults.length > 0
    ? defaults
    : installableAgents.value.slice(0, 1).map(agent => agent.id)
  agentFilter.value = ''
  showInstallModal.value = true
}

async function confirmInstall(): Promise<void> {
  if (selectedAgents.value.length === 0) {
    props.addToast('请至少选择一个 Agent', 'warning')
    return
  }

  isInstalling.value = true
  try {
    await api.install({
      name: installData.name,
      global: installData.global,
      agents: selectedAgents.value,
    })
    props.addToast('安装操作已完成', 'success')
    showInstallModal.value = false
    emit('installed')
  }
  catch (err) {
    props.addToast(String(err), 'error')
  }
  finally {
    isInstalling.value = false
  }
}
</script>

<template>
  <div class="animate-fade-in w-full pb-10">
    <div class="glass mx-auto mb-10 flex w-full max-w-5xl items-center gap-3 rounded-2xl border border-slate-700/50 p-2 shadow-lg shadow-black/20 transition-all focus-within:ring-2 focus-within:ring-emerald-500/50">
      <iconify-icon icon="catppuccin:search" class="pl-5 text-3xl opacity-80" />
      <input
        id="skill-search-input"
        v-model="keyword"
        placeholder="输入名称或关键字搜索 skills..."
        class="flex-1 border-none bg-transparent px-2 py-4 text-lg text-slate-200 placeholder-slate-500 focus:outline-none"
        @keyup.enter="search"
      >
      <button
        id="skill-search-button"
        type="button"
        :disabled="isSearching"
        class="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-10 py-4 text-lg font-bold text-slate-900 shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50"
        @click="search"
      >
        搜 索
      </button>
    </div>

    <div v-if="isSearching" class="animate-pulse py-32 text-center">
      <div class="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      <div class="text-lg font-medium tracking-widest text-emerald-400">
        SEARCHING...
      </div>
    </div>

    <div v-else-if="searchResults.length > 0" class="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <div
        v-for="skill in searchResults"
        :id="`search-result-card-${skill.name}`"
        :key="skill.name"
        class="glass group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-700/50 p-6 transition-all duration-300 hover:border-emerald-500/30"
      >
        <div class="mb-3 flex min-w-0 items-start justify-between">
          <h3 class="min-w-0 truncate pr-4 text-xl font-bold text-emerald-300">
            {{ skill.name }}
          </h3>
          <div class="group/src relative shrink-0">
            <span class="block max-w-[140px] truncate rounded-md border border-slate-700/50 bg-slate-800/80 px-2.5 py-1 font-mono text-xs text-slate-400">
              {{ skill.source }}
            </span>
            <div class="pointer-events-none absolute right-0 top-full z-30 mt-1.5 whitespace-nowrap rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-1.5 text-xs text-slate-200 opacity-0 shadow-2xl backdrop-blur-sm transition-opacity duration-200 group-hover/src:opacity-100">
              {{ skill.source }}
            </div>
          </div>
        </div>
        <p class="mb-6 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
          {{ skill.description }}
        </p>
        <div class="mt-auto flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            :id="`install-local-button-${skill.name}`"
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-700"
            @click="openInstallModal(skill.name, false)"
          >
            <iconify-icon icon="lucide:folder-down" class="text-base" />
            <span>本地</span>
          </button>
          <button
            :id="`install-global-button-${skill.name}`"
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-all hover:border-transparent hover:bg-emerald-500 hover:text-slate-900"
            @click="openInstallModal(skill.name, true)"
          >
            <iconify-icon icon="lucide:earth" class="text-base" />
            <span>全局</span>
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="keyword && !isSearching" class="flex flex-col items-center py-32 text-center">
      <iconify-icon icon="catppuccin:astro" class="mb-6 text-7xl opacity-80" />
      <div class="text-xl font-medium text-slate-400">
        在茫茫宇宙中没有找到匹配的 Skills
      </div>
    </div>

    <div v-else class="flex flex-col items-center py-32 text-center">
      <iconify-icon icon="catppuccin:rocket" class="mb-6 text-7xl opacity-80" />
      <div class="text-xl font-medium text-slate-400">
        输入关键字，探索无尽的 AI 潜能
      </div>
    </div>

    <InstallModal
      v-model:filter="agentFilter"
      v-model:selected-agents="selectedAgents"
      :show="showInstallModal"
      :agents="installableAgents"
      :skill-name="installData.name"
      :global="installData.global"
      :installing="isInstalling"
      @close="showInstallModal = false"
      @install="confirmInstall"
    />
  </div>
</template>
