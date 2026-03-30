import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* eslint-disable no-undef */
if (typeof __BUILD_TIME__ !== 'undefined') {
  console.log('[water] build:', __BUILD_TIME__);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
