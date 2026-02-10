#!/bin/bash
set -euo pipefail

#
# daily-learnings.sh
#
# Generates a "what I learned today" summary from today's Claude Code sessions.
# Uses claude -p, so no API cost is incurred (runs within Claude Code subscription).
#
# Usage:
#   bash daily-learnings.sh              # Today's unsummarized sessions
#   bash daily-learnings.sh --date 2025-02-08  # Specific date
#   bash daily-learnings.sh --all        # All of today's sessions
#

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LEARNINGS_DIR="$HOME/.claude/learnings"
PROMPT_FILE="$SCRIPTS_DIR/prompt.txt"

# Pass arguments through to extract-today.mjs
EXTRACT_ARGS=("$@")

# Determine the target date
TODAY=$(date +%Y-%m-%d)
if [ ${#EXTRACT_ARGS[@]} -gt 0 ]; then
  if [ "${EXTRACT_ARGS[$i]}" = "--date" ] && [ $((i + 1)) -lt ${#EXTRACT_ARGS[@]} ]; then
    TODAY="${EXTRACT_ARGS[$((i + 1))]}"
    break
  fi
done

OUTPUT="$LEARNINGS_DIR/$TODAY.md"

mkdir -p "$LEARNINGS_DIR"

echo "📖 Extracting sessions..."
EXTRACTED=$(node "$SCRIPTS_DIR/extract-today.mjs" ${EXTRACT_ARGS[@]+"${EXTRACT_ARGS[@]}"} 2>/dev/null || true)

if [ -z "$EXTRACTED" ] || echo "$EXTRACTED" | grep -q "No matching sessions" || echo "$EXTRACTED" | grep -q "Database not found"; then
  echo "❌ No matching sessions found."
  exit 0
fi

# Prepare the prompt
if [ -f "$PROMPT_FILE" ]; then
  PROMPT=$(sed "s/{{DATE}}/$TODAY/g" "$PROMPT_FILE")
else
  PROMPT="From the following Claude Code session transcripts, summarize what was newly learned today in Markdown format. Date: $TODAY"
fi

echo "🤖 Generating summary..."
echo "$EXTRACTED" | claude -p "$PROMPT" --model claude-haiku-4-5-20251001 --output-format text > "$OUTPUT"

echo "✅ Summary saved: $OUTPUT"

# Export to Obsidian (if configured via config.json or environment variable)
OBSIDIAN_CONFIGURED=false
if [ -n "${OBSIDIAN_VAULT_PATH:-}" ]; then
  OBSIDIAN_CONFIGURED=true
elif [ -f "$SCRIPTS_DIR/config.json" ]; then
  OBSIDIAN_PATH=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$SCRIPTS_DIR/config.json','utf-8'));if(c.obsidianVaultPath)console.log(c.obsidianVaultPath)}catch{}" 2>/dev/null)
  if [ -n "$OBSIDIAN_PATH" ]; then
    OBSIDIAN_CONFIGURED=true
  fi
fi

if [ "$OBSIDIAN_CONFIGURED" = true ]; then
  echo "📝 Exporting to Obsidian..."
  node "$SCRIPTS_DIR/export-obsidian.mjs" "$TODAY"
fi

# Update summarized flag
node -e "
import { homedir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(join(homedir(), '.claude', 'scripts', 'package.json'));
const Database = require('better-sqlite3');

const db = new Database(join(homedir(), '.claude', 'learnings', 'sessions.db'));
db.prepare(
  \"UPDATE sessions SET summarized = 1 WHERE date(created_at) = date(?) AND summarized = 0\"
).run('$TODAY');
const changes = db.prepare('SELECT changes() as count').get();
console.log('📊 Marked ' + changes.count + ' session(s) as summarized');
db.close();
"

echo ""
echo "📝 Done! Summary: $OUTPUT"
