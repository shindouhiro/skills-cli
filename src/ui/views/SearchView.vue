<script setup lang="ts">
import type { AgentDefinition, ToastType } from '../types/ui'
import { useI18n } from 'vue-i18n'
import InstallModal from '../components/InstallModal.vue'
import { useSkillSearch } from '../composables/useSkillSearch'

const props = defineProps<{
  agents: AgentDefinition[]
  defaultAgentIds: string[]
  addToast: (message: string, type?: ToastType) => void
}>()

const emit = defineEmits<{
  installed: []
}>()

const { t } = useI18n()

const {
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
} = useSkillSearch({
  agents: () => props.agents,
  defaultAgentIds: () => props.defaultAgentIds,
  addToast: props.addToast,
  installed: () => emit('installed'),
  t,
})
</script>

<template>
  <div class="animate-fade-in w-full pb-10">
    <div class="mx-auto mb-10 flex w-full max-w-4xl items-center gap-3 rounded-2xl border border-slate-300 bg-white p-2.5 shadow-sm transition-all focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none dark:focus-within:border-emerald-500/50 dark:focus-within:ring-emerald-500/10">
      <iconify-icon icon="lucide:search" class="pl-4 text-2xl text-slate-400 dark:text-slate-500" />
      <input
        id="skill-search-input"
        v-model="keyword"
        :placeholder="t('search.inputPlaceholder')"
        class="flex-1 bg-transparent px-3 py-3 text-lg text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder-slate-500"
        @keyup.enter="search"
      >
      <button
        id="skill-search-button"
        type="button"
        :disabled="isSearching"
        class="rounded-xl bg-emerald-500 px-8 py-3 text-base font-bold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        @click="search"
      >
        {{ t('search.button') }}
      </button>
    </div>

    <div v-if="isSearching" class="animate-pulse py-32 text-center">
      <div class="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      <div class="text-lg font-medium tracking-widest text-emerald-400">
        {{ t('search.searching') }}
      </div>
    </div>

    <div v-else-if="searchResults.length > 0" class="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <div
        v-for="skill in searchResults"
        :id="`search-result-card-${skill.name}`"
        :key="skill.name"
        class="glass group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 transition-all duration-300 hover:border-emerald-500/30"
      >
        <div class="mb-3 flex min-w-0 items-start justify-between">
          <h3 class="min-w-0 truncate pr-4 text-xl font-bold text-emerald-300">
            {{ skill.name }}
          </h3>
          <div class="group/src relative shrink-0">
            <span class="block max-w-[140px] truncate rounded-md border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 font-mono text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
              {{ skill.source }}
            </span>
            <div class="pointer-events-none absolute right-0 top-full z-30 mt-1.5 whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-600 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 opacity-0 shadow-2xl backdrop-blur-sm transition-opacity duration-200 group-hover/src:opacity-100">
              {{ skill.source }}
            </div>
          </div>
        </div>
        <p class="mb-6 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400 dark:text-slate-500 dark:text-slate-400">
          {{ skill.description }}
        </p>
        <div class="mt-auto flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            :id="`install-local-button-${skill.name}`"
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
            @click="openInstallModal(skill.name, false)"
          >
            <iconify-icon icon="lucide:folder-down" class="text-base" />
            <span>{{ t('search.installLocal') }}</span>
          </button>
          <button
            :id="`install-global-button-${skill.name}`"
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-all hover:border-transparent hover:bg-emerald-500 hover:text-slate-900"
            @click="openInstallModal(skill.name, true)"
          >
            <iconify-icon icon="lucide:earth" class="text-base" />
            <span>{{ t('search.installGlobal') }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="keyword && !isSearching" class="flex flex-col items-center py-32 text-center">
      <iconify-icon icon="catppuccin:astro" class="mb-6 text-7xl opacity-80" />
      <div class="text-xl font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400">
        {{ t('search.notFound') }}
      </div>
    </div>

    <div v-else class="flex flex-col items-center py-32 text-center">
      <iconify-icon icon="catppuccin:rocket" class="mb-6 text-7xl opacity-80" />
      <div class="text-xl font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400">
        {{ t('search.explore') }}
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
