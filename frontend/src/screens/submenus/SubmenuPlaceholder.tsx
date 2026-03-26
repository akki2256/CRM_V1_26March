type SubmenuPlaceholderProps = {
  title: string
}

export default function SubmenuPlaceholder({ title }: SubmenuPlaceholderProps) {
  return (
    <div className="widget-card">
      <h3>{title}</h3>
      <p>This section is set up in its own file for easier future implementation and debugging.</p>
    </div>
  )
}
