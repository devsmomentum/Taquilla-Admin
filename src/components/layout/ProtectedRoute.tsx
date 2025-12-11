import { Navigate, useLocation } from 'react-router-dom'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { currentUser, currentUserId, isLoading, hasPermission } = useSupabaseAuth()
  const location = useLocation()

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario autenticado, redirigir a login
  if (!currentUserId || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Helper para verificar si el usuario puede ver un módulo
  const canViewModule = (module: string): boolean => {
    if (!currentUser) return false

    // Para Admins: usar el sistema de permisos por roles
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      return hasPermission(module)
    }

    // Comercializadora tiene acceso fijo a: dashboard, reports y comercializadoras (sus agencias/taquillas)
    if (currentUser.userType === 'comercializadora') {
      return ['dashboard', 'reports', 'comercializadoras'].includes(module)
    }

    // Agencia tiene acceso fijo a: dashboard, reports y comercializadoras (sus taquillas)
    if (currentUser.userType === 'agencia') {
      return ['dashboard', 'reports', 'comercializadoras'].includes(module)
    }

    // Taquilla tiene acceso básico
    if (currentUser.userType === 'taquilla') {
      return ['dashboard'].includes(module)
    }

    return false
  }

  // Si se requiere un permiso específico, verificarlo
  if (requiredPermission && !canViewModule(requiredPermission)) {
    // Redirigir a la primera ruta permitida
    const allowedRoutes = [
      { path: '/dashboard', permission: 'dashboard' },
      { path: '/reports', permission: 'reports' },
      { path: '/lotteries', permission: 'lotteries' },
      { path: '/draws', permission: 'draws.read' },
      { path: '/winners', permission: 'winners' },
      { path: '/users', permission: 'users' },
      { path: '/roles', permission: 'roles' },
      { path: '/api-keys', permission: 'api-keys' },
      { path: '/comercializadoras', permission: 'comercializadoras' },
    ]

    const firstAllowed = allowedRoutes.find(route => canViewModule(route.permission))
    if (firstAllowed) {
      return <Navigate to={firstAllowed.path} replace />
    }

    // Si no tiene acceso a ninguna ruta, mostrar mensaje de error
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-foreground">No tienes permisos para acceder a esta sección</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
