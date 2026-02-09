#!/usr/bin/env node

/**
 * Claude Code Daily Learnings - Setup Script
 *
 * Installs hooks, scripts, and commands into ~/.claude/
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = join(homedir(), '.claude');

const DIRS = {
  scripts: join(CLAUDE_DIR, 'scripts'),
  commands: join(CLAUDE_DIR, 'commands'),
  learnings: join(CLAUDE_DIR, 'learnings'),
};

const SCRIPTS = [
  'scripts/record-session.mjs',
  'scripts/extract-today.mjs',
  'scripts/daily-learnings.sh',
  'scripts/export-obsidian.mjs',
  'prompt.txt',
];

const COMMANDS = [
  'commands/til.md',
];

// --- Helpers ---

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function ensureDirs() {
  for (const dir of Object.values(DIRS)) {
    mkdirSync(dir, { recursive: true });
  }
  log('📁', 'ディレクトリを作成しました');
}

function copyScripts() {
  for (const file of SCRIPTS) {
    const src = join(__dirname, file);
    // prompt.txt は scripts/ 内にコピー
    const destDir = file === 'prompt.txt' ? DIRS.scripts : CLAUDE_DIR;
    const dest = file === 'prompt.txt'
      ? join(DIRS.scripts, 'prompt.txt')
      : join(CLAUDE_DIR, file);

    mkdirSync(dirname(dest), { recursive: true });
    if (file === 'prompt.txt' && existsSync(dest)) {
      log('ℹ️', 'prompt.txt は既存のものを保持します');
      continue;
    }
    copyFileSync(src, dest);
  }
  log('📄', 'スクリプトをコピーしました');

  // シェルスクリプトに実行権限を付与
  const shPath = join(DIRS.scripts, 'daily-learnings.sh');
  execSync(`chmod +x "${shPath}"`);
  log('🔑', '実行権限を付与しました');
}

function copyCommands() {
  for (const file of COMMANDS) {
    const src = join(__dirname, file);
    const dest = join(CLAUDE_DIR, file);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  log('⚡', 'カスタムコマンドを配置しました');
}

function updateSettings() {
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      log('⚠️', '既存のsettings.jsonのパースに失敗。バックアップして新規作成します');
      copyFileSync(settingsPath, settingsPath + '.backup');
      settings = {};
    }
  }

  // hooks.SessionEnd を追加（既存を壊さない）
  if (!settings.hooks) {
    settings.hooks = {};
  }

  const hookCommand = `node ${join(DIRS.scripts, 'record-session.mjs')}`;
  const newHook = {
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: hookCommand,
      },
    ],
  };

  if (!settings.hooks.SessionEnd) {
    settings.hooks.SessionEnd = [newHook];
  } else {
    // 既にSessionEndがある場合、同じコマンドが無ければ追加
    const exists = settings.hooks.SessionEnd.some(entry =>
      entry.hooks?.some(h => h.command === hookCommand)
    );
    if (!exists) {
      settings.hooks.SessionEnd.push(newHook);
    } else {
      log('ℹ️', 'SessionEnd hookは既に設定済みです');
    }
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  log('⚙️', 'settings.jsonにhookを追加しました');
}

function resolveNodeModules() {
  // better-sqlite3 がグローバルにあるか確認し、なければ ~/.claude/scripts 用にインストール
  const nodeModulesDest = join(DIRS.scripts, 'node_modules');
  const pkgDest = join(DIRS.scripts, 'package.json');

  const pkg = {
    type: 'module',
    dependencies: {
      'better-sqlite3': '^11.0.0',
    },
  };

  writeFileSync(pkgDest, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  log('📦', 'better-sqlite3 をインストール中...');
  execSync('npm install --production', { cwd: DIRS.scripts, stdio: 'inherit' });
  log('✅', '依存パッケージをインストールしました');
}

// --- Main ---

console.log('');
console.log('🚀 Claude Code TIL - Setup');
console.log('=======================================');
console.log('');

ensureDirs();
copyScripts();
copyCommands();
updateSettings();
resolveNodeModules();

console.log('');
console.log('=======================================');
log('🎉', 'セットアップ完了！');
console.log('');
console.log('  使い方:');
console.log('  1. Claude Codeを普通に使う（自動的にセッションが記録されます）');
console.log('  2. 1日の終わりに Claude Code 内で /til を実行');
console.log('');
console.log('  Obsidian連携:');
console.log('  export OBSIDIAN_VAULT_PATH="$HOME/path/to/vault"');
console.log('');
console.log('  ⚠️  hookの反映にはClaude Codeの再起動が必要です');
console.log('');
