<script setup lang="ts">
import type { AppTab } from '../types/ui'
import { useDark, useToggle } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)

const activeTab = defineModel<AppTab>('activeTab', { required: true })

const tabs = computed<Array<{ id: AppTab, label: string, icon: string }>>(() => [
  { id: 'installed', label: t('nav.installed'), icon: 'catppuccin:folder-packages' },
  { id: 'search', label: t('nav.search'), icon: 'catppuccin:search' },
  { id: 'targets', label: t('nav.targets'), icon: 'catppuccin:folder-git' },
  { id: 'config', label: t('nav.config'), icon: 'lucide:settings' },
])

const title = computed(() => tabs.value.find(tab => tab.id === activeTab.value)?.label ?? 'Skills Admin')

function toggleLanguage() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}
</script>

<template>
  <div class="flex h-screen w-full text-slate-800 dark:text-slate-200">
    <aside class="z-20 flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6">
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
            : 'border-transparent text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200'"
          @click="activeTab = tab.id"
        >
          <iconify-icon :icon="tab.icon" class="text-2xl" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div class="border-t border-slate-200 dark:border-slate-800 p-6 text-xs text-slate-400 dark:text-slate-500">
        Skills CLI Dashboard v1.0
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col bg-slate-50/50 dark:bg-slate-900/50">
      <header class="glass sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-8">
        <h2 class="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-slate-100">
          {{ title }}
        </h2>

        <div class="flex items-center gap-4">
          <button
            type="button"
            class="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
            @click="toggleLanguage"
          >
            <iconify-icon icon="lucide:languages" class="text-lg" />
            {{ locale === 'zh' ? 'EN' : '中' }}
          </button>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
            @click="toggleDark()"
          >
            <iconify-icon v-if="isDark" icon="lucide:moon" class="text-lg" />
            <iconify-icon v-else icon="lucide:sun" class="text-lg" />
          </button>
        </div>
      </header>

      <main class="relative flex-1 overflow-y-auto overflow-x-hidden p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
