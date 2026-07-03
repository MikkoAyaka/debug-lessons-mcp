# debug-lessons-mcp

跨项目共享的踩坑案例 MCP 服务。所有本地 Claude Code 实例共享同一个 SQLite 数据库，让你在任何项目中都能搜索和复用调试经验。

## 快速开始

```bash
npm install -g debug-lessons-mcp   # 步骤 1：全局安装
debug-lessons-mcp setup            # 步骤 2：全局配置（mcp.json + skills + 数据目录）
```

重启 Claude Code。然后在**每个项目**中执行一次：

```bash
cd 项目路径
debug-lessons-mcp init
```

这会自动创建 `.claude/mcp.json`（带正确的 `PROJECT_ID`）并安装配套 skills 到 `.claude/skills/`。

> 也可以指定路径：`debug-lessons-mcp init D:\AICraft`

## 配套指令

| 指令 | 别名 | 说明 | 用法示例 |
|------|------|------|----------|
| `/init-lessons` | `/init-lessons` | **新项目初始化**：自动配置项目级 mcp.json 并安装 skills | `/init-lessons` |
| `/record-lesson` | `/记录踩坑` | 引导式记录一条新的踩坑案例 | `/record-lesson Docker 构建失败` |
| `/search-lessons` | `/搜索踩坑` | 全文搜索案例库，当前项目加权优先 | `/search-lessons Docker 端口 冲突` |
| `/lesson-stats` | `/踩坑统计` | 查看统计：总数、模型/分类/项目分布、趋势 | `/lesson-stats` |
| `/browse-lessons` | `/浏览踩坑` | 按项目、分类或模型筛选浏览 | `/browse-lessons sparx Docker` |

> **为什么需要 `/init-lessons`？** 全局配置让 MCP Server 在所有项目中可用，但没有指定 `PROJECT_ID`。初始化步骤会在项目内创建 `.claude/mcp.json`，写入当前项目的标识和模型信息，确保记录案例时归属正确。同时将 skills 安装到 `.claude/skills/` 以启用指令补全。

## 两级配置机制

| 级别 | 文件 | 作用 |
|------|------|------|
| **全局** | `~/.claude/mcp.json` | 告诉 Claude Code 如何启动 MCP Server（所有项目共用，`setup` 命令自动写入） |
| **项目** | `.claude/mcp.json` | 覆盖 `PROJECT_ID` 和 `model_id`（`/init-lessons` 自动创建） |

项目级配置会与全局配置合并——只覆盖 `debug-lessons` 条目的 `env`，不影响其他 MCP 服务器。

## 项目自动检测

添加案例时 `project_id` 的检测优先级：

1. 调用时显式传入的 `project_id`
2. `PROJECT_ID` 环境变量（最可靠，推荐在 `mcp.json` 中配置）
3. `CLAUDE_PROJECT_DIR` / `PWD` 环境变量（提取目录名）
4. fallback 为 `"unknown"`

推荐使用 `/init-lessons` 自动完成项目级配置。如需手动控制：

**全局** `~/.claude/mcp.json`（`setup` 自动写入）：

```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "debug-lessons-mcp",
      "args": [],
      "env": {
        "DB_PATH": "~/.claude/debug-lessons-mcp/data/debug-lessons.db"
      }
    }
  }
}
```

**项目级** `.claude/mcp.json`（`/init-lessons` 自动创建、覆盖 PROJECT_ID）：

```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "debug-lessons-mcp",
      "args": [],
      "env": {
        "PROJECT_ID": "my-project",
        "DB_PATH": "~/.claude/debug-lessons-mcp/data/debug-lessons.db"
      }
    }
  }
}
```

## CLI 命令

| 命令 | 说明 |
|------|------|
| `debug-lessons-mcp` | 启动 MCP Server（stdio 模式），供 Claude Code 调用 |
| `debug-lessons-mcp setup` | 一键配置：自动写入 mcp.json + 安装配套 skills + 创建数据目录 |
| `debug-lessons-mcp install-skills` | 仅安装/更新配套 slash commands 到 `~/.claude/skills/` |

## 数据模型

每条案例记录一个完整的调试闭环：

| 字段 | 含义 |
|------|------|
| `problem` | 问题描述 — 发生了什么？ |
| `thinking` | 排查思路 — 当时怎么分析的？ |
| `result` | 解决方案 — 最终怎么修好的？ |
| `lesson` | 教训总结 — 未来如何避免？（核心字段，要求具体可操作） |
| `category` | 分类，如 `Docker/Build`、`Frontend`、`Database/Schema` |
| `model_id` | 记录时的 AI 模型标识，用于跨模型对比分析 |
| `tags` | 逗号分隔的标签，辅助搜索 |

## MCP 工具列表

| 工具 | 说明 | 必填参数 |
|------|------|----------|
| `search_cases` | 全文搜索，当前项目案例 +50 加权优先 | `query` |
| `list_cases` | 按项目/分类/模型筛选，支持分页 | （全部可选） |
| `get_case` | 查看一条案例的完整详情 | `id` |
| `add_case` | 新增案例，project_id 自动检测 | `model_id, category, problem, thinking, result, lesson` |
| `update_case` | 编辑已有案例的任意字段 | `id` |
| `delete_case` | 删除案例，需 `confirm: true` 二次确认 | `id, confirm` |
| `get_stats` | 统计概览：总数、分布、近 7/30 天趋势 | （全部可选） |
| `get_models` | 列出所有模型标识及对应案例数 | （无） |
| `migrate_from_json` | 从旧版 JSON 文件批量导入到 SQLite | `json_path, project_id, model_id` |

## 数据迁移

如果之前使用 JSON 文件记录踩坑案例，可以通过 MCP tool 导入到共享数据库：

```
migrate_from_json <json_路径> <项目标识> <模型标识>
```

示例：
```
migrate_from_json /path/to/docs/debug-lessons.json sparx claude-opus-4-8
```

也可以在 Node.js 中直接调用：

```js
import { migrateFromJson } from "debug-lessons-mcp";
const count = migrateFromJson(
  "C:/Users/xxx/Desktop/sparx/docs/debug-lessons.json",
  "sparx",
  "claude-opus-4-8"
);
console.log(`导入了 ${count} 条案例`);
```

## 数据库

- **默认路径**：`~/.claude/debug-lessons-mcp/data/debug-lessons.db`
- **引擎**：SQLite（WAL 模式，支持读写并发）
- **自定义路径**：设置 `DB_PATH` 环境变量
- **共享机制**：所有本地 Claude Code 实例共享同一数据库文件

## 开发

```bash
git clone https://github.com/MikkoAyaka/debug-lessons-mcp.git
cd debug-lessons-mcp
npm install
npm run build
```

## 更新与卸载

```bash
# 日常更新（通常这样就够了）
npm install -g debug-lessons-mcp@latest

# 如果 release notes 提到 skill 有变化，刷新全局 skills
debug-lessons-mcp install-skills

# 彻底卸载
npm uninstall -g debug-lessons-mcp
# 从 ~/.claude.json 的 mcpServers 中删除 "debug-lessons" 条目
# 删除 ~/.claude/skills/ 下的 record-lesson 等目录
# 数据库 ~/.claude/debug-lessons-mcp/data/ 手动删除（如需清理）
```

> **不用每次更新都跑 `setup` 和 `init`。** `setup` 是装机一次性操作，`init` 是项目一次性操作。日常只需 `npm install -g ...@latest` 更新二进制。skill 有变化时 release notes 会说明，此时跑一次 `install-skills` 即可。
