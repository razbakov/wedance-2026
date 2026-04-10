// @ts-check
/* ========================================
   SDTV Client Form — Backend Server
   ========================================
   Express API serving:
   - Airtable proxy (festivals, captures, people)
   - Stripe payments (intents, promo codes)
   - Video preview delivery (ffmpeg-generated 720p cache)
   Port: 8001
   ======================================== */

const express = require('express');
const { execFile } = require('child_process');
const { existsSync, mkdirSync, statSync, createReadStream } = require('fs');
const path = require('path');

const app = express();
/** @type {number} */
const PORT = parseInt(process.env.PORT || '8001', 10);

// ffmpeg for preview generation — prefer ffmpeg-static, fall back to system ffmpeg
/** @type {string} */
const FFMPEG = (() => { try { return require('ffmpeg-static'); } catch { return 'ffmpeg'; } })();
const PREVIEW_DIR = path.join(__dirname, '.preview-cache');
if (!existsSync(PREVIEW_DIR)) mkdirSync(PREVIEW_DIR, { recursive: true });

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
if (!AIRTABLE_TOKEN) {
  console.error('FATAL: AIRTABLE_TOKEN env var required');
  process.exit(1);
}

// ── EMAIL (Gmail SMTP via nodemailer) ───────────────
const nodemailer = require('nodemailer');
const GMAIL_USER = process.env.GMAIL_USER;     // e.g. socialdancetv@gmail.com
const GMAIL_PASS = process.env.GMAIL_PASS;     // App Password from Google Account
let emailTransport = null;
if (GMAIL_USER && GMAIL_PASS) {
  emailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  console.log('Email initialized:', GMAIL_USER);
} else {
  console.warn('GMAIL_USER/GMAIL_PASS not set — email disabled');
}

