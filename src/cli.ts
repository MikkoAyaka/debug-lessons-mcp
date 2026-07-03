#!/usr/bin/env node
import { startServer } from "./index.js";
import {
  getHomeDir,
  getMcpConfigPath,
  getSkillsDir,
  getDefaultDataDir,
} from "./utils.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_VERSION = "1.0.0";

function printHelp() {
  console.log(`
debug-lessons-mcp — 跨项目共享的踩坑案例 MCP 服务

用法:
  debug-lessons-mcp [命令]

命令:
  (无参数)          启动 MCP Server (stdio 模式)，供 Claude Code 调用
  setup             自动配置 Claude Code（mcp.json + 安装配套 skills）
  install-skills    仅安装/更新配套 slash commands 到 ~/.claude/skills/
  --help, -h        显示此帮助
  --version, -v     显示版本号

示例:
  npm install -g debug-lessons-mcp   # 全局安装
  debug-lessons-mcp setup            # 一键配置
`);
}

function installSkills() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(__dirname, "..");
  const skillsSrc = path.join(pkgRoot, "skills");
  const skillsDest = getSkillsDir();

  if (!fs.existsSync(skillsSrc)) {
    throw new Error("skills source dir not found: " + skillsSrc);
  }

  fs.mkdirSync(skillsDest, { recursive: true });

  const installed = [];
  const entries = fs.readdirSync(skillsSrc);

  for (const entry of entries) {
    if (entry.endsWith(".md")) {
      const src = path.join(skillsSrc, entry);
      const dest = path.join(skillsDest, entry);
      fs.copyFileSync(src, dest);
      installed.push(entry);
    }
  }

  return { installed, targetDir: skillsDest };
}

function readMcpConfig() {
  const configPath = getMcpConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      return { config, existed: true };
    } catch {
      console.warn("Warning: failed to parse mcp.json, creating new config.");
      return { config: {}, existed: true };
    }
  }
  return { config: {}, existed: false };
}

function writeMcpConfig(config: { mcpServers?: Record<string, unknown> }) {
  const configPath = getMcpConfigPath();
  const claudeDir = path.dirname(configPath);
  fs.mkdirSync(claudeDir, { recursive: true });
  const content = JSON.stringify(config, null, 2) + "\n";
  fs.writeFileSync(configPath, content, "utf-8");
  return configPath;
}

function buildServerEntry() {
  const home = getHomeDir();
  const dbPath = path.join(home, ".claude", "debug-lessons-mcp", "data", "debug-lessons.db");
  return {
    command: "debug-lessons-mcp",
    args: [],
    env: { DB_PATH: dbPath },
  };
}

async function runSetup() {
  console.log("🔧 Configuring debug-lessons MCP service...\n");

  const { config, existed } = readMcpConfig();
  const serverEntry = buildServerEntry();

  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  config.mcpServers["debug-lessons"] = serverEntry;

  const configPath = writeMcpConfig(config);
  const action = existed ? "已更新" : "已创建";
  console.log(`✅ 全局 mcp.json ${action}（"debug-lessons" 条目）`);

  const dataDir = getDefaultDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`📊 数据库目录: ${dataDir}`);

  console.log("");
  await runInstallSkills();

  const dbPath = path.join(dataDir, "debug-lessons.db");
  console.log("");
  console.log("🎉 全局配置完成！");
  console.log("");
  console.log("   mcp.json: " + configPath);
  console.log("   数据库:   " + dbPath);
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 下一步：在每个项目中运行 /init-lessons（/初始化踩坑）");
  console.log("   这会创建项目级 .claude/mcp.json，");
  console.log("   自动配置 PROJECT_ID 并安装配套 skills。");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

async function runInstallSkills() {
  try {
    const { installed, targetDir } = installSkills();
    console.log("Skills installed (" + installed.length + " slash commands)");
    for (const name of installed) {
      const cmdName = name.replace(/\.md$/, "");
      console.log("  - /" + cmdName);
    }
    console.log("  Location: " + targetDir);
  } catch (err: any) {
    console.error("Skills install failed: " + err.message);
  }
}

const command = process.argv[2];

async function main() {
  switch (command) {
    case undefined:
    case "start":
      await startServer();
      break;
    case "setup":
      await runSetup();
      break;
    case "install-skills":
      await runInstallSkills();
      break;
    case "--version":
    case "-v":
      console.log("debug-lessons-mcp v" + PKG_VERSION);
      break;
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error("Unknown command: " + command);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
