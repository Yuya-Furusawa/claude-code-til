#!/bin/bash
set -euo pipefail

INSTALL_DIR="$HOME/.claude-code-til"
REPO_URL="https://github.com/Yuya-Furusawa/claude-code-til/archive/refs/heads/main.tar.gz"

echo ""
echo "🚀 Claude Code TIL - Installer"
echo "======================================="
echo ""

# Node.js チェック
if ! command -v node &> /dev/null; then
  echo "❌ Node.js が見つかりません。先にインストールしてください。"
  exit 1
fi

# 既存のインストールを削除
if [ -d "$INSTALL_DIR" ]; then
  echo "📦 既存のインストールを更新します..."
  rm -rf "$INSTALL_DIR"
fi

# ダウンロード & 展開
echo "📥 ダウンロード中..."
mkdir -p "$INSTALL_DIR"
curl -fsSL "$REPO_URL" | tar xz -C "$INSTALL_DIR" --strip-components=1

# 依存パッケージのインストール
echo "📦 依存パッケージをインストール中..."
cd "$INSTALL_DIR"
npm install --production

# セットアップ実行
echo ""
node setup.mjs

echo ""
echo "💡 アンインストールするには:"
echo "   curl -fsSL https://raw.githubusercontent.com/Yuya-Furusawa/claude-code-til/main/uninstall.sh | bash"
echo ""