async function sendDeliveryEmail({ to, dancers, festival, style, session, deliveryUrl, previewThumb }) {
  if (!emailTransport) { console.warn('Email not configured, skipping'); return; }

  const e = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const name = dancers || '';
  const hasName = !!name;
  const meta = [style, session].filter(Boolean).join(' · ');
  // Only use as thumbnail if it's an image URL, not a video
  const isImageUrl = previewThumb && /\.(jpg|jpeg|png|gif|webp)/i.test(previewThumb.split('?')[0]);
  const hasThumb = isImageUrl;
  const hasFestival = !!festival;

  // Subject: personal when possible
  const subject = hasName
    ? `${name} — your dance is ready`
    : `Your dance video is ready${hasFestival ? ' · ' + festival : ''}`;
  const preheader = hasFestival
    ? `Full HD, no watermark — ${festival}`
    : 'Full HD, no watermark — ready to download';

  // Font stacks
  const serif = "Georgia,'Times New Roman',Times,serif";
  const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  const c = { bg:'#07070a', card:'#0f0f12', surface:'#141417', ivory:'#f2efe9', muted:'#8a8580', faint:'#555350', dim:'#3a3835', red:'#c1453b', gold:'#e8b634', border:'rgba(255,255,255,0.05)' };

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${e(subject)}</title>
<!--[if !mso]><!--><style>@media(prefers-color-scheme:dark){.bg{background-color:${c.bg}!important}.card{background-color:${c.card}!important}}</style><!--<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${c.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${c.bg};">${e(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>

<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><![endif]-->
<table class="bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.bg};">
<tr><td align="center" style="padding:28px 12px 36px;">

<!-- CARD -->
<table class="card" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;background-color:${c.card};border-radius:20px;">

  <!-- BRAND -->
  <tr><td style="padding:26px 28px 0;text-align:center;">
    <span style="font-family:${sans};font-size:10px;font-weight:700;letter-spacing:0.2em;color:${c.red};text-transform:uppercase;">SOCIAL DANCE TV</span>
  </td></tr>

  <!-- THIN RULE -->
  <tr><td style="padding:18px 32px 0;"><div style="height:1px;background:${c.border};"></div></td></tr>

  <!-- HEADLINE -->
  <tr><td style="padding:22px 28px 0;text-align:center;">
    <h1 style="margin:0;font-family:${serif};font-size:28px;font-weight:700;color:${c.ivory};line-height:1.15;letter-spacing:-0.01em;">Your video is ready</h1>
  </td></tr>

  <!-- NAMES + META -->
  <tr><td style="padding:${hasName ? '10' : '0'}px 28px 0;text-align:center;">
    ${hasName ? `<p style="margin:0;font-family:${sans};font-size:16px;font-weight:600;color:${c.ivory};line-height:1.3;">${e(name)}</p>` : ''}
    ${meta || hasFestival ? `<p style="margin:${hasName ? '4' : '10'}px 0 0;font-family:${sans};font-size:12px;color:${c.faint};letter-spacing:0.03em;">${e([meta, festival].filter(Boolean).join(' · '))}</p>` : ''}
  </td></tr>

  <!-- PREVIEW IMAGE -->
  <tr><td style="padding:22px 20px 0;">
    <a href="${e(deliveryUrl)}" style="display:block;text-decoration:none;">
      ${hasThumb
        ? `<img src="${e(previewThumb)}" alt="${e(name || 'Your dance')} — tap to watch" width="400" style="display:block;width:100%;height:auto;border-radius:12px;" />`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0d" style="background-color:#0a0a0d;border-radius:12px;">
            <tr><td align="center" height="180" style="text-align:center;vertical-align:middle;font-size:0;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/YouTube_play_button_icon_%282013%E2%80%932017%29.svg/64px-YouTube_play_button_icon_%282013%E2%80%932017%29.svg.png" alt="Play" width="48" height="34" style="display:inline-block;border:0;outline:none;" />
            </td></tr>
            <tr><td align="center" style="padding:0 0 20px;font-family:${sans};font-size:12px;color:${c.faint};text-align:center;">Tap to watch your video</td></tr>
          </table>`
      }
    </a>
  </td></tr>

  <!-- TRUST LINE -->
  <tr><td style="padding:14px 28px 0;text-align:center;">
    <p style="margin:0;font-family:${sans};font-size:11px;color:${c.faint};letter-spacing:0.04em;">Full HD &nbsp;·&nbsp; No watermark &nbsp;·&nbsp; Yours forever</p>
  </td></tr>

  <!-- PRIMARY CTA -->
  <tr><td style="padding:22px 24px 0;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${e(deliveryUrl)}" style="height:52px;width:392px;" arcsize="27%" fillcolor="${c.red}" stroke="f"><v:textbox style="mso-fit-shape-to-text:t" inset="0,0,0,0"><center style="font-size:16px;font-weight:700;color:#ffffff;font-family:${sans};">Download My Video</center></v:textbox></v:roundrect><![endif]-->
    <!--[if !mso]><!-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="background-color:${c.red};border-radius:14px;">
        <a href="${e(deliveryUrl)}" style="display:block;padding:17px 32px;font-family:${sans};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;line-height:1.2;">Download My Video</a>
      </td></tr>
    </table>
    <!--<![endif]-->
  </td></tr>

  <!-- SECONDARY CTA -->
  <tr><td style="padding:14px 28px 0;text-align:center;">
    <a href="${e(deliveryUrl)}" style="font-family:${sans};font-size:13px;font-weight:500;color:${c.muted};text-decoration:none;border-bottom:1px solid ${c.dim};">Watch Preview Online</a>
  </td></tr>

  <!-- INFO CARD -->
  <tr><td style="padding:24px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.surface};border-radius:12px;">
      <tr><td style="padding:16px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${hasName ? `<tr><td style="font-family:${sans};font-size:11px;color:${c.faint};padding-bottom:2px;">Dancers</td><td align="right" style="font-family:${sans};font-size:12px;color:${c.ivory};font-weight:600;padding-bottom:2px;">${e(name)}</td></tr>` : ''}
          ${hasFestival ? `<tr><td style="font-family:${sans};font-size:11px;color:${c.faint};padding-bottom:2px;">Event</td><td align="right" style="font-family:${sans};font-size:12px;color:${c.ivory};padding-bottom:2px;">${e(festival)}</td></tr>` : ''}
          ${style ? `<tr><td style="font-family:${sans};font-size:11px;color:${c.faint};padding-bottom:2px;">Style</td><td align="right" style="font-family:${sans};font-size:12px;color:${c.ivory};padding-bottom:2px;">${e(style)}</td></tr>` : ''}
          <tr><td style="font-family:${sans};font-size:11px;color:${c.faint};">Format</td><td align="right" style="font-family:${sans};font-size:12px;color:${c.ivory};">HD &nbsp;&#10003;</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="padding:22px 32px 0;"><div style="height:1px;background:${c.border};"></div></td></tr>

  <!-- UPSELL -->
  <tr><td style="padding:22px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.surface};border-radius:12px;border:1px solid ${c.border};">
      <tr><td style="padding:20px;">
        <p style="margin:0;font-family:${sans};font-size:10px;font-weight:700;color:${c.gold};text-transform:uppercase;letter-spacing:0.08em;">SDTV Feature Package</p>
        <p style="margin:8px 0 0;font-family:${serif};font-size:16px;font-weight:700;color:${c.ivory};line-height:1.3;">Turn this dance into something stronger</p>
        <p style="margin:8px 0 0;font-family:${sans};font-size:12px;color:${c.faint};line-height:1.6;">We select the strongest moment from your clip, edit it for social media, shape the caption, and deliver a polished feature-ready piece that represents your dance at its best.</p>
        <p style="margin:14px 0 0;"><a href="${e(deliveryUrl)}" style="font-family:${sans};font-size:13px;font-weight:600;color:${c.red};text-decoration:none;">See the SDTV Feature &rarr;</a></p>
      </td></tr>
    </table>
  </td></tr>

  <!-- PARTNER SHARE -->
  <tr><td style="padding:20px 28px 0;text-align:center;">
    <p style="margin:0;font-family:${sans};font-size:12px;color:${c.faint};">Danced with a partner? <a href="${e(deliveryUrl)}" style="color:${c.muted};text-decoration:none;border-bottom:1px solid ${c.dim};">Share the link</a></p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 28px 28px;text-align:center;">
    <p style="margin:0;font-family:${sans};font-size:10px;color:${c.dim};line-height:1.7;">
      Social Dance TV<br>
      <a href="https://instagram.com/socialdancetv" style="color:${c.faint};text-decoration:none;">@socialdancetv</a>
    </p>
  </td></tr>

</table>
<!-- /CARD -->

</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->

</body></html>`;

  try {
    await emailTransport.sendMail({
      from: `"Social Dance TV" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Delivery email sent to', to);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

async function sendNotifyConfirmEmail({ to, dancerName, festival }) {
  if (!emailTransport) return;

  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const name = dancerName || 'there';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#08080a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#08080a;">
<tr><td align="center" style="padding:32px 16px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;background-color:#111113;border-radius:20px;overflow:hidden;">

  <tr><td style="padding:28px 28px 0;text-align:center;">
    <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;color:#c1453b;text-transform:uppercase;">Social Dance TV</span>
  </td></tr>

  <tr><td style="padding:16px 28px 0;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);"></div></td></tr>

  <tr><td style="padding:24px 28px 0;text-align:center;">
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#f4f1ec;line-height:1.2;">We're on it</h1>
  </td></tr>

  <tr><td style="padding:14px 28px 0;text-align:center;">
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#8a8580;line-height:1.6;">Hey ${e(name)}, your dance${festival ? ' from <strong style="color:#f4f1ec;">' + e(festival) + '</strong>' : ''} is being edited. We'll send you one email the moment it's ready to watch and download.</p>
  </td></tr>

  <tr><td style="padding:24px 28px 0;text-align:center;">
    <div style="display:inline-block;background-color:#161618;border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:14px 24px;">
      <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#6b6560;">No spam &middot; Just one email when your video drops</span>
    </div>
  </td></tr>

  <tr><td style="padding:28px 28px 28px;text-align:center;">
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;color:#3a3835;line-height:1.6;">
      Social Dance TV &middot; <a href="https://instagram.com/socialdancetv" style="color:#5a5650;text-decoration:none;">@socialdancetv</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  try {
    await emailTransport.sendMail({
      from: `"Social Dance TV" <${GMAIL_USER}>`,
      to,
      subject: festival ? `We're editing your dance — ${festival}` : `We're editing your dance video`,
      html,
    });
    console.log('Notify confirmation email sent to', to);
  } catch (e) {
    console.error('Notify email error:', e.message);
  }
}

// ── STRIPE ──────────────────────────────────────────
const STRIPE_SECRET = process.env.STRIPE_SECRET;
let stripe = null;
if (STRIPE_SECRET) {
  stripe = require('stripe')(STRIPE_SECRET);
  console.log('Stripe initialized');
} else {
  console.warn('STRIPE_SECRET not set — payments disabled');
}

const BASE_ID = 'appsgtrfnVi2IccFb';
const AIRTABLE_BASE = `https://api.airtable.com/v0/${BASE_ID}`;
const TABLES = {
  festivals:     'tblfxBXaajR8Pny9k',
  people:        'tblZR7aYmeSGvPqE2',
  captures:      'tblgiQssV0qnosiUl',
  notifications: 'tblWdNvW7mYibjddz',
  reservations:  'tblIon4g1QQdkUkpk',
  sessions:      'tblmI2kd2d9D8Pb1W',
};

// ── SECURITY HEADERS ────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── GZIP / BROTLI ───────────────────────────────────
app.use(require('compression')());

app.use(express.json());
app.use(express.static(__dirname, {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const headers = {
  'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Sanitize user input for Airtable formula strings.
 * Strips quotes, braces, newlines — prevents formula injection.
 * @param {string} str — raw user input
 * @returns {string} safe string for FIND()/formula use, max 100 chars
 */
function sanitizeForFormula(str) {
  return String(str).replace(/[\\"]/g, '').replace(/[{}()\n\r]/g, '').substring(0, 100);
}

/**
 * Fetch from Airtable with automatic retry (exponential backoff).
 * Retries on 429 (rate limit) and 5xx errors, up to 3 attempts.
 * @param {string} path — Airtable table/record path or full URL
 * @param {RequestInit & {headers?: Record<string, string>}} [opts]
 * @returns {Promise<any>} parsed JSON response
 */
async function airtableFetch(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${AIRTABLE_BASE}/${path}`;
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, { ...opts, headers: { ...headers, ...opts.headers } });
    if (res.status === 429 || (res.status >= 500 && attempt < maxRetries - 1)) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw { status: res.status, data };
    return data;
  }
}

// ── GET /api/festivals ──────────────────────────────
// Returns all festivals for the archive search + reserve filming
let festivalCache = { data: null, ts: 0 };
app.get('/api/festivals', async (req, res) => {
  try {
    const now = Date.now();
    if (festivalCache.data && now - festivalCache.ts < 5 * 60 * 1000) {
      return res.json(festivalCache.data);
    }
    const sort = `sort%5B0%5D%5Bfield%5D=Start%20Date&sort%5B0%5D%5Bdirection%5D=desc`;
    const data = await airtableFetch(`${TABLES.festivals}?${sort}`);
    festivalCache = { data, ts: now };
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load festivals' });
  }
});

// ── GET /api/sessions?festivalId=recXXX ─────────
// Returns filming sessions for a festival, with real availability
const sessionCache = {};
app.get('/api/sessions', async (req, res) => {
  try {
    const festivalId = (req.query.festivalId || '').trim();
    if (!festivalId || !festivalId.startsWith('rec')) {
      return res.status(400).json({ error: 'festivalId required' });
    }

    const fresh = req.query.fresh === '1';
    const cacheKey = festivalId;
    const now = Date.now();
    if (!fresh && sessionCache[cacheKey] && now - sessionCache[cacheKey].ts < 90 * 1000) {
      return res.json(sessionCache[cacheKey].data);
    }

    // Fetch all non-hidden sessions, then filter by festival link in JS
    // (Airtable formula can't reliably filter by linked record IDs)
    const formula = encodeURIComponent(`Status != "Hidden"`);
    const sort = `sort%5B0%5D%5Bfield%5D=Day&sort%5B0%5D%5Bdirection%5D=asc&sort%5B1%5D%5Bfield%5D=Sort%20Order&sort%5B1%5D%5Bdirection%5D=asc`;
    const data = await airtableFetch(`${TABLES.sessions}?filterByFormula=${formula}&${sort}`);
    const sessions = (data.records || []).filter(s => {
      const linked = s.fields.Festival;
      return Array.isArray(linked) && linked.includes(festivalId);
    });

    // Count confirmed reservations per session
    const sessionIds = new Set(sessions.map(s => s.id));
    const bookedMap = {};
    if (sessionIds.size > 0) {
      try {
        const resFormula = encodeURIComponent(`{Booking Status} = "Confirmed"`);
        const resFields = `fields%5B%5D=${encodeURIComponent('Session')}`;
        const resData = await airtableFetch(`${TABLES.reservations}?filterByFormula=${resFormula}&${resFields}`);
        for (const r of (resData.records || [])) {
          const linked = r.fields.Session;
          if (Array.isArray(linked)) {
            for (const sid of linked) {
              if (sessionIds.has(sid)) {
                bookedMap[sid] = (bookedMap[sid] || 0) + 1;
              }
            }
          }
        }
      } catch (e) {
        // If reservation counting fails, default to 0 — don't block session listing
      }
    }

    // Build response
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const result = sessions.map(s => {
      const f = s.fields;
      const capacity = f.Capacity || 0;
      const booked = bookedMap[s.id] || 0;
      const spotsLeft = Math.max(0, capacity - booked);
      const status = f.Status || 'Open';
      const isBookable = (status === 'Open' || status === 'Few Spots') && spotsLeft > 0;

      // Build day label from date
      const d = f.Day ? new Date(f.Day + 'T12:00:00') : null;
      const dayLabel = d
        ? `${weekdays[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`
        : f.Day || '';

      return {
        id: s.id,
        festivalId,
        label: f['Session Name'] || '',
        day: f.Day || '',
        dayLabel,
        timeStart: f['Time Start'] || '',
        timeEnd: f['Time End'] || '',
        desc: f.Description || '',
        status,
        capacity,
        booked,
        spotsLeft,
        isBookable,
        sortOrder: f['Sort Order'] || 0,
      };
    });

    const response = { sessions: result };
    sessionCache[cacheKey] = { data: response, ts: now };
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// ── GET /api/people/autocomplete?q=xxx ──────────
// Partial match on IG + Name, returns up to 5 results
app.get('/api/people/autocomplete', async (req, res) => {
  try {
    const q = sanitizeForFormula((req.query.q || '').trim().toLowerCase().replace(/^@/, ''));
    if (q.length < 2) return res.json({ records: [] });
    const formula = encodeURIComponent(
      `OR(FIND("${q}", LOWER({Instagram}))>0, FIND("${q}", LOWER({Name}))>0)`
    );
    const fields = ['Instagram','Email','Name'].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const data = await airtableFetch(`${TABLES.people}?filterByFormula=${formula}&maxRecords=5&${fields}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// ── GET /api/captures/search?ig=@handle ──────────────
// Find all captures for a dancer by IG handle
// Returns array of { danceId, videoTitle, festival, session, style, status, previewUrl, capturedAt }
app.get('/api/captures/search', async (req, res) => {
  try {
    const ig = (req.query.ig || '').trim();
    if (!ig || ig.length < 2) return res.json({ results: [] });

    const igNorm = ig.startsWith('@') ? ig : '@' + ig;
    // Strip dots, spaces, underscores for fuzzy matching
    const igClean = sanitizeForFormula(igNorm.replace(/[\s._-]/g, '').toLowerCase());
    const formula = encodeURIComponent(
      `OR(FIND("${igClean}", SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(LOWER({Partner 1 IG}), ".", ""), " ", ""), "_", ""))>0, FIND("${igClean}", SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(LOWER({Partner 2 IG}), ".", ""), " ", ""), "_", ""))>0)`
    );
    const fields = [
      'Dance ID', 'Video Title', 'Session', 'Dance Style',
      'Status', 'Preview URL', 'Captured At',
      'Partner 1 IG', 'Partner 1 Name', 'Partner 2 IG', 'Partner 2 Name'
    ].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const sort = `sort%5B0%5D%5Bfield%5D=Captured%20At&sort%5B0%5D%5Bdirection%5D=desc`;

    const data = await airtableFetch(`${TABLES.captures}?filterByFormula=${formula}&${fields}&${sort}`);

    const results = (data.records || []).map(r => {
      const f = r.fields;
      return {
        id: r.id,
        danceId: f['Dance ID'] || '',
        videoTitle: f['Video Title'] || '',
        session: f['Session'] || '',
        style: f['Dance Style'] || '',
        status: f['Status'] || 'Captured',
        previewUrl: f['Preview URL'] || '',
        capturedAt: f['Captured At'] || '',
        partner1: { ig: f['Partner 1 IG'] || '', name: f['Partner 1 Name'] || '' },
        partner2: { ig: f['Partner 2 IG'] || '', name: f['Partner 2 Name'] || '' },
      };
    });

    res.json({ results, count: results.length });
  } catch (e) {
    console.error('Search error:', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── POST /api/people/upsert ──────────────────────────
// Smart dedup: IG → Email → Name → create
// Same logic as capture form server
app.post('/api/people/upsert', async (req, res) => {
  try {
    const { ig, email, name, source, paid } = req.body || {};
    if (!ig && !email && !name) {
      return res.status(400).json({ error: 'Need at least ig, email, or name' });
    }
    const now = new Date().toISOString();
    const capName = name ? name.replace(/\b\w/g, c => c.toUpperCase()) : '';
    let existing = null;
    let matchedBy = null;

    // Step 1: Search by IG
    if (ig) {
      const igNorm = ig.startsWith('@') ? ig : '@' + ig;
      const formula = encodeURIComponent(`{Instagram}="${sanitizeForFormula(igNorm)}"`);
      const data = await airtableFetch(`${TABLES.people}?filterByFormula=${formula}&maxRecords=1`);
      if (data.records?.length > 0) { existing = data.records[0]; matchedBy = 'ig'; }
    }
    // Step 2: Search by email
    if (!existing && email) {
      const formula = encodeURIComponent(`{Email}="${sanitizeForFormula(email)}"`);
      const data = await airtableFetch(`${TABLES.people}?filterByFormula=${formula}&maxRecords=1`);
      if (data.records?.length > 0) { existing = data.records[0]; matchedBy = 'email'; }
    }
    // Step 3: Search by name (partial records only)
    if (!existing && capName) {
      const formula = encodeURIComponent(`AND({Name}="${sanitizeForFormula(capName)}", {Instagram}=BLANK(), {Email}=BLANK())`);
      const data = await airtableFetch(`${TABLES.people}?filterByFormula=${formula}&maxRecords=1`);
      if (data.records?.length > 0) { existing = data.records[0]; matchedBy = 'name'; }
    }

    if (existing) {
      const f = existing.fields;
      const upd = { 'Last Seen': now, 'Capture Count': (f['Capture Count'] || 0) + 1 };
      if (ig) { const n = ig.startsWith('@') ? ig : '@' + ig; if (n !== f.Instagram) upd.Instagram = n; }
      // paid=true (from checkout) → set primary Email only if empty
      if (email && paid && !f.Email) {
        upd.Email = email;
      }
      if (email && email.toLowerCase() !== (f['Delivery Email'] || '').toLowerCase()) {
        upd['Delivery Email'] = email;
      }
      if (capName && !f.Name) upd.Name = capName;
      if (source) upd['Last Source'] = source;

      await airtableFetch(`${TABLES.people}/${existing.id}`, {
        method: 'PATCH', body: JSON.stringify({ fields: upd })
      });
      return res.json({ action: 'updated', matchedBy });
    } else {
      const fields = { 'First Seen': now, 'Last Seen': now, 'Capture Count': 1 };
      if (ig) fields.Instagram = ig.startsWith('@') ? ig : '@' + ig;
      if (email && paid) fields.Email = email;
      if (email) fields['Delivery Email'] = email;
      if (capName) fields.Name = capName;
      fields.Source = source || 'Client form';
      if (source) fields['Last Source'] = source;

      await airtableFetch(TABLES.people, {
        method: 'POST', body: JSON.stringify({ records: [{ fields }], typecast: true })
      });
      return res.json({ action: 'created' });
    }
  } catch (e) {
    console.error('Upsert error:', e);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// ── POST /api/notifications ──────────────────────────
// Create a notification request (Notify Me flow)
app.post('/api/notifications', async (req, res) => {
  try {
    const { ig, email, festival, channel, template } = req.body || {};
    const ref = `NTF-${Date.now().toString(36).toUpperCase()}`;
    const fields = {
      'Notification Ref': ref,
      'Channel': channel || 'Email',
      'Status': 'Queued',
      'Sent At': null,
    };
    if (ig) fields['Recipient IG'] = ig.startsWith('@') ? ig : '@' + ig;
    if (email) fields['Recipient Email'] = email;
    if (template) fields['Template'] = template;
    if (festival) fields['Notes'] = `Festival: ${festival}`;

    await airtableFetch(TABLES.notifications, {
      method: 'POST', body: JSON.stringify({ records: [{ fields }], typecast: true })
    });

    // Send confirmation email if this is a notify-me request
    if (email && template && template.includes('Video ready')) {
      sendNotifyConfirmEmail({ to: email, dancerName: ig || '', festival: festival || '' });
    }

    res.json({ ok: true, ref });
  } catch (e) {
    console.error('Notification error:', e);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ── POST /api/send-delivery-email ──────────────────
// Send branded delivery email after payment
app.post('/api/send-delivery-email', async (req, res) => {
  try {
    const { email, captureId, ig, festival } = req.body || {};
    if (!email || !captureId) {
      return res.status(400).json({ error: 'Email and captureId required' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const deliveryUrl = `${baseUrl}/delivery?id=${encodeURIComponent(captureId)}`;

    // Fetch capture details for rich email
    let dancers = ig || '';
    let style = '';
    let session = '';
    let previewThumb = '';
    try {
      const cap = await airtableFetch(`${TABLES.captures}/${captureId}`);
      const f = cap.fields || {};
      const p1 = f['Partner 1 Name'] || '';
      const p2 = f['Partner 2 Name'] || '';
      dancers = f['Video Title'] || [p1, p2].filter(Boolean).join(' & ') || ig || '';
      style = f['Dance Style'] || '';
      session = f['Session'] || '';
      previewThumb = f['Preview URL'] || '';
    } catch {}

    await sendDeliveryEmail({
      to: email,
      dancers,
      festival: festival || '',
      style,
      session,
      deliveryUrl,
      previewThumb,
    });

    res.json({ ok: true, deliveryUrl });
  } catch (e) {
    console.error('Delivery email error:', e.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ── POST /api/reservations ──────────────────────────
// Book a filming slot at a festival
app.post('/api/reservations', async (req, res) => {
  try {
    const { festival, festivalId, sessionId, day, style, ig, email, name, package: pkg, notes } = req.body || {};
    if (!festival || !ig && !email) {
      return res.status(400).json({ error: 'Festival and contact info required' });
    }

    // Server-side session validation (if sessionId provided)
    if (sessionId) {
      try {
        const sessionData = await airtableFetch(`${TABLES.sessions}/${sessionId}`);
        const sf = sessionData.fields || {};
        const sessionStatus = sf.Status || '';
        if (sessionStatus === 'Hidden' || sessionStatus === 'Closed') {
          return res.status(409).json({ error: 'This session is no longer available' });
        }
        // Check capacity
        const capacity = sf.Capacity || 0;
        if (capacity > 0) {
          const formula = encodeURIComponent(
            `AND({Booking Status} = "Confirmed", FIND("${sessionId}", ARRAYJOIN(RECORD_ID(Session))))`
          );
          const resData = await airtableFetch(`${TABLES.reservations}?filterByFormula=${formula}&fields%5B%5D=Session`);
          const booked = (resData.records || []).length;
          if (booked >= capacity) {
            return res.status(409).json({ error: 'This session is fully booked' });
          }
        }
        // Verify session belongs to festival
        const linkedFest = sf.Festival;
        if (festivalId && Array.isArray(linkedFest) && !linkedFest.includes(festivalId)) {
          return res.status(409).json({ error: 'Session does not match selected festival' });
        }
      } catch (e) {
        return res.status(409).json({ error: 'Session not found' });
      }
    }

    const ref = `RSV-${Date.now().toString(36).toUpperCase()}`;
    const capName = name ? name.replace(/\b\w/g, c => c.toUpperCase()) : '';
    const fields = {
      'Reservation ID': ref,
      'Festival': festival,
      'Status': 'Reserved',
      'Booking Status': 'Pending',
      'Created At': new Date().toISOString(),
    };
    if (sessionId) fields['Session'] = [sessionId];
    if (day) fields['Day'] = day;
    if (style) fields['Dance Style'] = style;
    if (ig) fields['Instagram'] = ig.startsWith('@') ? ig : '@' + ig;
    if (email) fields['Email'] = email;
    if (capName) fields['Name'] = capName;
    if (pkg) fields['Package'] = pkg;
    if (notes) fields['Notes'] = notes;

    await airtableFetch(TABLES.reservations, {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }], typecast: true })
    });

    // Invalidate session cache for this festival
    if (festivalId) delete sessionCache[festivalId];

    // Also upsert into People table
    if (ig || email) {
      try {
        const personFields = {};
        const now = new Date().toISOString();
        // Quick search + upsert
        let existing = null;
        if (ig) {
          const igNorm = ig.startsWith('@') ? ig : '@' + ig;
          const formula = encodeURIComponent(`{Instagram}="${sanitizeForFormula(igNorm)}"`);
          const data = await airtableFetch(`${TABLES.people}?filterByFormula=${formula}&maxRecords=1`);
          if (data.records?.length) existing = data.records[0];
        }
        if (!existing && email) {
          const formula = encodeURIComponent(`{Email}="${sanitizeForFormula(email)}"`);
          const data = await airtableFetch(`${TABLES.people}?filterByFormula=${formula}&maxRecords=1`);
          if (data.records?.length) existing = data.records[0];
        }
        if (existing) {
          const upd = { 'Last Seen': now, 'Last Source': 'Reservation' };
          await airtableFetch(`${TABLES.people}/${existing.id}`, {
            method: 'PATCH', body: JSON.stringify({ fields: upd })
          });
        } else {
          const pf = { 'First Seen': now, 'Last Seen': now, 'Source': 'Reservation', 'Last Source': 'Reservation', 'Capture Count': 0 };
          if (ig) pf['Instagram'] = ig.startsWith('@') ? ig : '@' + ig;
          if (email) pf['Email'] = email;
          if (capName) pf['Name'] = capName;
          await airtableFetch(TABLES.people, {
            method: 'POST', body: JSON.stringify({ records: [{ fields: pf }], typecast: true })
          });
        }
      } catch (e) { /* non-fatal */ }
    }

    res.json({ ok: true, ref });
  } catch (e) {
    console.error('Reservation error:', e);
    res.status(500).json({ error: 'Failed to save reservation' });
  }
});

// ── PROMO CODES (via Stripe Promotion Codes) ─────────────
const SDTV_PRODUCTS = {
  social_video: 'prod_T2OrtAmOZ7MJVV', // Social Dance Video €100
};
const SDTV_PRICING = {
  base: 10000,        // €100 in cents
  earlybird: 8000,    // €80 in cents (pre-edit reserve)
  couponId: 'EARLYBIRD',
};
const EARLYBIRD_STATUSES = ['Captured', 'Processing', 'Waitlisted'];

// ── GET /api/validate-promo?code=XXX&amount=10000
app.get('/api/validate-promo', async (req, res) => {
  if (!stripe) return res.json({ valid: false, error: 'Payments not configured' });

  const code = (req.query.code || '').trim();
  const amount = parseInt(req.query.amount) || 10000; // cents

  if (!code) return res.json({ valid: false, error: 'No code provided' });

  try {
    // Search Stripe for this promotion code
    const promoCodes = await stripe.promotionCodes.list({ code, active: true, limit: 1 });

    if (!promoCodes.data.length) {
      return res.json({ valid: false, error: 'Invalid promo code' });
    }

    const promo = promoCodes.data[0];
    // Stripe SDK v22+: coupon is under promo.promotion.coupon (ID string)
    // Older SDKs: coupon is promo.coupon (expanded object)
    let coupon = promo.coupon;
    if (!coupon && promo.promotion?.coupon) {
      coupon = await stripe.coupons.retrieve(promo.promotion.coupon);
    } else if (typeof coupon === 'string') {
      coupon = await stripe.coupons.retrieve(coupon);
    }

    if (!coupon || !coupon.valid) {
      return res.json({ valid: false, error: 'This code has expired' });
    }

    let discount = 0;
    let type = 'fixed';
    let value = 0;

    if (coupon.percent_off) {
      type = 'percent';
      value = coupon.percent_off;
      discount = Math.round(amount * coupon.percent_off / 100);
    } else if (coupon.amount_off) {
      type = 'fixed';
      value = coupon.amount_off / 100; // Stripe stores in cents
      discount = coupon.amount_off;
    }
    discount = Math.min(discount, amount);

    const description = coupon.name || promo.code || 'Discount';

    res.json({
      valid: true,
      code: promo.code,
      promoId: promo.id,
      couponId: coupon.id,
      type,
      value,
      discount,
      description,
      newTotal: amount - discount,
    });
  } catch (e) {
    console.error('Promo validation error:', e.message);
    res.json({ valid: false, error: 'Could not validate code' });
  }
});

// ── POST /api/create-payment-intent ──────────────────
// Create a Stripe PaymentIntent for checkout
// Server determines price from capture status — client cannot set amount
app.post('/api/create-payment-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' });
  try {
    const { captureId, currency, description, metadata, promoId } = req.body || {};

    // Determine price server-side based on capture status
    let amount = SDTV_PRICING.base;
    let appliedCoupon = null;

    if (captureId) {
      try {
        const capData = await airtableFetch(`${TABLES.captures}/${captureId}`);
        const status = capData.fields?.['Status'] || 'Captured';
        if (EARLYBIRD_STATUSES.includes(status)) {
          amount = SDTV_PRICING.earlybird;
          appliedCoupon = SDTV_PRICING.couponId;
        }
      } catch (e) {
        console.warn('Could not verify capture status, using base price:', e.message);
      }
    }

    // Apply user promo code on top (if valid and no early-bird already applied)
    if (promoId && !appliedCoupon) {
      // User-submitted promo — discount already calculated client-side
      // but we re-validate server-side
      const clientAmount = req.body.amount;
      if (clientAmount && clientAmount < amount && clientAmount >= 0) {
        amount = Math.round(clientAmount);
      }
    }

    if (amount < 100) {
      return res.status(400).json({ error: 'Amount must be at least €1 (100 cents)' });
    }

    const piParams = {
      amount,
      currency: currency || 'eur',
      description: description || 'SDTV Video Purchase',
      metadata: {
        ...(metadata || {}),
        product: SDTV_PRODUCTS.social_video,
        ...(captureId ? { captureId } : {}),
        ...(appliedCoupon ? { coupon: appliedCoupon } : {}),
        ...(promoId ? { promotion_code: promoId } : {}),
      },
      automatic_payment_methods: { enabled: true },
    };
    const paymentIntent = await stripe.paymentIntents.create(piParams);
    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount,
      appliedCoupon,
    });
  } catch (e) {
    console.error('Stripe error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// ── GET /api/preview/:captureId ─────────────────────
// Preview delivery with ffmpeg-generated lightweight files:
//   1. Check disk cache for pre-generated 720p preview (~2-3MB)
//   2. If missing → download original from Dropbox, ffmpeg → 720p/10s/faststart
//   3. Serve cached preview file (supports Range for instant <video> playback)
// Result: first user ~15s wait (one-time), all others <100ms

const previewUrlCache = new Map();
const generatingSet = new Set();  // captureIds currently being generated

// Resolve Dropbox URL from Airtable (cached 10 min)
async function resolvePreviewUrl(captureId) {
  let cached = previewUrlCache.get(captureId);
  if (cached) return cached;

  const data = await airtableFetch(`${TABLES.captures}/${captureId}`);
  let videoUrl = data.fields?.['Preview URL'];
  if (!videoUrl) return null;

  if (videoUrl.includes('dropbox.com')) {
    videoUrl = videoUrl.replace(/dl=0/, 'dl=1').replace(/www\.dropbox\.com/, 'dl.dropboxusercontent.com');
  }

  previewUrlCache.set(captureId, videoUrl);
  setTimeout(() => previewUrlCache.delete(captureId), 10 * 60 * 1000);
  return videoUrl;
}

/**
 * Generate 720p/10s faststart preview via ffmpeg.
 * ffmpeg reads directly from URL — no full download to disk needed.
 * Result: ~2-3MB file with moov atom at start = instant browser playback.
 * @param {string} captureId — Airtable record ID (used as filename)
 * @param {string} sourceUrl — Dropbox direct download URL
 * @returns {Promise<string>} path to generated preview file
 */
function generatePreview(captureId, sourceUrl) {
  return new Promise((resolve, reject) => {
    const outFile = path.join(PREVIEW_DIR, `${captureId}.mp4`);

    // ffmpeg reads directly from URL — no full download needed
    const args = [
      '-y',
      '-i', sourceUrl,
      '-t', '10',                    // first 10 seconds
      '-vf', 'scale=720:-2',        // 720p
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-b:v', '2M',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',     // moov at start = instant playback
      outFile
    ];

    execFile(FFMPEG, args, { timeout: 120000 }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(outFile);
      }
    });
  });
}

/**
 * Serve a local file with HTTP Range support.
 * Enables <video> seeking and progressive playback.
 * @param {string} filePath — absolute path to .mp4 file
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function serveFile(filePath, req, res) {
  const stat = statSync(filePath);
  const totalSize = stat.size;
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    const start = parseInt(match[1], 10);
    const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Type': 'video/mp4',
      'Content-Length': chunkSize,
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': totalSize,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });
    createReadStream(filePath).pipe(res);
  }
}

// GET /api/preview/status/:captureId — check if preview is ready
app.get('/api/preview/status/:captureId', (req, res) => {
  const { captureId } = req.params;
  const filePath = path.join(PREVIEW_DIR, `${captureId}.mp4`);
  if (existsSync(filePath)) {
    res.json({ ready: true, size: statSync(filePath).size });
  } else {
    res.json({ ready: false, generating: generatingSet.has(captureId) });
  }
});

app.get('/api/preview/:captureId', async (req, res) => {
  const { captureId } = req.params;
  if (!captureId || captureId === 'status') return res.status(400).end();

  try {
    // 1. Check disk cache — instant serve
    const cachedFile = path.join(PREVIEW_DIR, `${captureId}.mp4`);
    if (existsSync(cachedFile)) {
      return serveFile(cachedFile, req, res);
    }

    // 2. Resolve source URL
    const sourceUrl = await resolvePreviewUrl(captureId);
    if (!sourceUrl) return res.status(404).json({ error: 'No preview available' });

    // 3. Already generating? Tell client to wait
    if (generatingSet.has(captureId)) {
      return res.status(202).json({ status: 'generating', retry: 3 });
    }

    // 4. Generate preview
    generatingSet.add(captureId);
    res.status(202).json({ status: 'generating', retry: 3 });

    // Generate in background — client will poll
    generatePreview(captureId, sourceUrl)
      .then(() => generatingSet.delete(captureId))
      .catch(() => generatingSet.delete(captureId));

  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: 'Preview failed' });
  }
});

// ── GET /delivery?id=recXXX ────────────────────────
// Branded delivery page — post-purchase video access
app.get('/delivery', async (req, res) => {
  const id = (req.query.id || '').trim();
  if (!id || !id.startsWith('rec')) {
    return res.status(400).send('Invalid delivery link');
  }

  try {
    const data = await airtableFetch(`${TABLES.captures}/${id}`);
    const f = data.fields || {};
    const title = f['Video Title'] || 'Your Dance Video';
    const festival = f['Festival'] || '';
    const session = f['Session'] || '';
    const style = f['Dance Style'] || '';
    const status = f['Status'] || 'Captured';
    const rawPreviewUrl = f['Preview URL'] || '';
    const finalUrl = f['Final URL'] || '';
    // Convert Dropbox share URLs to direct playback URLs
    const previewUrl = rawPreviewUrl.includes('dropbox.com') ? rawPreviewUrl.replace(/dl=0/, 'raw=1').replace(/\&amp;/g, '&') : rawPreviewUrl;
    const downloadUrl = finalUrl || previewUrl;
    const partner1 = f['Partner 1 Name'] || f['Partner 1 IG'] || '';
    const partner2 = f['Partner 2 Name'] || f['Partner 2 IG'] || '';
    const dancers = [partner1, partner2].filter(Boolean).join(' & ') || title;
    const details = [style, session, festival].filter(Boolean).join(' · ');
    const isReady = status === 'Ready' || status === 'Delivered' || status === 'Notified';

    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(dancers)} — Social Dance TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg: #0c0c0e; --surface: #161618; --surface-2: #1e1e21; --border: rgba(255,255,255,0.08); --ivory: #f4f1ec; --muted: #8a8580; --faint: #5a5650; --red: #c1453b; --green: #4caf50; --gold: #fbc02d; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--ivory); font-family: 'Inter', sans-serif; min-height: 100dvh; display: flex; justify-content: center; padding: 24px 16px; }
  .container { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 20px; }
  .header { text-align: center; padding: 20px 0 8px; }
  .header img { width: 72px; height: 72px; border-radius: 14px; margin-bottom: 10px; }
  .header h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; }
  .header p { font-size: 0.8125rem; color: var(--muted); }
  .video-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
  .video-wrap { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; }
  .video-wrap video { width: 100%; height: 100%; object-fit: contain; }
  .video-info { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .video-info .dancers { font-size: 1rem; font-weight: 600; }
  .video-info .details { font-size: 0.75rem; color: var(--muted); }
  .video-info .status { display: inline-flex; align-items: center; gap: 6px; font-size: 0.6875rem; font-weight: 600; padding: 4px 10px; border-radius: 20px; width: fit-content; }
  .status-ready { background: rgba(76,175,80,0.1); color: var(--green); }
  .status-pending { background: rgba(251,192,45,0.1); color: var(--gold); }
  .actions { display: flex; flex-direction: column; gap: 10px; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; border: none; border-radius: 14px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: transform 150ms, opacity 150ms; font-family: inherit; }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--red); color: white; }
  .btn-secondary { background: var(--surface-2); color: var(--ivory); border: 1px solid var(--border); }
  .upsell { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
  .upsell-badge { font-size: 0.6875rem; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 0.05em; }
  .upsell h3 { font-size: 1rem; font-weight: 700; }
  .upsell p { font-size: 0.8125rem; color: var(--muted); line-height: 1.5; }
  .upsell-feats { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; color: var(--muted); }
  .footer { text-align: center; font-size: 0.6875rem; color: var(--faint); padding: 16px 0; }
  .footer a { color: var(--muted); }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="/logo.png" alt="SDTV">
    <h1>${esc(dancers)}</h1>
    <p>${esc(details)}</p>
  </div>

  <div class="video-card">
    <div class="video-wrap">
      ${previewUrl
        ? `<video src="/api/preview/${esc(id)}" controls playsinline preload="auto"></video>`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--faint);">Video preview loading...</div>`
      }
    </div>
    <div class="video-info">
      <span class="dancers">${esc(dancers)}</span>
      <span class="details">${esc(details)}</span>
      <span class="status ${isReady ? 'status-ready' : 'status-pending'}">${isReady ? '&#10003; Ready to download' : '&#9711; Still being edited'}</span>
    </div>
  </div>

  ${isReady && downloadUrl ? `
  <div class="actions">
    <a href="${esc(downloadUrl)}" download class="btn btn-primary">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      ${finalUrl ? 'Download HD Video' : 'Download Video'}
    </a>
  </div>` : `
  <div class="actions">
    <div class="btn btn-secondary" style="cursor:default;opacity:0.6;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      We'll email you when it's ready
    </div>
  </div>`}

  <div class="upsell">
    <span class="upsell-badge">MAKE IT STRONGER</span>
    <h3>Turn your dance into an SDTV Feature</h3>
    <p>We select the strongest moment, edit it for social media, write the caption, and publish it through SDTV channels.</p>
    <div class="upsell-feats">
      <span>Best moment selected from your dance</span>
      <span>Edited and cropped for social impact</span>
      <span>Featured through SDTV with collab format</span>
    </div>
    <a href="/?flow=visibility&source=delivery${festival ? '&fest=' + encodeURIComponent(festival) : ''}${f['Partner 1 IG'] ? '&ig=' + encodeURIComponent(f['Partner 1 IG']) : ''}" class="btn btn-secondary">Add SDTV Feature · €100</a>
  </div>

  <div class="footer">
    <p>Social Dance TV · <a href="https://instagram.com/socialdancetv" target="_blank">@socialdancetv</a></p>
  </div>
</div>
</body>
</html>`);
  } catch (e) {
    console.error('Delivery page error:', e.message);
    res.status(404).send('Video not found. Check your link or contact us on Instagram @socialdancetv');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SDTV Client Form server running on port ${PORT}`);
});
