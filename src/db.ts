import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
  }
  // Default: data/debug-lessons.db relative to project root
  const root = path.resolve(__dirname, "..");
  const dataDir = path.join(root, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "debug-lessons.db");
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      project_path TEXT NOT NULL DEFAULT '',
      model_id TEXT NOT NULL,
      category TEXT NOT NULL,
      problem TEXT NOT NULL,
      thinking TEXT NOT NULL DEFAULT '',
      result TEXT NOT NULL DEFAULT '',
      lesson TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cases_project ON cases(project_id);
    CREATE INDEX IF NOT EXISTS idx_cases_model ON cases(model_id);
    CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
    CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at);
    CREATE INDEX IF NOT EXISTS idx_cases_tags ON cases(tags);
  `);

  // Migrate: drop model_name column if left over from v1.x
  const cols = db.pragma("table_info(cases)") as { name: string }[];
  if (cols.some((c) => c.name === "model_name")) {
    db.exec("ALTER TABLE cases DROP COLUMN model_name");
  }
}

// ---- Types ----

export interface DebugCase {
  id: number;
  project_id: string;
  project_path: string;
  model_id: string;
  category: string;
  problem: string;
  thinking: string;
  result: string;
  lesson: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface CaseInput {
  project_id?: string;
  project_path?: string;
  model_id?: string;
  category: string;
  problem: string;
  thinking: string;
  result: string;
  lesson: string;
  tags?: string;
}

export interface SearchResult {
  id: number;
  project_id: string;
  model_id: string;
  category: string;
  problem: string;
  lesson: string;
  tags: string;
  score: number;
  is_current_project: boolean;
}

export interface StatsResult {
  total: number;
  by_project: Record<string, number>;
  by_model: Record<string, number>;
  by_category: Record<string, number>;
  recent_30d: number;
  recent_7d: number;
}

// ---- CRUD ----

export function insertCase(input: CaseInput): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO cases (project_id, project_path, model_id, category, problem, thinking, result, lesson, tags)
    VALUES (@project_id, @project_path, @model_id, @category, @problem, @thinking, @result, @lesson, @tags)
  `);
  const result = stmt.run({
    project_id: input.project_id || "unknown",
    project_path: input.project_path || "",
    model_id: input.model_id || "unknown",
    category: input.category,
    problem: input.problem,
    thinking: input.thinking,
    result: input.result,
    lesson: input.lesson,
    tags: input.tags || "",
  });
  return Number(result.lastInsertRowid);
}

export function getCaseById(id: number): DebugCase | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as DebugCase | undefined;
}

export function updateCase(id: number, fields: Partial<CaseInput>): boolean {
  const db = getDb();
  const existing = getCaseById(id);
  if (!existing) return false;

  const updates: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = @${key}`);
      params[key] = value;
    }
  }

  if (updates.length === 0) return false;

  updates.push("updated_at = datetime('now')");
  db.prepare(`UPDATE cases SET ${updates.join(", ")} WHERE id = @id`).run(params);
  return true;
}

export function deleteCase(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM cases WHERE id = ?").run(id);
  return result.changes > 0;
}

// ---- Search ----

export function searchCases(query: string, currentProjectId?: string, limit = 10): SearchResult[] {
  const db = getDb();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Build a LIKE-based search across all text fields
  const conditions = tokens
    .map(() => `(LOWER(problem || ' ' || thinking || ' ' || result || ' ' || lesson || ' ' || tags || ' ' || category) LIKE ?)`)
    .join(" AND ");

  const likeParams = tokens.map((t) => `%${t}%`);

  const rows = db
    .prepare(
      `SELECT id, project_id, model_id, category, problem, lesson, tags FROM cases WHERE ${conditions}`
    )
    .all(...likeParams) as DebugCase[];

  // Score: each token match = 10 pts, exact phrase match = 20 pts, current project = 50 pts
  const results: SearchResult[] = rows.map((row) => {
    const text = `${row.problem} ${row.thinking} ${row.result} ${row.lesson} ${row.tags} ${row.category}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (text.includes(t)) score += 10;
    }
    if (text.includes(query.toLowerCase())) score += 20;
    if (currentProjectId && row.project_id === currentProjectId) score += 50;
    return {
      id: row.id,
      project_id: row.project_id,
      model_id: row.model_id,
      category: row.category,
      problem: row.problem,
      lesson: row.lesson,
      tags: row.tags,
      score,
      is_current_project: currentProjectId ? row.project_id === currentProjectId : false,
    };
  });

  // Sort by score descending, then by id descending (newer first)
  results.sort((a, b) => b.score - a.score || b.id - a.id);
  return results.slice(0, limit);
}

