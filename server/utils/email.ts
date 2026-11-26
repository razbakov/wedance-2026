import { Resend } from 'resend'
import { festivalPath } from '../../shared/utils/eventSlug'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const config = useRuntimeConfig()
    if (!config.resendApiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }
    _resend = new Resend(config.resendApiKey)
  }
  return _resend
}

export async function sendMagicLinkEmail(to: string, name: string, magicLinkUrl: string) {
  const config = useRuntimeConfig()

  // In development without Resend key, log the link instead
  if (!config.resendApiKey) {
    console.log(`\n🔗 Magic link for ${to}: ${magicLinkUrl}\n`)
    return
  }

  const resend = getResend()

  await resend.emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to,
    subject: 'Sign in to WeDance',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hey ${escapeHtml(name)}!</h2>
        <p>Click the button below to sign in to WeDance:</p>
        <a href="${magicLinkUrl}"
           style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Sign in to WeDance
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This link expires in 15 minutes. If you didn&apos;t request this, just ignore this email.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const config = useRuntimeConfig()

  if (!config.resendApiKey) {
    console.log(`\n🔗 Password reset link for ${to}: ${resetUrl}\n`)
    return
  }

  const resend = getResend()

  await resend.emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to,
    subject: 'Reset your WeDance password',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hey ${escapeHtml(name)}!</h2>
        <p>Click the button below to set a new password for your WeDance account:</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Reset my password
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This link expires in 15 minutes. If you didn&apos;t request this, just ignore this email.
        </p>
      </div>
    `,
  })
}

export interface TicketConfirmationParams {
  to: string
  buyerName: string
  festivalName: string
  festivalSlug: string
  startDate: string | null
  endDate: string | null
  ticketName: string | null
  amountCents: number
}

export async function sendTicketConfirmationEmail(params: TicketConfirmationParams) {
  const config = useRuntimeConfig()

  if (!config.resendApiKey) {
    console.log(`\n🎟️ Ticket confirmation for ${params.to}: ${params.festivalName} — ${params.ticketName ?? 'Social Unlock'}\n`)
    return
  }

  const resend = getResend()
  const siteUrl = config.siteUrl || 'https://2026.wedance.vip'

  const amountFormatted = `€${(params.amountCents / 100).toFixed(2)}`
  const ticketLabel = params.ticketName ?? 'Social Unlock'

  const dateRange = formatDateRange(params.startDate, params.endDate)

  const festivalUrl = `${siteUrl}${festivalPath(params.festivalSlug)}`

  await resend.emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject: `Your ticket for ${escapeHtml(params.festivalName)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">You&apos;re in, ${escapeHtml(params.buyerName)}! 🎉</h2>
        <p>Your purchase for <strong>${escapeHtml(params.festivalName)}</strong> is confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Ticket</td>
            <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(ticketLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount paid</td>
            <td style="padding: 8px 0; font-weight: bold;">${amountFormatted}</td>
          </tr>${dateRange ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Date</td>
            <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(dateRange)}</td>
          </tr>` : ''}
        </table>
        <a href="${festivalUrl}"
           style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View festival details
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          If you have any questions, reply to this email.
        </p>
      </div>
    `,
  })
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00Z')
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  if (!end || start === end) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Business mode: tell someone their claim / join / reclaim request was decided.
 * Logged instead of sent when Resend isn't configured (local dev).
 */
export async function sendAccessDecisionEmail(params: {
  to: string
  name: string
  profileName: string
  approved: boolean
  role: 'owner' | 'editor'
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = params.approved
    ? `You now manage ${params.profileName} on WeDance`
    : `Your request for ${params.profileName} wasn’t approved`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const body = params.approved
    ? `<p>You were added to <strong>${escapeHtml(params.profileName)}</strong> as ${params.role === 'owner' ? 'an owner' : 'an editor'}.</p>
       <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open your business page</a>`
    : `<p>Your request to manage <strong>${escapeHtml(params.profileName)}</strong> wasn’t approved.</p>
       <p>If it really is yours, send a new request with something we can check, e.g. a message from the profile’s Instagram account.</p>`
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>${body}</div>`,
  })
}

/**
 * Business mode: tell someone their claim needs more info before we can decide.
 * Logged instead of sent when Resend isn't configured (local dev).
 */
export async function sendInfoRequiredEmail(params: {
  to: string
  name: string
  profileName: string
  reviewerNote: string
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `More info needed for your ${params.profileName} claim`
  if (!config.resendApiKey) {
    console.log(`\n\u2709\ufe0f  ${params.to}: ${subject} \u2192 ${params.link}\n`)
    return
  }
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p>We're reviewing your request for <strong>${escapeHtml(params.profileName)}</strong> and need a bit more information:</p>
      <blockquote style="border-left: 3px solid #ddd; margin: 16px 0; padding: 8px 16px; color: #555;">${escapeHtml(params.reviewerNote)}</blockquote>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Update your request</a>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Go to your profile page on WeDance and re-submit your claim with the requested evidence.
      </p>
    </div>`,
  })
}

