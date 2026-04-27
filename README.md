# skills-cli

> Search, download and install AI Agent Skills for 30+ coding assistants.

[![npm version](https://img.shields.io/npm/v/skills-cli?color=a1b858&label=)](https://www.npmjs.com/package/skills-cli)
[![CI](https://github.com/shindouhiro/skills-cli/actions/workflows/test.yml/badge.svg)](https://github.com/shindouhiro/skills-cli/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 简介

`skills-cli` 是一个跨平台的命令行工具，可以帮助你在 30+ AI 编码助手（如 Cursor、Copilot、Claude Code、Antigravity 等）中统一管理和分发 **Skills**（技能文件）。

Skills 是 AI 助手的指令文件，用于定制和增强 AI 的能力（例如代码审查规范、测试最佳实践等）。

## 安装

```bash
# 全局安装
npm install -g skills-cli
# 或
pnpm add -g skills-cli
```

## 快速开始

### 搜索 Skills

```bash
skills search vue
skills search testing
```

### 安装 Skill

安装到当前项目（默认使用 symlink 模式，节省磁盘空间）：

```bash
skills install vue-testing-best-practices
```

安装到指定助手：

```bash
skills install vue-testing-best-practices -a antigravity,claude-code
```

安装到全局（用户级）目录：

```bash
skills install vue-testing-best-practices -g
```

从 GitHub 仓库直接安装：

```bash
# 简写格式
skills install github:antfu/skills/vue-testing-best-practices

# 完整 URL
skills install https://github.com/antfu/skills/tree/main/skills/vue-testing-best-practices
```

强制覆盖已安装的 Skill：

```bash
skills install vue-testing-best-practices --force
```

### 列出已安装的 Skills

```bash
# 当前项目
skills list

# 全局
skills list -g
```

### 卸载 Skill

```bash
skills uninstall vue-testing-best-practices

# 指定助手
skills uninstall vue-testing-best-practices -a antigravity
```

### 初始化配置文件

```bash
# 项目级（生成 .skillsrc）
skills init

# 全局
skills init -g
```

## 配置

在项目根目录创建 `.skillsrc` 文件（JSON 格式）：

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

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultAgents` | `string[]` | `[]` | 默认安装到哪些助手，留空则每次交互选择 |
| `installMode` | `"copy" \| "link"` | `"link"` | 安装模式，见下方说明 |
| `scope` | `"project" \| "global"` | `"project"` | 安装范围 |
| `sources` | `SourceConfig[]` | antfu/skills | 数据源配置 |

## 安装模式

### link 模式（推荐，默认）

Skill 只下载一份到 `.skills/store/`，各助手目录通过 **符号链接（symlink）** 共享，节省磁盘空间。

```
.skills/store/vue-testing-best-practices/   ← 唯一真实副本
.agent/skills/vue-testing-best-practices    → symlink
.claude/skills/vue-testing-best-practices   → symlink
```

### copy 模式

将 Skill 完整复制到每个助手目录，助手之间互不影响。

```bash
# 单次使用 copy 模式
skills install vue-testing-best-practices --no-link
```

## 支持的 AI 助手

| 助手 | ID | 项目目录 |
|---|---|---|
| Antigravity | `antigravity` | `.agent/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/skills/` |
| GitHub Copilot | `github-copilot` | `.github/skills/` |
| Gemini CLI | `gemini-cli` | `.gemini/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` |
| Cline | `cline` | `.cline/skills/` |
| Continue | `continue` | `.continue/skills/` |
| Roo Code | `roo` | `.roo/skills/` |
| Codex | `codex` | `.codex/skills/` |
| … 共 30+ | — | — |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（自动重新构建）
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

## License

[MIT](./LICENSE)
