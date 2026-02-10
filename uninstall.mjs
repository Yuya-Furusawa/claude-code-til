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
  const ok = skipConfirm || await confirm('Uninstall? (SQLite data will be preserved)');
  if (!ok) {
    log('👋', 'Cancelled');
    process.exit(0);
  }

  // 1. Remove hook from settings.json
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
        log('⚙️', 'Removed hook from settings.json');
      }
    } catch (e) {
      log('⚠️', `Failed to update settings.json: ${e.message}`);
    }
  }

  // 2. Remove scripts
  const scripts = [
    'scripts/record-session.mjs',
    'scripts/extract-today.mjs',
    'scripts/daily-learnings.sh',
    'scripts/export-obsidian.mjs',
    'scripts/config.json',
    'scripts/prompt.txt',
    'scripts/package.json',
  ];
  for (const file of scripts) {
    const path = join(CLAUDE_DIR, file);
    if (existsSync(path)) unlinkSync(path);
  }

  // Remove node_modules
  const nodeModulesPath = join(CLAUDE_DIR, 'scripts', 'node_modules');
  if (existsSync(nodeModulesPath)) {
    rmSync(nodeModulesPath, { recursive: true, force: true });
  }

  log('📄', 'Removed scripts');

  // 3. Remove custom commands
  const commandPath = join(CLAUDE_DIR, 'commands', 'til.md');
  if (existsSync(commandPath)) {
    unlinkSync(commandPath);
    log('⚡', 'Removed custom commands');
  }

  console.log('');
  log('✅', 'Uninstall complete');
  console.log('');
  console.log('  The following data has been preserved:');
  console.log(`  - SQLite: ~/.claude/learnings/sessions.db`);
  console.log(`  - Summaries: ~/.claude/learnings/*.md`);
  console.log('');
  console.log('  To remove everything:');
  console.log('  rm -rf ~/.claude/learnings');
  console.log('');
}

main();
