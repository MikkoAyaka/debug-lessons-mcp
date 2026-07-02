# debug-lessons-mcp

跨项目共享的踩坑案例 MCP 服务。所有本地 Claude Code 实例共享同一个 SQLite 数据库。

## 安装

```bash
cd ~/.claude/debug-lessons-mcp
npm install
npm run build
```

## Claude Code 配置

在 `~/.claude/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "node",
      "args": ["C:\\Users\\<your-user>\\.claude\\debug-lessons-mcp\\dist\\index.js"],
      "env": {
        "DB_PATH": "C:\\Users\\<your-user>\\.claude\\debug-lessons-mcp\\data\\debug-lessons.db"
      }
    }
  }
}
```

macOS / Linux:
```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "node",
      "args": ["~/.claude/debug-lessons-mcp/dist/index.js"],
      "env": {
        "DB_PATH": "~/.claude/debug-lessons-mcp/data/debug-lessons.db"
      }
    }
  }
}
```

## 数据迁移

从旧版 `debug-lessons.json` 导入：

```
migrate_from_json <json_路径> <项目标识> <模型标识>
```

示例：
```
migrate_from_json /path/to/docs/debug-lessons.json sparx claude-opus-4-8
```

## 工具列表

| 工具 | 说明 |
|------|------|
| `search_cases` | 全文搜索，当前项目案例加权 +50 优先 |
| `list_cases` | 按项目/分类/模型筛选，带分页 |
| `get_case` | 查看完整案例详情 |
| `add_case` | 新增案例（model_id 必填） |
| `update_case` | 编辑已有案例 |
| `delete_case` | 删除案例（需二次确认） |
| `get_stats` | 统计：总数、按模型/分类/项目分布、趋势 |
| `get_models` | 列出所有模型标识及案例数 |
| `migrate_from_json` | 从旧 JSON 批量导入 |

## 数据库位置

`~/.claude/debug-lessons-mcp/data/debug-lessons.db`

可通过 `DB_PATH` 环境变量自定义路径。
