#!/bin/bash
set -euo pipefail

INSTALL_DIR="$HOME/.claude-code-til"

echo ""
echo "🗑️  Claude Code TIL - Uninstaller"
echo "======================================="
echo ""

# Remove hooks and scripts
if [ -d "$INSTALL_DIR" ]; then
  cd "$INSTALL_DIR"
  node uninstall.mjs --yes 2>/dev/null || true
  cd "$HOME"
  rm -rf "$INSTALL_DIR"
  echo "✅ Uninstall complete"
else
  echo "ℹ️  Claude Code TIL is not installed"
fi

echo ""
echo "  The following data has been preserved:"
echo "  - SQLite: ~/.claude/learnings/sessions.db"
echo "  - Summaries: ~/.claude/learnings/*.md"
echo ""
echo "  To remove everything:"
echo "  rm -rf ~/.claude/learnings"
echo ""
