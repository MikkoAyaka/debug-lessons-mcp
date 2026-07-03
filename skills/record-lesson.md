---
name: record-lesson
description: 记录一条调试踩坑案例到共享知识库。引导式收集问题、排查思路、解决方案和教训总结。Alias: /记录踩坑
argument-hint: "[brief description of the issue]"
---

# Record Lesson / 记录踩坑

将当前调试经验记录到共享踩坑案例库。

## 流程

1. 如果用户提供了问题简述，以此作为起点。否则先问：「遇到了什么问题？」
2. 逐项收集信息。如果用户一次性描述了完整经历，直接提取并确认：
   - **问题描述** (problem) — 发生了什么？具体的错误信息或异常行为
   - **排查思路** (thinking) — 当时怎么分析的？试过哪些方法？
   - **解决方案** (result) — 最终怎么修好的？
   - **教训总结** (lesson) — 未来如何避免？要具体可操作
   - **分类** (category) — 从描述推断。常见：Docker/Build, Frontend, Backend/API, Database/Schema, Config/Env, CI/CD, Tooling, Testing, Performance, Security
   - **标签** (tags) — 可选，逗号分隔关键词
3. 确定模型信息：
   - **model_id** — 从当前会话上下文中获取。查找系统提示中 "You are powered by the model" 后的模型标识。例如看到 `deepseek-v4-pro` 就用 `deepseek-v4-pro`，看到 `claude-opus-4-8` 就用 `claude-opus-4-8`
   - **model_name** — 模型的显示名称。例如 `DeepSeek V4 Pro`、`Claude Opus 4.8`
4. 调用 `add_case` MCP tool 提交案例。project_id 由服务端自动检测，model_id 和 model_name 必须显式传入。
5. 显示保存结果（案例 ID 和摘要）。

## 注意
- 案例内容使用中文
- 教训要具体可操作，不要说「下次注意」
