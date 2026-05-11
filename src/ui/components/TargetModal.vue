<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  show: boolean
  saving: boolean
  name: string
  url: string
  path: string
  branch: string
  global: boolean
}>()

const emit = defineEmits<{
  'close': []
  'save': []
  'update:branch': [value: string]
  'update:global': [value: boolean]
  'update:name': [value: string]
  'update:path': [value: string]
  'update:url': [value: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="show"
    id="target-modal"
    class="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-white dark:bg-slate-900/80 p-4 backdrop-blur-sm"
  >
    <div class="flex w-[500px] max-w-full flex-col overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/30 p-6">
        <h3 class="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          <iconify-icon icon="lucide:server" class="text-blue-400" />
          {{ t('targets.modalTitle') }}
        </h3>
        <button id="target-modal-close-button" type="button" class="text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:text-white" @click="emit('close')">
          <iconify-icon icon="lucide:x" class="text-2xl" />
        </button>
      </div>

      <div class="space-y-4 p-6">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="target-name-input">{{ t('targets.name') }} <span class="text-red-400">*</span></label>
          <input
            id="target-name-input"
            :value="name"
            :placeholder="t('targets.namePlaceholder')"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-slate-800 dark:text-slate-200 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            @input="emit('update:name', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="target-url-input">{{ t('targets.url') }} <span class="text-red-400">*</span></label>
          <input
            id="target-url-input"
            :value="url"
            :placeholder="t('targets.urlPlaceholder')"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-slate-800 dark:text-slate-200 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            @input="emit('update:url', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="target-path-input">{{ t('targets.path') }}</label>
          <input
            id="target-path-input"
            :value="path"
            :placeholder="t('targets.pathPlaceholder')"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-slate-800 dark:text-slate-200 transition-all focus:border-blue-500 focus:outline-none"
            @input="emit('update:path', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="target-branch-input">{{ t('targets.branch') }}</label>
          <input
            id="target-branch-input"
            :value="branch"
            :placeholder="t('targets.branchPlaceholder')"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-slate-800 dark:text-slate-200 transition-all focus:border-blue-500 focus:outline-none"
            @input="emit('update:branch', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div class="mt-2 flex items-center gap-2">
          <input
            id="target-global-checkbox"
            :checked="global"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
            @change="emit('update:global', ($event.target as HTMLInputElement).checked)"
          >
          <label for="target-global-checkbox" class="cursor-pointer text-sm text-slate-700 dark:text-slate-300">{{ t('targets.globalConfig') }}</label>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/30 p-4">
        <button id="target-cancel-button" type="button" class="rounded-xl px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:bg-slate-800" @click="emit('close')">
          {{ t('common.cancel') }}
        </button>
        <button
          id="target-save-button"
          type="button"
          :disabled="saving || !name || !url"
          class="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('save')"
        >
          <iconify-icon v-if="saving" icon="lucide:loader-2" class="animate-spin" />
          {{ t('targets.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
