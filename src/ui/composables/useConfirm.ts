import type { ConfirmType } from '../types/ui'
import { reactive, readonly } from 'vue'

export interface ConfirmState {
  show: boolean
  title: string
  message: string
  type: ConfirmType
  onConfirm: (() => void | Promise<void>) | null
}

export function useConfirm() {
  const confirmModal = reactive<ConfirmState>({
    show: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: null,
  })

  function openConfirm(title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>): void {
    confirmModal.show = true
    confirmModal.title = title
    confirmModal.message = message
    confirmModal.type = type
    confirmModal.onConfirm = onConfirm
  }

  async function handleConfirm(): Promise<void> {
    await confirmModal.onConfirm?.()
    confirmModal.show = false
    confirmModal.onConfirm = null
  }

  function closeConfirm(): void {
    confirmModal.show = false
    confirmModal.onConfirm = null
  }

  return {
    confirmModal: readonly(confirmModal),
    openConfirm,
    handleConfirm,
    closeConfirm,
  }
}
