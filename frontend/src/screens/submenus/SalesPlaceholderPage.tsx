import type { SubmenuProps } from './submenuRegistry'

/** Placeholder for Sales workspace; account may be set when navigating from a deal tile. */
export default function SalesPlaceholderPage({ salesAccountHighlight }: SubmenuProps) {
  return (
    <div className="contacts-page">
      <h2>Sales</h2>
      <p className="muted">Further details for this area will be added later.</p>
      {salesAccountHighlight && salesAccountHighlight !== '—' ? (
        <p className="info">
          Selected account: <strong>{salesAccountHighlight}</strong>
        </p>
      ) : null}
    </div>
  )
}
