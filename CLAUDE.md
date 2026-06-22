# CLAUDE.md — MesimaLiBot

Guidance for Claude Code (and humans) working in this repository.

## What this is

A multi-tenant Telegram task-manager bot built as a single **n8n** workflow.
Tasks are stored in **Google Sheets** (one shared sheet, isolated per `chat_id`).
The bot is in Hebrew and understands both slash-commands and natural language.
See `README.md` for the full architecture.

There is no build step and no server here — the source of truth lives in n8n.
This repo is the documented, **sanitized** mirror of that workflow.

## 🔒 Security rules (MANDATORY — never violate)

These rules exist because a live bot token and a private Google Sheet ID were
once embedded in the workflow. Treat every file you add or edit as if it will be
public.

1. **No secrets in git, ever.** Never commit:
   - A Telegram bot token (`<digits>:<35 chars>`). The workflow must reference it
     only as `{{ $env.TELEGRAM_BOT_TOKEN }}`.
   - A real Google Sheets/Drive document ID or `docs.google.com/.../d/<id>` URL.
     Committed `documentId` values must be the placeholder `YOUR_GOOGLE_SHEETS_ID`.
   - Service-account JSON, OAuth client secrets, private keys, or any `api_key=…`
     / `token=…` literal.
   - Real personal data: chat IDs, phone numbers, names, or live task contents.

2. **Run the guard before committing.** Always run
   `scripts/check-secrets.sh --all` (or invoke the **secret-guard** skill) before
   any `git commit`, `git push`, or pull request. Only proceed when it prints
   `✓ No secrets detected.` A pre-commit hook enforces this; do not bypass it with
   `--no-verify` to sneak a secret through.

3. **Re-sanitize every fresh n8n export.** Exporting the workflow from n8n
   re-embeds the live `documentId` and any hardcoded credentials. After any
   re-export, replace the token with the env-var expression and the spreadsheet ID
   with `YOUR_GOOGLE_SHEETS_ID`, then re-run the guard.

4. **Secrets live in n8n, not here.** Credentials (Telegram, Google Sheets OAuth)
   stay as n8n credentials / env vars. This repo only documents structure.

5. **If a secret leaks, rotate it** — don't just delete the file. Regenerate the
   Telegram token in @BotFather and update the n8n `TELEGRAM_BOT_TOKEN` env var.

## Conventions

- Workflow logic lives in three n8n Code nodes, mirrored for review under `src/`:
  `constants.js`, `parse-update.js`, `resolve.js`. Edit logic in n8n; keep these
  files in sync when you change behavior.
- The importable, sanitized workflow is `workflow/telegram-task-bot.json`.
- Hebrew UI strings are intentional — keep them.
