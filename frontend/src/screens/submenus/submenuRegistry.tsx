import type { JSX } from 'react'
import AccountsPage from './AccountsPage'
import ActivitiesPage from './ActivitiesPage'
import ContactsPage from './ContactsPage'
import DealsPage from './DealsPage'
import FormsPage from './FormsPage'
import InvoicesPage from './InvoicesPage'
import LogsPage from './LogsPage'
import PricebookPage from './PricebookPage'
import ProductsPage from './ProductsPage'
import QuotesPage from './QuotesPage'
import SalesPlaceholderPage from './SalesPlaceholderPage'
import SegmentsListsPage from './SegmentsListsPage'

export type SubmenuProps = {
  goToSalesAccount?: (accountName: string) => void
  salesAccountHighlight?: string | null
}

export type SubmenuRenderer = (props: SubmenuProps) => JSX.Element

export const submenuRegistry: Record<string, SubmenuRenderer> = {
  'sales:Accounts': () => <AccountsPage />,
  'sales:Contacts': () => <ContactsPage />,
  'sales:Segments/Lists': () => <SegmentsListsPage />,
  'sales:Deals': (p) => <DealsPage {...p} />,
  'sales:Sales': (p) => <SalesPlaceholderPage {...p} />,
  'sales:Activities': () => <ActivitiesPage />,
  'sales:Quotes': () => <QuotesPage />,
  'sales:Invoices': () => <InvoicesPage />,
  'sales:Pricebook': () => <PricebookPage />,
  'sales:Products': () => <ProductsPage />,
  'marketing:Forms': () => <FormsPage />,
  'logs:Logs': () => <LogsPage />,
}
