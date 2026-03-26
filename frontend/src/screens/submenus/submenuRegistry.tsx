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
import SegmentsListsPage from './SegmentsListsPage'

type SubmenuRenderer = () => JSX.Element

export const submenuRegistry: Record<string, SubmenuRenderer> = {
  'sales:Accounts': AccountsPage,
  'sales:Contacts': ContactsPage,
  'sales:Segments/Lists': SegmentsListsPage,
  'sales:Deals': DealsPage,
  'sales:Activities': ActivitiesPage,
  'sales:Quotes': QuotesPage,
  'sales:Invoices': InvoicesPage,
  'sales:Pricebook': PricebookPage,
  'sales:Products': ProductsPage,
  'marketing:Forms': FormsPage,
  'logs:Logs': LogsPage,
}
