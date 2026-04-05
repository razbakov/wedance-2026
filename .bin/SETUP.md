# Telegram Bots — Setup Guide

## What This Does

Each agent gets a Telegram bot. You message a bot → it runs Claude Code with that agent's persona → replies back in Telegram.

**Stack:** Telegram (mobile capture) → Claude Code (processing) → Monday/files (execution)

## Step 1: Create Bots via @BotFather

Open Telegram, message @BotFather, and create 6 bots:

1. `/newbot` → name: `Maya - Chief of Staff` → username: e.g. `kirill_maya_bot`
2. `/newbot` → name: `Viktor - CTO` → username: e.g. `kirill_viktor_bot`
3. `/newbot` → name: `Luna - Content` → username: e.g. `kirill_luna_bot`
4. `/newbot` → name: `Marco - Strategy` → username: e.g. `kirill_marco_bot`
5. `/newbot` → name: `Sage - Coach` → username: e.g. `kirill_sage_bot`
6. `/newbot` → name: `Kai - Community` → username: e.g. `kirill_kai_bot`

Save each bot token.

**MVP shortcut:** Start with Maya only. She's the dispatcher — one bot handles 80% of use cases.

## Step 2: Get Your Telegram ID

Message @userinfobot in Telegram. It replies with your numeric user ID.

## Step 3: Create .env File

```bash
mkdir -p ~/.config/telegram
```

Create `~/.config/telegram/.env`:

```
OWNER_TELEGRAM_ID=YOUR_NUMERIC_ID

MAYA_BOT_TOKEN=...
VIKTOR_BOT_TOKEN=...
LUNA_BOT_TOKEN=...
MARCO_BOT_TOKEN=...
SAGE_BOT_TOKEN=...
KAI_BOT_TOKEN=...
```

You can leave tokens empty for agents you don't want to run yet.

## Step 4: Install Python Dependencies

```bash
python -m venv ~/.config/telegram/venv
~/.config/telegram/venv/Scripts/activate   # Windows
# or: source ~/.config/telegram/venv/bin/activate  # Linux/Mac

pip install python-telegram-bot python-dotenv
```

## Step 5: Install tmux

tmux is required — each agent runs as a persistent Claude Code session in a tmux window.

Windows (via Git Bash or WSL): `sudo apt install tmux`
Mac: `brew install tmux`

## Step 6: Run

```bash
# Dry run — check config:
python .bin/telegram-bots.py --dry-run

# Start Maya only (MVP):
.bin/telegram-bots.sh --agent maya

# Start all agents:
.bin/telegram-bots.sh

# Check status:
.bin/telegram-bots.sh --status

# Stop:
.bin/telegram-bots.sh --kill
```

## How It Works

1. You message Maya in Telegram
2. Bot receives message, tags it with chat/message IDs
3. Message is sent to a persistent Claude Code session (running in tmux)
4. Claude processes it with Maya's persona, tools, and org context
5. Claude replies back via `telegram-send.py`

## MVP Use Cases

- "Good morning" → Maya runs daily review
- "Scrum" → Maya runs evening check-in
- "Capture: idea for new package deal" → Maya saves to inbox
- "What's my top 3 today?" → Maya checks calendar + priorities
- Direct to any agent: message their bot directly

## Commands

- `/start` — bot greeting
- `/reset` — clear conversation context (fresh start)
