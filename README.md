# debug-lessons-mcp

A cross-project shared debugging case library (MCP server). All local Claude Code instances share one SQLite database — record once, search everywhere.

跨项目共享的踩坑案例库。一次记录，全局可查。

## Quick Start / 快速开始

```bash
npm install -g debug-lessons-mcp   # Step 1: install globally
debug-lessons-mcp setup            # Step 2: configure Claude Code + install skills
```

Restart Claude Code. Then in **each project**, run once:

```bash
cd /path/to/project
debug-lessons-mcp init             # Step 3: create .claude/mcp.json with PROJECT_ID
```

That's it. Use `/record-lesson` to record a case, `/search-lessons` to search.

---

## Slash Commands / 配套指令

| Command | Alias | Description |
|---------|-------|-------------|
| `/record-lesson` | `/记录踩坑` | Record a debugging case (auto-summarize, quick entry, or bulk file import) |
| `/search-lessons` | `/搜索踩坑` | Search cases by keywords; auto-triggers on errors |
| `/lesson-stats` | `/踩坑统计` | Statistics: by project, model, category, and recent trends |
| `/browse-lessons` | `/浏览踩坑` | Browse cases filtered by project, category, or model |

> **Ambient triggers:** `search-lessons` activates on build failures, exceptions, and Docker/DB errors. `record-lesson` suggests recording when bugs are fixed after multiple attempts.
>
> **Project setup:** use `debug-lessons-mcp init`, not a slash command. It's faster and deterministic.

---

## How Auto-Detection Works / 自动检测机制

| Field | Source |
|-------|--------|
| `project_id` | `PROJECT_ID` env var (set by `init` in `.claude/mcp.json`) → falls back to directory name from `PWD` |
| `model_id` | `ANTHROPIC_MODEL` env var (inherited from Claude Code subprocess) — strips `[1m]` suffix |

**Nothing to fill manually.** Both are auto-detected server-side.

---

## Configuration / 配置架构

### Global (`~/.claude.json`) — written by `setup`

```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "cmd",
      "args": ["/c", "debug-lessons-mcp"],
      "env": {
        "DB_PATH": "C:\\Users\\...\\.claude\\debug-lessons-mcp\\data\\debug-lessons.db"
      }
    }
  }
}
```

### Per-project (`.claude/mcp.json`) — written by `init`

```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "cmd",
      "args": ["/c", "debug-lessons-mcp"],
      "env": {
        "PROJECT_ID": "my-project"
      }
    }
  }
}
```

Project configs merge with the global one — only `PROJECT_ID` is overridden.

---

## CLI / 命令行

| Command | Purpose |
|---------|---------|
| `debug-lessons-mcp` | Start MCP server (stdio) |
| `debug-lessons-mcp setup` | **One-time:** write `~/.claude.json` + install skills + create data dir |
| `debug-lessons-mcp init [path]` | **Per-project:** create `.claude/mcp.json` with PROJECT_ID |
| `debug-lessons-mcp install-skills` | Refresh skills in `~/.claude/skills/` from current package |

---

## MCP Tools / 工具列表

| Tool | Description | Required |
|------|-------------|----------|
| `add_case` | Add a case (project_id & model_id auto-detected) | `category, problem, thinking, result, lesson` |
| `search_cases` | Full-text search, current project weighted +50 | `query` |
| `get_case` | View case details by ID | `id` |
| `list_cases` | List & filter by project/category/model | _(all optional)_ |
| `update_case` | Edit any field by ID | `id` |
| `delete_case` | Delete with `confirm: true` guard | `id, confirm` |
| `get_stats` | Totals, distributions, 7/30-day trends | _(all optional)_ |
| `get_models` | List all model IDs with case counts | _(none)_ |
| `migrate_from_json` | Bulk import from old JSON format | `json_path, project_id, model_id` |

---

## Data Model / 数据模型

Each case captures a complete debugging loop:

| Field | Meaning |
|-------|---------|
| `problem` | What happened? |
| `thinking` | How did you diagnose it? |
| `result` | How was it fixed? |
| `lesson` | Actionable take-away — the core field |
| `category` | e.g. `Docker/Build`, `Frontend`, `Database/Schema` |
| `model_id` | AI model in use (auto-detected) |
| `tags` | Comma-separated keywords |

---

## Upgrading / 更新

```bash
# Daily upgrade — this is usually enough
npm install -g debug-lessons-mcp@latest

# If release notes mention skill changes, refresh them
debug-lessons-mcp install-skills
```

> **Don't re-run `setup` or `init` on every update.** They're one-time operations. Only needed when explicitly noted in release notes.

---

## Uninstall / 卸载

```bash
npm uninstall -g debug-lessons-mcp
# Remove "debug-lessons" from ~/.claude.json → mcpServers
# Remove ~/.claude/skills/record-lesson etc.
# Remove ~/.claude/debug-lessons-mcp/data/ for the database (optional)
```

---

## Development / 开发

```bash
git clone https://github.com/MikkoAyaka/debug-lessons-mcp.git
cd debug-lessons-mcp
npm install
npm run build
```

## Data Migration / 数据迁移

From old `debug-lessons.json`:

```
migrate_from_json /path/to/docs/debug-lessons.json sparx claude-opus-4-8
```

Or via Node.js:

```js
import { migrateFromJson } from "debug-lessons-mcp";
const count = migrateFromJson("path/to/debug-lessons.json", "sparx", "claude-opus-4-8");
```

---

## Database / 数据库

- **Path:** `~/.claude/debug-lessons-mcp/data/debug-lessons.db`
- **Engine:** SQLite with WAL mode
- **Override:** set `DB_PATH` env var
- **Shared:** all local Claude Code instances share the same file