/**
 * Business mode: an organizer asked a page someone runs on WeDance — an artist
 * to confirm they're in a line-up, or a venue to host an event. Sent to the
 * page's team when the organizer clicks "Email them". Logged in local dev.
 */
export async function sendInviteEmail(params: {
  to: string
  name: string
  kind: 'artist' | 'venue'
  host: string
  profileName: string
  eventName: string
  when: string
  lines: string[]
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = params.kind === 'venue'
    ? `${params.host} asked ${params.profileName} to host ${params.eventName}`
    : `${params.host} added ${params.profileName} to ${params.eventName}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const ask = params.kind === 'venue'
    ? 'Can you host it? Say yes, suggest another date, or no, with your terms. It takes a minute.'
    : 'Confirm you’re in, check your programme and the posts about you.'
  const lines = params.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p><strong>${escapeHtml(params.host)}</strong> ${params.kind === 'venue' ? 'would like to hold' : 'added you to'} <strong>${escapeHtml(params.eventName)}</strong>${params.kind === 'venue' ? ` at ${escapeHtml(params.profileName)}` : ''}.</p>
      <p style="color: #555;">${escapeHtml(params.when)}</p>
      ${lines ? `<ul style="color: #555; padding-left: 18px;">${lines}</ul>` : ''}
      <p>${ask}</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Answer</a>
      <p style="color: #888; font-size: 13px; margin-top: 20px;">You get this because you run ${escapeHtml(params.profileName)} on WeDance. It’s also under “Needs you” on your Business home.</p>
    </div>`,
  })
}

/**
 * The answer to an artist invite or a venue ask, in writing, to whoever gave it.
 * `confirmUrl` (a magic link back to the invite) proves the address is theirs;
 * without it (signed in already) the button just opens the answer again.
 */
export async function sendInviteAnswerCopyEmail(params: {
  to: string
  name: string
  subject: string
  host: string
  lines: string[]
  confirmUrl: string | null
  link: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${params.subject} → ${params.confirmUrl ?? params.link}\n`)
    return
  }
  const lines = params.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')
  const button = (href: string, label: string) => `<a href="${href}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">${label}</a>`
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject: params.subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${escapeHtml(params.subject)}</h2>
      <p>Hey ${escapeHtml(params.name)}, here’s your answer to <strong>${escapeHtml(params.host)}</strong>, in writing:</p>
      ${lines ? `<ul style="color: #555; padding-left: 18px;">${lines}</ul>` : ''}
      ${params.confirmUrl
        ? `<p>Tap to confirm it was you. ${escapeHtml(params.host)} then sees your answer as confirmed.</p>${button(params.confirmUrl, 'That’s me, confirm')}
           <p style="color: #888; font-size: 13px; margin-top: 20px;">The button works for 7 days. Didn’t answer this? Ignore it: nothing is confirmed in your name. To change your answer, <a href="${params.link}">open it again</a>.</p>`
        : `${button(params.link, 'See or change your answer')}`}
    </div>`,
  })
}

