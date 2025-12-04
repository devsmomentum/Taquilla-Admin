import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface SupabaseUser {
  id: string
  name: string
  email: string
  is_active: boolean
  roles: Array<{
    id: string
    name: string
    description: string
    permissions: string[]
    is_system: boolean
  }>
  all_permissions: string[]
  comercializadoraId?: string
  agenciaId?: string
}

export function useSupabaseAuth() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id)
        loadUserData(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id)
        loadUserData(session.user.id)
      } else {
        setCurrentUserId('')
        setCurrentUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (userId: string) => {
    console.log('Loading user data for:', userId)

    try {
      setIsLoading(true)

      if (isSupabaseConfigured()) {
        try {
          const { data: userData, error } = await supabase
            .from('users_with_roles')
            .select('*')
            .eq('id', userId)
            .single()

          if (!error && userData) {
            // Obtener roles completos con permisos
            const { data: userRolesData, error: rolesError } = await supabase
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

            // Usuario real de Supabase con permisos correctos
            const user: SupabaseUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              is_active: userData.is_active,
              roles: roles,
              all_permissions: [...new Set(allPermissions)] // Eliminar duplicados
            }

            // Buscar vinculación con Comercializadora
            try {
              const { data: com } = await supabase
                .from('comercializadoras')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle()

              if (com) {
                user.comercializadoraId = com.id
                console.log('Usuario vinculado a Comercializadora:', com.id)
              }
            } catch (e) {
              console.warn('Error checking comercializadora link:', e)
            }

            // Fallback local para Comercializadora
            if (!user.comercializadoraId) {
              try {
                const localComs = JSON.parse(localStorage.getItem('comercializadoras_backup') || '[]')
                const myCom = localComs.find((c: any) => c.userId === userId)
                if (myCom) {
                  user.comercializadoraId = myCom.id
                  console.log('Usuario vinculado a Comercializadora (Local):', myCom.id)
                }
              } catch (e) {
                console.warn('Error checking local comercializadora link:', e)
              }
            }

            // Buscar vinculación con Agencia
            try {
              const { data: ag } = await supabase
                .from('agencias')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle()

              if (ag) {
                user.agenciaId = ag.id
                console.log('Usuario vinculado a Agencia:', ag.id)
              }
            } catch (e) {
              console.warn('Error checking agencia link:', e)
            }

            // Fallback local para Agencia
            if (!user.agenciaId) {
              try {
                const localAgencies = JSON.parse(localStorage.getItem('taquilla-agencies') || '[]')
                const myAgency = localAgencies.find((a: any) => a.userId === userId)
                if (myAgency) {
                  user.agenciaId = myAgency.id
                  console.log('Usuario vinculado a Agencia (Local):', myAgency.id)
                }
              } catch (e) {
                console.warn('Error checking local agencia link:', e)
              }
            }

            console.log('Usuario cargado desde Supabase:', user.email, 'Permisos:', user.all_permissions)
            setCurrentUser(user)
            setIsLoading(false)
            return
          }
        } catch (supabaseError) {
          console.log('Error cargando usuario de Supabase:', supabaseError)
        }
      }

      // Si llegamos aquí, no se pudo cargar el usuario
      setCurrentUser(null)

    } catch (error) {
      console.error('Error in loadUserData:', error)
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
        console.error('Login error:', error)
        return { success: false, error: 'Credenciales incorrectas o error de conexión' }
      }

      if (data.user) {
        console.log('Usuario autenticado:', data.user.email)
        // La actualización del estado se maneja en onAuthStateChange
        return { success: true }
      }

      return { success: false, error: 'No se pudo iniciar sesión' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error al iniciar sesión' }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setCurrentUserId('')
      setCurrentUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false
    // Si el usuario tiene el permiso universal '*', tiene acceso a todo
    if (currentUser.all_permissions.includes('*')) return true
    return currentUser.all_permissions.includes(permission)
  }

  return {
    currentUser,
    currentUserId,
    isLoading,
    login,
    logout,
    hasPermission,
  }
}
