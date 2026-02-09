#!/usr/bin/env node

/**
 * extract-today.mjs
 *
 * Retrieves today's session transcript_paths from SQLite,
 * extracts user questions and Claude's responses from each JSONL file,
 * and outputs them to stdout.
 *
 * Usage:
 *   node extract-today.mjs           # Extract today's unsummarized sessions
 *   node extract-today.mjs --all     # Extract all of today's sessions (including summarized)
 *   node extract-today.mjs --date 2025-02-08  # Extract sessions for a specific date
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(join(homedir(), '.claude', 'scripts', 'package.json'));
const Database = require('better-sqlite3');

const DB_PATH = join(homedir(), '.claude', 'learnings', 'sessions.db');

if (!existsSync(DB_PATH)) {
  console.log('Database not found. No sessions have been recorded yet.');
  process.exit(0);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const includeAll = args.includes('--all');
const dateIndex = args.indexOf('--date');
const targetDate = dateIndex !== -1 ? args[dateIndex + 1] : null;

const db = new Database(DB_PATH, { readonly: true });

// Build query
let query = 'SELECT * FROM sessions WHERE ';
const params = [];

if (targetDate) {
  query += 'date(created_at) = ?';
  params.push(targetDate);
} else {
  query += "date(created_at) = date('now', 'localtime')";
}

if (!includeAll) {
  query += ' AND summarized = 0';
}

query += ' ORDER BY created_at ASC';

const sessions = db.prepare(query).all(...params);

if (sessions.length === 0) {
  console.log('No matching sessions found.');
  process.exit(0);
}

/**
 * Extract user and assistant interactions from a transcript JSONL file.
 *
 * NOTE: The Claude Code transcript format may vary between versions.
 * Adjust this function to match the actual JSONL structure.
 *
 * Expected JSONL line format:
 * {"type": "human", "content": "..."}
 * {"type": "assistant", "content": "..." | [...]}
 */
function extractConversation(transcriptPath) {
  if (!existsSync(transcriptPath)) {
    return [];
  }

  const lines = readFileSync(transcriptPath, 'utf-8')
    .split('\n')
    .filter(Boolean);

  const messages = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Filter by type
      if (entry.type !== 'user' && entry.type !== 'assistant') {
        continue;
      }

      const role = entry.type === 'user' ? 'User' : 'Claude';

      // Message body is stored in entry.message.content
      const rawContent = entry.message?.content ?? entry.content;

      let content = '';
      if (typeof rawContent === 'string') {
        content = rawContent;
      } else if (Array.isArray(rawContent)) {
        // When content is an array (array of text blocks)
        content = rawContent
          .map(block => {
            if (typeof block === 'string') return block;
            if (block.type === 'text') return block.text || '';
            if (block.type === 'tool_use') return `[Tool: ${block.name}]`;
            if (block.type === 'tool_result') return '';
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }

      // Skip empty messages or messages containing only tool_result
      if (!content || content.trim().length < 5) continue;

      // Truncate overly long responses (to save tokens during summary generation)
      const MAX_LENGTH = 2000;
      if (content.length > MAX_LENGTH) {
        content = content.slice(0, MAX_LENGTH) + '\n... (truncated)';
      }

      messages.push(`[${role}]: ${content}`);
    } catch {
      // Ignore parse errors
      continue;
    }
  }

  return messages;
}

// Output conversations from all sessions
let totalMessages = 0;

for (const session of sessions) {
  const messages = extractConversation(session.transcript_path);

  if (messages.length > 0) {
    console.log(`\n--- Session: ${session.project_dir} (${session.created_at}) ---`);
    console.log(messages.join('\n'));
    totalMessages += messages.length;
  }
}

if (totalMessages === 0) {
  console.log('No extractable messages found.');
}

db.close();
