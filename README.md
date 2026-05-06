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
- ⬆️ **本地上传**：把本地已安装的 skills 上传到你自己的 GitHub 或任意 Git 远端仓库。
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

### 2. 添加搜索/下载数据源
你可以手动把 GitHub 仓库或 skills.sh 地址加入 `.skillsrc`，后续 `search` 和按名称 `install` 都会使用这些数据源：
```bash
skills source add https://github.com/owner/repo/tree/main/skills
skills source add https://github.com/owner/repo -p skills
skills source add https://skills.sh -g    # 写入全局配置
```

### 3. 上传技能
你可以把本地安装的 skills 上传到自己的 GitHub 或其他 Git 远端仓库。

#### 交互式上传 (推荐)
如果不带参数直接运行 `upload`，CLI 会引导你完成整个流程：
1. **自动配置**：如果尚未配置上传目标，会提示输入 Git URL 并自动保存。
2. **来源选择**：让你选择从「项目级」还是「全局」扫描 skills。
3. **多选上传**：弹出支持搜索过滤的列表，勾选你想上传的 skills。

```bash
skills upload
```

#### 命令行指定
也可以通过参数直接指定要上传的内容或目标：
```bash
# 上传当前项目所有已安装的 skills
skills upload --all

# 上传指定的全局 skills 到特定目标
skills upload vue-testing-best-practices --target personal -g

# 仅查看上传计划 (不执行 push)
skills upload --dry-run
```

#### 管理上传目标
如果你想手动预先配置多个上传目标：
```bash
skills upload target add git@github.com:owner/skills.git --name personal -p skills
skills upload target add https://github.com/owner/skills.git --name work -g
```

### 4. 安装技能
安装指定技能时，默认会弹出支持输入过滤的助手多选；配置中的 `defaultAgents` 会作为预选项：
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

显式进入支持输入过滤的交互式选择目标助手：
```bash
skills i vue-testing -i
```

### 5. 查看已安装
```bash
skills list
skills ls -g
```

### 6. 卸载技能

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
| `source add <url>` | - | 手动添加搜索/下载数据源 URL | `-g, --global`: 写入全局配置<br>`-p, --path <path>`: GitHub 仓库内 skills 所在子目录 |
| `upload [names...]` | - | 上传本地 skills 到配置的 Git 远端 | `-a, --all`: 上传全部<br>`-t, --target <name>`: 上传目标名称<br>`-g, --global`: 上传全局 skills<br>`-d, --dry-run`: 仅展示计划<br>`-m, --message <message>`: 自定义提交信息 |
| `upload target add <url>` | - | 添加 Git 上传目标 | `-g, --global`: 写入全局配置<br>`-n, --name <name>`: 上传目标名称<br>`-p, --path <path>`: 目标仓库内 skills 子目录<br>`-b, --branch <branch>`: 目标分支 |
| `install <name>` | `i`, `add` | 安装指定的 skill | `-a, --agent [agents]`: 指定目标助手 (逗号分隔；不传值则弹选择)<br>`-g, --global`: 安装到全局用户目录<br>`-f, --force`: 强制覆盖已存在的 skill<br>`-l, --link`: 使用符号链接模式 (推荐)<br>`-i, --interactive`: 显式进入交互式选择模式 |
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
  ],
  "upload": {
    "defaultTarget": "personal",
    "targets": [
      {
        "name": "personal",
        "type": "git",
        "url": "git@github.com:owner/skills.git",
        "path": "skills"
      }
    ]
  }
}
```

`skills.sh` 是默认搜索源。即使你的项目级或全局 `.skillsrc` 自定义了 `sources`，CLI 也会自动补上 `skills.sh`，确保 `skills search <keyword>` 默认可以搜索公开 skill 目录。

`upload.targets` 使用 Git 远端 URL，鉴权由本机 Git 环境处理，例如 SSH key、Git credential helper 或 GitHub token HTTPS 凭据。`path` 省略时默认上传到目标仓库的 `skills` 目录；`branch` 可选，省略时使用远端默认分支。



## 📄 开源协议

基于 [MIT](./LICENSE) 协议开源。
