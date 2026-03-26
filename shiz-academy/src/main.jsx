import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OrientationGuard from './components/OrientationGuard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div id="appContent">
      <App />
    </div>
    <OrientationGuard />
  </StrictMode>,
)
