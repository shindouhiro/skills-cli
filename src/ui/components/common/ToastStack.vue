<script setup lang="ts">
import type { ToastMessage } from '../../composables/useToast'

defineProps<{
  toasts: readonly ToastMessage[]
}>()

function toastIcon(type: ToastMessage['type']): string {
  if (type === 'success')
    return 'lucide:check-circle'
  if (type === 'error')
    return 'lucide:x-circle'
  return 'lucide:alert-triangle'
}

function toastClass(type: ToastMessage['type']): string {
  if (type === 'success')
    return 'bg-emerald-500/10 text-emerald-400'
  if (type === 'error')
    return 'bg-red-500/10 text-red-400'
  return 'bg-amber-500/10 text-amber-400'
}
</script>

<template>
  <div class="pointer-events-none fixed left-1/2 top-6 z-[100] flex -translate-x-1/2 flex-col gap-3">
    <div
      v-for="toast in toasts"
      :id="`toast-${toast.id}`"
      :key="toast.id"
      class="glass animate-fade-in pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-700/50 px-6 py-3 shadow-2xl"
      :class="toastClass(toast.type)"
    >
      <iconify-icon :icon="toastIcon(toast.type)" class="text-xl" />
      <span class="font-medium">{{ toast.message }}</span>
    </div>
  </div>
</template>
