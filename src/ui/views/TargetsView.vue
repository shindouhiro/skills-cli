<script setup lang="ts">
import type { ConfirmType, TargetSkillsState, ToastType, UploadTargetConfig } from '../types/ui'
import { onMounted, reactive, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import TargetModal from '../components/TargetModal.vue'
import { api } from '../services/api'

const props = defineProps<{
  addToast: (message: string, type?: ToastType) => void
  openConfirm: (title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>) => void
}>()

const { t } = useI18n()

const targets = ref<UploadTargetConfig[]>([])
const targetSkillsData = ref<Record<string, TargetSkillsState>>({})
const showTargetModal = shallowRef(false)
const isSavingTarget = shallowRef(false)
const targetFormData = reactive({
  name: '',
  url: '',
  path: 'skills',
  branch: '',
  global: false,
})

async function fetchTargetSkills(targetName: string, global: boolean): Promise<void> {
  targetSkillsData.value[targetName] = { skills: [], loading: true, error: null }
  try {
    const data = await api.targetSkills(targetName, global)
    targetSkillsData.value[targetName] = data.success
      ? { skills: data.skills, loading: false, error: null }
      : { skills: [], loading: false, error: data.error || '获取失败' }
  }
  catch (err) {
    targetSkillsData.value[targetName] = { skills: [], loading: false, error: String(err) }
  }
}

async function fetchTargets(): Promise<void> {
  try {
    targets.value = await api.targets()
    await Promise.all(targets.value.map(target => fetchTargetSkills(target.name, false)))
  }
  catch (err) {
    props.addToast(String(err), 'error')
  }
}

function openAddTarget(): void {
  targetFormData.name = ''
  targetFormData.url = ''
  targetFormData.path = 'skills'
  targetFormData.branch = ''
  targetFormData.global = false
  showTargetModal.value = true
}

async function saveTarget(): Promise<void> {
  if (!targetFormData.name || !targetFormData.url) {
    props.addToast(t('targets.nameAndUrlRequired'), 'warning')
    return
  }

  isSavingTarget.value = true
  try {
    const data = await api.addTarget(targetFormData)
    props.addToast(data.message || t('common.success'), 'success')
    showTargetModal.value = false
    await fetchTargets()
  }
  catch (err) {
    props.addToast(String(err), 'error')
  }
  finally {
    isSavingTarget.value = false
  }
}

function deleteTarget(name: string, global: boolean): void {
  props.openConfirm(t('common.confirm'), t('targets.deleteConfirm', { name }), 'danger', async () => {
    try {
      const data = await api.deleteTarget({ name, global })
      props.addToast(data.message || t('common.success'), 'success')
      await fetchTargets()
    }
    catch (err) {
      props.addToast(String(err), 'error')
    }
  })
}

function deleteTargetSkill(targetName: string, skillName: string, global: boolean): void {
  props.openConfirm(t('common.confirm'), t('targets.deleteSkillConfirm', { targetName, skillName }), 'danger', async () => {
    try {
      await api.deleteTargetSkill({ targetName, skillName, global })
      props.addToast(t('common.success'), 'success')
      await fetchTargetSkills(targetName, global)
    }
    catch (err) {
      props.addToast(String(err), 'error')
    }
  })
}

onMounted(fetchTargets)
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

      <div v-if="targets.length === 0" class="glass flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
        <iconify-icon icon="lucide:server-off" class="mb-4 text-6xl opacity-80" />
        <div>{{ t('targets.empty') }}</div>
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="target in targets"
          :id="`target-card-${target.name}`"
          :key="target.name"
          class="glass group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 transition-all duration-300 hover:border-blue-500/30"
        >
          <div class="absolute right-0 top-0 p-4">
            <button
              :id="`target-delete-button-${target.name}`"
              type="button"
              class="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-colors hover:text-red-400"
              title="删除整个目标配置"
              @click="deleteTarget(target.name, false)"
            >
              <iconify-icon icon="lucide:trash-2" class="text-xl" />
            </button>
          </div>
          <h4 class="mb-2 flex items-center gap-2 text-xl font-bold">
            <iconify-icon icon="lucide:server" class="text-blue-400" />
            <span class="text-slate-900 dark:text-slate-100">{{ target.name }}</span>
          </h4>
          <div class="mb-6 mt-2 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800/50 pb-4 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-1.5" :title="target.url">
              <iconify-icon icon="lucide:link" />
              <span class="max-w-[200px] truncate">{{ target.url }}</span>
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
            <h5 class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400">
              <iconify-icon icon="lucide:package-open" />
              {{ t('targets.skills') }}
            </h5>
            <div v-if="targetSkillsData[target.name]?.loading" class="py-8 text-center">
              <iconify-icon icon="lucide:loader-2" class="animate-spin text-3xl text-blue-500/50" />
              <div class="mt-2 text-sm text-slate-400 dark:text-slate-500">
                {{ t('targets.fetchLoading') }}
              </div>
            </div>
            <div v-else-if="targetSkillsData[target.name]?.error" class="rounded-xl border border-red-500/20 bg-red-500/5 py-6 text-center">
              <div class="mb-2 text-sm text-red-400">
                {{ t('targets.fetchError', { error: targetSkillsData[target.name].error }) }}
              </div>
              <button :id="`target-retry-button-${target.name}`" type="button" class="text-xs text-blue-400 hover:underline" @click="fetchTargetSkills(target.name, false)">
                {{ t('targets.retry') }}
              </button>
            </div>
            <div v-else-if="!targetSkillsData[target.name]?.skills?.length" class="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/20 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              {{ t('targets.noSkills') }}
            </div>
            <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="skill in targetSkillsData[target.name].skills"
                :id="`target-skill-card-${target.name}-${skill.name}`"
                :key="skill.name"
                class="group/skill flex items-start justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 p-4 transition-colors hover:border-slate-300 dark:border-slate-600"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 truncate font-bold text-slate-800 dark:text-slate-200">
                    {{ skill.meta?.name || skill.name }}
                    <span v-if="skill.meta?.version" class="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">{{ skill.meta.version }}</span>
                  </div>
                  <div class="mt-1 truncate text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400" :title="skill.meta?.description">
                    {{ skill.meta?.description || '无描述信息' }}
                  </div>
                </div>
                <button
                  :id="`target-skill-delete-button-${target.name}-${skill.name}`"
                  type="button"
                  class="ml-2 shrink-0 rounded p-1.5 text-slate-400 dark:text-slate-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/skill:opacity-100"
                  title="删除该技能"
                  @click="deleteTargetSkill(target.name, skill.name, false)"
                >
                  <iconify-icon icon="lucide:trash-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
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
