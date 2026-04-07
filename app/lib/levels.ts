const levelChilis: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
}

export function chilis(level: string): string {
  const count = levelChilis[level] || 1
  return '🌶️'.repeat(count)
}
