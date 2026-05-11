<script setup lang="ts">
import type { AgentDefinition, ConfirmType, ToastType } from '../types/ui'
import { useI18n } from 'vue-i18n'
import AgentFilterDropdown from '../components/installed/AgentFilterDropdown.vue'
import InstalledSkillSection from '../components/installed/InstalledSkillSection.vue'
import { useInstalledSkills } from '../composables/useInstalledSkills'

const props = defineProps<{
  agents: AgentDefinition[]
  addToast: (message: string, type?: ToastType) => void
  openConfirm: (title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>) => void
}>()

const { t } = useI18n()

const {
  isLoading,
  selectedAgentId,
  availableAgents,
  sections,
  getAgent,
  getSkillSourceLabel,
  uninstallSkill,
  uploadSkill,
} = useInstalledSkills({
  agents: () => props.agents,
  addToast: props.addToast,
  openConfirm: props.openConfirm,
  t,
})
</script>

<template>
  <div class="animate-fade-in w-full space-y-12 pb-10">
    <div v-if="isLoading" class="py-28 text-center text-slate-500 dark:text-slate-400">
      <iconify-icon icon="lucide:loader-2" class="mb-3 animate-spin text-4xl text-emerald-500 dark:text-emerald-400/70" />
      <div>{{ t('common.loading') }}</div>
    </div>

    <template v-else>
      <div v-if="availableAgents.length > 0" class="mb-2 flex items-center justify-start">
        <AgentFilterDropdown
          v-model:selected-agent-id="selectedAgentId"
          :agents="availableAgents"
        />
      </div>

      <InstalledSkillSection
        v-for="section in sections"
        :key="section.key"
        :get-agent="getAgent"
        :get-source-label="getSkillSourceLabel"
        :section="section"
        @uninstall="uninstallSkill"
        @upload="uploadSkill"
      />
    </template>
  </div>
</template>
