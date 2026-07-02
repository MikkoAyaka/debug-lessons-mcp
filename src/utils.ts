import { getDb, listCases } from "./db.js";

/**
 * Detect the current project ID from available sources.
 * Priority:
 * 1. Explicit project_id parameter (handled in tool call)
 * 2. CLAUDE_PROJECT_DIR / PROJECT_DIR env var — extract dir name as project_id
 * 3. PWD / cwd path matching against known project_path values in DB
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

  // 2. Environment variables
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.env.PROJECT_DIR || process.env.PWD || "";
  if (projectDir) {
    // Extract the last directory name as project_id
    const normalized = projectDir.replace(/\\/g, "/");
    const dirName = normalized.split("/").filter(Boolean).pop() || normalized;
    return { project_id: dirName, project_path: normalized, source: "env" };
  }

  // 3. Fallback — no detection possible
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
