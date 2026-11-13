/**
 * Minimal Telegram Bot API client for city channels (migration 0066): the WeDance bot
 * posts a city's weekly schedule to its official Telegram channels and groups.
 *
 * Setup: create the bot with @BotFather, set TELEGRAM_BOT_TOKEN, then add the bot to the
 * channel (or group) as an administrator allowed to post. A city admin checks it from
 * Business → the city page → Channels ("Check bot").
 *
 * `fetchImpl` is injectable so it is unit-tested without the network.
 */
export class TelegramError extends Error {
  constructor(message: string, public code?: number) {
    super(message)
    this.name = 'TelegramError'
  }
}

type Fetch = typeof fetch
export interface TelegramOpts { token?: string; fetchImpl?: Fetch }

export function telegramToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
}

export function telegramConfigured(): boolean {
  return !!telegramToken()
}

async function call<T>(method: string, body: Record<string, unknown>, opts: TelegramOpts = {}): Promise<T> {
  const token = opts.token ?? telegramToken()
  if (!token) throw new TelegramError('The Telegram bot isn’t set up on this server (TELEGRAM_BOT_TOKEN).')
  const f = opts.fetchImpl ?? fetch
  const res = await f(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data: any = await res.json().catch(() => ({}))
  if (!data?.ok) throw new TelegramError(explain(data?.description || `Telegram said no (HTTP ${res.status}).`), data?.error_code ?? res.status)
  return data.result as T
}

/** Telegram's errors, in words a city admin can act on. */
function explain(description: string): string {
  if (/chat not found/i.test(description)) return 'Telegram can’t find that chat. Use the channel’s @name, or add the bot to the group first.'
  if (/not enough rights|need administrator rights|not a member|bot was kicked|have no rights/i.test(description)) return 'The WeDance bot can’t post there. Add it to the channel as an administrator allowed to post messages.'
  return description
}

export interface TgChat { id: number; title?: string; username?: string; type: 'channel' | 'group' | 'supergroup' | 'private' }

export const getMe = (opts?: TelegramOpts) => call<{ id: number; username: string }>('getMe', {}, opts)
export const getChat = (chatId: string, opts?: TelegramOpts) => call<TgChat>('getChat', { chat_id: chatId }, opts)

/**
 * Can the bot post in that chat? Channels need an administrator with can_post_messages;
 * in groups a member may write unless the group restricts it.
 */
export async function checkChat(chatId: string, opts?: TelegramOpts): Promise<{ chat: TgChat; canPost: boolean; bot: string }> {
  const me = await getMe(opts)
  const chat = await getChat(chatId, opts)
  const member = await call<{ status: string; can_post_messages?: boolean; can_send_messages?: boolean }>('getChatMember', { chat_id: chatId, user_id: me.id }, opts)
  const canPost = chat.type === 'channel'
    ? member.status === 'creator' || (member.status === 'administrator' && member.can_post_messages !== false)
    : ['creator', 'administrator', 'member'].includes(member.status) || (member.status === 'restricted' && member.can_send_messages === true)
  return { chat, canPost, bot: me.username }
}

/** The public link of a posted message (public chats only). */
export function messageUrl(chat: { username?: string }, messageId: number): string | null {
  return chat.username ? `https://t.me/${chat.username}/${messageId}` : null
}

/**
 * Post a picture with the text. Telegram captions stop at 1024 characters, so a longer
 * text goes as a reply-less second message right after the picture. Returns the first
 * message (the one to link to).
 */
export async function postPhotoWithText(chatId: string, input: { photoUrl: string | null; text: string }, opts?: TelegramOpts): Promise<{ messageId: number; chat: TgChat }> {
  const chat = await getChat(chatId, opts)
  const text = input.text.slice(0, 4096)
  if (!input.photoUrl) {
    const m = await call<{ message_id: number }>('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } }, opts)
    return { messageId: m.message_id, chat }
  }
  const fits = text.length <= 1024
  const photo = await call<{ message_id: number }>('sendPhoto', { chat_id: chatId, photo: input.photoUrl, ...(fits ? { caption: text } : {}) }, opts)
  if (!fits) await call('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } }, opts)
  return { messageId: photo.message_id, chat }
}
