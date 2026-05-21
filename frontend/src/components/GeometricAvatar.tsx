type Props = {
  label: string
  variant?: 'mint' | 'orange' | 'pink' | 'lavender' | 'slate'
  size?: 'sm' | 'md'
}

const VARIANT_CLASS: Record<NonNullable<Props['variant']>, string> = {
  mint: 'geo-avatar--mint',
  orange: 'geo-avatar--orange',
  pink: 'geo-avatar--pink',
  lavender: 'geo-avatar--lavender',
  slate: 'geo-avatar--slate',
}

function initialsFrom(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export default function GeometricAvatar({ label, variant = 'lavender', size = 'md' }: Props) {
  return (
    <span
      className={`geo-avatar ${VARIANT_CLASS[variant]} geo-avatar--${size}`}
      aria-hidden
      title={label}
    >
      <span className="geo-avatar-shape" />
      <span className="geo-avatar-text">{initialsFrom(label)}</span>
    </span>
  )
}
