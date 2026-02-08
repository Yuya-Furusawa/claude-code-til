#!/usr/bin/env node

/**
 * extract-today.mjs
 *
 * SQLiteから今日のセッションのtranscript_pathを取得し、
 * 各JSONLファイルからユーザーの質問とClaudeの回答を抽出してstdoutに出力する。
 *
 * Usage:
 *   node extract-today.mjs           # 今日の未サマリー分を抽出
 *   node extract-today.mjs --all     # 今日の全セッション（サマリー済み含む）
 *   node extract-today.mjs --date 2025-02-08  # 特定日を抽出
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(join(homedir(), '.claude', 'scripts', 'package.json'));
const Database = require('better-sqlite3');

const DB_PATH = join(homedir(), '.claude', 'learnings', 'sessions.db');

if (!existsSync(DB_PATH)) {
  console.log('データベースが見つかりません。まだセッションが記録されていません。');
  process.exit(0);
}

// CLI引数のパース
const args = process.argv.slice(2);
const includeAll = args.includes('--all');
const dateIndex = args.indexOf('--date');
const targetDate = dateIndex !== -1 ? args[dateIndex + 1] : null;

const db = new Database(DB_PATH, { readonly: true });

// クエリの組み立て
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
  console.log('対象のセッションはありません。');
  process.exit(0);
}

/**
 * transcriptのJSONLからユーザーとアシスタントのやり取りを抽出する。
 *
 * NOTE: Claude Codeのtranscriptフォーマットはバージョンによって異なる可能性があります。
 * 実際のJSONL構造に合わせてこの関数を調整してください。
 *
 * 想定されるJSONL行の形式:
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

      // type ベースのフィルタリング
      if (entry.type !== 'user' && entry.type !== 'assistant') {
        continue;
      }

      const role = entry.type === 'user' ? 'User' : 'Claude';

      // メッセージ本体は entry.message.content に格納されている
      const rawContent = entry.message?.content ?? entry.content;

      let content = '';
      if (typeof rawContent === 'string') {
        content = rawContent;
      } else if (Array.isArray(rawContent)) {
        // contentが配列の場合（text blockの配列）
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

      // 空のメッセージやtool_resultのみのメッセージはスキップ
      if (!content || content.trim().length < 5) continue;

      // 長すぎる回答はtruncate（サマリー生成時のトークン節約）
      const MAX_LENGTH = 2000;
      if (content.length > MAX_LENGTH) {
        content = content.slice(0, MAX_LENGTH) + '\n... (truncated)';
      }

      messages.push(`[${role}]: ${content}`);
    } catch {
      // パースエラーは無視
      continue;
    }
  }

  return messages;
}

// 全セッションの会話を出力
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
  console.log('抽出可能なメッセージがありませんでした。');
}

db.close();
