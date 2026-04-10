# SDTV Admin Panel — UX/UI Redesign Brief v2

last_updated: 2026-04-09
status: PENDING — execute in next session
priority: High
file: C:\tmp\sdtv-capture\admin.html

## Top 7 Improvements (ordered by impact)

### 1. NEXT bar → Workflow status bar
- Less banner, more product workflow bar
- Step number: "Step 2 of 4"
- Status left, action right
- Connected to tab progress

### 2. KPI strip → Live stats rail
- Compact, less borders, better typography
- Active values accented, zeros muted
- Labels small-caps, values bold
- Not chips — operational rail

### 3. States: empty/hover/focused/loading/success/warning/disabled/completed
- Buttons: hover lift, active scale, loading shimmer, disabled meaningful
- Inputs: strong focus (accent border + inner glow + bg shift), clean placeholder, disabled state
- Tabs: hover subtle, active = surface change + glow (not heavy box)
- Action cards: available/blocked/success states
- Step banner: completed/current/locked

### 4. Less boxed feeling
- Fewer visible outlines
- Structure through spacing + background layers, not borders
- 2-3 surface levels (panel bg → nested bg → interactive bg)
- Soft alpha borders, glow only on active/focused

### 5. Editor Brief → clearer semantic groups
- Group 1: Links (RAW + Upload)
- Group 2: Branding (logo URL + branding mode)
- Visual separation without changing logic

### 6. Activity log → operational log
- Timestamps quieter, action text stronger
- Category dots or severity color
- Monospace only for machine fragments
- Better row spacing
- Copy/Clear less prominent
- Sticky header for log area

### 7. Tabs → workflow progress
- Show: completed / current / locked
- Not just navigation — workflow visualization
- Subtle completion indicator per tab

## Additional CSS Improvements

### Typography
- Increase difference between section title and helper text
- Labels slightly more contrast
- Lower opacity for secondary text
- Better line-height in descriptions
- Section labels: smaller, stronger tracking, lower opacity, more spacing below

### Spacing
- More vertical rhythm between major blocks
- Remove same-distance patterns
- More intentional paddings in action cards

### Inputs
- Stronger focus: thin accent border + light inner glow + subtle bg shift
- Cleaner placeholder color (not dirty gray)
- Better disabled state
- No cheap blue outline

### Buttons
- More pronounced hover/active
- Subtle lift on hover
- Disabled = meaningfully inactive, not just faded

### Surfaces
- 3 levels: panel bg → nested panel bg → interactive surface bg
- Less same-dark-everywhere

### Borders & shadows
- Fewer hard frames
- Thinner alpha borders
- Soft shadows/glow only on active/focused

## UX Additions

### Inline validation
- Bad Dropbox link → error inline immediately
- Empty required field → helper hint

### Save feedback
- Tiny "saved" badge when fields auto-save
- Last updated timestamp

### Better empty states
- "No files scanned yet"
- "No logo attached"
- "No invoice data yet"

### Progressive disclosure
- Don't show heavy actions until relevant
- "Available after file scan" helper text
- Success state after action completion

## Top bar refinements
- Event switcher: less visual noise
- Prefix badge (WOR26): thinner, more elegant
- Tabs: lower contrast, active via surface change + subtle glow
- Hover states thin, no heavy boxed feeling

## Action cards
- One primary when relevant
- Buttons proportional to card
- More action module, less list row
- Show: available / depends on data / blocked
- Helper: "Available after file scan"
- Success state after action

## What NOT to change
- No structural changes
- No new features
- No logic changes
- Only CSS/UX/states/hierarchy/animation