/** Tell the organiser who asked that an artist or venue answered. */
export async function sendInviteAnsweredEmail(params: {
  to: string
  name: string
  subject: string
  lines: string[]
  confirmed: boolean
  link: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${params.subject} → ${params.link}\n`)
    return
  }
  const lines = params.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject: params.subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${escapeHtml(params.subject)}</h2>
      <p>Hey ${escapeHtml(params.name)}!</p>
      ${lines ? `<ul style="color: #555; padding-left: 18px;">${lines}</ul>` : ''}
      <p style="color: #555;">${params.confirmed ? '✅ Answered from an email address they confirmed.' : 'Answered through their link. You’ll see “email confirmed” once they confirm it was them.'}</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open the event</a>
    </div>`,
  })
}

/**
 * Someone asked to book an artist or venue from their WeDance page. Sent to
 * the page's team (else its private booking email, else WeDance to pass on).
 * Reply-To is the asker, so answering is just replying. Logged in local dev.
 */
export async function sendBookingInquiryEmail(params: {
  to: string
  name: string
  profileName: string
  forward: boolean
  from: { name: string; email: string; phone?: string | null; organization?: string | null }
  lines: string[]
  message: string
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `${params.from.name} wants to book ${params.profileName}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} (reply to ${params.from.email}) → ${params.link}\n`)
    return
  }
  const lines = params.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')
  const who = params.from.organization ? `${params.from.name} (${params.from.organization})` : params.from.name
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    replyTo: params.from.email,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p><strong>${escapeHtml(who)}</strong> wants to book <strong>${escapeHtml(params.profileName)}</strong> through WeDance.</p>
      ${lines ? `<ul style="color: #555; padding-left: 18px;">${lines}</ul>` : ''}
      <p style="white-space: pre-line; border-left: 3px solid #ddd; padding-left: 12px; color: #333;">${escapeHtml(params.message)}</p>
      <p>Reply to this email to answer ${escapeHtml(params.from.name)} directly (${escapeHtml(params.from.email)})${params.from.phone ? `, or call or WhatsApp them: <a href="https://wa.me/${escapeHtml(params.from.phone.replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, ''))}">${escapeHtml(params.from.phone)}</a>` : ''}.</p>
      <p>Or open it on WeDance and tap “Yes, book it”. That saves the booking, emails them, and puts you on a draft of their event when they have a page.</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open on WeDance</a>
      <p style="color: #888; font-size: 13px; margin-top: 20px;">${params.forward
        ? `Nobody runs ${escapeHtml(params.profileName)} on WeDance yet: pass this on to them.`
        : `You get this because you run ${escapeHtml(params.profileName)} on WeDance. It’s also under “Needs you” on your Business home.`}</p>
    </div>`,
  })
}

/** The artist said yes: the asker hears it on WeDance, with the draft when there is one. */
export async function sendBookingYesEmail(params: {
  to: string
  name: string
  artistName: string
  what: string
  lines: string[]
  link: string
  hasEvent: boolean
}) {
  const config = useRuntimeConfig()
  const subject = `${params.artistName} said yes`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const lines = params.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')
  const next = params.hasEvent
    ? `It’s saved on WeDance as a draft event, with ${escapeHtml(params.artistName)} in the line-up and your budget as the offer. Open it, check the details, and publish when you’re ready.`
    : `It’s saved on WeDance. Sign in with this email, then open Business to put them on an event.`
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p><strong>${escapeHtml(params.artistName)}</strong> said yes to <strong>${escapeHtml(params.what)}</strong>.</p>
      ${lines ? `<ul style="color: #555; padding-left: 18px;">${lines}</ul>` : ''}
      <p>${next}</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">${params.hasEvent ? 'Open the draft' : 'Open WeDance'}</a>
    </div>`,
  })
}

