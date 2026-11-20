/**
 * A line of organiser text with its links made clickable and read as words, not URLs: a picture is
 * "picture", a PDF "PDF", anything else its site ("freshsuites.de").
 */
export function linkParts(text: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = []
  let last = 0
  for (const m of text.matchAll(/https?:\/\/[^\s,;)]+/g)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) })
    const url = m[0]
    let label = url
    try {
      const u = new URL(url)
      label = /\.(png|jpe?g|webp|gif|avif)$/i.test(u.pathname) ? 'picture' : /\.pdf$/i.test(u.pathname) ? 'PDF' : u.host.replace(/^www\./, '')
    } catch { /* keep the url */ }
    out.push({ text: label, href: url })
    last = m.index! + url.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
