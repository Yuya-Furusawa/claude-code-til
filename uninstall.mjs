#!/usr/bin/env node

/**
 * Claude Code Daily Learnings - Uninstall Script
 *
 * Removes hooks, scripts, and commands from ~/.claude/
 * Does NOT remove the SQLite database or generated summaries.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';

const CLAUDE_DIR = join(homedir(), '.claude');

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('');
  console.log('🗑️  Claude Code Daily Learnings - Uninstall');
  console.log('============================================');
  console.log('');

  const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');
  const ok = skipConfirm || await confirm('アンインストールしますか？（SQLiteデータは保持されます）');
  if (!ok) {
    log('👋', 'キャンセルしました');
    process.exit(0);
  }

  // 1. settings.jsonからhookを削除
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.hooks?.SessionEnd) {
        settings.hooks.SessionEnd = settings.hooks.SessionEnd.filter(entry =>
          !entry.hooks?.some(h => h.command?.includes('record-session.mjs'))
        );
        if (settings.hooks.SessionEnd.length === 0) {
          delete settings.hooks.SessionEnd;
        }
        if (Object.keys(settings.hooks).length === 0) {
          delete settings.hooks;
        }
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
        log('⚙️', 'settings.jsonからhookを削除しました');
      }
    } catch (e) {
      log('⚠️', `settings.jsonの更新に失敗: ${e.message}`);
    }
  }

  // 2. スクリプトを削除
  const scripts = [
    'scripts/record-session.mjs',
    'scripts/extract-today.mjs',
    'scripts/daily-learnings.sh',
    'scripts/export-obsidian.mjs',
    'scripts/prompt.txt',
    'scripts/package.json',
  ];
  for (const file of scripts) {
    const path = join(CLAUDE_DIR, file);
    if (existsSync(path)) unlinkSync(path);
  }

  // node_modules を削除
  const nodeModulesPath = join(CLAUDE_DIR, 'scripts', 'node_modules');
  if (existsSync(nodeModulesPath)) {
    rmSync(nodeModulesPath, { recursive: true, force: true });
  }

  log('📄', 'スクリプトを削除しました');

  // 3. カスタムコマンドを削除
  const commandPath = join(CLAUDE_DIR, 'commands', 'til.md');
  if (existsSync(commandPath)) {
    unlinkSync(commandPath);
    log('⚡', 'カスタムコマンドを削除しました');
  }

  console.log('');
  log('✅', 'アンインストール完了');
  console.log('');
  console.log('  以下のデータは保持されています:');
  console.log(`  - SQLite: ~/.claude/learnings/sessions.db`);
  console.log(`  - サマリー: ~/.claude/learnings/*.md`);
  console.log('');
  console.log('  完全に削除するには:');
  console.log('  rm -rf ~/.claude/learnings');
  console.log('');
}

main();
