---
name: search-lessons
description: 在共享踩坑案例库中全文搜索类似问题。当前项目案例自动加权优先。Alias: /搜索踩坑
argument-hint: "[search keywords]"
---

# Search Lessons / 搜索踩坑

在踩坑案例库中搜索相关经验。

## 流程

1. 如果用户提供了关键词，直接使用。否则询问搜索内容。
2. 调用 `search_cases` MCP tool：
   - query: 关键词（多词空格分隔）
   - 不传 project_id（自动检测当前项目，+50 加权优先）
   - limit: 默认 10
3. 展示搜索结果：[id] 📌标记 项目 | 模型 | 分类 | 问题摘要 | 教训摘要
4. 用户可输入编号查看详情 → 调用 `get_case` 展示完整内容。

## 搜索技巧
- 多个简短关键词比长句子效果好（如 "Docker 端口 冲突"）
- 当前项目案例标记 📌 并排在前面
