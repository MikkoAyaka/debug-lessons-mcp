#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import {
  insertCase,
  getCaseById,
  updateCase,
  deleteCase,
  searchCases,
  listCases,
  getStats,
  getModels,
  migrateFromJson,
} from "./db.js";
import { detectCurrentProject, truncate } from "./utils.js";

// ---- Server Setup ----

const server = new Server(
  {
    name: "debug-lessons-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ---- Tool Definitions ----

const tools: Tool[] = [
  {
    name: "search_cases",
    description:
      "搜索踩坑案例。在 problem、thinking、result、lesson、tags、category 字段中全文搜索。当前项目的案例自动加权优先排在前面。返回匹配列表，包含 id、项目、模型、分类、问题摘要、教训。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词（支持多词，空格分隔）" },
        project_id: { type: "string", description: "项目标识（可选，不传则自动检测）" },
        limit: { type: "number", description: "返回数量上限（默认 10）" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_cases",
    description: "浏览踩坑案例列表。支持按项目、分类、模型筛选，带分页。",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "按项目筛选（可选）" },
        category: { type: "string", description: "按分类筛选（可选）" },
        model_id: { type: "string", description: "按模型筛选（可选）" },
        limit: { type: "number", description: "每页数量（默认 50）" },
        offset: { type: "number", description: "偏移量（默认 0）" },
      },
    },
  },
  {
    name: "get_case",
    description: "查看一个踩坑案例的完整详情。包含 problem、thinking、result、lesson 全部字段。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "案例 ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_case",
    description:
      "新增一条踩坑案例。project_id 不传则自动检测当前项目。model_id 必填，用于后续按模型统计。",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "项目标识（可选，不传则自动检测）" },
        model_id: { type: "string", description: "模型标识，如 claude-opus-4-8、deepseek-v4-pro" },
        model_name: { type: "string", description: "模型显示名称（可选）" },
        category: { type: "string", description: "分类，如 Docker/Build、Frontend、Database/Schema" },
        problem: { type: "string", description: "问题描述 — 发生了什么？" },
        thinking: { type: "string", description: "排查思路 — 当时怎么分析的？" },
        result: { type: "string", description: "解决方案 — 最终怎么修好的？" },
        lesson: { type: "string", description: "教训总结 — 未来如何避免？（可操作、可直接套用）" },
        tags: { type: "string", description: "逗号分隔的标签（可选）" },
      },
      required: ["model_id", "category", "problem", "thinking", "result", "lesson"],
    },
  },
  {
    name: "update_case",
    description: "编辑已有案例的任意字段。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "案例 ID" },
        project_id: { type: "string", description: "项目标识" },
        model_id: { type: "string", description: "模型标识" },
        model_name: { type: "string", description: "模型显示名称" },
        category: { type: "string", description: "分类" },
        problem: { type: "string", description: "问题描述" },
        thinking: { type: "string", description: "排查思路" },
        result: { type: "string", description: "解决方案" },
        lesson: { type: "string", description: "教训总结" },
        tags: { type: "string", description: "标签" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_case",
    description: "删除一条踩坑案例。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "案例 ID" },
        confirm: { type: "boolean", description: "确认删除（必须为 true）" },
      },
      required: ["id", "confirm"],
    },
  },
  {
    name: "get_stats",
    description:
      "获取踩坑案例的统计概览：总数、按模型分布、按分类分布、按项目分布、近7/30天新增趋势。用于分析模型间差异和案例积累趋势。",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "限定项目（可选，不传=全局统计）" },
      },
    },
  },
  {
    name: "get_models",
    description:
      "列出所有出现过的模型标识及案例数量。用于了解哪些模型被记录过踩坑案例，以及后续做模型间对比分析。",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "migrate_from_json",
    description:
      "从旧版 debug-lessons.json 文件批量导入案例到 SQLite 数据库。适合首次从项目内 JSON 迁移到共享 MCP 服务。",
    inputSchema: {
      type: "object",
      properties: {
        json_path: { type: "string", description: "debug-lessons.json 文件的绝对路径" },
        project_id: { type: "string", description: "导入后归属的项目标识" },
        model_id: { type: "string", description: "导入案例的模型标识（可后续单独修正）" },
      },
      required: ["json_path", "project_id", "model_id"],
    },
  },
];

