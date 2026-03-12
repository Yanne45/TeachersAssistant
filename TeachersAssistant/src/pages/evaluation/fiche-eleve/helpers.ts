export function levelColor(level: number | null) {
  if (level === null) return { bg: 'var(--color-bg)', text: 'var(--color-text-muted)' };
  if (level >= 3) return { bg: 'rgba(126,217,87,0.20)', text: 'var(--color-success)' };
  if (level === 2) return { bg: 'rgba(245,166,35,0.20)', text: 'var(--color-warn)' };
  return { bg: 'rgba(231,76,60,0.20)', text: 'var(--color-danger)' };
}
