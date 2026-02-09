#!/bin/bash
set -euo pipefail

INSTALL_DIR="$HOME/.claude-code-til"
REPO_URL="https://github.com/Yuya-Furusawa/claude-code-til/archive/refs/heads/main.tar.gz"

echo ""
echo "🚀 Claude Code TIL - Installer"
echo "======================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install it first."
  exit 1
fi

# Remove existing installation
if [ -d "$INSTALL_DIR" ]; then
  echo "📦 Updating existing installation..."
  rm -rf "$INSTALL_DIR"
fi

# Download & extract
echo "📥 Downloading..."
mkdir -p "$INSTALL_DIR"
curl -fsSL "$REPO_URL" | tar xz -C "$INSTALL_DIR" --strip-components=1

# Install dependencies
echo "📦 Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production

# Run setup
echo ""
node setup.mjs

echo ""
echo "💡 To uninstall:"
echo "   curl -fsSL https://raw.githubusercontent.com/Yuya-Furusawa/claude-code-til/main/uninstall.sh | bash"
echo ""
