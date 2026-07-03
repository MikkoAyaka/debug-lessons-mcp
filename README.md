# debug-lessons-mcp

跨项目共享的踩坑案例 MCP 服务。所有本地 Claude Code 实例共享同一个 SQLite 数据库，让你在任何项目中都能搜索和复用调试经验。

## 快速开始

```bash
npm install -g debug-lessons-mcp
debug-lessons-mcp setup
```

重启 Claude Code 后即可在任意项目中使用配套 slash commands。

## 配套指令

安装后，在 Claude Code 中直接输入以下指令：

| 指令 | 说明 | 用法示例 |
|------|------|----------|
| `/记录踩坑` | 引导式记录一条新的踩坑案例 | `/记录踩坑 Docker 构建时 gocache 写入失败` |
| `/搜索踩坑` | 全文搜索案例库，当前项目加权优先 | `/搜索踩坑 Docker 端口 冲突` |
| `/踩坑统计` | 查看统计：总数、模型/分类/项目分布、近 7/30 天趋势 | `/踩坑统计` |
| `/浏览踩坑` | 按项目、分类或模型筛选浏览 | `/浏览踩坑 sparx 项目的 Docker 案例` |

## 项目自动检测

添加案例时，服务端自动识别当前项目，无需手动指定 `project_id`。检测优先级：

1. 调用时显式传入的 `project_id`
2. `PROJECT_ID` 环境变量（最可靠，推荐在 `mcp.json` 中配置）
3. `CLAUDE_PROJECT_DIR` / `PWD` 环境变量（提取目录名）
4. fallback 为 `"unknown"`

如果需要为某个项目指定固定标识，在 `mcp.json` 中添加 `PROJECT_ID`：

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
# 更新到最新版本
npm update -g debug-lessons-mcp

# 卸载
npm uninstall -g debug-lessons-mcp
# 手动从 ~/.claude/mcp.json 中删除 "debug-lessons" 条目
# 手动删除 ~/.claude/skills/ 下的 记录踩坑.md 等 4 个文件
# 数据库文件 ~/.claude/debug-lessons-mcp/data/ 需手动删除（如需彻底清理）
```
