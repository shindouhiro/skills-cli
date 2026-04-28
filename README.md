# ⚡ Skills CLI (@shindou/skills-cli)

<p align="center">
  <img src="https://raw.githubusercontent.com/shindouhiro/skills-cli/main/assets/banner.png" alt="Skills CLI Banner" width="600" />
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
- 🔍 **便捷搜索**：内置模糊搜索，快速发现适合你项目的 AI 技能。
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
搜索与 Vue 或测试相关的技能：
```bash
skills search vue
skills s testing
```

### 2. 安装技能
安装指定技能到当前项目的所有已识别助手：
```bash
skills install vue-testing-best-practices
```

安装到指定的助手（支持多个）：
```bash
skills i vue-testing -a antigravity,claude-code
```

安装到全局（用户级）目录：
```bash
skills i vue-testing -g
```

### 3. 查看已安装
```bash
skills list
skills ls -g
```

### 4. 卸载技能
```bash
skills uninstall vue-testing-best-practices
```

## 📂 支持的 AI 助手 (30+)

`skills-cli` 能够自动识别并支持以下助手的技能存放目录：

| 助手名称 | ID | 助手名称 | ID |
| :--- | :--- | :--- | :--- |
| **Antigravity** | `antigravity` | **Claude Code** | `claude-code` |
| **Cursor** | `cursor` | **Windsurf** | `windsurf` |
| **Trae** | `trae` | **GitHub Copilot** | `github-copilot` |
| **Gemini CLI** | `gemini-cli` | **Cline** | `cline` |
| **Continue** | `continue` | **Roo Code** | `roo` |
| **Amp / Kimi Code** | `amp` | **Moltbot** | `moltbot` |
| **CodeBuddy** | `codebuddy` | **Codex** | `codex` |
| **Command Code** | `command-code` | **Crush** | `crush` |
| **Droid** | `droid` | **Goose** | `goose` |
| **Junie** | `junie` | **Kilo Code** | `kilo` |
| **Kiro CLI** | `kiro-cli` | **Kode** | `kode` |
| **MCPJam** | `mcpjam` | **Mux** | `mux` |
| **OpenCode** | `opencode` | **OpenHands** | `openhands` |
| **Pi** | `pi` | **Qoder** | `qoder` |
| **Qwen Code** | `qwen-code` | **Zencoder** | `zencoder` |
| **Neovate** | `neovate` | **Pochi** | `pochi` |

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
      "type": "github",
      "repo": "antfu/skills",
      "path": "skills"
    }
  ]
}
```

## 🛠️ 开发

```bash
pnpm install    # 安装依赖
pnpm dev        # 监控并自动构建
pnpm build      # 生产构建
pnpm test       # 运行测试
```

## 📄 开源协议

基于 [MIT](./LICENSE) 协议开源。
