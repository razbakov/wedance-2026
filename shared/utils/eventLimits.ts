/**
 * Size limits of an event in the editor, shared by the tRPC input
 * (`businessEvents`), the MCP tools and the form's valibot schema
 * (`EventLimitsSchema`), so the form catches what the server would refuse.
 *
 * Sized from real festivals (RAZ-991: a 46-artist line-up and a 343-character
 * practical-info line were refused at 40 / 300), with room to spare.
 */
export const EVENT_ARTISTS_MAX = 200
export const PRACTICAL_INFO_MAX = 60
export const PRACTICAL_INFO_LINE_MAX = 2000
export const PASS_DESCRIPTION_MAX = 1000