/** One nudge, three days on, to whoever still owes an answer. */
export async function sendBookingReminderEmail(params: {
  to: string
  name: string
  askerName: string
  profileName: string
  what: string
  sentOn: string
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `Still waiting: ${params.askerName} wants to book ${params.profileName}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p><strong>${escapeHtml(params.askerName)}</strong> asked to book <strong>${escapeHtml(params.profileName)}</strong> for ${escapeHtml(params.what)}${params.sentOn ? ` on ${escapeHtml(params.sentOn)}` : ''}. It’s still unanswered.</p>
      <p>Say yes on WeDance to save the booking and email them, or decline.</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open the request</a>
      <p style="color: #888; font-size: 13px; margin-top: 20px;">You get this once, three days after the request.</p>
    </div>`,
  })
}

/** Someone signed up on a profile's website (RAZ-412): tell the team. */
export async function sendSiteSignupTeamEmail(params: {
  to: string
  name: string
  profileName: string
  contact: { name: string; email: string; phone?: string | null; city?: string | null; locale?: string | null }
  source: Record<string, string>
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `New sign-up on your website: ${params.contact.name}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const rows = [
    ['Name', params.contact.name], ['Email', params.contact.email], ['Phone', params.contact.phone || ''], ['City', params.contact.city || ''], ['Language', params.contact.locale || ''],
    ...Object.entries(params.source).map(([k, v]) => [k, v]),
  ].filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding: 4px 12px 4px 0; color: #888;">${escapeHtml(k!)}</td><td>${escapeHtml(v!)}</td></tr>`).join('')
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    replyTo: params.contact.email,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p><strong>${escapeHtml(params.contact.name)}</strong> signed up on ${escapeHtml(params.profileName)}’s website.</p>
      <table style="border-collapse: collapse; font-size: 14px;">${rows}</table>
      <p style="margin-top: 16px;"><a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">See your contacts</a></p>
      <p style="color: #888; font-size: 13px;">Reply to this email to answer them directly.</p>
    </div>`,
  })
}

/** The welcome email a profile wrote for people who sign up on its website. */
export async function sendSiteWelcomeEmail(params: {
  to: string
  profileName: string
  replyTo?: string | null
  subject: string
  body: string
  siteUrl?: string | null
  unsubscribeUrl: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${params.subject}\n${params.body}\n`)
    return
  }
  // Plain paragraphs; bare links become links.
  const html = params.body.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join('')
  const from = (config.resendFromEmail || 'WeDance <noreply@wedance.vip>').replace(/^[^<]*</, `${params.profileName.replace(/[<>"]/g, '')} <`)
  await getResend().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    headers: { 'List-Unsubscribe': `<${params.unsubscribeUrl}>` },
    html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
      ${html}
      <p style="color: #999; font-size: 12px; margin-top: 32px;">${escapeHtml(params.profileName)}${params.siteUrl ? ` · <a href="${params.siteUrl}" style="color: #999;">${escapeHtml(params.siteUrl.replace(/^https?:\/\//, ''))}</a>` : ''} · via WeDance<br>
      <a href="${params.unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>
    </div>`,
  })
}

/** Gigs (MCP phase 2): someone applied to a gig role. Goes to the gig's contact email. */
export async function sendGigApplicationEmail(params: {
  to: string
  gigTitle: string
  applicant: { name: string; email: string; page?: string | null }
  message: string
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `${params.applicant.name} applied: ${params.gigTitle}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} (reply to ${params.applicant.email}) → ${params.link}\n`)
    return
  }
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    replyTo: params.applicant.email,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <p><strong>${escapeHtml(params.applicant.name)}</strong>${params.applicant.page ? ` (<a href="${params.applicant.page}">their page</a>)` : ''} applied to your gig <strong>${escapeHtml(params.gigTitle)}</strong> on WeDance.</p>
      <p style="white-space: pre-line; border-left: 3px solid #ddd; padding-left: 12px; color: #333;">${escapeHtml(params.message)}</p>
      <p>Reply to this email to answer them, or accept or decline on WeDance.</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">See applications</a>
    </div>`,
  })
}

