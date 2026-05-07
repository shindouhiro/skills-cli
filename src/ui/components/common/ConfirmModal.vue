<script setup lang="ts">
import type { ConfirmState } from '../../composables/useConfirm'

defineProps<{
  state: Readonly<ConfirmState>
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <div
    v-if="state.show"
    id="confirm-modal"
    class="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
  >
    <div class="flex w-[400px] max-w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <div class="p-6">
        <h3
          class="mb-4 flex items-center gap-3 text-xl font-bold"
          :class="state.type === 'danger' ? 'text-red-400' : 'text-emerald-400'"
        >
          <iconify-icon :icon="state.type === 'danger' ? 'lucide:alert-triangle' : 'lucide:info'" class="text-3xl" />
          {{ state.title }}
        </h3>
        <p class="leading-relaxed text-slate-300">
          {{ state.message }}
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-800 bg-slate-800/30 px-6 py-4">
        <button
          id="confirm-modal-cancel-button"
          type="button"
          class="rounded-xl px-6 py-2 font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          id="confirm-modal-confirm-button"
          type="button"
          class="rounded-xl px-6 py-2 font-medium text-white shadow-lg transition-all"
          :class="state.type === 'danger'
            ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20 hover:from-red-500 hover:to-red-400'
            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400'"
          @click="emit('confirm')"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>
