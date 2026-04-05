#!/usr/bin/env python3
"""
Telegram Bot Runner for Ikigai Team (Windows-compatible, no tmux).

Runs Telegram bots for agents. Each incoming message is processed by
calling `claude` CLI as a subprocess (stateless per message).

Usage:
  python telegram-bots.py              # Run all bots with tokens in .env
  python telegram-bots.py --dry-run    # Print config without starting bots
  python telegram-bots.py --agent maya # Run only Maya's bot

Tokens stored in ~/.config/telegram/.env:
  MAYA_BOT_TOKEN=...
  OWNER_TELEGRAM_ID=...
"""
import asyncio
import logging
import os
import subprocess
import sys
from pathlib import Path

ENV_FILE = Path.home() / ".config" / "telegram" / ".env"
PROJECT_DIR = Path.home() / "Orgs" / "ikigai"


def load_env(path):
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


load_env(ENV_FILE)

OWNER_TELEGRAM_ID = int(os.environ.get("OWNER_TELEGRAM_ID", "0"))

logging.basicConfig(
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("agent-bots")

AGENTS = {
    "maya": {
        "token_env": "MAYA_BOT_TOKEN",
        "name": "Maya",
        "role": "Chief of Staff",
        "greeting": "Maya here. What do you need?",
    },
    "viktor": {
        "token_env": "VIKTOR_BOT_TOKEN",
        "name": "Viktor",
        "role": "CTO",
        "greeting": "Viktor here. What needs building?",
    },
    "luna": {
        "token_env": "LUNA_BOT_TOKEN",
        "name": "Luna",
        "role": "Head of Content & Growth",
        "greeting": "Luna here! What story are we telling today?",
    },
    "marco": {
        "token_env": "MARCO_BOT_TOKEN",
        "name": "Marco",
        "role": "Head of Strategy & Business",
        "greeting": "Marco here. Let's talk strategy.",
    },
    "sage": {
        "token_env": "SAGE_BOT_TOKEN",
        "name": "Sage",
        "role": "Personal Coach",
        "greeting": "Hey Кирилл. How are you, really?",
    },
    "kai": {
        "token_env": "KAI_BOT_TOKEN",
        "name": "Kai",
        "role": "Community & Partnerships",
        "greeting": "Kai here! Who are we connecting with?",
    },
}


async def call_claude(agent_key: str, message: str) -> str:
    """Call claude CLI with the agent persona and return the response."""
    cmd = [
        "claude",
        "--agent", agent_key,
        "--dangerously-skip-permissions",
        "--output-format", "text",
        "-p", message,
    ]
    log.info(f"[{agent_key}] Running claude CLI ({len(message)} chars)")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(PROJECT_DIR),
    )
    stdout, stderr = await asyncio.wait_for(
        proc.communicate(),
        timeout=300,  # 5 min max per message
    )

    response = stdout.decode("utf-8", errors="replace").strip()
    if proc.returncode != 0:
        err = stderr.decode("utf-8", errors="replace").strip()
        log.error(f"[{agent_key}] claude error (rc={proc.returncode}): {err[:200]}")
        if not response:
            response = f"Error processing message. Please try again."

    log.info(f"[{agent_key}] Response: {len(response)} chars")
    return response


def make_handlers(agent_key: str):
    agent = AGENTS[agent_key]

    async def start(update, context):
        if update.effective_user.id != OWNER_TELEGRAM_ID:
            await update.message.reply_text("This bot is private.")
            return
        await update.message.reply_text(agent["greeting"])

    async def handle_message(update, context):
        from telegram import ReactionTypeEmoji

        if update.effective_user.id != OWNER_TELEGRAM_ID:
            await update.message.reply_text("This bot is private.")
            return

        text = update.message.text or update.message.caption or ""
        if not text:
            await update.message.reply_text("I can only process text messages for now.")
            return

        # Show "processing" reaction
        try:
            await update.message.set_reaction(ReactionTypeEmoji("👀"))
        except Exception:
            pass

        # Add context from quoted message if any
        quoted = ""
        reply = update.message.reply_to_message
        if reply:
            reply_text = reply.text or reply.caption or ""
            reply_from = ""
            if reply.from_user:
                reply_from = reply.from_user.first_name or reply.from_user.username or ""
            if reply_text:
                quoted = f"\n[quoted message from {reply_from}]: {reply_text}\n"

        full_message = f"{text}{quoted}"

        try:
            response = await call_claude(agent_key, full_message)

            # Send response in chunks (Telegram limit is 4096)
            chunks = [response[i:i+4000] for i in range(0, len(response), 4000)]
            for chunk in chunks:
                await update.message.reply_text(chunk)

            # Mark as done
            try:
                await update.message.set_reaction(ReactionTypeEmoji("👌"))
            except Exception:
                pass

        except asyncio.TimeoutError:
            await update.message.reply_text("Request timed out. Try a simpler message.")
            log.error(f"[{agent_key}] Timeout processing message")
        except Exception as e:
            await update.message.reply_text(f"Something went wrong: {str(e)[:200]}")
            log.error(f"[{agent_key}] Error: {e}")

    return start, handle_message


async def run_bot(agent_key: str):
    from telegram.ext import Application, CommandHandler, MessageHandler, filters

    agent = AGENTS[agent_key]
    token = os.environ.get(agent["token_env"])

    app = Application.builder().token(token).build()
    start, handle_message = make_handlers(agent_key)

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    log.info(f"[{agent_key}] Bot started: {agent['name']} ({agent['role']})")
    return app


async def main():
    only_agent = None
    if "--agent" in sys.argv:
        idx = sys.argv.index("--agent") + 1
        only_agent = sys.argv[idx].lower()

    if "--dry-run" in sys.argv:
        print("Agent Bot Configuration:")
        print(f"  OWNER_TELEGRAM_ID: {OWNER_TELEGRAM_ID}")
        print(f"  PROJECT_DIR: {PROJECT_DIR}")
        for key, agent in AGENTS.items():
            if only_agent and key != only_agent:
                continue
            token = os.environ.get(agent["token_env"], "")
            has_token = "SET" if token else "MISSING"
            print(f"  {agent['name']:8s} [{agent['role']:30s}] token={has_token}")
        return

    if OWNER_TELEGRAM_ID == 0:
        log.error("OWNER_TELEGRAM_ID not set in .env")
        sys.exit(1)

    agents_to_run = [only_agent] if only_agent else list(AGENTS.keys())
    apps = []
    for key in agents_to_run:
        token = os.environ.get(AGENTS[key]["token_env"])
        if not token:
            log.warning(f"[{key}] No token ({AGENTS[key]['token_env']}), skipping")
            continue
        app = await run_bot(key)
        if app:
            apps.append(app)

    if not apps:
        log.error("No bots started — check .env tokens")
        sys.exit(1)

    log.info(f"Starting {len(apps)} bot(s)...")

    for app in apps:
        await app.initialize()
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)

    log.info("All bots running. Press Ctrl+C to stop.")

    try:
        await asyncio.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        log.info("Shutting down...")
    finally:
        for app in apps:
            await app.updater.stop()
            await app.stop()
            await app.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
