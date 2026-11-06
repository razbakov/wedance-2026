import { defineEventHandler, setResponseHeaders } from 'h3'

// OpenAI plugin dashboard → MCPs → Connect → Domain verification. It fetches this URL and
// expects exactly the token, as plain text. The token is public by design (it only proves we
// control the domain); a new one from the dashboard replaces this value.
export const OPENAI_APPS_CHALLENGE = 'Ylqqpq4Ge2QftCxFq8AxlkYlXjSW_PTVlacpNeDq14g'

export default defineEventHandler((event) => {
  setResponseHeaders(event, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  return OPENAI_APPS_CHALLENGE
})
