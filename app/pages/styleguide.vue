<script setup lang="ts">
import { WD } from '~/lib/brand'
/**
 * /styleguide — internal design-system reference showing palette, type scale,
 * font families, and every `app/components/ui` component in all variants/states.
 * noindex — not meant for public discovery.
 */
definePageMeta({ layout: false })
useHead({
  title: 'WeDance — Style Guide',
  meta: [{ name: 'robots', content: 'noindex' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap' },
  ],
})

const colors = [
  { name: 'Cream (background)', var: '--wd-cream', hex: '#fbf5ea', class: 'bg-background' },
  { name: 'Brown 900 (foreground)', var: '--wd-brown-900', hex: '#3b1f0d', class: 'bg-foreground' },
  { name: 'Brown 700 (muted-fg)', var: '--wd-brown-700', hex: '#5b3a1d', class: 'bg-muted-foreground' },
  { name: 'Amber 600 (secondary)', var: '--wd-amber-600', hex: '#9a5614', class: 'bg-secondary' },
  { name: 'Red 600 (primary)', var: '--wd-red-600', hex: '#dc2626', class: 'bg-primary' },
  { name: 'Red 800 (shadow)', var: '--wd-red-800', hex: '#b91c1c', class: 'bg-wd-red-800' },
  { name: 'Orange 500', var: '--wd-orange-500', hex: '#f97316', class: 'bg-wd-orange-500' },
  { name: 'Green 600 (success)', var: '--wd-green-600', hex: '#16a34a', class: 'bg-success' },
  { name: 'Cyan 600 (info)', var: '--wd-cyan-600', hex: '#0891b2', class: 'bg-info' },
  { name: 'Amber 500 (warning)', var: '--wd-amber-500', hex: '#f59e0b', class: 'bg-warning' },
]

const semanticColors = [
  { name: 'background', class: 'bg-background', fg: 'text-foreground' },
  { name: 'card', class: 'bg-card', fg: 'text-card-foreground' },
  { name: 'popover', class: 'bg-popover', fg: 'text-popover-foreground' },
  { name: 'primary', class: 'bg-primary', fg: 'text-primary-foreground' },
  { name: 'secondary', class: 'bg-secondary', fg: 'text-secondary-foreground' },
  { name: 'muted', class: 'bg-muted', fg: 'text-muted-foreground' },
  { name: 'accent', class: 'bg-accent', fg: 'text-accent-foreground' },
  { name: 'destructive', class: 'bg-destructive', fg: 'text-white' },
]

const fonts = [
  { name: 'Display', token: 'font-display', class: 'font-display', family: "'Playfair Display', serif", sample: 'Dance festivals, curated for you.' },
  { name: 'Display italic', token: 'font-display italic', class: 'font-display italic', family: "'Playfair Display', serif · italic", sample: 'Handwritten-feel highlights — made for dancers.' },
  { name: 'Sans', token: 'font-sans', class: 'font-sans', family: 'system-ui, sans-serif', sample: 'Body text, UI labels, and form elements.' },
]

// Extended palette: every --wd-* primitive that isn't in the core list above.
const coreVars = new Set(colors.map(c => c.var))
const extended = Object.entries(WD)
  .map(([key, hex]) => ({ var: '--wd-' + key.replace(/([A-Z]|\d+)/g, '-$1').toLowerCase(), hex }))
  .filter(c => !coreVars.has(c.var))

const typeScale = [
  { name: 'Display', class: 'text-5xl font-display font-bold', label: 'text-5xl' },
  { name: 'H1', class: 'text-4xl font-display font-bold', label: 'text-4xl' },
  { name: 'H2', class: 'text-3xl font-display font-bold', label: 'text-3xl' },
  { name: 'H3', class: 'text-2xl font-display font-bold', label: 'text-2xl' },
  { name: 'H4', class: 'text-xl font-display font-bold', label: 'text-xl' },
  { name: 'Large', class: 'text-lg font-sans', label: 'text-lg' },
  { name: 'Body', class: 'text-base font-sans', label: 'text-base' },
  { name: 'Small', class: 'text-sm font-sans', label: 'text-sm' },
  { name: 'Caption', class: 'text-xs font-sans', label: 'text-xs' },
  { name: 'Label', class: 'text-[10px] uppercase tracking-[0.3em] font-bold', label: 'uppercase label' },
]

const buttonVariants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
const badgeVariants = ['default', 'secondary', 'destructive', 'outline'] as const
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans">
    <SiteHeader />

    <main class="max-w-5xl mx-auto px-4 py-12 space-y-16">
      <!-- Page title -->
      <div>
        <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">Design System</div>
        <h1 class="text-4xl font-display font-bold mt-2">WeDance Style Guide</h1>
        <p class="text-muted-foreground mt-2 max-w-xl">
          Tokens, palette, type scale, and UI components for the 2026 tropical aesthetic.
          Internal reference only — not indexed by search engines.
        </p>
      </div>

      <!-- ─── PALETTE ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Brand Palette</h2>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div v-for="c in colors" :key="c.var" class="space-y-1.5">
            <div
              :class="c.class"
              class="w-full aspect-square rounded-xl border border-border shadow-sm"
            />
            <div class="text-xs font-bold truncate">{{ c.name }}</div>
            <div class="text-[10px] text-muted-foreground font-mono">{{ c.hex }}</div>
            <div class="text-[10px] text-muted-foreground font-mono">{{ c.var }}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-2xl font-display font-bold mb-2">Extended Palette</h2>
        <p class="text-sm text-muted-foreground mb-6">Accents and tints used by pages. Same names in CSS (<code>var(--wd-*)</code>, <code>bg-wd-*</code>) and JS (<code>WD.*</code>).</p>
        <div class="grid grid-cols-3 sm:grid-cols-8 gap-3">
          <div v-for="c in extended" :key="c.var" class="space-y-1">
            <div class="w-full aspect-square rounded-lg border border-border" :style="{ background: `var(${c.var})` }" />
            <div class="text-[10px] font-mono truncate">{{ c.var }}</div>
            <div class="text-[10px] text-muted-foreground font-mono">{{ c.hex }}</div>
          </div>
        </div>
      </section>

      <!-- ─── SEMANTIC TOKENS ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Semantic Tokens</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div v-for="s in semanticColors" :key="s.name" class="space-y-1.5">
            <div
              :class="[s.class, s.fg]"
              class="w-full rounded-xl border border-border shadow-sm p-4 flex items-center justify-center text-sm font-bold"
            >
              {{ s.name }}
            </div>
          </div>
        </div>
      </section>

      <!-- ─── STATUS COLORS ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Status Colors</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-xl bg-success text-success-foreground p-4 text-sm font-bold text-center">Success</div>
          <div class="rounded-xl bg-destructive text-white p-4 text-sm font-bold text-center">Danger / Error</div>
          <div class="rounded-xl bg-warning text-warning-foreground p-4 text-sm font-bold text-center">Warning</div>
          <div class="rounded-xl bg-info text-info-foreground p-4 text-sm font-bold text-center">Info</div>
        </div>
      </section>

      <!-- ─── TYPOGRAPHY: FONT FAMILIES ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Font Families</h2>
        <div class="space-y-4">
          <div v-for="f in fonts" :key="f.name" class="rounded-xl border border-border bg-card p-5">
            <div class="flex items-baseline gap-3 mb-2">
              <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">{{ f.name }}</span>
              <span class="text-xs text-muted-foreground font-mono">{{ f.token }}</span>
            </div>
            <p :class="f.class" class="text-2xl text-foreground">{{ f.sample }}</p>
            <p class="text-xs text-muted-foreground mt-1 font-mono">{{ f.family }}</p>
          </div>
        </div>
      </section>

      <!-- ─── TYPE SCALE ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Type Scale</h2>
        <div class="space-y-4">
          <div v-for="t in typeScale" :key="t.name" class="flex items-baseline gap-4 border-b border-border pb-3">
            <span class="w-24 shrink-0 text-xs font-bold text-secondary uppercase tracking-wider">{{ t.name }}</span>
            <span :class="t.class" class="text-foreground flex-1">The quick brown fox</span>
            <span class="text-xs text-muted-foreground font-mono shrink-0 hidden sm:inline">{{ t.label }}</span>
          </div>
        </div>
      </section>

      <!-- ─── BUTTONS ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Buttons</h2>
        <div class="space-y-6">
          <!-- Variants -->
          <div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-3">Variants</div>
            <div class="flex flex-wrap gap-3">
              <Button v-for="v in buttonVariants" :key="v" :variant="v">
                {{ v }}
              </Button>
            </div>
          </div>
          <!-- Sizes -->
          <div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-3">Sizes</div>
            <div class="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">+</Button>
            </div>
          </div>
          <!-- States -->
          <div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-3">States</div>
            <div class="flex flex-wrap gap-3">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          <!-- CTA button (the V3 tropical style) -->
          <div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-3">CTA (brand)</div>
            <button
              class="wd-cta inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      <!-- ─── BADGES ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Badges</h2>
        <div class="flex flex-wrap gap-3">
          <Badge v-for="v in badgeVariants" :key="v" :variant="v">
            {{ v }}
          </Badge>
        </div>
      </section>

      <!-- ─── CARDS ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Cards</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description text, typically a summary.</CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">Content area — forms, data, or media go here.</p>
            </CardContent>
            <CardFooter class="justify-end gap-2">
              <Button variant="outline" size="sm">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Event Card Example</CardTitle>
              <CardDescription>Charanga Habanera — Munich</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="flex items-center gap-2">
                <Badge>Salsa</Badge>
                <Badge variant="secondary">Concert</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <!-- ─── DIALOG ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Dialog</h2>
        <p class="text-sm text-muted-foreground mb-4">
          Dialogs use the brand cream background (<code class="font-mono text-xs">bg-background</code>) with
          a primary accent bar. See SignUpModal and ReportProblem for production examples.
        </p>
        <Dialog>
          <DialogTrigger as-child>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-md border-0 p-0 overflow-hidden bg-background text-foreground font-display">
            <div class="h-1.5 bg-primary" />
            <div class="px-6 pb-6 pt-4">
              <DialogHeader class="text-left space-y-1">
                <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">Preview</div>
                <DialogTitle class="text-2xl leading-tight text-foreground font-display">Dialog Example</DialogTitle>
                <DialogDescription class="text-muted-foreground font-sans">
                  This is the standard WeDance modal pattern.
                </DialogDescription>
              </DialogHeader>
              <div class="mt-4">
                <Button class="w-full bg-primary shadow-[0_3px_0_-1px_var(--wd-red-800)] font-sans rounded-full text-white font-bold uppercase tracking-wider">
                  Primary Action
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <!-- ─── TABS ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Tabs</h2>
        <Tabs default-value="one">
          <TabsList>
            <TabsTrigger value="one">First</TabsTrigger>
            <TabsTrigger value="two">Second</TabsTrigger>
            <TabsTrigger value="three">Third</TabsTrigger>
          </TabsList>
          <TabsContent value="one">
            <p class="text-sm text-muted-foreground p-4">First tab content.</p>
          </TabsContent>
          <TabsContent value="two">
            <p class="text-sm text-muted-foreground p-4">Second tab content.</p>
          </TabsContent>
          <TabsContent value="three">
            <p class="text-sm text-muted-foreground p-4">Third tab content.</p>
          </TabsContent>
        </Tabs>
      </section>

      <!-- ─── SEPARATOR ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Separator</h2>
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">Content above separator.</p>
          <Separator />
          <p class="text-sm text-muted-foreground">Content below separator.</p>
        </div>
      </section>

      <!-- ─── AVATAR ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Avatar</h2>
        <div class="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>WD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AR</AvatarFallback>
          </Avatar>
          <span class="text-sm text-muted-foreground">Avatars with fallback initials</span>
        </div>
      </section>

      <!-- ─── FORM INPUTS ─── -->
      <section>
        <h2 class="text-2xl font-display font-bold mb-6">Form Inputs</h2>
        <div class="max-w-md space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-foreground">Text input</label>
            <input
              type="text"
              placeholder="Placeholder text"
              class="w-full h-11 rounded-full px-4 text-sm outline-none bg-white border border-border text-foreground font-sans"
            >
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-foreground">With error</label>
            <input
              type="text"
              value="Invalid value"
              aria-invalid="true"
              class="w-full h-11 rounded-full px-4 text-sm outline-none bg-white border border-border text-foreground font-sans"
            >
            <FieldError id="demo-error" message="This field is required." />
          </div>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
