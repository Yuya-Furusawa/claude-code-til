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
  log('📁', 'Created directories');
}

function copyScripts() {
  for (const file of SCRIPTS) {
    const src = join(__dirname, file);
    // Copy prompt.txt into scripts/ directory
    const destDir = file === 'prompt.txt' ? DIRS.scripts : CLAUDE_DIR;
    const dest = file === 'prompt.txt'
      ? join(DIRS.scripts, 'prompt.txt')
      : join(CLAUDE_DIR, file);

    mkdirSync(dirname(dest), { recursive: true });
    if (file === 'prompt.txt' && existsSync(dest)) {
      log('ℹ️', 'Keeping existing prompt.txt');
      continue;
    }
    copyFileSync(src, dest);
  }
  log('📄', 'Copied scripts');

  // Grant execute permission to shell script
  const shPath = join(DIRS.scripts, 'daily-learnings.sh');
  execSync(`chmod +x "${shPath}"`);
  log('🔑', 'Granted execute permission');
}

function copyCommands() {
  for (const file of COMMANDS) {
    const src = join(__dirname, file);
    const dest = join(CLAUDE_DIR, file);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  log('⚡', 'Placed custom commands');
}

function detectObsidianVault() {
  const configPath = join(DIRS.scripts, 'config.json');

  // Don't overwrite existing config
  if (existsSync(configPath)) {
    log('ℹ️', 'Keeping existing config.json');
    return;
  }

  const obsidianJsonPath = join(
    homedir(),
    'Library',
    'Application Support',
    'obsidian',
    'obsidian.json',
  );

  if (!existsSync(obsidianJsonPath)) {
    log('ℹ️', 'Obsidian not found — skipping config.json');
    return;
  }

  try {
    const data = JSON.parse(readFileSync(obsidianJsonPath, 'utf-8'));
    const vaults = Object.values(data.vaults || {});
    if (vaults.length === 0) {
      log('ℹ️', 'No Obsidian vaults found — skipping config.json');
      return;
    }

    const vaultPath = vaults[0].path;
    if (vaults.length > 1) {
      log('ℹ️', `Multiple vaults found. Using: ${vaultPath}`);
    }

    const config = { obsidianVaultPath: vaultPath };
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    log('🔗', `Obsidian vault detected: ${vaultPath}`);
  } catch (e) {
    log('⚠️', `Failed to read obsidian.json: ${e.message}`);
  }
}

function updateSettings() {
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      log('⚠️', 'Failed to parse existing settings.json. Backing up and creating a new one');
      copyFileSync(settingsPath, settingsPath + '.backup');
      settings = {};
    }
  }

  // Add hooks.SessionEnd (without breaking existing config)
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
    // If SessionEnd already exists, add only if the same command is not present
    const exists = settings.hooks.SessionEnd.some(entry =>
      entry.hooks?.some(h => h.command === hookCommand)
    );
    if (!exists) {
      settings.hooks.SessionEnd.push(newHook);
    } else {
      log('ℹ️', 'SessionEnd hook is already configured');
    }
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  log('⚙️', 'Added hook to settings.json');
}

function resolveNodeModules() {
  // Install better-sqlite3 into ~/.claude/scripts if not available globally
  const nodeModulesDest = join(DIRS.scripts, 'node_modules');
  const pkgDest = join(DIRS.scripts, 'package.json');

  const pkg = {
    type: 'module',
    dependencies: {
      'better-sqlite3': '^11.0.0',
    },
  };

  writeFileSync(pkgDest, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  log('📦', 'Installing better-sqlite3...');
  execSync('npm install --production', { cwd: DIRS.scripts, stdio: 'inherit' });
  log('✅', 'Installed dependencies');
}

// --- Main ---

console.log('');
console.log('🚀 Claude Code TIL - Setup');
console.log('=======================================');
console.log('');

ensureDirs();
copyScripts();
copyCommands();
detectObsidianVault();
updateSettings();
resolveNodeModules();

console.log('');
console.log('=======================================');
log('🎉', 'Setup complete!');
console.log('');
console.log('  Usage:');
console.log('  1. Use Claude Code as usual (sessions are recorded automatically)');
console.log('  2. Run /til inside Claude Code at the end of the day');
console.log('');
console.log('  Obsidian integration:');
console.log('  Vault path is auto-detected. Edit ~/.claude/scripts/config.json to change.');
console.log('');
console.log('  ⚠️  Restart Claude Code for hook changes to take effect');
console.log('');
