#!/bin/bash
set -euo pipefail

INSTALL_DIR="$HOME/.claude-code-til"

echo ""
echo "🗑️  Claude Code TIL - Uninstaller"
echo "======================================="
echo ""

# hookとスクリプトの削除
if [ -d "$INSTALL_DIR" ]; then
  cd "$INSTALL_DIR"
  node uninstall.mjs --yes 2>/dev/null || true
  cd "$HOME"
  rm -rf "$INSTALL_DIR"
  echo "✅ アンインストール完了"
else
  echo "ℹ️  Claude Code TIL はインストールされていません"
fi

echo ""
echo "  以下のデータは保持されています:"
echo "  - SQLite: ~/.claude/learnings/sessions.db"
echo "  - サマリー: ~/.claude/learnings/*.md"
echo ""
echo "  完全に削除するには:"
echo "  rm -rf ~/.claude/learnings"
echo ""
