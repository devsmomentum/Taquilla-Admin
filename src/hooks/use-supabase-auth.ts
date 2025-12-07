import { useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface SupabaseUser {
  id: string
  name: string
  email: string
  is_active: boolean
  userType: 'admin' | 'comercializadora' | 'agencia' | 'taquilla' // Tipo de usuario
  // Solo para admins
  roles: Array<{
    id: string
    name: string
    description: string
    permissions: string[]
    is_system: boolean
  }>
  all_permissions: string[]
  // Relación jerárquica
  parentId?: string // ID del padre jerárquico
  taquillaId?: string // ID específico si es taquilla
}

export function useSupabaseAuth() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Ref para trackear el userId actual sin causar re-renders
  const currentUserIdRef = useRef<string>('')

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        currentUserIdRef.current = session.user.id
        setCurrentUserId(session.user.id)
        loadUserData(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Escuchar cambios en la autenticación
    // Solo recargar datos en eventos de login/logout, no en TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignorar TOKEN_REFRESHED para evitar recargas innecesarias
      if (event === 'TOKEN_REFRESHED') {
        return
      }

      if (session?.user) {
        // Solo recargar si el usuario cambió
        if (session.user.id !== currentUserIdRef.current) {
          currentUserIdRef.current = session.user.id
          setCurrentUserId(session.user.id)
          loadUserData(session.user.id)
        }
      } else {
        currentUserIdRef.current = ''
        setCurrentUserId('')
        setCurrentUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (userId: string) => {
    try {
      setIsLoading(true)

      if (isSupabaseConfigured()) {
        try {
          // Leer usuario con parent_id de la tabla users
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, email, is_active, user_type, parent_id')
            .eq('id', userId)
            .single()

          if (!error && userData) {
            // Obtener roles completos con permisos (solo para admins)
            const { data: userRolesData } = await supabase
              .from('user_roles')
              .select('*, roles(*)')
              .eq('user_id', userId)

            const roles = (userRolesData || []).map((ur: any) => ({
              id: ur.roles.id,
              name: ur.roles.name,
              description: ur.roles.description || '',
              permissions: ur.roles.permissions || [],
              is_system: ur.roles.is_system || false
            }))

            // Combinar todos los permisos de todos los roles
            const allPermissions = roles.reduce((acc: string[], role: any) => {
              return [...acc, ...role.permissions]
            }, [])

            // Determinar userType desde la base de datos
            const userType = (userData.user_type as 'admin' | 'comercializadora' | 'agencia' | 'taquilla') || 'admin'

            // Construir usuario - ahora solo usamos parentId para relaciones jerárquicas
            const user: SupabaseUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              is_active: userData.is_active,
              userType,
              roles: roles,
              all_permissions: [...new Set(allPermissions)],
              parentId: userData.parent_id,
              taquillaId: userType === 'taquilla' ? userData.id : undefined
            }

            setCurrentUser(user)
            setIsLoading(false)
            return
          }
        } catch (supabaseError) {
          // Error loading user from Supabase
        }
      }

      // Si llegamos aquí, no se pudo cargar el usuario
      setCurrentUser(null)

    } catch (error) {
      // Error in loadUserData
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Sistema no configurado. Contacte al administrador' }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: 'Credenciales incorrectas o error de conexión' }
      }

      if (data.user) {
        // La actualización del estado se maneja en onAuthStateChange
        return { success: true }
      }

      return { success: false, error: 'No se pudo iniciar sesión' }
    } catch (error) {
      return { success: false, error: 'Error al iniciar sesión' }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setCurrentUserId('')
      setCurrentUser(null)
    } catch (error) {
      // Logout error
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false
    // Solo los admins usan el sistema de permisos
    if (currentUser.userType !== 'admin') return false
    // Si el usuario tiene el permiso universal '*', tiene acceso a todo
    if (currentUser.all_permissions.includes('*')) return true
    return currentUser.all_permissions.includes(permission)
  }

  const isUserType = (type: 'admin' | 'comercializadora' | 'agencia' | 'taquilla'): boolean => {
    if (!currentUser) return false
    return currentUser.userType === type
  }

  const canAccessEntity = (entityId: string, entityType: 'comercializadora' | 'agencia' | 'taquilla'): boolean => {
    if (!currentUser) return false

    // Admins con permisos adecuados pueden acceder a todo
    if (currentUser.userType === 'admin' && currentUser.all_permissions.includes('*')) return true

    // Verificar acceso según el tipo de entidad usando parentId
    if (entityType === 'comercializadora') {
      // Si es comercializadora, su ID es el entityId
      return currentUser.userType === 'comercializadora' && currentUser.id === entityId
    } else if (entityType === 'agencia') {
      // Si es agencia, su ID es el entityId, o si es comercializadora, el entityId es hijo
      return currentUser.userType === 'agencia' && currentUser.id === entityId
    } else if (entityType === 'taquilla') {
      return currentUser.taquillaId === entityId
    }

    return false
  }

  return {
    currentUser,
    currentUserId,
    isLoading,
    login,
    logout,
    hasPermission,
    isUserType,
    canAccessEntity,
  }
}
