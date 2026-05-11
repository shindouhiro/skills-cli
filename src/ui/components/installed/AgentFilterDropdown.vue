<script setup lang="ts">
import type { AgentDefinition } from '../../types/ui'
import { onClickOutside } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import AgentIcon from '../common/AgentIcon.vue'

const props = defineProps<{
  agents: AgentDefinition[]
  selectedAgentId: string
}>()

const emit = defineEmits<{
  'update:selectedAgentId': [value: string]
}>()

const { t } = useI18n()
const isOpen = shallowRef(false)
const filterRef = useTemplateRef<HTMLElement>('filterRef')

const selectedAgentName = computed(() => {
  if (props.selectedAgentId === 'all')
    return t('common.showAll')
  return props.agents.find(agent => agent.id === props.selectedAgentId)?.name || 'Unknown'
})

function selectAgent(id: string): void {
  emit('update:selectedAgentId', id)
  isOpen.value = false
}

onClickOutside(filterRef, () => {
  isOpen.value = false
})
</script>

<template>
  <div ref="filterRef" class="relative">
    <button
      id="installed-agent-filter-button"
      type="button"
      class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1 pr-3 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-500/50 dark:border-slate-700/50 dark:bg-slate-800/30 dark:hover:border-slate-600/50"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-1.5 pl-2.5 pr-1 text-slate-400 dark:text-slate-500">
        <iconify-icon icon="lucide:list-filter" class="text-sm" />
        <span class="text-sm font-medium">{{ t('common.filterAgents') }}</span>
      </div>
      <div class="h-4 w-px bg-slate-200/80 dark:bg-slate-700/50" />
      <div class="flex items-center gap-1.5 pl-1">
        <span class="text-sm font-medium text-emerald-400">{{ selectedAgentName }}</span>
        <iconify-icon icon="lucide:chevron-down" class="text-xs text-slate-400 transition-transform duration-200 dark:text-slate-500" :class="{ 'rotate-180': isOpen }" />
      </div>
    </button>

    <div
      v-if="isOpen"
      id="installed-agent-filter-menu"
      class="absolute left-0 top-full z-50 mt-2 w-64 animate-fade-in rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/95"
    >
      <button
        id="installed-agent-filter-option-all"
        type="button"
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-200/80 dark:hover:bg-slate-700/50"
        :class="selectedAgentId === 'all' ? 'text-emerald-400 font-medium bg-emerald-500/10' : 'text-slate-700 dark:text-slate-300'"
        @click="selectAgent('all')"
      >
        <iconify-icon icon="lucide:check" class="text-base" :class="selectedAgentId === 'all' ? 'opacity-100' : 'opacity-0'" />
        {{ t('common.showAll') }}
      </button>
      <div class="my-1 h-px w-full bg-slate-200/80 dark:bg-slate-700/50" />
      <div class="custom-scrollbar max-h-64 overflow-y-auto pr-1">
        <button
          v-for="agent in agents"
          :id="`installed-agent-filter-option-${agent.id}`"
          :key="agent.id"
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-200/80 dark:hover:bg-slate-700/50"
          :class="selectedAgentId === agent.id ? 'text-emerald-400 font-medium bg-emerald-500/10' : 'text-slate-700 dark:text-slate-300'"
          @click="selectAgent(agent.id)"
        >
          <iconify-icon icon="lucide:check" class="shrink-0 text-base" :class="selectedAgentId === agent.id ? 'opacity-100' : 'opacity-0'" />
          <AgentIcon :icon="agent.icon" class-name="mr-1 h-5 w-5 shrink-0 object-contain text-xl opacity-80" />
          <span class="truncate">{{ agent.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
