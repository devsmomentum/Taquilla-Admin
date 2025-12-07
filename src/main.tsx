import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorFallback } from './ErrorFallback.tsx'
import LoginRoute from './LoginRoute.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Global filter for noisy library messages
{
  const origWarn = console.warn.bind(console)
  const origInfo = console.info ? console.info.bind(console) : undefined
  console.warn = (...args) => {
    const msg = String(args[0] || '')
    if (
      msg.includes('React DevTools') ||
      msg.includes('React Router Future Flag Warning') ||
      msg.includes('Multiple GoTrueClient instances')
    ) return
    origWarn(...args)
  }
  if (origInfo) {
    console.info = (...args) => {
      const msg = String(args[0] || '')
      if (msg.includes('React DevTools')) return
      origInfo(...args)
    }
  }
}

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:#b91c1c;background:#fff7f7">Error: root element not found</div>'
} else {
  try {
    createRoot(rootEl).render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<LoginRoute />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    )
  } catch (err: any) {
    // Ensure any early runtime error displays in the page instead of a blank screen
    console.error('Render error:', err)
    rootEl.innerHTML = `<pre style="white-space:pre-wrap;color:#b91c1c;padding:16px;background:#fff7f7">Render error:\n${String(err)}</pre>`
  }
}
