#!/bin/bash
set -euo pipefail

#
# daily-learnings.sh
#
# 今日のClaude Codeセッションから「学んだこと」のサマリーを生成する。
# claude -p を使用するため、APIコストは発生しない（Claude Codeサブスク内）。
#
# Usage:
#   bash daily-learnings.sh              # 今日の未サマリー分
#   bash daily-learnings.sh --date 2025-02-08  # 特定日
#   bash daily-learnings.sh --all        # 今日の全セッション
#

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LEARNINGS_DIR="$HOME/.claude/learnings"
PROMPT_FILE="$SCRIPTS_DIR/prompt.txt"

# 引数をextract-today.mjsにそのまま渡す
EXTRACT_ARGS=("$@")

# 日付の決定
TODAY=$(date +%Y-%m-%d)
if [ ${#EXTRACT_ARGS[@]} -gt 0 ]; then
  if [ "${EXTRACT_ARGS[$i]}" = "--date" ] && [ $((i + 1)) -lt ${#EXTRACT_ARGS[@]} ]; then
    TODAY="${EXTRACT_ARGS[$((i + 1))]}"
    break
  fi
done

OUTPUT="$LEARNINGS_DIR/$TODAY.md"

mkdir -p "$LEARNINGS_DIR"

echo "📖 セッションを抽出中..."
EXTRACTED=$(node "$SCRIPTS_DIR/extract-today.mjs" ${EXTRACT_ARGS[@]+"${EXTRACT_ARGS[@]}"} 2>/dev/null || true)

if [ -z "$EXTRACTED" ] || echo "$EXTRACTED" | grep -q "セッションはありません" || echo "$EXTRACTED" | grep -q "データベースが見つかりません"; then
  echo "❌ 対象のセッションがありません。"
  exit 0
fi

# プロンプトの準備
if [ -f "$PROMPT_FILE" ]; then
  PROMPT=$(sed "s/{{DATE}}/$TODAY/g" "$PROMPT_FILE")
else
  PROMPT="以下のClaude Codeセッション記録から、今日新しく学んだことをMarkdown形式でまとめてください。日付: $TODAY"
fi

echo "🤖 サマリーを生成中..."
echo "$EXTRACTED" | claude -p "$PROMPT" --model claude-haiku-4-5-20251001 --output-format text > "$OUTPUT"

echo "✅ サマリーを保存しました: $OUTPUT"

# Obsidianに出力（環境変数が設定されている場合）
if [ -n "${OBSIDIAN_VAULT_PATH:-}" ]; then
  echo "📝 Obsidianに出力中..."
  node "$SCRIPTS_DIR/export-obsidian.mjs" "$TODAY"
fi

# summarizedフラグを更新
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
console.log('📊 ' + changes.count + ' セッションを処理済みに更新しました');
db.close();
"

echo ""
echo "📝 完了！ サマリー: $OUTPUT"
