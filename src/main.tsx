import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/cyrillic-400.css'
import '@fontsource/manrope/cyrillic-600.css'
import '@fontsource/manrope/cyrillic-700.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/cyrillic-500.css'
import '@fontsource/cormorant-garamond/cyrillic-600.css'
import './ui/styles/tokens.css'
import './ui/styles/app.css'
import './ui/styles/screens.css'
import { App } from './ui/App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('#root не найден')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
