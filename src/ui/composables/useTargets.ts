import type { ConfirmType, ScopedUploadTargetConfig, TargetSkillsState, ToastType } from '../types/ui'
import { onMounted, reactive, ref, shallowRef } from 'vue'
import { api } from '../services/api'

type Translate = (key: string, params?: Record<string, unknown>) => string

interface UseTargetsOptions {
  addToast: (message: string, type?: ToastType) => void
  openConfirm: (title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>) => void
  t: Translate
}

export interface TargetFormData {
  name: string
  url: string
  path: string
  branch: string
  global: boolean
}

export function getTargetKey(target: Pick<ScopedUploadTargetConfig, 'global' | 'name'>): string {
  return `${target.global ? 'global' : 'project'}:${target.name}`
}

export function useTargets(options: UseTargetsOptions) {
  const targets = ref<ScopedUploadTargetConfig[]>([])
  const targetSkillsData = ref<Record<string, TargetSkillsState>>({})
  const showTargetModal = shallowRef(false)
  const isSavingTarget = shallowRef(false)
  const targetFormData = reactive<TargetFormData>({
    name: '',
    url: '',
    path: 'skills',
    branch: '',
    global: false,
  })

  async function fetchTargetSkills(target: ScopedUploadTargetConfig): Promise<void> {
    const key = getTargetKey(target)
    targetSkillsData.value[key] = { skills: [], loading: true, error: null }
    try {
      const data = await api.targetSkills(target.name, target.global)
      targetSkillsData.value[key] = data.success
        ? { skills: data.skills, loading: false, error: null }
        : { skills: [], loading: false, error: data.error || options.t('targets.fetchFailed') }
    }
    catch (err) {
      targetSkillsData.value[key] = { skills: [], loading: false, error: String(err) }
    }
  }

  async function fetchTargets(): Promise<void> {
    try {
      targets.value = await api.targets()
      await Promise.all(targets.value.map(target => fetchTargetSkills(target)))
    }
    catch (err) {
      options.addToast(String(err), 'error')
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
      options.addToast(options.t('targets.nameAndUrlRequired'), 'warning')
      return
    }

    isSavingTarget.value = true
    try {
      const data = await api.addTarget(targetFormData)
      options.addToast(data.message || options.t('common.success'), 'success')
      showTargetModal.value = false
      await fetchTargets()
    }
    catch (err) {
      options.addToast(String(err), 'error')
    }
    finally {
      isSavingTarget.value = false
    }
  }

  function deleteTarget(target: ScopedUploadTargetConfig): void {
    options.openConfirm(options.t('common.confirm'), options.t('targets.deleteConfirm', { name: target.name }), 'danger', async () => {
      try {
        const data = await api.deleteTarget({ name: target.name, global: target.global })
        options.addToast(data.message || options.t('common.success'), 'success')
        await fetchTargets()
      }
      catch (err) {
        options.addToast(String(err), 'error')
      }
    })
  }

  function deleteTargetSkill(target: ScopedUploadTargetConfig, skillName: string): void {
    options.openConfirm(options.t('common.confirm'), options.t('targets.deleteSkillConfirm', { targetName: target.name, skillName }), 'danger', async () => {
      try {
        await api.deleteTargetSkill({ targetName: target.name, skillName, global: target.global })
        options.addToast(options.t('common.success'), 'success')
        await fetchTargetSkills(target)
      }
      catch (err) {
        options.addToast(String(err), 'error')
      }
    })
  }

  onMounted(fetchTargets)

  return {
    targets,
    targetSkillsData,
    showTargetModal,
    isSavingTarget,
    targetFormData,
    fetchTargetSkills,
    fetchTargets,
    openAddTarget,
    saveTarget,
    deleteTarget,
    deleteTargetSkill,
  }
}
