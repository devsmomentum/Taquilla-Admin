import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorFallback } from './ErrorFallback.tsx'
import LoginRoute from './LoginRoute.tsx'
import { AppProvider } from './contexts/AppContext'
import { LotteryTypeProvider } from './contexts/LotteryTypeContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados frescos
      gcTime: 30 * 60 * 1000,   // 30 minutos - tiempo en cache
      refetchOnWindowFocus: true, // Revalidar al volver a la pestaña
      retry: 1, // Reintentar 1 vez en caso de error
      refetchOnReconnect: true, // Revalidar al reconectar
    },
    mutations: {
      retry: 0, // No reintentar mutaciones
    },
  },
})

// Pages
import { DashboardPage } from './pages/DashboardPage'
import { ReportsPage } from './pages/ReportsPage'
import { LotteriesPage } from './pages/LotteriesPage'
import { DrawsPage } from './pages/DrawsPage'
import { WinnersPage } from './pages/WinnersPage'
import { UsersPage } from './pages/UsersPage'
import { RolesPage } from './pages/RolesPage'
import { ApiKeysPage } from './pages/ApiKeysPage'
import { ComercializadorasPage } from './pages/ComercializadorasPage'
import { ComercializadoraAgenciasPage } from './pages/ComercializadoraAgenciasPage'
import { ComercializadoraSubdistribuidoresPage } from './pages/ComercializadoraSubdistribuidoresPage'
import { AgenciaTaquillasPage } from './pages/AgenciaTaquillasPage'
import { SettingsPage } from './pages/SettingsPage'

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
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <BrowserRouter>
            <AppProvider>
              <LotteryTypeProvider>
                <Routes>
                  {/* Public route */}
                  <Route path="/login" element={<LoginRoute />} />

                  {/* Protected routes with layout */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={
                      <ProtectedRoute requiredPermission="dashboard">
                        <DashboardPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                      <ProtectedRoute requiredPermission="reports">
                        <ReportsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/lotteries" element={
                      <ProtectedRoute requiredPermission="lotteries">
                        <LotteriesPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/draws" element={
                      <ProtectedRoute requiredPermission="draws.read">
                        <DrawsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/winners" element={
                      <ProtectedRoute requiredPermission="winners">
                        <WinnersPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute requiredPermission="users">
                        <UsersPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/roles" element={
                      <ProtectedRoute requiredPermission="roles">
                        <RolesPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/api-keys" element={
                      <ProtectedRoute requiredPermission="api-keys">
                        <ApiKeysPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercializadores" element={
                      <ProtectedRoute requiredPermission="comercializadoras">
                        <ComercializadorasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercializadores/:id/agencias" element={
                      <ProtectedRoute requiredPermission="comercializadoras">
                        <ComercializadoraAgenciasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercializadores/:id/subdistribuidores" element={
                      <ProtectedRoute requiredPermission="comercializadoras">
                        <ComercializadoraSubdistribuidoresPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercializadores/:comercializadoraId/subdistribuidores/:subdistribuidorId/agencias" element={
                      <ProtectedRoute>
                        <ComercializadoraAgenciasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/subdistribuidor/agencias" element={
                      <ProtectedRoute>
                        <ComercializadoraAgenciasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercializadores/:comercializadoraId/subdistribuidores/:subdistribuidorId/agencias/:agencyId/taquillas" element={
                      <ProtectedRoute requiredPermission="comercializadoras">
                        <AgenciaTaquillasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercializadores/:id/agencias/:agencyId/taquillas" element={
                      <ProtectedRoute requiredPermission="comercializadoras">
                        <AgenciaTaquillasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/agencias/:id/taquillas" element={
                      <ProtectedRoute requiredPermission="comercializadoras">
                        <AgenciaTaquillasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/agencia/taquillas" element={
                      <ProtectedRoute>
                        <AgenciaTaquillasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute requiredPermission="settings">
                        <SettingsPage />
                      </ProtectedRoute>
                    } />
                  </Route>

                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </LotteryTypeProvider>
            </AppProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </QueryClientProvider>
    )
  } catch (err: any) {
    // Ensure any early runtime error displays in the page instead of a blank screen
    console.error('Render error:', err)
    rootEl.innerHTML = `<pre style="white-space:pre-wrap;color:#b91c1c;padding:16px;background:#fff7f7">Render error:\n${String(err)}</pre>`
  }
}
