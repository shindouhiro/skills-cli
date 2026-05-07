<script setup lang="ts">
import type { AgentDefinition, ConfirmType, InstalledSkill, ToastType } from '../types/ui'
import { computed, onMounted, ref, shallowRef } from 'vue'
import AgentIcon from '../components/common/AgentIcon.vue'
import { api } from '../services/api'

const props = defineProps<{
  agents: AgentDefinition[]
  addToast: (message: string, type?: ToastType) => void
  openConfirm: (title: string, message: string, type: ConfirmType, onConfirm: () => void | Promise<void>) => void
}>()

interface SkillSection {
  key: 'local' | 'global'
  title: string
  emptyText: string
  accentClass: string
  glowClass: string
  scopeGlobal: boolean
  icon: string
  entries: Array<[string, InstalledSkill[]]>
}

const localSkills = ref<Record<string, InstalledSkill[]>>({})
const globalSkills = ref<Record<string, InstalledSkill[]>>({})
const isLoading = shallowRef(false)

const agentById = computed(() => new Map(props.agents.map(agent => [agent.id, agent])))

const sections = computed<SkillSection[]>(() => [
  {
    key: 'local',
    title: '本地项目 Skills',
    emptyText: '当前项目未安装任何 Skills',
    accentClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-emerald-500/5',
    glowClass: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
    scopeGlobal: false,
    icon: 'catppuccin:folder-src',
    entries: Object.entries(localSkills.value),
  },
  {
    key: 'global',
    title: '全局用户 Skills',
    emptyText: '系统全局未安装任何 Skills',
    accentClass: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10 shadow-cyan-500/5',
    glowClass: 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]',
    scopeGlobal: true,
    icon: 'catppuccin:folder-public',
    entries: Object.entries(globalSkills.value),
  },
])

async function fetchSkills(): Promise<void> {
  isLoading.value = true
  try {
    const data = await api.skills()
    localSkills.value = data.local
    globalSkills.value = data.global
  }
  catch (err) {
    props.addToast(String(err), 'error')
  }
  finally {
    isLoading.value = false
  }
}

function getAgent(agentId: string): AgentDefinition | undefined {
  return agentById.value.get(agentId)
}

function uninstallSkill(name: string, agentId: string, global: boolean): void {
  props.openConfirm('确认卸载', `确定要从 ${agentId} 中卸载 Skill: ${name} 吗？此操作不可逆。`, 'danger', async () => {
    try {
      await api.uninstall({ name, global, agents: [agentId] })
      props.addToast('卸载成功', 'success')
      await fetchSkills()
    }
    catch (err) {
      props.addToast(String(err), 'error')
    }
  })
}

function uploadSkill(name: string, global: boolean): void {
  props.openConfirm('确认上传', `即将上传 Skill: ${name} 到配置的 Git 远端，是否继续？`, 'info', async () => {
    props.addToast('正在准备上传...', 'warning')
    try {
      const data = await api.upload({ name, global })
      props.addToast(data.message || '上传成功', 'success')
    }
    catch (err) {
      props.addToast(String(err), 'error')
    }
  })
}

onMounted(fetchSkills)
</script>

<template>
  <div class="animate-fade-in w-full space-y-12 pb-10">
    <div v-if="isLoading" class="py-28 text-center text-slate-400">
      <iconify-icon icon="lucide:loader-2" class="mb-3 text-4xl text-emerald-400/70 animate-spin" />
      <div>正在读取已安装 Skills...</div>
    </div>

    <section v-for="section in sections" v-else :key="section.key">
      <div class="mb-6 flex items-center gap-3">
        <span class="h-6 w-1.5 rounded-full" :class="section.glowClass" />
        <h2 class="text-xl font-bold text-slate-100">
          {{ section.title }}
        </h2>
      </div>

      <div v-if="section.entries.length === 0" class="glass flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-800 p-16 text-center text-slate-400">
        <iconify-icon :icon="section.icon" class="mb-4 text-6xl opacity-80" />
        <div>{{ section.emptyText }}</div>
      </div>

      <div
        v-for="[agentId, skills] in section.entries"
        v-else
        :id="`installed-agent-section-${section.key}-${agentId}`"
        :key="agentId"
        class="mb-8 rounded-2xl border border-slate-800 bg-slate-800/20 p-6"
      >
        <h3 class="mb-6 flex items-center gap-2 text-lg font-medium">
          <div class="flex items-center gap-2.5 rounded-xl border px-3 py-1.5 shadow-sm" :class="section.accentClass">
            <AgentIcon :icon="getAgent(agentId)?.icon" />
            <span>{{ getAgent(agentId)?.name || agentId }}</span>
          </div>
        </h3>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <div
            v-for="skill in skills"
            :id="`installed-skill-card-${section.key}-${agentId}-${skill.name}`"
            :key="skill.name"
            class="glass group relative flex min-h-[180px] flex-col rounded-2xl border border-slate-700/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <h4 class="flex items-start justify-between text-lg font-bold">
              <span class="truncate pr-2 text-slate-200">{{ skill.name }}</span>
              <span v-if="skill.meta?.version" class="shrink-0 whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-emerald-400">
                v{{ skill.meta.version }}
              </span>
            </h4>

            <div class="group/desc relative mt-3 flex-1">
              <p class="line-clamp-2 text-sm leading-relaxed text-slate-400">
                {{ skill.meta?.description || '无描述信息' }}
              </p>
              <div
                v-if="skill.meta?.description && skill.meta.description.length > 40"
                class="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-72 whitespace-normal rounded-xl border border-slate-600 bg-slate-900/95 px-4 py-3 text-xs leading-relaxed text-slate-200 opacity-0 shadow-2xl backdrop-blur-sm transition-opacity duration-200 group-hover/desc:opacity-100"
              >
                {{ skill.meta.description }}
              </div>
            </div>

            <div class="mt-auto flex justify-end gap-2 border-t border-slate-800 pt-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button
                :id="`installed-upload-button-${section.key}-${agentId}-${skill.name}`"
                type="button"
                class="group/btn relative flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-sm font-medium text-blue-400 transition-colors hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-300"
                @click="uploadSkill(skill.name, section.scopeGlobal)"
              >
                <iconify-icon icon="lucide:upload-cloud" class="text-lg" />
                <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700/50 bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/btn:opacity-100">
                  上传至仓库
                </div>
              </button>
              <button
                :id="`installed-uninstall-button-${section.key}-${agentId}-${skill.name}`"
                type="button"
                class="group/btn relative flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-sm font-medium text-red-400 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                @click="uninstallSkill(skill.name, agentId, section.scopeGlobal)"
              >
                <iconify-icon icon="lucide:trash-2" class="text-lg" />
                <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700/50 bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/btn:opacity-100">
                  卸载
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
