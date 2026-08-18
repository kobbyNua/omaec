import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// silence non-critical console output in the UI
import './utils/disableConsole'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
