import { getDb, listCases } from "./db.js";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Get the user's home directory in a cross-platform way.
 */
export function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

/**
 * Resolve a path that may start with ~ to an absolute path.
 */
export function resolveHome(filepath: string): string {
  if (filepath.startsWith("~")) {
    return path.join(getHomeDir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Get the Claude Code config directory (~/.claude).
 */
export function getClaudeDir(): string {
  return path.join(getHomeDir(), ".claude");
}

/**
 * Get the path to mcp.json.
 */
export function getMcpConfigPath(): string {
  return path.join(getClaudeDir(), "mcp.json");
}

/**
 * Get the path to the Claude Code skills directory.
 */
export function getSkillsDir(): string {
  return path.join(getClaudeDir(), "skills");
}

/**
 * Get the default data directory for the shared database.
 */
export function getDefaultDataDir(): string {
  return path.join(getClaudeDir(), "debug-lessons-mcp", "data");
}

/**
 * Detect the current project ID from available sources.
 * Priority:
 * 1. Explicit project_id parameter (handled in tool call)
 * 2. PROJECT_ID env var — direct project identifier (most reliable)
 * 3. CLAUDE_PROJECT_DIR / PROJECT_DIR env var — extract dir name as project_id
 * 4. PWD / cwd path matching
 */
export function detectCurrentProject(explicitProjectId?: string): {
  project_id: string;
  project_path: string;
  source: "explicit" | "env" | "db_match" | "fallback";
} {
  // 1. Explicit parameter
  if (explicitProjectId) {
    return { project_id: explicitProjectId, project_path: "", source: "explicit" };
  }

  // 2. Direct PROJECT_ID env var
  if (process.env.PROJECT_ID) {
    return { project_id: process.env.PROJECT_ID, project_path: process.env.CLAUDE_PROJECT_DIR || "", source: "env" };
  }

  // 3. Path-based env vars — extract dir name as project_id
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.env.PWD || "";
  if (projectDir) {
    const normalized = projectDir.replace(/\\/g, "/");
    const dirName = normalized.split("/").filter(Boolean).pop() || normalized;
    return { project_id: dirName, project_path: normalized, source: "env" };
  }

  // 4. Fallback — no detection possible
  return { project_id: "", project_path: "", source: "fallback" };
}

/**
 * Truncate a string to n characters, adding "..." if truncated.
 */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "...";
}

/**
 * List known projects from the database.
 */
export function listKnownProjects(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT project_id FROM cases ORDER BY project_id")
    .all() as { project_id: string }[];
  return rows.map((r) => r.project_id);
}