/** Gigs: the poster accepted or declined an application. */
export async function sendGigDecisionEmail(params: { to: string; name: string; gigTitle: string; accepted: boolean; poster: { name: string; email: string }; link: string }) {
  const config = useRuntimeConfig()
  const subject = params.accepted ? `You’re in: ${params.gigTitle}` : `Your application: ${params.gigTitle}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    replyTo: params.poster.email,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Hey ${escapeHtml(params.name)}!</h2>
      <p>${params.accepted
        ? `<strong>${escapeHtml(params.poster.name)}</strong> accepted your application for <strong>${escapeHtml(params.gigTitle)}</strong>. Reply to this email to sort out the details.`
        : `<strong>${escapeHtml(params.poster.name)}</strong> went with someone else for <strong>${escapeHtml(params.gigTitle)}</strong>. Thanks for applying, and keep an eye on new gigs.`}</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open gigs</a>
    </div>`,
  })
}

/** Share my weekend (#527): a friend tapped "I'm in" on a party the dancer shared. */
export async function sendWeekendJoinEmail(params: {
  to: string
  name: string
  joiner: string
  eventName: string
  when: string
  coming: string[]
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `${params.joiner} is coming with you to ${params.eventName}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const others = params.coming.filter(n => n !== params.joiner)
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${escapeHtml(params.joiner)} is in 💃</h2>
      <p>Hey ${escapeHtml(params.name)}!</p>
      <p style="color: #555;">${escapeHtml(params.joiner)} tapped “I’m in” on your weekend plan: <strong>${escapeHtml(params.eventName)}</strong>${params.when ? `, ${escapeHtml(params.when)}` : ''}.</p>
      ${others.length ? `<p style="color: #555;">Also coming: ${escapeHtml(others.join(', '))}.</p>` : ''}
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">See your weekend</a>
    </div>`,
  })
}

/**
 * An organiser cancelled an event this person signed up for (RAZ-948): on their
 * plan, a "yes" on the event poll, or a ticket. Ticket buyers are told to
 * contact the organiser about a refund (refunds stay manual for now).
 */
export async function sendEventCancelledEmail(params: {
  to: string
  name: string
  eventName: string
  when: string
  reason: string | null
  organizer: string | null
  ticket: boolean
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `Cancelled: ${params.eventName}${params.when ? `, ${params.when}` : ''}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const by = params.organizer ? escapeHtml(params.organizer) : 'The organiser'
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${escapeHtml(params.eventName)} is cancelled</h2>
      <p>Hey ${escapeHtml(params.name || 'there')},</p>
      <p style="color: #555;">${by} cancelled <strong>${escapeHtml(params.eventName)}</strong>${params.when ? `, ${escapeHtml(params.when)}` : ''}. You had it on your plan, so we’re letting you know.</p>
      ${params.reason ? `<p style="color: #555; border-left: 3px solid #ddd; padding-left: 12px;">“${escapeHtml(params.reason)}”</p>` : ''}
      ${params.ticket ? `<p style="color: #555;">You have a ticket for it. For a refund, please contact ${params.organizer ? escapeHtml(params.organizer) : 'the organiser'} directly.</p>` : ''}
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">See the event</a>
    </div>`,
  })
}

/**
 * An organiser took the "Cancelled" mark off an event (RAZ-969): the people who
 * got the cancellation email hear it's on again. Ticket holders are told their
 * ticket still counts unless they already asked for a refund.
 */
