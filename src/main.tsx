import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ConnectionGuard from './components/ConnectionGuard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionGuard><App /></ConnectionGuard>
  </StrictMode>,
)
