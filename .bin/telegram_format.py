"""
Telegram message formatter for Agent OS.

Converts raw agent output into clean, scannable Telegram HTML messages.
Used by both telegram-bots.py and telegram-send.py.
"""
import re

# Telegram HTML supports: <b>, <i>, <u>, <s>, <code>, <pre>, <a href="">, <blockquote>
# Max message length: 4096 chars

FIELD_EMOJI = {
    "PROJECT":            "",
    "SUMMARY":            "",
    "RECOMMENDED ACTION": "",
    "OWNER":              "",
    "TIMING":             "",
    "RISK":               "",
    "NEXT HANDOFF":       "",
    "PRIORITY":           "",
    "TYPE":               "",
    "PHASE":              "",
    "DEPENDENCY":         "",
    "CONTENT BUCKET":     "",
    "COMMERCIAL SCORE":   "",
    "TEMPERATURE":        "",
    "DEAL STAGE":         "",
    "STATUS":             "",
}

PRIORITY_BADGE = {
    "critical":  "CRITICAL",
    "today":     "TODAY",
    "this week": "THIS WEEK",
    "backlog":   "BACKLOG",
}


def escape_html(text: str) -> str:
    """Escape HTML special characters for Telegram."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _format_field_value(key: str, value: str) -> str:
    """Format a single field value with priority badges etc."""
    lower = value.strip().lower()
    if key in ("TIMING", "PRIORITY") and lower in PRIORITY_BADGE:
        return f"<b>{PRIORITY_BADGE[lower]}</b>"
    return escape_html(value.strip())


def _is_structured_output(text: str) -> bool:
    """Detect if text contains agent structured output format."""
    # Look for at least 2 of the known field labels
    count = 0
    for field in ("PROJECT:", "SUMMARY:", "RECOMMENDED ACTION:", "OWNER:", "TIMING:", "RISK:"):
        if field in text:
            count += 1
    return count >= 2


def _parse_structured_fields(text: str) -> list[tuple[str, str]]:
    """Parse KEY: value lines from structured agent output."""
    fields = []
    # Match lines like "KEY:  value" or "KEY:  value"
    pattern = re.compile(r'^([A-Z][A-Z /]+?):\s+(.+)$', re.MULTILINE)
    for match in pattern.finditer(text):
        key = match.group(1).strip()
        value = match.group(2).strip()
        if value and value not in ("[", "]"):
            fields.append((key, value))
    return fields


def _extract_sections(text: str) -> tuple[str, str]:
    """Split text into structured fields block and free-text body."""
    lines = text.split("\n")
    field_pattern = re.compile(r'^[A-Z][A-Z /]+:\s+')
    separator_pattern = re.compile(r'^[-=]{3,}$')

    # Find where structured fields end
    last_field_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if field_pattern.match(stripped):
            last_field_idx = i
        elif stripped and last_field_idx >= 0 and not separator_pattern.match(stripped):
            # Non-field, non-empty, non-separator line after fields = body starts
            break

    if last_field_idx < 0:
        return "", text

    fields_block = "\n".join(lines[:last_field_idx + 1])
    body = "\n".join(lines[last_field_idx + 1:]).strip()
    # Clean separators from body start
    body = re.sub(r'^[-=]{3,}\n*', '', body).strip()

    return fields_block, body


def format_for_telegram(text: str) -> str:
    """
    Convert agent output to clean Telegram HTML.

    Structured output (PROJECT/SUMMARY/etc.) gets formatted as a clean card.
    Free text passes through with basic markdown-to-HTML conversion.
    """
    text = text.strip()
    if not text:
        return ""

    if _is_structured_output(text):
        return _format_structured(text)

    return _format_freetext(text)


def _format_structured(text: str) -> str:
    """Format structured agent output as a Telegram card."""
    fields_block, body = _extract_sections(text)
    fields = _parse_structured_fields(fields_block)

    parts = []

    # Group: header (PROJECT + SUMMARY)
    project = ""
    summary = ""
    remaining_fields = []

    for key, value in fields:
        if key == "PROJECT":
            project = value
        elif key == "SUMMARY":
            summary = value
        else:
            remaining_fields.append((key, value))

    # Header line
    if project:
        parts.append(f"<b>{escape_html(project)}</b>")
    if summary:
        parts.append(f"\n{escape_html(summary)}")

    # Separator
    if parts:
        parts.append("")

    # Remaining fields as compact list
    for key, value in remaining_fields:
        formatted_value = _format_field_value(key, value)
        parts.append(f"<b>{escape_html(key)}:</b> {formatted_value}")

    # Body (free text after fields)
    if body:
        parts.append("")
        parts.append(_format_freetext(body))

    return "\n".join(parts)


def _format_freetext(text: str) -> str:
    """Convert markdown-ish text to Telegram HTML."""
    # Already HTML? Return as-is
    if re.search(r'<[a-z]+[ />]', text, re.IGNORECASE):
        return text

    lines = text.split("\n")
    result = []

    for line in lines:
        stripped = line.strip()

        # Headers → bold
        header_match = re.match(r'^#{1,3}\s+(.+)$', stripped)
        if header_match:
            result.append(f"\n<b>{escape_html(header_match.group(1))}</b>")
            continue

        # Bullet points — keep but clean up
        bullet_match = re.match(r'^[-*]\s+(.+)$', stripped)
        if bullet_match:
            content = _inline_format(bullet_match.group(1))
            result.append(f"  - {content}")
            continue

        # Numbered list
        num_match = re.match(r'^(\d+)[.)]\s+(.+)$', stripped)
        if num_match:
            content = _inline_format(num_match.group(2))
            result.append(f"  {num_match.group(1)}. {content}")
            continue

        # Separator lines → skip
        if re.match(r'^[-=]{3,}$', stripped):
            continue

        # Code blocks
        if stripped.startswith("```"):
            result.append(stripped.replace("```", "<pre>", 1) if "<pre>" not in "".join(result[-3:]) else "</pre>")
            continue

        # Regular line
        result.append(_inline_format(stripped))

    return "\n".join(result)


def _inline_format(text: str) -> str:
    """Convert inline markdown to HTML."""
    # Bold: **text** or __text__
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)
    # Italic: *text* or _text_ (but not inside words with underscores)
    text = re.sub(r'(?<!\w)\*(.+?)\*(?!\w)', r'<i>\1</i>', text)
    # Inline code: `text`
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    return text


def chunk_message(text: str, max_len: int = 4000) -> list[str]:
    """Split message into Telegram-safe chunks, preferring line breaks."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    while text:
        if len(text) <= max_len:
            chunks.append(text)
            break

        # Find a good break point
        cut = text.rfind("\n", 0, max_len)
        if cut < max_len // 2:
            # No good line break, try space
            cut = text.rfind(" ", 0, max_len)
        if cut < max_len // 2:
            # Hard cut
            cut = max_len

        chunks.append(text[:cut])
        text = text[cut:].lstrip("\n")

    return chunks
