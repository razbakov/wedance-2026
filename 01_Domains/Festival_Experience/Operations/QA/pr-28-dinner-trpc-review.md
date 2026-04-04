# QA Report: PR #28 — Wire dinner join/leave to tRPC

**Date:** 2026-03-23
**PR:** https://github.com/razbakov/festival-schedule/pull/28
**Status:** OPEN (not yet merged)
**Reviewer:** AI Agent (wire-dinner-e2e-qa)

## Summary

PR #28 refactors the dinner join/leave flow from inline tRPC calls in `[slug].vue` to a `useDinners(festivalSlug)` composable. The composable handles data loading, optimistic UI updates, and rollback on failure.

## Build Verification

- **Nuxt build:** PASSES on main branch
- **Unit tests:** `dinner.test.ts` covers list, join, leave tRPC endpoints (requires DATABASE_URL)
- **E2E tests:** Playwright BDD tests exist for group-dinner feature (mock-based)

## Code Review Findings

### Issue 1: Lost `alreadyJoined` handling (Medium)
**File:** `useDinners.ts` (PR version) vs `[slug].vue` (current main)

The current main code at line 397-401 checks `result.alreadyJoined` after a join mutation and rolls back the optimistic count increment:
```js
$trpc.dinner.join.mutate({ dinnerId: id }).then((result) => {
  if (result.alreadyJoined) {
    d.joined-- // rollback optimistic increment for duplicate
  }
})
```

The PR's composable does NOT check for `alreadyJoined`:
```js
await $trpc.dinner.join.mutate({ dinnerId: id })
// No check for result.alreadyJoined
```

**Impact:** If a user double-clicks join or if a race condition occurs, the UI count will be off by 1 until page refresh.

**Fix:** Add `alreadyJoined` check in the composable's `joinDinner`:
```js
const result = await $trpc.dinner.join.mutate({ dinnerId: id })
if (result.alreadyJoined) {
  d.joined-- // rollback the extra optimistic increment
}
```

### Issue 2: No "Leave" button in UI (Low, pre-existing)
**Files:** `CartDrawer.vue`, `DiscoverDancers.vue`, `ActivitiesTab.vue`

No component emits a `leave-dinner` event. The `leaveDinner` function added by PR #28 is dead code — there's no UI trigger for it. The page defines `leaveDinner` but no template binds to it.

**Impact:** Users have no way to leave a dinner they've joined. This is a pre-existing gap, not introduced by PR #28.

**Recommendation:** Add a "Leave" button in the CartDrawer when `dinner.userJoined` is true.

### Issue 3: Race condition in capacity check (Low, pre-existing)
**File:** `dinner.ts` lines 107-112

The join endpoint does `SELECT COUNT(*)` then `INSERT` as separate queries. Under concurrent requests, multiple users could pass the count check simultaneously, exceeding `maxSize`.

```js
const [{ count }] = await ctx.db
  .select({ count: sql`COUNT(*)` })
  .from(dinnerSignups)
  .where(eq(dinnerSignups.dinnerId, input.dinnerId))
if (Number(count) >= dinner.maxSize) throw new Error('Dinner is full')
// Gap: another user could insert here
await ctx.db.insert(dinnerSignups).values({ ... })
```

**Impact:** Low for festival scale (6 seats per dinner, low concurrency). Could exceed maxSize by 1-2 under burst traffic.

**Fix (future):** Use a Postgres advisory lock or a serializable transaction.

### Issue 4: Type mismatch for `photo` field (Low)
**File:** `dinner.ts` line 65 vs `types/festival.ts` line 235

The tRPC router returns `{ name: string; photo: string | null }` for group members, but the `GroupDinner` interface expects `photo: string` (non-nullable).

**Impact:** Null photos could cause rendering issues if templates assume non-null.

### Issue 5: Silent error handling (Low)
**File:** `[slug].vue` (PR version)

Both join and leave catch errors silently:
```js
doJoinDinner(id).catch(() => {})
doLeaveDinner(id).catch(() => {})
```

**Impact:** Users get no feedback when operations fail. The optimistic UI rolls back correctly, but the user doesn't know why their action was reversed.

## Test Coverage Assessment

### Existing Coverage
| Layer | Coverage | Notes |
|-------|----------|-------|
| tRPC router unit tests | Good | `dinner.test.ts` covers list, join (auth, duplicate), leave |
| E2E BDD tests | Partial | Mock-based, tests UI behavior but not real tRPC flow |
| Composable unit tests | Missing | No test for `useDinners` composable itself |

### Missing Test Scenarios
1. Composable integration test: `useDinners` calling real tRPC endpoints
2. Optimistic rollback test: Verify UI reverts on network failure
3. `alreadyJoined` handling test
4. Leave dinner UI flow (blocked by missing leave button)
5. Auth token propagation: Bearer header from session cookie

### New E2E Feature File
Added `dinner-trpc-flow.feature` with 10 scenarios covering:
- Dinner list loading from backend
- Join with optimistic UI + backend persistence
- Join rollback on network failure
- Duplicate join handling
- Unauthenticated join rejection
- Full dinner rejection
- Leave with optimistic UI + backend cleanup
- Leave rollback on network failure
- Auth token propagation

## Manual Test Plan (Pre-Festival Verification)

### Prerequisites
- [ ] PR #28 merged to main
- [ ] Deployed to staging/production
- [ ] At least one festival with dinners seeded in the database

### Happy Path Tests
1. **Load dinners**: Navigate to festival page, verify dinner cards appear with correct data from DB
2. **Join dinner (authenticated)**: Sign in, join a dinner, verify "You're in!" appears and count increments
3. **Refresh persistence**: After joining, refresh the page — verify join state persists
4. **Cross-session**: Open in a new browser/incognito — verify joined count reflects the join

### Edge Case Tests
5. **Join without auth**: Try to join without signing in — verify paywall/auth gate
6. **Full dinner**: Set a dinner to maxSize capacity — verify "Full" badge and join is blocked
7. **Double-click join**: Rapidly click join twice — verify count only increments by 1
8. **Network offline join**: Disable network, try to join — verify optimistic UI rolls back

### Not Testable Yet (Blocked)
9. **Leave dinner**: No UI button exists (Issue 2)
10. **Restaurant reveal timing**: Requires revealDate to be set in DB

## Recommendation

**PR #28 is safe to merge** with one recommended fix:
- Add `alreadyJoined` check in `useDinners.ts` `joinDinner` (Issue 1)

The other issues are pre-existing or low-severity and can be addressed in follow-up PRs after the Meneate festival.
