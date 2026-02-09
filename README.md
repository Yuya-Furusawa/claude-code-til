# Claude Code TIL (Today I Learned)

A tool that automatically records your daily Claude Code interactions and generates a summary of "what you learned today" at the end of each day.

## How It Works

```
[During the day] Use Claude Code as usual
  | SessionEnd Hook automatically records session info to SQLite

[End of day] Run /til
  | Extract today's transcripts
  | Generate summary with claude -p (runs within your subscription, no extra API cost)
  | Output Markdown to Obsidian Vault
```

## Features

- **Auto-recording**: Automatically saves transcript paths when a session ends via SessionEnd hook
- **No API cost**: Uses `claude -p`, so it runs entirely within your Claude Code subscription
- **Obsidian integration**: Outputs date-based Markdown files to a Daily Learnings folder
- **Custom command**: Just type `/til` inside Claude Code to run

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI)
- Node.js >= 18
- npm
- Obsidian

## Installation

### One-liner install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Yuya-Furusawa/claude-code-til/main/install.sh | bash
```

### Manual install (for developers)

```bash
git clone https://github.com/Yuya-Furusawa/claude-code-til.git
cd claude-code-til
npm install
node setup.mjs
```

`setup.mjs` automatically performs the following:

1. Copies scripts to `~/.claude/scripts/`
2. Places custom commands in `~/.claude/commands/`
3. Adds a SessionEnd hook to `~/.claude/settings.json`
4. Creates the SQLite directory

### Obsidian integration setup (optional)

Set the `OBSIDIAN_VAULT_PATH` environment variable to your Vault path.

```bash
# ~/.bashrc or ~/.zshrc
export OBSIDIAN_VAULT_PATH="$HOME/Documents/Obsidian/MyVault"
```

## Update

Simply re-run the install command to update to the latest version.
Your customized `prompt.txt` will be preserved as-is.

```bash
curl -fsSL https://raw.githubusercontent.com/Yuya-Furusawa/claude-code-til/main/install.sh | bash
```

## Usage

### Daily workflow

No special steps required. Just use Claude Code as usual, and session information will be automatically recorded when each session ends.

### Summarize today's learnings

Run the following command inside Claude Code:

```
/til
```

Or run directly from your terminal:

```bash
bash ~/.claude/scripts/daily-learnings.sh
```

### Example output

```markdown
# Today I Learned - 2025-02-08

## Learnings

### How Claude Code Hooks work
- SessionEnd hook provides the transcript_path
- Hook data is received via stdin in JSON format
- Matcher allows filtering trigger conditions

### Using SQLite from Node.js
- better-sqlite3 provides a synchronous API that is easy to use
- `INSERT OR IGNORE` safely skips duplicates with UNIQUE constraints

## Keywords
#claude-code #hooks #sqlite #nodejs
```

## File Structure

```
claude-code-learnings/
├── README.md
├── package.json
├── setup.mjs              # Installer
├── uninstall.mjs          # Uninstaller
├── scripts/
│   ├── record-session.mjs # Hook: records session info to SQLite
│   ├── extract-today.mjs  # Extracts today's transcripts
│   ├── daily-learnings.sh # Main: generates summary
│   └── export-obsidian.mjs# Exports to Obsidian
├── commands/
│   └── til.md # Custom slash command
└── prompt.txt             # Prompt for summary generation
```

## Configuration

### Customize the summary prompt

Edit `prompt.txt` to change the summary output format. After setup, it is copied to `~/.claude/scripts/prompt.txt`.

### Check hook settings

Type `/hooks` inside Claude Code to view and edit the current hook configuration.

## Advanced

### Search past learnings

```bash
# Search directly from SQLite
sqlite3 ~/.claude/learnings/sessions.db \
  "SELECT created_at, project_dir FROM sessions ORDER BY created_at DESC LIMIT 10"
```

### List generated summaries

```bash
ls -la ~/.claude/learnings/*.md
```

### Auto-run with cron (daily at 23:55)

```bash
crontab -e
# Add the following:
55 23 * * * bash ~/.claude/scripts/daily-learnings.sh
```

## Uninstall

### If installed via one-liner

```bash
curl -fsSL https://raw.githubusercontent.com/Yuya-Furusawa/claude-code-til/main/uninstall.sh | bash
```

### If installed manually

```bash
cd claude-code-til
node uninstall.mjs
```

## Troubleshooting

### Transcript JSONL structure differs from expected

The transcript format may vary depending on the Claude Code version. Check the actual structure as follows:

```bash
# Check the latest transcript file
sqlite3 ~/.claude/learnings/sessions.db \
  "SELECT transcript_path FROM sessions ORDER BY created_at DESC LIMIT 1"

# View the first few lines
head -5 <transcript_path>
```

Adjust `extractConversation()` in `scripts/extract-today.mjs` to match the structure you find.

### Hook is not working

```bash
# Check in debug mode
claude --debug
```

Hook settings are snapshotted at startup, so restart Claude Code after changing settings.

## License

MIT
