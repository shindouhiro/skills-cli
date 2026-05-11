<script setup lang="ts">
import type { InstalledSkillSection } from '../../composables/useInstalledSkills'
import type { InstalledSkill } from '../../types/ui'
import { useI18n } from 'vue-i18n'

defineProps<{
  skill: InstalledSkill
  section: InstalledSkillSection
  agentId: string
  sourceLabel?: string
}>()

const emit = defineEmits<{
  upload: [name: string, global: boolean]
  uninstall: [name: string, agentId: string, global: boolean]
}>()

const { t } = useI18n()
</script>

<template>
  <div
    :id="`installed-skill-card-${section.key}-${agentId}-${skill.name}`"
    class="glass group relative flex min-h-[180px] flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    :class="skill.broken
      ? 'border-red-500/40 opacity-70 hover:border-red-500/60 hover:shadow-red-500/10'
      : 'border-slate-200 hover:border-emerald-500/30 hover:shadow-emerald-500/10 dark:border-slate-700/50'"
  >
    <h4 class="flex items-start justify-between text-lg font-bold">
      <span class="truncate pr-2 text-slate-800 dark:text-slate-200">{{ skill.name }}</span>
      <div class="flex shrink-0 items-center gap-1.5">
        <span v-if="skill.broken" class="flex items-center gap-1 whitespace-nowrap rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 font-mono text-xs text-red-400">
          <iconify-icon icon="lucide:link-2-off" class="text-sm" />
          {{ t('installed.broken') }}
        </span>
        <span v-else-if="skill.meta?.version" class="whitespace-nowrap rounded-md border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-emerald-400 dark:border-slate-700 dark:bg-slate-800">
          v{{ skill.meta.version }}
        </span>
      </div>
    </h4>

    <div
      v-if="section.scopeGlobal && sourceLabel"
      class="mt-1.5 flex items-center gap-1 text-xs text-violet-400/80"
    >
      <iconify-icon icon="lucide:folder-symlink" class="text-sm" />
      <span class="font-mono">{{ sourceLabel }}</span>
    </div>

    <div class="group/desc relative mt-3 flex-1">
      <p v-if="skill.broken" class="text-sm leading-relaxed text-red-400/80">
        <iconify-icon icon="lucide:alert-triangle" class="mr-1 align-text-top text-base" />
        {{ t('installed.brokenDesc') }}
      </p>
      <template v-else>
        <p class="line-clamp-2 text-sm leading-relaxed text-slate-400 dark:text-slate-500">
          {{ skill.meta?.description || t('installed.noDesc') }}
        </p>
        <div
          v-if="skill.meta?.description && skill.meta.description.length > 40"
          class="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-72 whitespace-normal rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-xs leading-relaxed text-slate-800 opacity-0 shadow-2xl backdrop-blur-sm transition-opacity duration-200 group-hover/desc:opacity-100 dark:border-slate-600 dark:bg-slate-900/95 dark:text-slate-200"
        >
          {{ skill.meta.description }}
        </div>
      </template>
    </div>

    <div class="mt-auto flex justify-end gap-2 border-t border-slate-200 pt-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:border-slate-800">
      <button
        v-if="!skill.broken"
        :id="`installed-upload-button-${section.key}-${agentId}-${skill.name}`"
        type="button"
        class="group/btn relative flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-sm font-medium text-blue-400 transition-colors hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-300"
        @click="emit('upload', skill.name, section.scopeGlobal)"
      >
        <iconify-icon icon="lucide:upload-cloud" class="text-lg" />
        <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 opacity-0 shadow-lg transition-opacity group-hover/btn:opacity-100 dark:border-slate-700/50 dark:bg-slate-900 dark:text-white">
          {{ t('installed.upload') }}
        </div>
      </button>
      <button
        :id="`installed-uninstall-button-${section.key}-${agentId}-${skill.name}`"
        type="button"
        class="group/btn relative flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-sm font-medium text-red-400 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
        @click="emit('uninstall', skill.name, agentId, section.scopeGlobal)"
      >
        <iconify-icon icon="lucide:trash-2" class="text-lg" />
        <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 opacity-0 shadow-lg transition-opacity group-hover/btn:opacity-100 dark:border-slate-700/50 dark:bg-slate-900 dark:text-white">
          {{ t('installed.uninstall') }}
        </div>
      </button>
    </div>
  </div>
</template>