// ---- List ----

export function listCases(options: {
  project_id?: string;
  category?: string;
  model_id?: string;
  limit?: number;
  offset?: number;
}): DebugCase[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (options.project_id) {
    conditions.push("project_id = @project_id");
    params.project_id = options.project_id;
  }
  if (options.category) {
    conditions.push("category = @category");
    params.category = options.category;
  }
  if (options.model_id) {
    conditions.push("model_id = @model_id");
    params.model_id = options.model_id;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  return db
    .prepare(`SELECT * FROM cases ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as DebugCase[];
}

// ---- Stats ----

export function getStats(project_id?: string): StatsResult {
  const db = getDb();
  const whereProject = project_id ? "WHERE project_id = ?" : "";
  const params = project_id ? [project_id] : [];

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM cases ${whereProject}`).get(...params) as { count: number }
  ).count;

  const byProject = db
    .prepare(
      `SELECT project_id, COUNT(*) as count FROM cases ${whereProject} GROUP BY project_id ORDER BY count DESC`
    )
    .all(...params) as { project_id: string; count: number }[];

  const byModel = db
    .prepare(
      `SELECT model_id, COUNT(*) as count FROM cases ${whereProject} GROUP BY model_id ORDER BY count DESC`
    )
    .all(...params) as { model_id: string; count: number }[];

  const byCategory = db
    .prepare(
      `SELECT category, COUNT(*) as count FROM cases ${whereProject} GROUP BY category ORDER BY count DESC`
    )
    .all(...params) as { category: string; count: number }[];

  const recent30d = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM cases ${whereProject} ${project_id ? "AND" : "WHERE"} created_at >= datetime('now', '-30 days')`
      )
      .get(...params) as { count: number }
  ).count;

  const recent7d = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM cases ${whereProject} ${project_id ? "AND" : "WHERE"} created_at >= datetime('now', '-7 days')`
      )
      .get(...params) as { count: number }
  ).count;

  return {
    total,
    by_project: Object.fromEntries(byProject.map((r) => [r.project_id, r.count])),
    by_model: Object.fromEntries(byModel.map((r) => [r.model_id, r.count])),
    by_category: Object.fromEntries(byCategory.map((r) => [r.category, r.count])),
    recent_30d: recent30d,
    recent_7d: recent7d,
  };
}

export function getModels(): { model_id: string; count: number }[] {
  const db = getDb();
  return db
    .prepare("SELECT model_id, COUNT(*) as count FROM cases GROUP BY model_id ORDER BY count DESC")
    .all() as { model_id: string; count: number }[];
}

// ---- Migration ----

export interface JsonCase {
  category: string;
  problem: string;
  thinking: string;
  result: string;
  lesson: string;
}

export function migrateFromJson(jsonPath: string, projectId: string, modelId: string): number {
  const content = fs.readFileSync(jsonPath, "utf-8");
  const cases: JsonCase[] = JSON.parse(content);

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO cases (project_id, project_path, model_id, category, problem, thinking, result, lesson)
    VALUES (@project_id, @project_path, @model_id, @category, @problem, @thinking, @result, @lesson)
  `);

  const insertMany = db.transaction((items: JsonCase[]) => {
    let count = 0;
    for (const item of items) {
      stmt.run({
        project_id: projectId,
        project_path: "",
        model_id: modelId,
        category: item.category,
        problem: item.problem,
        thinking: item.thinking,
        result: item.result,
        lesson: item.lesson,
      });
      count++;
    }
    return count;
  });

  return insertMany(cases);
}
