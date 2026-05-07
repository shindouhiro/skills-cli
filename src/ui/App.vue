<script setup lang="ts">
import type { AgentDefinition, AppTab } from './types/ui'
import { onMounted, ref, shallowRef } from 'vue'
import AppShell from './components/AppShell.vue'
import ConfirmModal from './components/common/ConfirmModal.vue'
import ToastStack from './components/common/ToastStack.vue'
import { useConfirm } from './composables/useConfirm'
import { useToast } from './composables/useToast'
import { api } from './services/api'
import ConfigView from './views/ConfigView.vue'
import InstalledView from './views/InstalledView.vue'
import SearchView from './views/SearchView.vue'
import TargetsView from './views/TargetsView.vue'

const activeTab = shallowRef<AppTab>('installed')
const agents = ref<AgentDefinition[]>([])
const defaultAgentIds = ref<string[]>([])
const { toasts, addToast } = useToast()
const { confirmModal, openConfirm, handleConfirm, closeConfirm } = useConfirm()

async function fetchAgents(): Promise<void> {
  try {
    const data = await api.agents()
    agents.value = data.agents
    defaultAgentIds.value = data.defaultAgents
  }
  catch (err) {
    addToast(String(err), 'error')
  }
}

onMounted(fetchAgents)
</script>

<template>
  <ToastStack :toasts="toasts" />
  <ConfirmModal
    :state="confirmModal"
    @close="closeConfirm"
    @confirm="handleConfirm"
  />

  <AppShell v-model:active-tab="activeTab">
    <InstalledView
      v-if="activeTab === 'installed'"
      :agents="agents"
      :add-toast="addToast"
      :open-confirm="openConfirm"
    />
    <SearchView
      v-else-if="activeTab === 'search'"
      :agents="agents"
      :default-agent-ids="defaultAgentIds"
      :add-toast="addToast"
      @installed="activeTab = 'installed'"
    />
    <TargetsView
      v-else-if="activeTab === 'targets'"
      :add-toast="addToast"
      :open-confirm="openConfirm"
    />
    <ConfigView
      v-else-if="activeTab === 'config'"
      :add-toast="addToast"
      @config-saved="fetchAgents"
    />
  </AppShell>
</template>
