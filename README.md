# debug-lessons-mcp

跨项目共享的踩坑案例 MCP 服务。所有本地 Claude Code 实例共享同一个 SQLite 数据库。

## 快速开始

```bash
npm install -g debug-lessons-mcp
debug-lessons-mcp setup
```

重启 Claude Code 后即可使用配套 slash commands。

## 配套指令

| 指令 | 说明 |
|------|------|
| `/记录踩坑` | 引导式记录一条新的踩坑案例 |
| `/搜索踩坑` | 在案例库中搜索类似问题 |
| `/踩坑统计` | 查看案例统计概览和趋势 |
| `/浏览踩坑` | 按项目/分类/模型浏览案例列表 |

## 手动配置

如果需要手动配置 Claude Code，在 `~/.claude/mcp.json` 中添加：

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

## CLI 命令

| 命令 | 说明 |
|------|------|
| `debug-lessons-mcp` | 启动 MCP Server（stdio 模式） |
| `debug-lessons-mcp setup` | 自动配置 mcp.json + 安装配套 skills |
| `debug-lessons-mcp install-skills` | 仅安装/更新配套 slash commands |

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

## 数据迁移

从旧版 `debug-lessons.json` 导入：

```
migrate_from_json <json_路径> <项目标识> <模型标识>
```

示例：
```
migrate_from_json /path/to/docs/debug-lessons.json sparx claude-opus-4-8
```

## 数据库位置

`~/.claude/debug-lessons-mcp/data/debug-lessons.db`

可通过 `DB_PATH` 环境变量自定义路径。

## 开发

```bash
git clone https://github.com/MikkoAyaka/debug-lessons-mcp.git
cd debug-lessons-mcp
npm install
npm run build
```

## 更新与卸载

```bash
# 更新
npm update -g debug-lessons-mcp

# 卸载
npm uninstall -g debug-lessons-mcp
# 手动删除 ~/.claude/mcp.json 中的 debug-lessons 条目
# 手动删除 ~/.claude/skills/ 中的 记录踩坑.md 等文件
```
