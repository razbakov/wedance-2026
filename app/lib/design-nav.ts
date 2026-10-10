/**
 * Navigation for the /design docs — the single source for the sidebar, the
 * overview and the components index. Add a page here and it shows up everywhere.
 *
 * status: 'stable'  — documented, safe to use
 *         'beta'    — usable, API or look may still change
 *         'planned' — not built yet; listed so the roadmap is visible (no page)
 */
export type DocStatus = 'stable' | 'beta' | 'planned'

export interface DocItem {
  title: string
  to: string
  status: DocStatus
  summary: string
}

export interface DocSection {
  title: string
  items: DocItem[]
}

export const designNav: DocSection[] = [
  {
    title: 'Getting started',
    items: [
      { title: 'Overview', to: '/design', status: 'stable', summary: 'Principles, how to use the system, status board.' },
    ],
  },
  {
    title: 'Foundations',
    items: [
      { title: 'Colors', to: '/design/foundations/colors', status: 'stable', summary: 'Core, semantic, status and extended palettes with contrast.' },
      { title: 'Typography', to: '/design/foundations/typography', status: 'stable', summary: 'Font pair, type scale and usage rules.' },
      { title: 'Elevation', to: '/design/foundations/elevation', status: 'beta', summary: 'Radii and the shadow recipes in use.' },
      { title: 'Motion', to: '/design/foundations/motion', status: 'beta', summary: 'Durations, easing and reduced motion.' },
      { title: 'Spacing & layout', to: '/design/foundations/spacing', status: 'planned', summary: 'Spacing scale, containers, breakpoints.' },
      { title: 'Icons', to: '/design/foundations/icons', status: 'planned', summary: 'Lucide set, sizes and colours.' },
    ],
  },
  {
    title: 'Components',
    items: [
      { title: 'All components', to: '/design/components', status: 'stable', summary: 'Index with status for every component.' },
      { title: 'Button', to: '/design/components/button', status: 'stable', summary: 'Actions, including the brand CTA.' },
      { title: 'Badge', to: '/design/components/badge', status: 'stable', summary: 'Small status and category labels.' },
      { title: 'Card', to: '/design/components/card', status: 'beta', summary: 'Surface for grouped content.' },
      { title: 'Dialog', to: '/design/components/dialog', status: 'beta', summary: 'Modal for focused tasks.' },
      { title: 'Tabs', to: '/design/components/tabs', status: 'beta', summary: 'Switch between related views.' },
      { title: 'Avatar', to: '/design/components/avatar', status: 'beta', summary: 'Person or organisation image with fallback.' },
      { title: 'Separator', to: '/design/components/separator', status: 'beta', summary: 'Visual divider between content.' },
      { title: 'Input', to: '/design/components/input', status: 'planned', summary: 'Single-line text field.' },
      { title: 'Select', to: '/design/components/select', status: 'planned', summary: 'Pick one option from a list.' },
      { title: 'Textarea', to: '/design/components/textarea', status: 'planned', summary: 'Multi-line text field.' },
      { title: 'Checkbox', to: '/design/components/checkbox', status: 'planned', summary: 'Toggle an option on or off.' },
      { title: 'Field', to: '/design/components/field', status: 'planned', summary: 'Label + control + hint + error wrapper.' },
    ],
  },
  {
    title: 'Patterns',
    items: [
      { title: 'Forms & validation', to: '/design/patterns/forms', status: 'planned', summary: 'Layout, validation timing, error copy.' },
      { title: 'Cards', to: '/design/patterns/cards', status: 'beta', summary: 'Event, festival, artist and plan cards.' },
      { title: 'Heroes', to: '/design/patterns/heroes', status: 'beta', summary: 'Page headers with photo and title.' },
      { title: 'Empty states', to: '/design/patterns/empty-states', status: 'beta', summary: 'What to show when there is nothing yet.' },
    ],
  },
  {
    title: 'Brand',
    items: [
      { title: 'Logo, voice & imagery', to: '/design/brand', status: 'beta', summary: 'Logo use, tone of voice, photo rules.' },
    ],
  },
]

export const allDocItems = designNav.flatMap(s => s.items)
export const componentItems = designNav.find(s => s.title === 'Components')!.items.filter(i => i.to !== '/design/components')
