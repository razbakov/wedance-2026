import { Resend } from 'resend'

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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
