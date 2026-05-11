<script setup lang="ts">
import type { ToastType } from '../types/ui'
import { onMounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '../services/api'

const props = defineProps<{
  addToast: (message: string, type?: ToastType) => void
}>()

const emit = defineEmits<{
  configSaved: []
}>()

const { t } = useI18n()

const configText = shallowRef('{}')
const configPath = shallowRef('')
const configScope = shallowRef<'project' | 'global'>('project')
const isSavingConfig = shallowRef(false)

async function fetchConfig(): Promise<void> {
  try {
    const data = await api.config(configScope.value)
    configPath.value = data.path
    configText.value = JSON.stringify(JSON.parse(data.content), null, 2)
  }
  catch {
    configText.value = '{}'
  }
}

async function saveConfigData(): Promise<void> {
  isSavingConfig.value = true
  try {
    JSON.parse(configText.value)
    const data = await api.saveConfig({ path: configPath.value, content: configText.value })
    props.addToast(data.message || t('config.saveSuccess'), 'success')
    emit('configSaved')
  }
  catch (err) {
    props.addToast(err instanceof SyntaxError ? t('config.syntaxError') : String(err), 'error')
  }
  finally {
    isSavingConfig.value = false
  }
}

async function setScope(scope: 'project' | 'global'): Promise<void> {
  configScope.value = scope
  await fetchConfig()
}

onMounted(fetchConfig)
</script>

<template>
  <div class="animate-fade-in w-full space-y-8 pb-10">
    <section>
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="h-6 w-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
            {{ t('config.editorTitle') }}
          </h2>

          <div class="ml-4 flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 p-1">
            <button
              id="config-scope-project-button"
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              :class="configScope === 'project' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'"
              @click="setScope('project')"
            >
              {{ t('config.projectScope') }}
            </button>
            <button
              id="config-scope-global-button"
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              :class="configScope === 'global' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'"
              @click="setScope('global')"
            >
              {{ t('config.globalScope') }}
            </button>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            id="config-reload-button"
            type="button"
            class="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
            @click="fetchConfig"
          >
            <iconify-icon icon="lucide:refresh-cw" />
            {{ t('config.reload') }}
          </button>
          <button
            id="config-save-button"
            type="button"
            :disabled="isSavingConfig"
            class="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-300 disabled:opacity-50"
            @click="saveConfigData"
          >
            <iconify-icon icon="lucide:save" />
            {{ isSavingConfig ? t('config.saving') : t('config.saveConfig') }}
          </button>
        </div>
      </div>

      <div class="glass space-y-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
        <div class="flex items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700/30 bg-slate-200/50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
          <iconify-icon icon="lucide:file-json" class="shrink-0 text-lg text-amber-400" />
          <span class="truncate font-mono">{{ configPath }}</span>
        </div>
        <textarea
          id="config-editor-textarea"
          v-model="configText"
          spellcheck="false"
          class="custom-scroll min-h-[400px] w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950/80 px-5 py-4 font-mono text-sm leading-relaxed text-emerald-300 transition-all [tab-size:2] focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
        <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <iconify-icon icon="lucide:info" class="text-base" />
          <span>{{ t('config.infoText') }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
