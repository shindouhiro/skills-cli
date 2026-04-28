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

**Skills CLI** is a skill management tool built for 30+ AI coding assistants. It lets you search, download, and install **Skills** instruction sets across different AI assistants (Cursor, Claude Code, Antigravity, etc.) with a single command, dramatically improving your AI pair-programming experience.

## ✨ Features

- 🚀 **One-click Install**: Install skills from GitHub or custom repositories instantly.
- 📦 **Multi-assistant Support**: Automatically detects and installs to 30+ mainstream AI assistants.
- 🔗 **Smart Sharing**: Uses symlinks by default — one copy shared across all assistants, saving space and staying in sync.
- 🔍 **Easy Search**: Searches [skills.sh](https://skills.sh/) by default, plus any configured GitHub sources.
- 🗑️ **Interactive Uninstall**: Run without arguments to enter multi-select mode — browse all installed skills and batch delete.
- 🔎 **Keyword Filtering**: Filter skills by keyword when uninstalling — via `--filter` flag or interactive input.
- 🛠️ **Highly Configurable**: Supports project-level and global `.skillsrc` configuration files.

## 🚀 Installation

Install globally with `pnpm` (recommended):

```bash
pnpm add -g @shindou/skills-cli
```

Or use `npm` / `yarn`:

```bash
npm install -g @shindou/skills-cli
# or
yarn global add @shindou/skills-cli
```

Once installed, use the `skills` command to get started.

## 💡 Quick Start

### 1. Search Skills
Search the public [skills.sh](https://skills.sh/) directory by default, along with configured GitHub sources:
```bash
skills search vue
skills s testing
skills search frontend-design
```

### 2. Install Skills
Install a skill to all detected assistants in the current project:
```bash
skills install vue-testing-best-practices
```

You can also install from a `skills.sh` page URL. The CLI resolves it to the matching GitHub repository and skill:
```bash
skills install https://skills.sh/anthropics/skills/frontend-design
```

Install to specific assistants (supports multiple):
```bash
skills i vue-testing -a antigravity,claude-code
```

Install to global (user-level) directory:
```bash
skills i vue-testing -g
```

Force interactive assistant selection (ignoring defaults from config):
```bash
skills i vue-testing -i
```

### 3. List Installed
```bash
skills list
skills ls -g
```

### 4. Uninstall Skills

Uninstall by name directly:
```bash
skills uninstall vue-testing-best-practices
```

Run without a name to enter interactive multi-select mode (browse all → filter → select → confirm):
```bash
skills rm
skills rm -g          # interactive uninstall for global skills
```

Filter by keyword before selecting:
```bash
skills rm --filter vue        # only show skills matching "vue"
skills rm -g -f testing       # filter "testing" in global skills
```

## 🛠️ Commands

| Command | Aliases | Description | Options |
| :--- | :--- | :--- | :--- |
| `search <keyword>` | `s` | Search available skills from skills.sh and configured sources | - |
| `install <name>` | `i`, `add` | Install a skill | `-a, --agent <agents>`: Target assistants (comma-separated)<br>`-g, --global`: Install to global directory<br>`-f, --force`: Force overwrite existing skill<br>`-l, --link`: Use symlink mode (recommended)<br>`-i, --interactive`: Force interactive selection |
| `list` | `ls` | List installed skills | `-g, --global`: List globally installed skills |
| `uninstall [name]` | `u`, `remove`, `rm`, `delete` | Uninstall skill (omit name for multi-select mode) | `-a, --agent <agents>`: Target assistants<br>`-g, --global`: Remove from global directory<br>`-f, --filter <keyword>`: Filter skills list by keyword |
| `init` | - | Initialize `.skillsrc` config file | `-g, --global`: Initialize global config |

## 📂 Supported AI Assistants (30+)

`skills-cli` automatically detects and supports the following assistants:

| Assistant | ID | Assistant | ID |
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

*...and more being added continuously.*

## ⚙️ Configuration (.skillsrc)

Create a config file with `skills init`.

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

`skills.sh` is the default search source. Even if your project-level or global `.skillsrc` customizes `sources`, the CLI automatically adds `skills.sh` so `skills search <keyword>` can search the public skill directory out of the box.

## 🛠️ Development

```bash
pnpm install    # Install dependencies
pnpm dev        # Watch and auto-build
pnpm build      # Production build
pnpm test       # Run tests
```

## 📄 License

Licensed under [MIT](./LICENSE).