// ---- Tool Handler ----

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_cases": {
        const query = (args as any).query as string;
        const project = detectCurrentProject((args as any).project_id);
        const limit = (args as any).limit || 10;
        const results = searchCases(query, project.project_id || undefined, limit);

        if (results.length === 0) {
          return { content: [{ type: "text", text: "未找到匹配的案例。" }] };
        }

        const lines = results.map((r, i) => {
          const badge = r.is_current_project ? "📌" : "  ";
          return [
            `[${r.id}] ${badge} ${r.category}  │  模型: ${r.model_id}  │  项目: ${r.project_id}`,
            `    问题: ${truncate(r.problem, 120)}`,
            `    教训: ${truncate(r.lesson, 120)}`,
            "",
          ].join("\n");
        });

        return {
          content: [
            {
              type: "text",
              text: `找到 ${results.length} 条匹配案例（📌 = 当前项目）：\n\n${lines.join("\n")}`,
            },
          ],
        };
      }

      case "list_cases": {
        const rows = listCases({
          project_id: (args as any).project_id,
          category: (args as any).category,
          model_id: (args as any).model_id,
          limit: (args as any).limit || 50,
          offset: (args as any).offset || 0,
        });

        if (rows.length === 0) {
          return { content: [{ type: "text", text: "没有找到案例。" }] };
        }

        const lines = rows.map(
          (r) =>
            `[${r.id}] ${r.category}  │  项目: ${r.project_id}  │  模型: ${r.model_id}  │  ${truncate(r.problem, 80)}`
        );

        return {
          content: [{ type: "text", text: `共 ${rows.length} 条案例：\n\n${lines.join("\n")}` }],
        };
      }

      case "get_case": {
        const id = (args as any).id as number;
        const c = getCaseById(id);
        if (!c) {
          return { content: [{ type: "text", text: `案例 #${id} 不存在。` }] };
        }

        const text = [
          `══════ 案例 #${c.id} ══════`,
          `项目:     ${c.project_id}`,
          `模型:     ${c.model_id}${c.model_name ? ` (${c.model_name})` : ""}`,
          `分类:     ${c.category}`,
          `标签:     ${c.tags || "（无）"}`,
          `创建:     ${c.created_at}`,
          `更新:     ${c.updated_at}`,
          ``,
          `━━━ 问题 ━━━`,
          c.problem,
          ``,
          `━━━ 排查思路 ━━━`,
          c.thinking,
          ``,
          `━━━ 解决方案 ━━━`,
          c.result,
          ``,
          `━━━ 教训总结 ━━━`,
          c.lesson,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      }

      case "add_case": {
        const project = detectCurrentProject((args as any).project_id);
        const input = args as any;
        const id = insertCase({
          project_id: project.project_id || input.project_id || "unknown",
          project_path: project.project_path || "",
          model_id: input.model_id,
          model_name: input.model_name || "",
          category: input.category,
          problem: input.problem,
          thinking: input.thinking,
          result: input.result,
          lesson: input.lesson,
          tags: input.tags || "",
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ 案例已添加，ID: ${id}\n项目: ${project.project_id || input.project_id || "unknown"}\n模型: ${input.model_id}\n分类: ${input.category}`,
            },
          ],
        };
      }

      case "update_case": {
        const id = (args as any).id as number;
        const input = args as any;
        const { id: _id, ...fields } = input as Record<string, unknown>;
        const ok = updateCase(id, fields);
        if (!ok) {
          return { content: [{ type: "text", text: `案例 #${id} 不存在。` }] };
        }
        return { content: [{ type: "text", text: `✅ 案例 #${id} 已更新。` }] };
      }

      case "delete_case": {
        const id = (args as any).id as number;
        const confirm = (args as any).confirm as boolean;
        if (!confirm) {
          return {
            content: [{ type: "text", text: "删除操作需要 confirm: true 确认。请重新调用并设置 confirm 为 true。" }],
          };
        }
        const ok = deleteCase(id);
        if (!ok) {
          return { content: [{ type: "text", text: `案例 #${id} 不存在。` }] };
        }
        return { content: [{ type: "text", text: `🗑️ 案例 #${id} 已删除。` }] };
      }

      case "get_stats": {
        const project_id = (args as any).project_id as string | undefined;
        const stats = getStats(project_id);

        const text = [
          `══════ 踩坑案例统计 ${project_id ? `(${project_id})` : "(全局)"} ══════`,
          ``,
          `总计: ${stats.total} 条`,
          `近 7 天新增: ${stats.recent_7d} 条`,
          `近 30 天新增: ${stats.recent_30d} 条`,
          ``,
          `━━━ 按项目分布 ━━━`,
          ...Object.entries(stats.by_project).map(([k, v]) => `  ${k}: ${v}`),
          ``,
          `━━━ 按模型分布 ━━━`,
          ...Object.entries(stats.by_model).map(([k, v]) => `  ${k}: ${v}`),
          ``,
          `━━━ 按分类分布 ━━━`,
          ...Object.entries(stats.by_category).map(([k, v]) => `  ${k}: ${v}`),
        ].join("\n");

        return { content: [{ type: "text", text }] };
      }

      case "get_models": {
        const models = getModels();
        if (models.length === 0) {
          return { content: [{ type: "text", text: "暂无任何模型记录。" }] };
        }

        const lines = models.map(
          (m) => `  ${m.model_id}${m.model_name ? ` (${m.model_name})` : ""} — ${m.count} 条案例`
        );

        return {
          content: [
            {
              type: "text",
              text: `已记录的模型（共 ${models.length} 种）：\n\n${lines.join("\n")}`,
            },
          ],
        };
      }

      case "migrate_from_json": {
        const jsonPath = (args as any).json_path as string;
        const projectId = (args as any).project_id as string;
        const modelId = (args as any).model_id as string;
        const count = migrateFromJson(jsonPath, projectId, modelId);

        return {
          content: [
            {
              type: "text",
              text: `✅ 迁移完成：从 ${jsonPath} 导入了 ${count} 条案例。\n项目: ${projectId}\n模型: ${modelId}\n\n提示：后续可通过 update_case 逐一修正每条案例的 model_id。`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `未知工具: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `错误: ${error.message}` }],
      isError: true,
    };
  }
});

// ---- Start ----

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Debug Lessons MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
