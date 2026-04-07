export const styleColors: Record<string, { border: string; bg: string; pill: string; pillActive: string }> = {
  Salsa: {
    border: 'border-l-rose-400',
    bg: 'bg-rose-50',
    pill: 'border-rose-300 text-rose-700 hover:bg-rose-50',
    pillActive: 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600',
  },
  Bachata: {
    border: 'border-l-violet-400',
    bg: 'bg-violet-50',
    pill: 'border-violet-300 text-violet-700 hover:bg-violet-50',
    pillActive: 'bg-violet-500 text-white border-violet-500 hover:bg-violet-600',
  },
  Casino: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-50',
    pill: 'border-amber-300 text-amber-700 hover:bg-amber-50',
    pillActive: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
  },
  Son: {
    border: 'border-l-emerald-400',
    bg: 'bg-emerald-50',
    pill: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
    pillActive: 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600',
  },
  Timba: {
    border: 'border-l-red-400',
    bg: 'bg-red-50',
    pill: 'border-red-300 text-red-700 hover:bg-red-50',
    pillActive: 'bg-red-500 text-white border-red-500 hover:bg-red-600',
  },
  Rumba: {
    border: 'border-l-orange-400',
    bg: 'bg-orange-50',
    pill: 'border-orange-300 text-orange-700 hover:bg-orange-50',
    pillActive: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600',
  },
  Afro: {
    border: 'border-l-teal-400',
    bg: 'bg-teal-50',
    pill: 'border-teal-300 text-teal-700 hover:bg-teal-50',
    pillActive: 'bg-teal-500 text-white border-teal-500 hover:bg-teal-600',
  },
  Reggaeton: {
    border: 'border-l-pink-400',
    bg: 'bg-pink-50',
    pill: 'border-pink-300 text-pink-700 hover:bg-pink-50',
    pillActive: 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600',
  },
  Kizomba: {
    border: 'border-l-pink-400',
    bg: 'bg-pink-50',
    pill: 'border-pink-300 text-pink-700 hover:bg-pink-50',
    pillActive: 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600',
  },
  Zouk: {
    border: 'border-l-cyan-400',
    bg: 'bg-cyan-50',
    pill: 'border-cyan-300 text-cyan-700 hover:bg-cyan-50',
    pillActive: 'bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600',
  },
  Theory: {
    border: 'border-l-sky-400',
    bg: 'bg-sky-50',
    pill: 'border-sky-300 text-sky-700 hover:bg-sky-50',
    pillActive: 'bg-sky-500 text-white border-sky-500 hover:bg-sky-600',
  },
  Ladies: {
    border: 'border-l-fuchsia-400',
    bg: 'bg-fuchsia-50',
    pill: 'border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50',
    pillActive: 'bg-fuchsia-500 text-white border-fuchsia-500 hover:bg-fuchsia-600',
  },
}

export function getStyleColors(style: string) {
  return styleColors[style] || {
    border: 'border-l-gray-400',
    bg: 'bg-gray-50',
    pill: 'border-gray-300 text-gray-700 hover:bg-gray-50',
    pillActive: 'bg-gray-500 text-white border-gray-500 hover:bg-gray-600',
  }
}
