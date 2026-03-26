type SpinnerProps = {
  size?: 'sm' | 'md'
}

export default function Spinner({ size = 'md' }: SpinnerProps) {
  return <span className={`spinner ${size}`} aria-label="Loading" />
}
