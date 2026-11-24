import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { wakeApi } from './lib/wakeApi.js'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

wakeApi()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
