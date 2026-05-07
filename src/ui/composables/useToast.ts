import type { ToastType } from '../types/ui'
import { readonly, ref } from 'vue'

export interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

export function useToast() {
  const toasts = ref<ToastMessage[]>([])
  let toastId = 0

  function addToast(message: string, type: ToastType = 'success'): void {
    const id = toastId++
    toasts.value.push({ id, message, type })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter(toast => toast.id !== id)
    }, 3000)
  }

  return {
    toasts: readonly(toasts),
    addToast,
  }
}
