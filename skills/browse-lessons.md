---
name: browse-lessons
description: 按项目、分类或模型浏览踩坑案例列表，支持分页。Alias: /浏览踩坑
argument-hint: "[filter: project/category/model]"
---

# Browse Lessons / 浏览踩坑

按条件浏览案例列表，适合不定向翻阅和学习。

## 流程

1. 解析筛选意图：
   - "Docker 相关的" → category: "Docker/Build"
   - "sparx 项目的" → project_id: "sparx"
   - "Claude Opus 的" → model_id: "claude-opus-4-8"
2. 调用 `list_cases` MCP tool，传入筛选参数，默认每页 20 条。
3. 展示列表：[id] 分类 | 项目 | 模型 | 问题摘要
4. 用户可输入编号查看详情 → 调用 `get_case`。
5. 结果多时提示缩小筛选范围。
