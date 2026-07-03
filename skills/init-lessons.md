---
name: init-lessons
description: 在新项目中初始化踩坑案例库接入。自动检测项目标识和当前模型，创建项目级 MCP 配置并安装配套 skills。Alias: /初始化踩坑
---

# Init Lessons / 初始化踩坑

为当前项目完成 MCP 接入初始化。每个新项目首次使用时调用一次。

## 流程

### 步骤 1：检测项目信息

- **项目标识** (project_id)：从当前工作目录名提取。例如 `/Users/xxx/my-app` → `my-app`
- **当前模型** (model_id)：从当前会话上下文获取（如 `claude-opus-4-8`、`deepseek-v4-pro`）。无法确定时询问用户

### 步骤 2：创建项目级 MCP 配置

在项目根目录创建 `.claude/mcp.json`。如已有则只更新 `debug-lessons` 条目：

```json
{
  "mcpServers": {
    "debug-lessons": {
      "command": "debug-lessons-mcp",
      "args": [],
      "env": {
        "PROJECT_ID": "<检测到的项目标识>",
        "DB_PATH": "~/.claude/debug-lessons-mcp/data/debug-lessons.db"
      }
    }
  }
}
```

### 步骤 3：安装配套 skills

将 4 个 skill 文件复制到 `.claude/skills/`：
`record-lesson.md`, `search-lessons.md`, `lesson-stats.md`, `browse-lessons.md`

来源：`~/.claude/skills/` → 复制到 `.claude/skills/`

### 步骤 4：验证并报告

- ✅ `.claude/mcp.json` 已配置（项目标识: xxx）
- ✅ 配套 skills 已安装
- 💡 输入 `/record-lesson` 开始使用

## 注意
- `.claude/` 应加入 `.gitignore`
- 不覆盖已有的其他 MCP 服务器配置
