#!/usr/bin/env node

/**
 * export-obsidian.mjs
 *
 * 生成済みサマリーをObsidian Vaultにコピーする。
 *
 * Usage:
 *   node export-obsidian.mjs              # 今日のサマリー
 *   node export-obsidian.mjs 2025-02-08   # 特定日のサマリー
 *
 * 環境変数:
 *   OBSIDIAN_VAULT_PATH  Obsidian Vaultのパス（必須）
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;

if (!VAULT_PATH) {
  console.error('❌ OBSIDIAN_VAULT_PATH 環境変数が設定されていません。');
  console.error('   export OBSIDIAN_VAULT_PATH="$HOME/path/to/vault"');
  process.exit(1);
}

const date = process.argv[2] || new Date().toISOString().split('T')[0];
const summaryPath = join(homedir(), '.claude', 'learnings', `${date}.md`);

if (!existsSync(summaryPath)) {
  console.error(`❌ サマリーが見つかりません: ${summaryPath}`);
  process.exit(1);
}

const LEARNINGS_DIR = join(VAULT_PATH, 'Daily Learnings');
mkdirSync(LEARNINGS_DIR, { recursive: true });

const summary = readFileSync(summaryPath, 'utf-8');
const outputPath = join(LEARNINGS_DIR, `${date}.md`);
writeFileSync(outputPath, summary, 'utf-8');

console.log(`✅ Obsidianに出力しました: ${outputPath}`);
