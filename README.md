# 📚 Claude Code Daily Learnings

Claude Codeでの日々のやり取りを自動記録し、1日の終わりに「今日新しく学んだこと」をまとめるツール。

## How It Works

```
[日中] Claude Codeを普通に使う
  ↓ SessionEnd Hook が自動でセッション情報をSQLiteに記録

[1日の終わり] /today-learnings を実行
  ↓ 今日のtranscriptを抽出
  ↓ claude -p でサマリー生成（サブスク内で完結・APIコスト不要）
  ↓ Obsidian Vault に Markdown 出力
```

## Features

- **自動記録**: SessionEnd hookでセッション終了時に自動的にtranscriptパスを保存
- **APIコスト不要**: `claude -p` を使うためClaude Codeサブスク内で完結
- **Obsidian連携**: Daily Learningsフォルダに日付別Markdownを自動出力
- **カスタムコマンド**: Claude Code内で `/today-learnings` と打つだけで実行

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI)
- Node.js >= 18
- npm

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/claude-code-learnings.git
cd claude-code-learnings
npm install
node setup.mjs
```

`setup.mjs` が以下を自動で行います:

1. `~/.claude/scripts/` にスクリプトをコピー
2. `~/.claude/commands/` にカスタムコマンドを配置
3. `~/.claude/settings.json` にSessionEnd hookを追加
4. SQLite用ディレクトリを作成

### Obsidian連携の設定（任意）

環境変数 `OBSIDIAN_VAULT_PATH` にVaultのパスを設定してください。

```bash
# ~/.bashrc or ~/.zshrc
export OBSIDIAN_VAULT_PATH="$HOME/Documents/Obsidian/MyVault"
```

## Usage

### 日常の使い方

特別な操作は不要です。Claude Codeを普通に使うだけで、セッション終了時に自動的にtranscript情報が記録されます。

### 今日の学びをまとめる

Claude Code内で以下のコマンドを実行:

```
/today-learnings
```

または、ターミナルから直接:

```bash
bash ~/.claude/scripts/daily-learnings.sh
```

### 出力例

```markdown
# 📚 Today I Learned - 2025-02-08

## 学んだこと

### Claude Code Hooksの仕組み
- SessionEnd hookでtranscript_pathが取得できる
- stdinからJSON形式でhookデータを受け取る
- matcherで発火条件をフィルタリング可能

### SQLiteをNode.jsから使う
- better-sqlite3は同期APIで扱いやすい
- `INSERT OR IGNORE` でUNIQUE制約の重複を安全にスキップ

## キーワード
#claude-code #hooks #sqlite #nodejs
```

## File Structure

```
claude-code-learnings/
├── README.md
├── package.json
├── setup.mjs              # インストーラー
├── uninstall.mjs          # アンインストーラー
├── scripts/
│   ├── record-session.mjs # Hook: セッション情報をSQLiteに記録
│   ├── extract-today.mjs  # 今日のtranscriptを抽出
│   ├── daily-learnings.sh # メイン: サマリー生成
│   └── export-obsidian.mjs# Obsidianに出力
├── commands/
│   └── today-learnings.md # カスタムslashコマンド
└── prompt.txt             # サマリー生成用プロンプト
```

## Configuration

### サマリーのプロンプトをカスタマイズ

`prompt.txt` を編集することで、サマリーの出力形式を自由に変更できます。setup後は `~/.claude/scripts/prompt.txt` にコピーされます。

### hook設定の確認

Claude Code内で `/hooks` と入力すると、現在のhook設定を確認・編集できます。

## Advanced

### 過去の学びを検索

```bash
# SQLiteから直接検索
sqlite3 ~/.claude/learnings/sessions.db \
  "SELECT created_at, project_dir FROM sessions ORDER BY created_at DESC LIMIT 10"
```

### 生成済みサマリーの一覧

```bash
ls -la ~/.claude/learnings/*.md
```

### cronで自動実行（毎日23:55）

```bash
crontab -e
# 以下を追加:
55 23 * * * bash ~/.claude/scripts/daily-learnings.sh
```

## Uninstall

```bash
cd claude-code-learnings
node uninstall.mjs
```

## Troubleshooting

### transcriptのJSONL構造が想定と違う

Claude Codeのバージョンによってtranscriptのフォーマットが異なる場合があります。以下で実際の構造を確認してください:

```bash
# 最新のtranscriptファイルを確認
sqlite3 ~/.claude/learnings/sessions.db \
  "SELECT transcript_path FROM sessions ORDER BY created_at DESC LIMIT 1"

# 先頭数行を確認
head -5 <transcript_path>
```

確認した構造に合わせて `scripts/extract-today.mjs` の `extractConversation()` を調整してください。

### hookが動作しない

```bash
# デバッグモードで確認
claude --debug
```

hookの設定は起動時にスナップショットされるため、設定変更後はClaude Codeを再起動してください。

## License

MIT
