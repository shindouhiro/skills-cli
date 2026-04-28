<p align="right">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

# ⚡ Skills CLI (@shindou/skills-cli)

<p align="center">
  <img src="./assets/banner.png" alt="Skills CLI Banner" width="600" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@shindou/skills-cli">
    <img src="https://img.shields.io/npm/v/@shindou/skills-cli?color=a1b858&label=npm" alt="npm version" />
  </a>
  <a href="https://github.com/shindouhiro/skills-cli/actions/workflows/test.yml">
    <img src="https://github.com/shindouhiro/skills-cli/actions/workflows/test.yml/badge.svg" alt="CI" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
</p>

---

**Skills CLI** 是一个为 30+ 种 AI 编码助手量身定制的技能管理工具。它能让你在不同的 AI 助手（如 Cursor、Claude Code、Antigravity 等）之间一键搜索、下载并同步安装 **Skills** 指令集，极大地提升你的 AI 结对编程体验。

## ✨ 特性

- 🚀 **一键安装**：支持从 GitHub 或指定仓库快速安装技能。
- 📦 **多助手适配**：自动识别并安装到 30+ 种主流 AI 助手的配置目录。
- 🔗 **智能共享**：默认使用符号链接（Symlink），一份存储多处共享，节省空间且同步更新。
- 🔍 **便捷搜索**：默认接入 [skills.sh](https://skills.sh/) 和 GitHub 数据源，快速发现适合你项目的 AI 技能。
- 🗑️ **交互式删除**：不传参数自动进入多选模式，浏览全部已安装技能并批量删除。
- 🔎 **关键字过滤**：删除时支持关键字过滤，快速定位目标技能（`--filter` 或交互式输入）。
- 🛠️ **高度可配置**：支持项目级和全局配置文件 `.skillsrc`。

## 🚀 安装

推荐使用 `pnpm` 进行全局安装：

```bash
pnpm add -g @shindou/skills-cli
```

或者使用 `npm` / `yarn`：

```bash
npm install -g @shindou/skills-cli
# 或
yarn global add @shindou/skills-cli
```

安装完成后，你可以通过 `skills` 命令来调用它。

## 💡 快速上手

### 1. 搜索技能
默认会从 [skills.sh](https://skills.sh/) 搜索公开 skill 目录，也会继续搜索配置中的 GitHub 数据源。展示全部结果，支持并行搜索和相关度排序：
```bash
skills search vue
skills s react --limit 20    # 限制只显示 20 条结果
```

### 2. 安装技能
安装指定技能到当前项目的所有已识别助手：
```bash
skills install vue-testing-best-practices
```

也可以直接安装 `skills.sh` 页面链接，CLI 会解析为对应的 GitHub 仓库和 skill：
```bash
skills install https://skills.sh/anthropics/skills/frontend-design
```

安装到指定的助手（支持多个）：
```bash
skills i vue-testing -a antigravity,claude-code
```

安装到全局（用户级）目录：
```bash
skills i vue-testing -g
```

强制交互式选择目标助手（忽略配置文件中的默认设置）：
```bash
skills i vue-testing -i
```

### 3. 查看已安装
```bash
skills list
skills ls -g
```

### 4. 卸载技能

直接指定名称删除：
```bash
skills uninstall vue-testing-best-practices
```

不传名称进入交互式多选删除模式（浏览所有已安装技能 → 过滤 → 多选 → 确认）：
```bash
skills rm
skills rm -g          # 交互式删除全局技能
```

使用关键字过滤后再多选删除：
```bash
skills rm --filter vue        # 只显示含 "vue" 的技能
skills rm -g -f testing       # 全局技能中过滤 "testing"
```

## 🛠️ 指令一览

| 指令 | 别名 | 描述 | 选项 |
| :--- | :--- | :--- | :--- |
| `search <keyword>` | `s` | 从 skills.sh 和配置的数据源搜索可用 skills（默认显示全部结果） | `-l, --limit <count>`: 限制最大显示数量 |
| `install <name>` | `i`, `add` | 安装指定的 skill | `-a, --agent <agents>`: 指定目标助手 (逗号分隔)<br>`-g, --global`: 安装到全局用户目录<br>`-f, --force`: 强制覆盖已存在的 skill<br>`-l, --link`: 使用符号链接模式 (推荐)<br>`-i, --interactive`: 强制进入交互式选择模式 |
| `list` | `ls` | 列出已安装的 skills | `-g, --global`: 列出全局已安装的 skills |
| `uninstall [name]` | `u`, `remove`, `rm`, `delete` | 卸载 skill（不传 name 进入多选模式） | `-a, --agent <agents>`: 指定目标助手<br>`-g, --global`: 从全局目录删除<br>`-f, --filter <keyword>`: 按关键字过滤 skills 列表 |
| `init` | - | 初始化 `.skillsrc` 配置文件 | `-g, --global`: 初始化全局配置 |

## 📂 支持的 AI 助手 (30+)

`skills-cli` 能够自动识别并支持以下助手的技能存放目录：

| 助手名称 | ID | 助手名称 | ID |
| :--- | :--- | :--- | :--- |
| **Amp / Kimi Code** | `amp` | **Antigravity** | `antigravity` |
| **Claude Code** | `claude-code` | **Cline** | `cline` |
| **CodeBuddy** | `codebuddy` | **Codex** | `codex` |
| **Command Code** | `command-code` | **Continue** | `continue` |
| **Crush** | `crush` | **Cursor** | `cursor` |
| **Droid** | `droid` | **Gemini CLI** | `gemini-cli` |
| **GitHub Copilot** | `github-copilot` | **Goose** | `goose` |
| **Junie** | `junie` | **Kilo Code** | `kilo` |
| **Kiro CLI** | `kiro-cli` | **Kode** | `kode` |
| **MCPJam** | `mcpjam` | **Moltbot** | `moltbot` |
| **Mux** | `mux` | **Neovate** | `neovate` |
| **OpenCode** | `opencode` | **OpenHands** | `openhands` |
| **Pi** | `pi` | **Pochi** | `pochi` |
| **Qoder** | `qoder` | **Qwen Code** | `qwen-code` |
| **Roo Code** | `roo` | **Trae** | `trae` |
| **Windsurf** | `windsurf` | **Zencoder** | `zencoder` |

*...以及更多持续更新中。*

## ⚙️ 配置 (.skillsrc)

你可以通过 `skills init` 创建配置文件。

```json
{
  "defaultAgents": ["antigravity", "claude-code"],
  "installMode": "link",
  "scope": "project",
  "sources": [
    {
      "type": "skills-sh",
      "url": "https://skills.sh"
    },
    {
      "type": "github",
      "repo": "antfu/skills",
      "path": "skills"
    }
  ]
}
```

`skills.sh` 是默认搜索源。即使你的项目级或全局 `.skillsrc` 自定义了 `sources`，CLI 也会自动补上 `skills.sh`，确保 `skills search <keyword>` 默认可以搜索公开 skill 目录。

## 🛠️ 开发

```bash
pnpm install    # 安装依赖
pnpm dev        # 监控并自动构建
pnpm build      # 生产构建
pnpm test       # 运行测试
```

## 📄 开源协议

基于 [MIT](./LICENSE) 协议开源。
