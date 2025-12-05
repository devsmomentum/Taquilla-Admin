import { useState, useEffect } from 'react'
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
          // Leer directamente de la tabla users para obtener user_type
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, email, is_active, user_type')
            .eq('id', userId)
            .single()

          if (!error && userData) {
            // Obtener roles completos con permisos (solo para admins)
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

            // Inicializar usuario base
            let userType: 'admin' | 'comercializadora' | 'agencia' | 'taquilla' = 'admin' // Default
            let comercializadoraId: string | undefined
            let agenciaId: string | undefined
            let taquillaId: string | undefined

            // PRIMERO: Leer user_type directamente de la tabla users
            if (userData.user_type) {
              userType = userData.user_type as 'admin' | 'comercializadora' | 'agencia' | 'taquilla'
              console.log('🔍 UserType desde DB:', userType)
            } else {
              console.warn('⚠️ user_type no encontrado en userData, usando detección por relaciones')
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
                  console.log('Usuario tipo Taquilla (detectado por relación):', taq.id)
                }
              } catch (e) {
                console.warn('Error checking taquilla link:', e)
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
                    console.log('Usuario tipo Agencia (detectado por relación):', ag.id)
                  }
                } catch (e) {
                  console.warn('Error checking agencia link:', e)
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
                      console.log('Usuario tipo Agencia (Local):', myAgency.id)
                    }
                  } catch (e) {
                    console.warn('Error checking local agencia link:', e)
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
                    console.log('Usuario tipo Comercializadora (detectado por relación):', com.id)
                  }
                } catch (e) {
                  console.warn('Error checking comercializadora link:', e)
                }

                // Fallback local para Comercializadora
                if (!comercializadoraId) {
                  try {
                    const localComs = JSON.parse(localStorage.getItem('comercializadoras_backup') || '[]')
                    const myCom = localComs.find((c: any) => c.userId === userId)
                    if (myCom) {
                      userType = 'comercializadora'
                      comercializadoraId = myCom.id
                      console.log('Usuario tipo Comercializadora (Local):', myCom.id)
                    }
                  } catch (e) {
                    console.warn('Error checking local comercializadora link:', e)
                  }
                }
              }

              // Si no tiene ninguna vinculación con entidades de negocio, es admin
              if (!taquillaId && !agenciaId && !comercializadoraId) {
                userType = 'admin'
                console.log('Usuario tipo Admin (por defecto)')
              }
            } else {
              console.log('✅ UserType ya definido en DB:', userData.user_type)

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
                    console.log('✅ ComercializadoraId desde DB:', comercializadoraId)
                  }
                } catch (e) {
                  console.warn('Error fetching comercializadoraId:', e)
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
                    console.log('✅ AgenciaId desde DB:', agenciaId)
                  }
                } catch (e) {
                  console.warn('Error fetching agenciaId:', e)
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
                    console.log('✅ TaquillaId desde DB:', taquillaId)
                  }
                } catch (e) {
                  console.warn('Error fetching taquillaId:', e)
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

            console.log('Usuario cargado:', user.email, 'Tipo:', user.userType, 'Permisos:', user.all_permissions)
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
