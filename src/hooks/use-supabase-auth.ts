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
  // Relaciones con entidades de negocio
  comercializadoraId?: string // Si userType === 'comercializadora'
  agenciaId?: string // Si userType === 'agencia'
  taquillaId?: string // Si userType === 'taquilla'
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
          // Leer directamente de la tabla users para obtener user_type
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, email, is_active, user_type')
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

            // Inicializar usuario base
            let userType: 'admin' | 'comercializadora' | 'agencia' | 'taquilla' = 'admin' // Default
            let comercializadoraId: string | undefined
            let agenciaId: string | undefined
            let taquillaId: string | undefined

            // PRIMERO: Leer user_type directamente de la tabla users
            if (userData.user_type) {
              userType = userData.user_type as 'admin' | 'comercializadora' | 'agencia' | 'taquilla'
            }

            // Buscar vinculación con Taquilla (SOLO si userType no está definido en DB)
            if (!userData.user_type) {
              try {
                const { data: taq } = await supabase
                  .from('taquillas')
                  .select('id, agencia_id, comercializadora_id')
                  .eq('user_id', userId)
                  .maybeSingle()

                if (taq) {
                  userType = 'taquilla'
                  taquillaId = taq.id
                  agenciaId = taq.agencia_id
                  comercializadoraId = taq.comercializadora_id
                }
              } catch (e) {
                // Error checking taquilla link
              }

              // Si no es taquilla, buscar vinculación con Agencia
              if (!taquillaId) {
                try {
                  const { data: ag } = await supabase
                    .from('agencias')
                    .select('id, comercializadora_id')
                    .eq('user_id', userId)
                    .maybeSingle()

                  if (ag) {
                    userType = 'agencia'
                    agenciaId = ag.id
                    comercializadoraId = ag.comercializadora_id
                  }
                } catch (e) {
                  // Error checking agencia link
                }

                // Fallback local para Agencia
                if (!agenciaId) {
                  try {
                    const localAgencies = JSON.parse(localStorage.getItem('taquilla-agencies') || '[]')
                    const myAgency = localAgencies.find((a: any) => a.userId === userId)
                    if (myAgency) {
                      userType = 'agencia'
                      agenciaId = myAgency.id
                      comercializadoraId = myAgency.commercializerId
                    }
                  } catch (e) {
                    // Error checking local agencia link
                  }
                }
              }

              // Si no es taquilla ni agencia, buscar vinculación con Comercializadora
              if (!taquillaId && !agenciaId) {
                try {
                  const { data: com } = await supabase
                    .from('comercializadoras')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle()

                  if (com) {
                    userType = 'comercializadora'
                    comercializadoraId = com.id
                  }
                } catch (e) {
                  // Error checking comercializadora link
                }

                // Fallback local para Comercializadora
                if (!comercializadoraId) {
                  try {
                    const localComs = JSON.parse(localStorage.getItem('comercializadoras_backup') || '[]')
                    const myCom = localComs.find((c: any) => c.userId === userId)
                    if (myCom) {
                      userType = 'comercializadora'
                      comercializadoraId = myCom.id
                    }
                  } catch (e) {
                    // Error checking local comercializadora link
                  }
                }
              }

              // Si no tiene ninguna vinculación con entidades de negocio, es admin
              if (!taquillaId && !agenciaId && !comercializadoraId) {
                userType = 'admin'
              }
            } else {
              // Buscar IDs en Supabase según el tipo de usuario
              if (userData.user_type === 'comercializadora') {
                try {
                  const { data: com } = await supabase
                    .from('comercializadoras')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle()

                  if (com) {
                    comercializadoraId = com.id
                  }
                } catch (e) {
                  // Error fetching comercializadoraId
                }
              } else if (userData.user_type === 'agencia') {
                try {
                  const { data: ag } = await supabase
                    .from('agencias')
                    .select('id, commercializer_id')
                    .eq('user_id', userId)
                    .maybeSingle()

                  if (ag) {
                    agenciaId = ag.id
                    comercializadoraId = ag.commercializer_id
                  }
                } catch (e) {
                  // Error fetching agenciaId
                }
              } else if (userData.user_type === 'taquilla') {
                try {
                  const { data: taq } = await supabase
                    .from('taquillas')
                    .select('id, agency_id')
                    .eq('user_id', userId)
                    .maybeSingle()

                  if (taq) {
                    taquillaId = taq.id
                    agenciaId = taq.agency_id
                  }
                } catch (e) {
                  // Error fetching taquillaId
                }
              }
            }

            // Construir usuario con el tipo correcto
            const user: SupabaseUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              is_active: userData.is_active,
              userType,
              roles: roles,
              all_permissions: [...new Set(allPermissions)], // Eliminar duplicados
              comercializadoraId,
              agenciaId,
              taquillaId
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

    // Verificar acceso según el tipo de entidad
    if (entityType === 'comercializadora') {
      return currentUser.comercializadoraId === entityId
    } else if (entityType === 'agencia') {
      return currentUser.agenciaId === entityId
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
