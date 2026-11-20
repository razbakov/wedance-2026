/**
 * Re-read blueprint issue refs (RAZ-1072).
 *
 * Without LINEAR_API_KEY: the same check as the unit test — an unfinished step
 * must not cite an issue in CLOSED_BLUEPRINT_ISSUES.
 *
 * With LINEAR_API_KEY: ask Linear about every RAZ id a step cites. Fail when
 * an unfinished step cites a completed or canceled issue, or when
 * CLOSED_BLUEPRINT_ISSUES is no longer exactly that set (edit the list, then
 * re-run). A weekly workflow runs this.
 *
 *   bun run blueprint:issues
 */
import {
  CLOSED_BLUEPRINT_ISSUES,
  TERMINAL_ISSUE_TYPES,
  closedIssuesOnOpenSteps,
  linearRefs,
  serviceBlueprints,
} from '../app/lib/blueprint-issues'

const steps = serviceBlueprints.flatMap(b => b.bp.steps)
const cited = linearRefs(steps)

function localDrift(): string[] {
  return serviceBlueprints.flatMap(b =>
    closedIssuesOnOpenSteps(b.bp.steps, new Set(CLOSED_BLUEPRINT_ISSUES))
      .map(h => `${b.id} step "${h.name}" (${h.id}) is ${h.status} but cites ${h.issue}, which is closed. Mark the step live, or take the issue out of refs.`))
}

async function linearStates(ids: string[]): Promise<Map<string, string>> {
  const key = process.env.LINEAR_API_KEY
  if (!key) return new Map()
  const numbers = ids.map(id => Number(id.slice(4)))
  const query = `query($numbers: [Float!]!) {
    issues(filter: { team: { key: { eq: "RAZ" } }, number: { in: $numbers } }) {
      nodes { identifier state { type } }
    }
  }`
  const r = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: key },
    body: JSON.stringify({ query, variables: { numbers } }),
  })
  const body = await r.json() as { data?: { issues?: { nodes?: { identifier: string, state: { type: string } }[] } }, errors?: { message: string }[] }
  if (!r.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message || `Linear API ${r.status}`)
  }
  const out = new Map<string, string>()
  for (const node of body.data?.issues?.nodes ?? []) out.set(node.identifier, node.state.type)
  return out
}

const drift = localDrift()
if (drift.length) {
  console.error(drift.join('\n'))
  process.exit(1)
}

const states = await linearStates(cited)
if (!process.env.LINEAR_API_KEY) {
  console.log(`blueprint:issues — ${cited.length} issue refs, checked against the committed closed list (${CLOSED_BLUEPRINT_ISSUES.length}). Set LINEAR_API_KEY to re-read Linear.`)
  process.exit(0)
}

const missing = cited.filter(id => !states.has(id))
if (missing.length) {
  console.error(`Linear did not return: ${missing.join(', ')}`)
  process.exit(1)
}

const closedNow = cited.filter(id => TERMINAL_ISSUE_TYPES.has(states.get(id)!))
const liveDrift = serviceBlueprints.flatMap(b =>
  closedIssuesOnOpenSteps(b.bp.steps, new Set(closedNow))
    .map(h => `${b.id} step "${h.name}" (${h.id}) is ${h.status} but ${h.issue} is ${states.get(h.issue)}. Mark the step live, or take it out of refs.`))
if (liveDrift.length) {
  console.error(liveDrift.join('\n'))
  process.exit(1)
}

const snapshot = [...CLOSED_BLUEPRINT_ISSUES].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
const fresh = [...closedNow].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
if (snapshot.join() !== fresh.join()) {
  console.error('CLOSED_BLUEPRINT_ISSUES is out of date. Linear says these cited issues are Done or Canceled:')
  console.error(fresh.join('\n'))
  console.error('Update the list in app/lib/blueprint-issues.ts.')
  process.exit(1)
}

console.log(`blueprint:issues — ${cited.length} issue refs, ${fresh.length} closed, none left on an unfinished step.`)
