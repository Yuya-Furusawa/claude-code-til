#!/usr/bin/env node

/**
 * record-session.mjs
 *
 * Called from the SessionEnd hook to record session info to SQLite.
 * Receives the following JSON via stdin:
 * {
 *   "session_id": "abc123",
 *   "transcript_path": "/Users/.../.claude/projects/.../xxxx.jsonl",
 *   "cwd": "/Users/.../my-project",
 *   "hook_event_name": "SessionEnd",
 *   "reason": "user_exit"
 * }
 */

import { readFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

// better-sqlite3 is a native module, so resolve from scripts/node_modules
const require = createRequire(join(homedir(), '.claude', 'scripts', 'package.json'));
const Database = require('better-sqlite3');

try {
  const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));

  const DB_DIR = join(homedir(), '.claude', 'learnings');
  const DB_PATH = join(DB_DIR, 'sessions.db');

  mkdirSync(DB_DIR, { recursive: true });

  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      transcript_path TEXT NOT NULL,
      project_dir TEXT,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      summarized INTEGER DEFAULT 0
    )
  `);

  db.prepare(`
    INSERT OR IGNORE INTO sessions (session_id, transcript_path, project_dir, reason)
    VALUES (?, ?, ?, ?)
  `).run(
    input.session_id ?? 'unknown',
    input.transcript_path ?? '',
    input.cwd ?? '',
    input.reason ?? ''
  );

  db.close();
} catch (e) {
  // Exit silently so hook errors don't affect the session
  console.error(`[record-session] ${e.message}`);
  process.exit(0);
}
