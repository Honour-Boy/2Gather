import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import { initObservability } from './lib/observability'
import './styles/index.css'

// Sentry + PostHog — no-ops unless their env vars are set (see lib/observability).
initObservability()

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)