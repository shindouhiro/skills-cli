<script setup lang="ts">
import type { AppTab } from '../types/ui'
import { computed } from 'vue'

const activeTab = defineModel<AppTab>('activeTab', { required: true })

const tabs: Array<{ id: AppTab, label: string, icon: string }> = [
  { id: 'installed', label: '已安装管理', icon: 'catppuccin:folder-packages' },
  { id: 'search', label: '发现与安装', icon: 'catppuccin:search' },
  { id: 'targets', label: '仓库设置', icon: 'catppuccin:folder-git' },
  { id: 'config', label: '配置管理', icon: 'lucide:settings' },
]

const title = computed(() => tabs.find(tab => tab.id === activeTab.value)?.label ?? 'Skills Admin')
</script>

<template>
  <div class="flex h-screen w-full text-slate-200">
    <aside class="z-20 flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div class="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <div class="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-slate-900">
          S
        </div>
        <h1 class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-xl font-black text-transparent">
          Skills Admin
        </h1>
      </div>

      <nav class="flex-1 space-y-2 px-4 py-6">
        <button
          v-for="tab in tabs"
          :id="`tab-button-${tab.id}`"
          :key="tab.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 font-medium transition-all duration-300"
          :class="activeTab === tab.id
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
          @click="activeTab = tab.id"
        >
          <iconify-icon :icon="tab.icon" class="text-2xl" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div class="border-t border-slate-800 p-6 text-xs text-slate-500">
        Skills CLI Dashboard v1.0
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col bg-slate-900/50">
      <header class="glass sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-8">
        <h2 class="flex items-center gap-3 text-xl font-bold text-slate-100">
          {{ title }}
        </h2>
      </header>

      <main class="relative flex-1 overflow-y-auto overflow-x-hidden p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