export async function sendEventBackOnEmail(params: {
  to: string
  name: string
  eventName: string
  when: string
  organizer: string | null
  ticket: boolean
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `Good news, it’s on again: ${params.eventName}${params.when ? `, ${params.when}` : ''}`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const by = params.organizer ? escapeHtml(params.organizer) : 'The organiser'
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Good news, it’s on again 🎉</h2>
      <p>Hey ${escapeHtml(params.name || 'there')},</p>
      <p style="color: #555;">${by} cancelled <strong>${escapeHtml(params.eventName)}</strong>${params.when ? `, ${escapeHtml(params.when)}` : ''}, and now it’s back on. Check the details before you go.</p>
      ${params.ticket ? `<p style="color: #555;">You have a ticket for it. If you already asked for a refund, please check with ${params.organizer ? escapeHtml(params.organizer) : 'the organiser'} directly.</p>` : ''}
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">See the event</a>
    </div>`,
  })
}

/**
 * A city's WeDance admins ask an organiser what they plan for an occasion (RAZ-970):
 * "New Year's Eve is coming — planning something?". The answer is an event on WeDance,
 * which then lands in the city's weekly post and the occasion post by itself.
 */
export async function sendOccasionAskEmail(params: {
  to: string
  name: string
  pageName: string
  cityName: string
  occasion: string
  when: string
  message: string
  link: string
}) {
  const config = useRuntimeConfig()
  const subject = `${params.occasion} in ${params.cityName} — are you planning something?`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${escapeHtml(params.occasion)} · ${escapeHtml(params.when)}</h2>
      <p>Hey ${escapeHtml(params.name || 'there')},</p>
      <p style="color: #555; white-space: pre-line;">${escapeHtml(params.message)}</p>
      <p style="color: #888; font-size: 13px;">You get this because ${escapeHtml(params.pageName)} runs events in ${escapeHtml(params.cityName)} on WeDance.</p>
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Add your event</a>
    </div>`,
  })
}

/**
 * A page's email to its contacts (RAZ-975): the same text to many people, each with their
 * own name and unsubscribe link, sent with Resend's batch API (100 per call). From the page's
 * name, replies go to the person who sent it. Returns how many went out; a failed batch is
 * counted, never retried here (the send log keeps the numbers). `results` has one entry per
 * message, in order: Resend's email id (what its webhook reports delivered / opened / clicked /
 * bounced for), or null when that batch failed. `mailingId` tags each email so the webhook can
 * tell page emails from WeDance's own.
 */
export async function sendContactMailing(params: {
  profileName: string
  replyTo?: string | null
  subject: string
  mailingId?: string
  messages: { to: string; subject?: string; html: string; text: string; unsubscribeUrl?: string | null }[]
}): Promise<{ sent: number; failed: number; results: { resendId: string | null; ok: boolean }[] }> {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    for (const m of params.messages) console.log(`\n✉️  ${m.to}: ${m.subject ?? params.subject}\n${m.text}\n`)
    return { sent: params.messages.length, failed: 0, results: params.messages.map(() => ({ resendId: null, ok: true })) }
  }
  const from = (config.resendFromEmail || 'WeDance <noreply@wedance.vip>').replace(/^[^<]*</, `${params.profileName.replace(/[<>"]/g, '')} <`)
  let sent = 0
  let failed = 0
  const results: { resendId: string | null; ok: boolean }[] = []
  for (let i = 0; i < params.messages.length; i += 100) {
    const chunk = params.messages.slice(i, i + 100)
    try {
      const { data, error } = await getResend().batch.send(chunk.map(m => ({
        from,
        to: m.to,
        subject: m.subject ?? params.subject,
        html: m.html,
        text: m.text,
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        ...(m.unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${m.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
        ...(params.mailingId ? { tags: [{ name: 'mailing', value: params.mailingId }] } : {}),
      })))
      if (error) {
        console.error('[contact-mailing] batch failed', error)
        failed += chunk.length
        for (const _ of chunk) results.push({ resendId: null, ok: false })
      } else {
        sent += chunk.length
        chunk.forEach((_, j) => results.push({ resendId: data?.data?.[j]?.id ?? null, ok: true }))
      }
    } catch (e) {
      console.error('[contact-mailing] batch failed', e)
      failed += chunk.length
      for (const _ of chunk) results.push({ resendId: null, ok: false })
    }
  }
  return { sent, failed, results }
}

/**
 * The morning after (RAZ-1011): "How was Thursday at La Timberia?" to everyone who signed up.
 * Five star links open the event page with that rating picked (`?rate=N`); "Didn't make it?"
 * opens it with a one-tap "don't ask again" (a GET never changes anything — mail scanners
 * open links).
 */
export async function sendReviewAskEmail(params: {
  to: string
  name: string
  subject: string
  eventName: string
  host: string | null
  /** The event page; star links add `?rate=N`. */
  link: string
  /** The event page with the "didn't make it" step. */
  missedLink: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${params.subject} → ${params.link}?rate=5 · missed: ${params.missedLink}\n`)
    return
  }
  const sep = params.link.includes('?') ? '&' : '?'
  const stars = [1, 2, 3, 4, 5].map(n => `<a href="${params.link}${sep}rate=${n}" style="display: inline-block; width: 44px; margin-right: 6px; padding: 8px 0; border: 1px solid #ddd; border-radius: 8px; text-align: center; text-decoration: none; color: #333;"><span style="font-size: 22px; color: #f2a516;">★</span><br><span style="font-size: 11px; font-weight: bold;">${n}</span></a>`).join('')
  const sender = (params.host || 'WeDance').replace(/[<>"]/g, '')
  const from = (config.resendFromEmail || 'WeDance <noreply@wedance.vip>').replace(/^[^<]*</, `${params.host ? `${sender} via WeDance` : 'WeDance'} <`)
  await getResend().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #333;">${escapeHtml(params.subject)}</h2>
      <p>Hey ${escapeHtml(params.name || 'there')},</p>
      <p style="color: #555;">You signed up for <strong>${escapeHtml(params.eventName)}</strong>. One tap tells ${params.host ? escapeHtml(params.host) : 'the organiser'} and other dancers how it went:</p>
      <p style="margin: 16px 0;">${stars}</p>
      <p style="color: #777; font-size: 13px;">Each star opens the event page with that rating picked — add a line if you like.</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">Didn’t make it? <a href="${params.missedLink}" style="color: #999;">Tell us</a> and we won’t ask again.</p>
    </div>`,
  })
}

