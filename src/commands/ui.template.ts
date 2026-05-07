export const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <title>Skills Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.8/iconify-icon.min.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: '#10b981',
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; }
    .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body class="min-h-screen text-slate-200 overflow-hidden">
  <div id="app" class="flex h-screen w-full">
    <!-- Vue 模板在此处挂载 -->
  </div>
  <script type="module">
    import { createApp, ref, computed, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'

    createApp({
      setup() {
        const activeTab = ref('installed')
        const agents = ref([])
        const localSkills = ref({})
        const globalSkills = ref({})
        const keyword = ref('')
        const searchResults = ref([])
        const isSearching = ref(false)

        // Modal State
        const showInstallModal = ref(false)
        const isInstalling = ref(false)
        const installData = ref({ name: '', global: false })
        const agentFilter = ref('')
        const selectedAgents = ref([])

        // Toast Notifications
        const toasts = ref([])
        let toastId = 0
        function addToast(message, type = 'success') {
          const id = toastId++
          toasts.value.push({ id, message, type })
          setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id)
          }, 3000)
        }

        // Confirm Modal State
        const confirmModal = ref({
          show: false,
          title: '',
          message: '',
          type: 'danger',
          onConfirm: null
        })

        function openConfirm(title, message, type, onConfirm) {
          confirmModal.value = { show: true, title, message, type, onConfirm }
        }

        function handleConfirm() {
          if (confirmModal.value.onConfirm) confirmModal.value.onConfirm()
          confirmModal.value.show = false
        }

        async function fetchAgents() {
          const res = await fetch('/api/agents')
          agents.value = await res.json()
        }

        async function fetchSkills() {
          const res = await fetch('/api/skills')
          const data = await res.json()
          localSkills.value = data.local
          globalSkills.value = data.global
        }

        async function search() {
          if (!keyword.value) return
          isSearching.value = true
          try {
            const res = await fetch('/api/search?q=' + encodeURIComponent(keyword.value))
            searchResults.value = await res.json()
          } catch(e) {
            addToast('Search failed', 'error')
          } finally {
            isSearching.value = false
          }
        }

        function openInstallModal(name, global) {
          installData.value = { name, global }
          selectedAgents.value = agents.value.map(a => a.id) // Default select all
          agentFilter.value = ''
          showInstallModal.value = true
        }

        const filteredAgents = computed(() => {
          if (!agentFilter.value) return agents.value
          const lower = agentFilter.value.toLowerCase()
          return agents.value.filter(a => a.name.toLowerCase().includes(lower) || a.id.toLowerCase().includes(lower))
        })

        async function confirmInstall() {
           if (selectedAgents.value.length === 0) {
             addToast('请至少选择一个 Agent', 'warning')
             return
           }
           isInstalling.value = true
           try {
             const opts = { name: installData.value.name, global: installData.value.global, agents: selectedAgents.value }
             await fetch('/api/install', {
               method: 'POST',
               headers:{'Content-Type': 'application/json'},
               body: JSON.stringify(opts)
             })
             addToast('安装操作已完成', 'success')
             showInstallModal.value = false
             fetchSkills()
             activeTab.value = 'installed'
           } catch(e) {
             addToast('安装失败', 'error')
           } finally {
             isInstalling.value = false
           }
        }

        async function uninstall(name, agentId, global) {
           openConfirm('确认卸载', \`确定要从 \${agentId} 中卸载 Skill: \${name} 吗？此操作不可逆。\`, 'danger', async () => {
             try {
               const opts = { name, global, agents: [agentId] }
               await fetch('/api/uninstall', {
                 method: 'POST',
                 headers:{'Content-Type': 'application/json'},
                 body: JSON.stringify(opts)
               })
               addToast('卸载成功', 'success')
               fetchSkills()
             } catch(e) {
               addToast('卸载失败', 'error')
             }
           })
        }

        async function uploadSkill(name, global) {
           openConfirm('确认上传', \`即将上传 Skill: \${name} 到配置的 Git 远端，是否继续？\`, 'info', async () => {
             addToast('正在准备上传...', 'warning')
             try {
               const opts = { name, global }
               const res = await fetch('/api/upload', {
                 method: 'POST',
                 headers:{'Content-Type': 'application/json'},
                 body: JSON.stringify(opts)
               })
               const data = await res.json()
               if (data.success) {
                 addToast(data.message || '上传成功', 'success')
               } else {
                 addToast(data.error || '上传失败', 'error')
               }
             } catch(e) {
               addToast('上传失败: 网络或系统错误', 'error')
             }
           })
        }

        const targets = ref([])
        const showTargetModal = ref(false)
        const targetFormData = ref({ name: '', url: '', path: 'skills', branch: '', global: false })
        const isSavingTarget = ref(false)

        const targetSkillsData = ref({})

        async function fetchTargetSkills(targetName, global) {
          targetSkillsData.value[targetName] = { skills: [], loading: true, error: null }
          try {
            const res = await fetch(\`/api/targets/skills?targetName=\${encodeURIComponent(targetName)}&global=\${global}\`)
            const data = await res.json()
            if (data.success) {
              targetSkillsData.value[targetName] = { skills: data.skills, loading: false, error: null }
            } else {
              targetSkillsData.value[targetName] = { skills: [], loading: false, error: data.error }
            }
          } catch(e) {
            targetSkillsData.value[targetName] = { skills: [], loading: false, error: String(e) }
          }
        }

        async function deleteTargetSkill(targetName, skillName, global) {
          openConfirm('确认删除', \`确定要从远端库 \${targetName} 中删除 Skill: \${skillName} 吗？\`, 'danger', async () => {
            try {
              const res = await fetch('/api/targets/skills', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ targetName, skillName, global })
              })
              const data = await res.json()
              if (data.success) {
                addToast('删除成功', 'success')
                fetchTargetSkills(targetName, global)
              } else {
                addToast(data.error || '删除失败', 'error')
              }
            } catch(e) {
              addToast('删除失败', 'error')
            }
          })
        }

        async function fetchTargets() {
          const res = await fetch('/api/targets')
          targets.value = await res.json()
          targets.value.forEach(t => {
            fetchTargetSkills(t.name, false)
          })
        }

        function openAddTarget() {
          targetFormData.value = { name: '', url: '', path: 'skills', branch: '', global: false }
          showTargetModal.value = true
        }

        async function saveTarget() {
          if (!targetFormData.value.name || !targetFormData.value.url) {
             addToast('名称和 URL 是必填项', 'warning')
             return
          }
          isSavingTarget.value = true
          try {
             const res = await fetch('/api/targets', {
               method: 'POST',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify(targetFormData.value)
             })
             const data = await res.json()
             if (data.success) {
               addToast('上传目标添加成功', 'success')
               showTargetModal.value = false
               fetchTargets()
             } else {
               addToast(data.error || '添加失败', 'error')
             }
          } catch(e) {
             addToast('添加失败', 'error')
          } finally {
             isSavingTarget.value = false
          }
        }

        async function deleteTarget(name, global) {
           openConfirm('确认删除', \`确定要删除上传目标 \${name} 吗？\`, 'danger', async () => {
             try {
               const res = await fetch('/api/targets', {
                 method: 'DELETE',
                 headers: {'Content-Type': 'application/json'},
                 body: JSON.stringify({ name, global })
               })
               const data = await res.json()
               if (data.success) {
                 addToast('删除成功', 'success')
                 fetchTargets()
               } else {
                 addToast(data.error || '删除失败', 'error')
               }
             } catch(e) {
               addToast('删除失败', 'error')
             }
           })
        }

        onMounted(() => {
          fetchAgents()
          fetchSkills()
          fetchTargets()
        })

        return {
          activeTab, agents, localSkills, globalSkills, keyword, searchResults, isSearching, search, openInstallModal, uninstall, uploadSkill,
          showInstallModal, isInstalling, installData, agentFilter, selectedAgents, filteredAgents, confirmInstall,
          targets, showTargetModal, targetFormData, isSavingTarget, openAddTarget, saveTarget, deleteTarget,
          targetSkillsData, fetchTargetSkills, deleteTargetSkill,
          toasts, confirmModal, handleConfirm,
          hasLocal: () => Object.keys(localSkills.value).length > 0,
          hasGlobal: () => Object.keys(globalSkills.value).length > 0
        }
      },
      template: \`
        <!-- Toasts -->
        <div class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
          <div v-for="toast in toasts" :key="toast.id" class="animate-fade-in pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl glass border border-slate-700/50" :class="{'bg-emerald-500/10 text-emerald-400': toast.type==='success', 'bg-red-500/10 text-red-400': toast.type==='error', 'bg-amber-500/10 text-amber-400': toast.type==='warning'}">
             <iconify-icon v-if="toast.type==='success'" icon="lucide:check-circle" class="text-xl"></iconify-icon>
             <iconify-icon v-if="toast.type==='error'" icon="lucide:x-circle" class="text-xl"></iconify-icon>
             <iconify-icon v-if="toast.type==='warning'" icon="lucide:alert-triangle" class="text-xl"></iconify-icon>
             <span class="font-medium">{{ toast.message }}</span>
          </div>
        </div>

        <!-- Confirm Modal -->
        <div v-if="confirmModal.show" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
          <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[400px] flex flex-col overflow-hidden transform transition-all">
            <div class="p-6">
              <h3 class="text-xl font-bold flex items-center gap-3 mb-4" :class="{'text-red-400': confirmModal.type==='danger', 'text-emerald-400': confirmModal.type==='info'}">
                 <iconify-icon v-if="confirmModal.type==='danger'" icon="lucide:alert-triangle" class="text-3xl"></iconify-icon>
                 <iconify-icon v-else icon="lucide:info" class="text-3xl"></iconify-icon>
                 {{ confirmModal.title }}
              </h3>
              <p class="text-slate-300 leading-relaxed">{{ confirmModal.message }}</p>
            </div>
            
            <div class="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
               <button @click="confirmModal.show=false" class="px-6 py-2 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium">取消</button>
               <button @click="handleConfirm" class="px-6 py-2 rounded-xl text-white font-medium transition-all shadow-lg" :class="{'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/20': confirmModal.type==='danger', 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-500/20': confirmModal.type==='info'}">
                 确定
               </button>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0">
          <div class="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
             <div class="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-slate-900">S</div>
             <h1 class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Skills Admin</h1>
          </div>
          <nav class="flex-1 py-6 px-4 space-y-2">
             <button @click="activeTab='installed'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300', activeTab==='installed'?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent']">
               <iconify-icon icon="catppuccin:folder-packages" class="text-2xl"></iconify-icon> 已安装管理
             </button>
             <button @click="activeTab='search'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300', activeTab==='search'?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent']">
               <iconify-icon icon="catppuccin:search" class="text-2xl"></iconify-icon> 发现与安装
             </button>
             <button @click="activeTab='targets'" :class="['w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300', activeTab==='targets'?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent']">
               <iconify-icon icon="catppuccin:folder-git" class="text-2xl"></iconify-icon> 仓库设置
             </button>
          </nav>
          <div class="p-6 text-xs text-slate-500 border-t border-slate-800">
             Skills CLI Dashboard v1.0
          </div>
        </aside>

        <!-- Main Area -->
        <div class="flex-1 flex flex-col min-w-0 bg-slate-900/50">
          <!-- Header -->
          <header class="h-16 glass px-8 flex items-center justify-between border-b border-slate-800 z-10 sticky top-0 shrink-0">
             <h2 class="text-xl font-bold text-slate-100 flex items-center gap-3">
                <span v-if="activeTab==='installed'">已安装的 Skills</span>
                <span v-if="activeTab==='search'">发现新的 Skills</span>
                <span v-if="activeTab==='targets'">上传仓库配置</span>
             </h2>
          </header>

          <!-- Content -->
          <main class="flex-1 overflow-y-auto p-8 relative">
             <div v-if="activeTab === 'installed'" class="w-full space-y-12 animate-fade-in pb-10">
                <section>
                  <div class="flex items-center gap-3 mb-6">
                    <span class="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></span>
                    <h2 class="text-xl font-bold text-slate-100">本地项目 Skills</h2>
                  </div>
                  <div v-if="!hasLocal()" class="glass rounded-2xl p-16 text-center text-slate-400 border-dashed border-2 border-slate-800 flex flex-col items-center">
                    <iconify-icon icon="catppuccin:folder-src" class="text-6xl mb-4 opacity-80"></iconify-icon>
                    <div>当前项目未安装任何 Skills</div>
                  </div>
                  <div v-for="(skills, agentId) in localSkills" :key="agentId" class="mb-8 bg-slate-800/20 rounded-2xl p-6 border border-slate-800">
                    <h3 class="text-lg font-medium text-emerald-400 mb-6 flex items-center gap-2">
                      <span class="px-3 py-1 bg-emerald-500/10 rounded-lg">{{ agents.find(a=>a.id===agentId)?.name || agentId }}</span>
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                      <div v-for="s in skills" :key="s.name" class="glass p-5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 group border border-slate-700/50 hover:border-emerald-500/30 flex flex-col min-h-[180px] relative">
                         <h4 class="font-bold text-lg flex items-start justify-between">
                           <span class="text-slate-200 truncate pr-2">{{ s.name }}</span>
                           <span v-if="s.meta?.version" class="text-xs font-mono bg-slate-800 text-emerald-400 px-2 py-1 rounded-md border border-slate-700 whitespace-nowrap shrink-0">v{{s.meta.version}}</span>
                         </h4>
                         <div class="mt-3 flex-1 group/desc relative">
                           <p class="text-sm text-slate-400 line-clamp-2 leading-relaxed">{{ s.meta?.description || '无描述信息' }}</p>
                           <div v-if="s.meta?.description && s.meta.description.length > 40" class="absolute left-0 bottom-full mb-2 w-72 px-4 py-3 text-xs text-slate-200 bg-slate-900/95 border border-slate-600 rounded-xl shadow-2xl opacity-0 group-hover/desc:opacity-100 transition-opacity duration-200 pointer-events-none z-30 whitespace-normal leading-relaxed backdrop-blur-sm">{{ s.meta.description }}</div>
                         </div>
                         <div class="mt-auto pt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-t border-slate-800">
                           <button @click="uploadSkill(s.name, false)" class="relative group/btn text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-blue-500/20">
                             <iconify-icon icon="lucide:upload-cloud" class="text-lg"></iconify-icon>
                             <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700/50 z-10">上传至仓库</div>
                           </button>
                           <button @click="uninstall(s.name, agentId, false)" class="relative group/btn text-red-400 hover:bg-red-500/10 hover:text-red-300 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-500/20">
                             <iconify-icon icon="lucide:trash-2" class="text-lg"></iconify-icon>
                             <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700/50 z-10">卸载</div>
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div class="flex items-center gap-3 mb-6">
                    <span class="w-1.5 h-6 bg-cyan-500 rounded-full shadow-[0_0_10px_#06b6d4]"></span>
                    <h2 class="text-xl font-bold text-slate-100">全局用户 Skills</h2>
                  </div>
                  <div v-if="!hasGlobal()" class="glass rounded-2xl p-16 text-center text-slate-400 border-dashed border-2 border-slate-800 flex flex-col items-center">
                    <iconify-icon icon="catppuccin:folder-public" class="text-6xl mb-4 opacity-80"></iconify-icon>
                    <div>系统全局未安装任何 Skills</div>
                  </div>
                  <div v-for="(skills, agentId) in globalSkills" :key="agentId" class="mb-8 bg-slate-800/20 rounded-2xl p-6 border border-slate-800">
                    <h3 class="text-lg font-medium text-cyan-400 mb-6 flex items-center gap-2">
                      <span class="px-3 py-1 bg-cyan-500/10 rounded-lg">{{ agents.find(a=>a.id===agentId)?.name || agentId }}</span>
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                      <div v-for="s in skills" :key="s.name" class="glass p-5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 group border border-slate-700/50 hover:border-cyan-500/30 flex flex-col min-h-[180px] relative">
                         <h4 class="font-bold text-lg flex items-start justify-between">
                           <span class="text-slate-200 truncate pr-2">{{ s.name }}</span>
                           <span v-if="s.meta?.version" class="text-xs font-mono bg-slate-800 text-cyan-400 px-2 py-1 rounded-md border border-slate-700 whitespace-nowrap shrink-0">v{{s.meta.version}}</span>
                         </h4>
                         <div class="mt-3 flex-1 group/desc relative">
                           <p class="text-sm text-slate-400 line-clamp-2 leading-relaxed">{{ s.meta?.description || '无描述信息' }}</p>
                           <div v-if="s.meta?.description && s.meta.description.length > 40" class="absolute left-0 bottom-full mb-2 w-72 px-4 py-3 text-xs text-slate-200 bg-slate-900/95 border border-slate-600 rounded-xl shadow-2xl opacity-0 group-hover/desc:opacity-100 transition-opacity duration-200 pointer-events-none z-30 whitespace-normal leading-relaxed backdrop-blur-sm">{{ s.meta.description }}</div>
                         </div>
                         <div class="mt-auto pt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-t border-slate-800">
                           <button @click="uploadSkill(s.name, true)" class="relative group/btn text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-blue-500/20">
                             <iconify-icon icon="lucide:upload-cloud" class="text-lg"></iconify-icon>
                             <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700/50 z-10">上传至仓库</div>
                           </button>
                           <button @click="uninstall(s.name, agentId, true)" class="relative group/btn text-red-400 hover:bg-red-500/10 hover:text-red-300 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-500/20">
                             <iconify-icon icon="lucide:trash-2" class="text-lg"></iconify-icon>
                             <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700/50 z-10">卸载</div>
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </section>
             </div>

             <div v-if="activeTab === 'search'" class="animate-fade-in w-full pb-10">
               <div class="glass p-2 rounded-2xl flex gap-3 items-center mb-10 shadow-lg shadow-black/20 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all border border-slate-700/50 w-full max-w-5xl mx-auto">
                 <iconify-icon icon="catppuccin:search" class="pl-5 text-3xl opacity-80"></iconify-icon>
                 <input v-model="keyword" @keyup.enter="search" placeholder="输入名称或关键字搜索 skills..." class="flex-1 bg-transparent border-none px-2 py-4 text-lg focus:outline-none text-slate-200 placeholder-slate-500">
                 <button @click="search" :disabled="isSearching" class="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-slate-900 px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 text-lg">搜 索</button>
               </div>

               <div v-if="isSearching" class="text-center py-32 animate-pulse">
                 <div class="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
                 <div class="text-emerald-400 font-medium tracking-widest text-lg">SEARCHING...</div>
               </div>
               
               <div v-else-if="searchResults.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                 <div v-for="s in searchResults" :key="s.name" class="glass p-6 rounded-2xl flex flex-col group hover:border-emerald-500/30 transition-all duration-300 border border-slate-700/50 h-full">
                   <div class="flex items-start justify-between mb-3">
                     <h3 class="font-bold text-xl text-emerald-300 truncate pr-4">{{ s.name }}</h3>
                     <span class="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50 whitespace-nowrap shrink-0">{{ s.source }}</span>
                   </div>
                   <p class="text-slate-400 leading-relaxed flex-1 mb-6 text-sm line-clamp-3">{{ s.description }}</p>
                   <div class="flex gap-3 justify-end mt-auto pt-4 border-t border-slate-800">
                     <button @click="openInstallModal(s.name, false)" class="relative group/btn bg-slate-800 hover:bg-slate-700 text-slate-300 w-10 h-10 flex items-center justify-center rounded-xl font-medium transition-all shadow-sm border border-slate-700 hover:border-slate-600">
                       <iconify-icon icon="lucide:download" class="text-xl"></iconify-icon>
                       <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700/50 z-10">本地安装</div>
                     </button>
                     <button @click="openInstallModal(s.name, true)" class="relative group/btn bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 w-10 h-10 flex items-center justify-center border border-emerald-500/20 hover:border-transparent rounded-xl font-medium transition-all shadow-sm">
                       <iconify-icon icon="lucide:globe" class="text-xl"></iconify-icon>
                       <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700/50 z-10">全局安装</div>
                     </button>
                   </div>
                 </div>
               </div>
               
               <div v-else-if="keyword && !isSearching" class="text-center py-32 flex flex-col items-center">
                 <iconify-icon icon="catppuccin:astro" class="text-7xl mb-6 opacity-80"></iconify-icon>
                 <div class="text-slate-400 text-xl font-medium">在茫茫宇宙中没有找到匹配的 Skills</div>
               </div>
               
               <div v-else-if="!keyword" class="text-center py-32 flex flex-col items-center">
                 <iconify-icon icon="catppuccin:rocket" class="text-7xl mb-6 opacity-80"></iconify-icon>
                 <div class="text-slate-400 text-xl font-medium">输入关键字，探索无尽的 AI 潜能</div>
               </div>
             </div>

             <div v-if="activeTab === 'targets'" class="w-full space-y-12 animate-fade-in pb-10">
                <section>
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                      <span class="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></span>
                      <h2 class="text-xl font-bold text-slate-100">上传目标仓库配置</h2>
                    </div>
                    <button @click="openAddTarget" class="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm border border-blue-500/30 hover:border-blue-500/50">
                      <iconify-icon icon="lucide:plus"></iconify-icon> 添加上传目标
                    </button>
                  </div>

                  <div v-if="targets.length === 0" class="glass rounded-2xl p-16 text-center text-slate-400 border-dashed border-2 border-slate-800 flex flex-col items-center">
                    <iconify-icon icon="lucide:server-off" class="text-6xl mb-4 opacity-80"></iconify-icon>
                    <div>尚未配置任何上传目标</div>
                  </div>

                  <div v-else class="space-y-6">
                    <div v-for="t in targets" :key="t.name" class="glass p-6 rounded-2xl border border-slate-700/50 flex flex-col group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden">
                       <div class="absolute top-0 right-0 p-4">
                         <button @click="deleteTarget(t.name, false)" class="text-slate-500 hover:text-red-400 p-2 rounded-lg transition-colors" title="删除整个目标配置">
                           <iconify-icon icon="lucide:trash-2" class="text-xl"></iconify-icon>
                         </button>
                       </div>
                       <h4 class="font-bold text-xl flex items-center gap-2 mb-2">
                         <iconify-icon icon="lucide:server" class="text-blue-400"></iconify-icon>
                         <span class="text-slate-100">{{ t.name }}</span>
                       </h4>
                       <div class="flex items-center gap-4 text-sm text-slate-400 mt-2 mb-6 border-b border-slate-800/50 pb-4">
                         <div class="flex items-center gap-1.5" :title="t.url">
                           <iconify-icon icon="lucide:link"></iconify-icon>
                           <span class="truncate max-w-[200px]">{{ t.url }}</span>
                         </div>
                         <div class="flex items-center gap-1.5">
                           <iconify-icon icon="lucide:folder"></iconify-icon>
                           <span>{{ t.path || 'skills' }}</span>
                         </div>
                         <div v-if="t.branch" class="flex items-center gap-1.5">
                           <iconify-icon icon="lucide:git-branch"></iconify-icon>
                           <span>{{ t.branch }}</span>
                         </div>
                       </div>
                       
                       <!-- Skills List -->
                       <div>
                         <h5 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                            <iconify-icon icon="lucide:package-open"></iconify-icon> 远端库 Skills
                         </h5>
                         <div v-if="targetSkillsData[t.name]?.loading" class="text-center py-8">
                           <iconify-icon icon="lucide:loader-2" class="animate-spin text-3xl text-blue-500/50"></iconify-icon>
                           <div class="text-sm text-slate-500 mt-2">正在拉取远端信息...</div>
                         </div>
                         <div v-else-if="targetSkillsData[t.name]?.error" class="text-center py-6 border border-red-500/20 rounded-xl bg-red-500/5">
                            <div class="text-red-400 text-sm mb-2">获取失败: {{ targetSkillsData[t.name].error }}</div>
                            <button @click="fetchTargetSkills(t.name, false)" class="text-blue-400 text-xs hover:underline">重试</button>
                         </div>
                         <div v-else-if="!targetSkillsData[t.name]?.skills?.length" class="text-center py-6 text-sm text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800 border-dashed">
                            暂无上传的技能
                         </div>
                         <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           <div v-for="skill in targetSkillsData[t.name].skills" :key="skill.name" class="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex justify-between items-start group/skill hover:border-slate-600 transition-colors">
                             <div class="min-w-0 flex-1">
                                <div class="font-bold text-slate-200 truncate flex items-center gap-2">
                                  {{ skill.meta?.name || skill.name }}
                                  <span v-if="skill.meta?.version" class="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">{{ skill.meta.version }}</span>
                                </div>
                                <div class="text-xs text-slate-400 mt-1 truncate" :title="skill.meta?.description">
                                  {{ skill.meta?.description || '无描述信息' }}
                                </div>
                             </div>
                             <button @click="deleteTargetSkill(t.name, skill.name, false)" class="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-all opacity-0 group-hover/skill:opacity-100 flex-shrink-0 ml-2" title="删除该技能">
                               <iconify-icon icon="lucide:trash-2"></iconify-icon>
                             </button>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </section>
             </div>
          </main>

        <!-- Target Modal -->
        <div v-if="showTargetModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
          <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[500px] flex flex-col overflow-hidden transform transition-all">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h3 class="text-xl font-bold text-slate-100 flex items-center gap-2">
                <iconify-icon icon="lucide:server" class="text-blue-400"></iconify-icon>添加上传目标
              </h3>
              <button @click="showTargetModal = false" class="text-slate-400 hover:text-white transition-colors"><iconify-icon icon="lucide:x" class="text-2xl"></iconify-icon></button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">名称 (唯一标识) <span class="text-red-400">*</span></label>
                <input v-model="targetFormData.name" placeholder="例如: my-skills" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Git 远端 URL <span class="text-red-400">*</span></label>
                <input v-model="targetFormData.url" placeholder="例如: git@github.com:owner/repo.git" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">技能子目录名称</label>
                <input v-model="targetFormData.path" placeholder="默认: skills" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">目标分支 (可选)</label>
                <input v-model="targetFormData.branch" placeholder="留空使用远端默认分支" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
              </div>
              <div class="flex items-center gap-2 mt-2">
                <input type="checkbox" id="globalTarget" v-model="targetFormData.global" class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900">
                <label for="globalTarget" class="text-sm text-slate-300 cursor-pointer">保存到全局配置 (~/.config/skills-cli/.skillsrc)</label>
              </div>
            </div>
            <div class="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button @click="showTargetModal = false" class="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors">取消</button>
              <button @click="saveTarget" :disabled="isSavingTarget || !targetFormData.name || !targetFormData.url" class="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                <iconify-icon v-if="isSavingTarget" icon="lucide:loader-2" class="animate-spin"></iconify-icon> 保 存
              </button>
            </div>
          </div>
        </div>
        </div>

        <!-- Install Modal -->
        <div v-if="showInstallModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
          <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[600px] flex flex-col max-h-[90vh] overflow-hidden transform transition-all">
            <!-- Modal Header -->
            <div class="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 class="text-xl font-bold flex items-center gap-3">
                 <iconify-icon icon="catppuccin:folder-download" class="text-3xl"></iconify-icon> 
                 <span class="text-slate-100">安装 <span class="text-emerald-400">{{ installData.name }}</span></span>
                 <span class="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700">{{ installData.global ? '全局' : '本地' }}</span>
              </h3>
              <button @click="showInstallModal=false" class="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors text-xl">&times;</button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-6 flex flex-col gap-5 overflow-hidden">
               <div>
                 <label class="block text-sm font-medium text-slate-400 mb-2">选择目标 Agent (可多选)</label>
                 <div class="relative">
                   <iconify-icon icon="catppuccin:search" class="absolute left-3 top-3 text-slate-400 text-lg"></iconify-icon>
                   <input v-model="agentFilter" placeholder="搜索过滤..." class="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-slate-200 placeholder-slate-500 transition-all">
                 </div>
               </div>

               <div class="flex-1 overflow-y-auto border border-slate-700/50 rounded-xl bg-slate-800/20 p-2 space-y-1 custom-scroll min-h-[200px]">
                  <label v-for="agent in filteredAgents" :key="agent.id" class="flex items-center p-3 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors group">
                     <div class="relative flex items-center justify-center w-5 h-5 mr-4">
                       <input type="checkbox" :value="agent.id" v-model="selectedAgents" class="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded bg-slate-900 checked:bg-emerald-500 checked:border-emerald-500 focus:outline-none transition-all cursor-pointer">
                       <svg class="absolute w-3 h-3 text-slate-900 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none">
                          <path d="M1 5L5 9L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>
                     </div>
                     <div class="flex flex-col">
                       <span class="font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">{{ agent.name }}</span>
                     </div>
                     <span class="text-xs font-mono text-slate-500 ml-auto bg-slate-800/50 px-2 py-1 rounded border border-slate-700">{{ agent.id }}</span>
                  </label>
                  <div v-if="filteredAgents.length === 0" class="text-center py-10 text-slate-500">
                    无匹配的 Agent
                  </div>
               </div>
               <div class="text-sm text-slate-400 flex justify-between items-center">
                 <span>已选择 <strong class="text-emerald-400">{{ selectedAgents.length }}</strong> 个 Agent</span>
                 <div class="space-x-3">
                   <button @click="selectedAgents = filteredAgents.map(a=>a.id)" class="text-emerald-400 hover:text-emerald-300">全选当前</button>
                   <button @click="selectedAgents = []" class="text-slate-400 hover:text-slate-300">清空</button>
                 </div>
               </div>
            </div>
            
            <!-- Modal Footer -->
            <div class="px-6 py-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30">
               <button @click="showInstallModal=false" :disabled="isInstalling" class="px-6 py-2.5 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 font-medium">取消</button>
               <button @click="confirmInstall" :disabled="isInstalling" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white disabled:opacity-50 flex items-center gap-2 transition-all font-medium shadow-lg shadow-emerald-500/20">
                 <span v-if="isInstalling" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                 <span v-if="isInstalling">安装中...</span>
                 <span v-else>确认安装</span>
               </button>
            </div>
          </div>
        </div>
      \`
    }).mount('#app')
  </script>
</body>
</html>
`
