import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/bento.css'
import App from './App.tsx'

const THEME_STORAGE_KEY = 'crm_theme'
const VALID_THEMES = new Set([
  'object-bento',
  'navy',
  'slate-blue',
  'midnight-purple',
  'forest-night',
  'frost-light',
  'sand-light',
])

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  const theme = saved && VALID_THEMES.has(saved) ? saved : 'object-bento'
  document.documentElement.setAttribute('data-theme', theme)
}

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