/**
 * "<Name> said yes too" (RAZ-985): someone this dancer said yes to (Meet deck or a
 * festival wave) said yes back. One per match, at most one a day; the link at the
 * bottom (and List-Unsubscribe) turns these off.
 */
export async function sendMeetMatchEmail(params: {
  to: string
  name: string
  other: string
  night: { name: string; when: string; link: string } | null
  link: string
  unsubscribeUrl: string
}) {
  const config = useRuntimeConfig()
  const subject = `${params.other} said yes too`
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${subject} → ${params.link}\n`)
    return
  }
  const o = escapeHtml(params.other)
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject,
    headers: { 'List-Unsubscribe': `<${params.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    html: `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">You and ${o} both said yes 💃</h2>
      <p>Hey ${escapeHtml(params.name)}!</p>
      <p style="color: #555;">You said yes to ${o} on WeDance, and ${o} just said yes to you. You’d both like to dance together.</p>
      ${params.night ? `<p style="color: #555;">A night you could both go to: <a href="${params.night.link}" style="color: #333; font-weight: bold;">${escapeHtml(params.night.name)}</a>, ${escapeHtml(params.night.when)}.</p>` : ''}
      <a href="${params.link}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">See your dance friends</a>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">You get this because you said yes to ${o} in Meet new friends or on a festival page. At most one a day. <a href="${params.unsubscribeUrl}" style="color: #999;">Stop these emails</a> · or turn them off in Settings.</p>
    </div>`,
  })
}

/**
 * The morning after a booked meetup (RAZ-1071): "How was it with Mary?"
 * The HTML is built in shared/utils/ritual.ts so the on-screen preview and the
 * sent mail say the same thing. Logged instead of sent when Resend isn't configured.
 */
export async function sendRitualFollowupEmail(params: {
  to: string
  subject: string
  html: string
  text: string
  unsubscribeUrl: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.log(`\n✉️  ${params.to}: ${params.subject}\n${params.text}\n`)
    return
  }
  await getResend().emails.send({
    from: config.resendFromEmail || 'WeDance <noreply@wedance.vip>',
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    headers: { 'List-Unsubscribe': `<${params.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  })
}
