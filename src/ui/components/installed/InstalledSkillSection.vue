<script setup lang="ts">
import type { InstalledSkillSection } from '../../composables/useInstalledSkills'
import type { AgentDefinition, InstalledSkill } from '../../types/ui'
import { useI18n } from 'vue-i18n'
import AgentIcon from '../common/AgentIcon.vue'
import InstalledSkillCard from './InstalledSkillCard.vue'

defineProps<{
  section: InstalledSkillSection
  getAgent: (agentId: string) => AgentDefinition | undefined
  getSourceLabel: (skill: InstalledSkill, agentId: string) => string | undefined
}>()

const emit = defineEmits<{
  upload: [name: string, global: boolean]
  uninstall: [name: string, agentId: string, global: boolean]
}>()

const { t } = useI18n()

function emitUpload(name: string, global: boolean): void {
  emit('upload', name, global)
}

function emitUninstall(name: string, agentId: string, global: boolean): void {
  emit('uninstall', name, agentId, global)
}
</script>

<template>
  <section>
    <div class="mb-6 flex items-center gap-3">
      <span class="h-6 w-1.5 rounded-full" :class="section.glowClass" />
      <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
        {{ section.title }}
      </h2>
    </div>

    <div v-if="section.entries.length === 0" class="glass flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400 dark:border-slate-800 dark:text-slate-500">
      <iconify-icon :icon="section.icon" class="mb-4 text-6xl opacity-80" />
      <div>{{ section.emptyText }}</div>
    </div>

    <div
      v-for="[agentId, skills] in section.entries"
      v-else
      :id="`installed-agent-section-${section.key}-${agentId}`"
      :key="agentId"
      class="mb-8 rounded-2xl border border-slate-200 bg-slate-100/80 p-6 dark:border-slate-800 dark:bg-slate-800/20"
    >
      <h3 class="mb-6 flex flex-wrap items-center gap-2 text-lg font-medium">
        <div class="flex items-center gap-2.5 rounded-xl border px-3 py-1.5 shadow-sm" :class="section.accentClass">
          <AgentIcon :icon="getAgent(agentId)?.icon" />
          <span>{{ getAgent(agentId)?.name || agentId }}</span>
        </div>
        <div
          v-if="section.scopeGlobal && getAgent(agentId)?.extraGlobalDirs?.length"
          class="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-400"
        >
          <iconify-icon icon="lucide:folder-tree" class="text-sm" />
          <span>{{ t('installed.discoveryPaths', { count: 1 + (getAgent(agentId)?.extraGlobalDirs?.length || 0) }) }}</span>
        </div>
      </h3>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <InstalledSkillCard
          v-for="skill in skills"
          :key="skill.name"
          :agent-id="agentId"
          :section="section"
          :skill="skill"
          :source-label="getSourceLabel(skill, agentId)"
          @uninstall="emitUninstall"
          @upload="emitUpload"
        />
      </div>
    </div>
  </section>
</template>
