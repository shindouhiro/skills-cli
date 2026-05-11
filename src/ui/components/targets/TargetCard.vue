<script setup lang="ts">
import type { ScopedUploadTargetConfig, TargetSkillsState } from '../../types/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getTargetKey } from '../../composables/useTargets'

const props = defineProps<{
  target: ScopedUploadTargetConfig
  state?: TargetSkillsState
}>()

const emit = defineEmits<{
  deleteTarget: [target: ScopedUploadTargetConfig]
  deleteSkill: [target: ScopedUploadTargetConfig, skillName: string]
  retry: [target: ScopedUploadTargetConfig]
}>()

const { t } = useI18n()

const cardIdPrefix = computed(() => getTargetKey(props.target).replace(':', '-'))
const scopeLabel = computed(() => props.target.global ? t('config.globalScope') : t('config.projectScope'))
</script>

<template>
  <div
    :id="`target-card-${cardIdPrefix}`"
    class="glass group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 p-6 transition-all duration-300 hover:border-blue-500/30 dark:border-slate-700/50"
  >
    <div class="absolute right-0 top-0 p-4">
      <button
        :id="`target-delete-button-${cardIdPrefix}`"
        type="button"
        class="rounded-lg p-2 text-slate-400 transition-colors hover:text-red-400 dark:text-slate-500"
        :title="t('targets.deleteTargetTitle')"
        @click="emit('deleteTarget', target)"
      >
        <iconify-icon icon="lucide:trash-2" class="text-xl" />
      </button>
    </div>

    <h4 class="mb-2 flex flex-wrap items-center gap-2 pr-10 text-xl font-bold">
      <iconify-icon icon="lucide:server" class="text-blue-400" />
      <span class="min-w-0 truncate text-slate-900 dark:text-slate-100">{{ target.name }}</span>
      <span class="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
        {{ scopeLabel }}
      </span>
    </h4>

    <div class="mb-6 mt-2 flex flex-wrap items-center gap-4 border-b border-slate-200 pb-4 text-sm text-slate-400 dark:border-slate-800/50 dark:text-slate-500">
      <div class="flex min-w-0 items-center gap-1.5" :title="target.url">
        <iconify-icon icon="lucide:link" class="shrink-0" />
        <span class="max-w-[260px] truncate">{{ target.url }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <iconify-icon icon="lucide:folder" />
        <span>{{ target.path || 'skills' }}</span>
      </div>
      <div v-if="target.branch" class="flex items-center gap-1.5">
        <iconify-icon icon="lucide:git-branch" />
        <span>{{ target.branch }}</span>
      </div>
    </div>

    <div>
      <h5 class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400 dark:text-slate-500">
        <iconify-icon icon="lucide:package-open" />
        {{ t('targets.skills') }}
      </h5>

      <div v-if="state?.loading" class="py-8 text-center">
        <iconify-icon icon="lucide:loader-2" class="animate-spin text-3xl text-blue-500/50" />
        <div class="mt-2 text-sm text-slate-400 dark:text-slate-500">
          {{ t('targets.fetchLoading') }}
        </div>
      </div>

      <div v-else-if="state?.error" class="rounded-xl border border-red-500/20 bg-red-500/5 py-6 text-center">
        <div class="mb-2 text-sm text-red-400">
          {{ t('targets.fetchError', { error: state.error }) }}
        </div>
        <button
          :id="`target-retry-button-${cardIdPrefix}`"
          type="button"
          class="text-xs text-blue-400 hover:underline"
          @click="emit('retry', target)"
        >
          {{ t('targets.retry') }}
        </button>
      </div>

      <div v-else-if="!state?.skills?.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-100/80 py-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-500">
        {{ t('targets.noSkills') }}
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="skill in state.skills"
          :id="`target-skill-card-${cardIdPrefix}-${skill.name}`"
          :key="skill.name"
          class="group/skill flex items-start justify-between rounded-xl border border-slate-200 bg-slate-100 p-4 transition-colors hover:border-slate-300 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:border-slate-600"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 truncate font-bold text-slate-800 dark:text-slate-200">
              {{ skill.meta?.name || skill.name }}
              <span v-if="skill.meta?.version" class="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-300">{{ skill.meta.version }}</span>
            </div>
            <div class="mt-1 truncate text-xs text-slate-400 dark:text-slate-500" :title="skill.meta?.description">
              {{ skill.meta?.description || t('installed.noDesc') }}
            </div>
          </div>
          <button
            :id="`target-skill-delete-button-${cardIdPrefix}-${skill.name}`"
            type="button"
            class="ml-2 shrink-0 rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/skill:opacity-100 dark:text-slate-500"
            :title="t('targets.deleteSkillTitle')"
            @click="emit('deleteSkill', target, skill.name)"
          >
            <iconify-icon icon="lucide:trash-2" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
