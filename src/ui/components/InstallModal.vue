<script setup lang="ts">
import type { AgentDefinition } from '../types/ui'
import { computed } from 'vue'
import AgentIcon from './common/AgentIcon.vue'

const props = defineProps<{
  show: boolean
  agents: AgentDefinition[]
  skillName: string
  global: boolean
  installing: boolean
  filter: string
  selectedAgents: string[]
}>()

const emit = defineEmits<{
  'close': []
  'install': []
  'update:filter': [value: string]
  'update:selectedAgents': [value: string[]]
}>()

const filteredAgents = computed(() => {
  const keyword = props.filter.trim().toLowerCase()
  if (!keyword)
    return props.agents

  return props.agents.filter(agent =>
    agent.name.toLowerCase().includes(keyword) || agent.id.toLowerCase().includes(keyword),
  )
})

const selectedModel = computed({
  get: () => props.selectedAgents,
  set: value => emit('update:selectedAgents', value),
})

function selectVisibleAgents(): void {
  emit('update:selectedAgents', filteredAgents.value.map(agent => agent.id))
}
</script>

<template>
  <div
    v-if="show"
    id="install-modal"
    class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-900/80 p-4 backdrop-blur-sm"
  >
    <div class="flex max-h-[90vh] w-[600px] max-w-full flex-col overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 px-6 py-5">
        <h3 class="flex items-center gap-3 text-xl font-bold">
          <iconify-icon icon="catppuccin:folder-download" class="text-3xl" />
          <span class="text-slate-900 dark:text-slate-100">安装 <span class="text-emerald-400">{{ skillName }}</span></span>
          <span class="rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
            {{ global ? '全局' : '本地' }}
          </span>
        </h3>
        <button
          id="install-modal-close-button"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>

      <div class="flex flex-col gap-5 overflow-hidden p-6">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400" for="install-agent-filter-input">选择目标 Agent</label>
          <div class="relative">
            <iconify-icon icon="catppuccin:search" class="absolute left-3 top-3 text-lg text-slate-400 dark:text-slate-500 dark:text-slate-400" />
            <input
              id="install-agent-filter-input"
              :value="filter"
              placeholder="搜索过滤..."
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/50 py-2.5 pl-10 pr-4 text-slate-800 dark:text-slate-200 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              @input="emit('update:filter', ($event.target as HTMLInputElement).value)"
            >
          </div>
        </div>

        <div class="custom-scroll min-h-[200px] flex-1 space-y-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-100/80 dark:bg-slate-800/20 p-2">
          <label
            v-for="agent in filteredAgents"
            :id="`install-agent-option-${agent.id}`"
            :key="agent.id"
            class="group flex cursor-pointer items-center rounded-lg p-3 transition-colors hover:bg-slate-200/50 dark:bg-slate-800/50"
          >
            <span class="relative mr-4 flex h-5 w-5 items-center justify-center">
              <input
                :id="`install-agent-checkbox-${agent.id}`"
                v-model="selectedModel"
                type="checkbox"
                :value="agent.id"
                class="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 transition-all checked:border-emerald-500 checked:bg-emerald-500 focus:outline-none"
              >
              <svg class="pointer-events-none absolute h-3 w-3 text-slate-900 opacity-0 peer-checked:opacity-100" viewBox="0 0 14 10" fill="none">
                <path d="M1 5L5 9L13 1" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
            </span>
            <span class="flex min-w-0 flex-1 items-center">
              <AgentIcon :icon="agent.icon" class-name="mr-3 h-6 w-6 object-contain text-2xl text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors group-hover:text-emerald-400" />
              <span class="flex min-w-0 flex-col">
                <span class="truncate font-medium text-slate-800 dark:text-slate-200 transition-colors group-hover:text-emerald-300">{{ agent.name }}</span>
              </span>
              <span class="ml-auto rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 opacity-60">{{ agent.id }}</span>
            </span>
          </label>
          <div v-if="filteredAgents.length === 0" class="py-10 text-center text-slate-400 dark:text-slate-500">
            无匹配的 Agent
          </div>
        </div>

        <div class="flex items-center justify-between text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
          <span>已选择 <strong class="text-emerald-400">{{ selectedAgents.length }}</strong> 个 Agent</span>
          <div class="space-x-3">
            <button id="install-select-visible-button" type="button" class="text-emerald-400 hover:text-emerald-300" @click="selectVisibleAgents">
              全选当前
            </button>
            <button id="install-clear-selection-button" type="button" class="text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300" @click="emit('update:selectedAgents', [])">
              清空
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/30 px-6 py-5">
        <button
          id="install-cancel-button"
          type="button"
          :disabled="installing"
          class="rounded-xl px-6 py-2.5 font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          id="install-confirm-button"
          type="button"
          :disabled="installing"
          class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50"
          @click="emit('install')"
        >
          <span v-if="installing" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span>{{ installing ? '安装中...' : '确认安装' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
