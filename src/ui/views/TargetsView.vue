<script setup lang="ts">
import type { ConfirmType, ToastType } from '../types/ui'
import { useI18n } from 'vue-i18n'
import TargetModal from '../components/TargetModal.vue'
import TargetCard from '../components/targets/TargetCard.vue'
import { getTargetKey, useTargets } from '../composables/useTargets'

const props = defineProps<{
  addToast: (message: string, type?: ToastType) => void
  openConfirm: (title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>) => void
}>()

const { t } = useI18n()

const {
  targets,
  targetSkillsData,
  showTargetModal,
  isSavingTarget,
  targetFormData,
  fetchTargetSkills,
  openAddTarget,
  saveTarget,
  deleteTarget,
  deleteTargetSkill,
} = useTargets({
  addToast: props.addToast,
  openConfirm: props.openConfirm,
  t,
})
</script>

<template>
  <div class="animate-fade-in w-full space-y-12 pb-10">
    <section>
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="h-6 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
            {{ t('targets.pageTitle') }}
          </h2>
        </div>
        <button
          id="target-add-button"
          type="button"
          class="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/30"
          @click="openAddTarget"
        >
          <iconify-icon icon="lucide:plus" />
          {{ t('targets.add') }}
        </button>
      </div>

      <div v-if="targets.length === 0" class="glass flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <iconify-icon icon="lucide:server-off" class="mb-4 text-6xl opacity-80" />
        <div>{{ t('targets.empty') }}</div>
      </div>

      <div v-else class="space-y-6">
        <TargetCard
          v-for="target in targets"
          :key="getTargetKey(target)"
          :target="target"
          :state="targetSkillsData[getTargetKey(target)]"
          @delete-skill="deleteTargetSkill"
          @delete-target="deleteTarget"
          @retry="fetchTargetSkills"
        />
      </div>
    </section>

    <TargetModal
      v-model:branch="targetFormData.branch"
      v-model:global="targetFormData.global"
      v-model:name="targetFormData.name"
      v-model:path="targetFormData.path"
      v-model:url="targetFormData.url"
      :show="showTargetModal"
      :saving="isSavingTarget"
      @close="showTargetModal = false"
      @save="saveTarget"
    />
  </div>
</template>
