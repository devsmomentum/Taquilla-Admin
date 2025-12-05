import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { User } from '@/lib/types'
import { toast } from 'sonner'

export interface SupabaseUser {
  id: string
  name: string
  email: string
  password_hash: string
  is_active: boolean
  created_at: string
  created_by: string | null
  updated_at: string
  // Campos de la vista users_with_roles
  roles?: Array<{
    id: string
    name: string
    description: string
    permissions: string[]
    is_system: boolean
  }>
  all_permissions?: string[]
}

// Funciones de almacenamiento local
const getLocalUsers = (): User[] => {
  try {
    const stored = localStorage.getItem('users')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading local users:', error)
    return []
  }
}

const saveLocalUsers = (users: User[]): void => {
  try {
    localStorage.setItem('users', JSON.stringify(users))
    console.log(`💾 Guardados ${users.length} usuarios localmente`)
  } catch (error) {
    console.error('Error saving local users:', error)
  }
}

export function useSupabaseUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar usuarios desde Supabase y local
  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Cargar usuarios locales primero
    const localUsers = getLocalUsers()
    console.log(`📱 Cargados ${localUsers.length} usuarios desde localStorage`)

    if (!isSupabaseConfigured()) {
      // Solo usar usuarios locales + usuarios por defecto si Supabase no está configurado
      const defaultUsers: User[] = [
        {
          id: 'admin-user-default',
          name: 'Administrador Principal',
          email: 'admin@loteria.com',
          roleIds: ['admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        }
      ]

      // Combinar usuarios por defecto con locales (evitar duplicados)
      const combinedUsers = [...defaultUsers]
      localUsers.forEach(localUser => {
        if (!combinedUsers.find(u => u.id === localUser.id)) {
          combinedUsers.push(localUser)
        }
      })

      setUsers(combinedUsers)
      setIsLoading(false)
      return
    }

    try {
      // Cargar usuarios desde Supabase
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          is_active,
          created_at,
          created_by,
          user_type,
          address,
          share_on_sales,
          share_on_profits,
          comercializadora_id,
          agencia_id,
          parent_id
        `)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Cargar roles para cada usuario
      const usersWithRoles = await Promise.all(
        data.map(async (user: any) => {
          // Obtener roles del usuario
          const { data: userRolesData } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', user.id)

          const roleIds = userRolesData?.map(ur => ur.role_id) || []

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            address: user.address,
            shareOnSales: parseFloat(user.share_on_sales) || 0,
            shareOnProfits: parseFloat(user.share_on_profits) || 0,
            roleIds: roleIds,
            isActive: user.is_active,
            createdAt: user.created_at,
            createdBy: user.created_by || 'system',
            // Campos para RLS jerárquico
            comercializadoraId: user.comercializadora_id,
            agenciaId: user.agencia_id,
            parentId: user.parent_id
          }
        })
      )

      console.log(`☁️ Cargados ${usersWithRoles.length} usuarios desde Supabase con sus roles`)

      // Combinar usuarios de Supabase con locales (prioridad a Supabase)
      const combinedUsers: User[] = [...usersWithRoles]
      localUsers.forEach(localUser => {
        if (!combinedUsers.find(u => u.id === localUser.id || u.email === localUser.email)) {
          combinedUsers.push(localUser)
        }
      })

      setUsers(combinedUsers)

      // Guardar la combinación localmente
      saveLocalUsers(combinedUsers)

    } catch (error: any) {
      console.error('Error loading users from Supabase:', error)
      setError(error.message || 'Error al cargar usuarios')
      toast.error('Error al cargar usuarios desde Supabase, usando datos locales')

      // Fallback a usuarios locales + por defecto
      const defaultUsers: User[] = [
        {
          id: 'admin-user-fallback',
          name: 'Administrador Principal',
          email: 'admin@loteria.com',
          roleIds: ['admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        }
      ]

      const combinedUsers = [...defaultUsers, ...localUsers]
      setUsers(combinedUsers)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    // 1. Verificar si el email ya existe localmente
    const existingLocalUser = users.find(u => u.email === userData.email)
    if (existingLocalUser) {
      toast.error('Ya existe un usuario con este email localmente')
      return false
    }

    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newUser: User = {
      id: newUserId,
      name: userData.name,
      email: userData.email,
      userType: userData.userType || 'admin',
      roleIds: userData.roleIds || [],
      isActive: userData.isActive,
      createdAt: new Date().toISOString(),
      createdBy: userData.createdBy || 'local-system'
    }

    let supabaseSuccess = false

    // 2. Intentar crear en Supabase usando Edge Function
    if (isSupabaseConfigured()) {
      try {
        console.log(`📝 Creando usuario ${userData.email} con Edge Function...`)

        // Obtener sesión para auth
        const { data: session } = await supabase.auth.getSession()

        if (!session?.session) {
          toast.error('Debes estar autenticado para crear usuarios')
          return false
        }

        const password = userData.password || '123456' // Contraseña por defecto

        // Llamar a Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              password: password,
              roleIds: userData.roleIds,
              userType: userData.userType || 'admin',
              isActive: userData.isActive ?? true,
              address: userData.address || null,
              shareOnSales: userData.shareOnSales || 0,
              shareOnProfits: userData.shareOnProfits || 0,
              agenciaId: userData.agenciaId || null,
              comercializadoraId: userData.comercializadoraId || null,  // Para RLS jerárquico
              parentId: userData.createdBy || null  // ID del usuario padre para RLS
            })
          }
        )

        const result = await response.json()

        if (!response.ok) {
          console.error('Error de Edge Function:', result)
          throw new Error(result.error || 'Error al crear usuario')
        }

        // Usuario creado exitosamente
        newUser.id = result.userId
        supabaseSuccess = true
        console.log('✅ Usuario creado completamente:', result)
        toast.success('Usuario creado en Authentication y base de datos')

      } catch (error: any) {
        console.error('❌ Error creando usuario:', error)

        // Manejo de errores específicos
        if (error.message.includes('ya está registrado')) {
          toast.error(`El email ${userData.email} ya está registrado`)
          return false
        }

        toast.error(`Error: ${error.message}`)
        return false
      }
    }

    // 3. Guardar localmente
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    if (!isSupabaseConfigured()) {
      toast.success('Usuario creado localmente (Supabase no configurado)')
    }

    return true
  }

  // Actualizar usuario (Supabase + Local)
  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    // Verificar si el email ya existe localmente (excluyendo el usuario actual)
    if (userData.email) {
      const existingLocalUser = users.find(u => u.email === userData.email && u.id !== userId)
      if (existingLocalUser) {
        toast.error('Ya existe otro usuario con este email')
        return false
      }
    }

    let supabaseSuccess = false

    // Intentar actualizar en Supabase primero
    if (isSupabaseConfigured()) {
      try {
        // Verificar duplicados de email en Supabase si se está cambiando el email
        if (userData.email) {
          const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', userData.email)
            .neq('id', userId)

          if (checkError) {
            throw checkError
          }

          if (existingUsers && existingUsers.length > 0) {
            toast.error('Este email ya está registrado en Supabase')
            return false
          }
        }

        const { error } = await supabase
          .from('users')
          .update({
            name: userData.name,
            email: userData.email,
            is_active: userData.isActive,
          })
          .eq('id', userId)

        if (error) {
          // Manejar errores de duplicado específicamente
          if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
            toast.error('Este email ya está registrado en Supabase')
            return false
          }
          throw error
        }

        // Actualizar roles si se proporcionaron
        if (userData.roleIds !== undefined) {
          // Eliminar roles existentes
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)

          // Insertar nuevos roles
          if (userData.roleIds.length > 0) {
            const userRoles = userData.roleIds.map(roleId => ({
              user_id: userId,
              role_id: roleId
            }))

            const { error: rolesError } = await supabase
              .from('user_roles')
              .insert(userRoles)

            if (rolesError) {
              console.error('Error actualizando roles:', rolesError)
            }
          }
        }

        supabaseSuccess = true
        console.log('✅ Usuario actualizado en Supabase')

      } catch (error: any) {
        console.error('Error updating user in Supabase:', error)

        // Si es error de duplicado, no continuar
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          toast.error('Este email ya está registrado en Supabase')
          return false
        }

        // Si es error de UUID inválido, es porque el usuario es local y no existe en Supabase
        if (error.message.includes('invalid input syntax for type uuid')) {
          console.log('Usuario local detectado (ID no es UUID), actualizando solo localmente')
          // No mostramos error al usuario, es comportamiento esperado para usuarios legacy
        } else {
          toast.error(`Error en Supabase: ${error.message}. Actualizando solo localmente.`)
        }
      }
    }

    // Actualizar localmente (siempre, si no hay errores de duplicado)
    const updatedUsers = users.map(user =>
      user.id === userId ? { ...user, ...userData } : user
    )
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    // Mostrar mensaje apropiado
    if (supabaseSuccess) {
      toast.success('Usuario actualizado en Supabase y localmente')
    } else if (!isSupabaseConfigured()) {
      toast.success('Usuario actualizado localmente (Supabase no configurado)')
    } else {
      toast.success('Usuario actualizado localmente')
    }

    return true
  }

  // Eliminar usuario (Auth + Public usando Edge Function)
  const deleteUser = async (userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      try {
        console.log('🗑️ Eliminando usuario completamente:', userId)

        // Llamar a Edge Function que elimina de Auth + Public
        const { data: session } = await supabase.auth.getSession()

        if (!session?.session) {
          toast.error('Debes estar autenticado para eliminar usuarios')
          return false
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ userId })
          }
        )

        const result = await response.json()

        if (!response.ok) {
          console.error('Error de Edge Function:', result)

          // Fallback: Intentar método RPC tradicional
          console.warn('Edge Function falló, intentando RPC fallback...')
          const { error: rpcError } = await supabase.rpc('delete_user_completely', {
            target_user_id: userId
          })

          if (rpcError) {
            console.warn('RPC también falló:', rpcError.message)

            // Último recurso: solo borrar de public
            await supabase.from('user_roles').delete().eq('user_id', userId)
            const { error: deleteError } = await supabase.from('users').delete().eq('id', userId)

            if (deleteError) {
              throw deleteError
            }

            toast.warning('Usuario eliminado de la base de datos, pero permanece en Auth (elimina manualmente desde Dashboard)')
          } else {
            toast.success('Usuario eliminado completamente')
          }
        } else {
          console.log('✅ Usuario eliminado completamente:', result)
          toast.success('Usuario eliminado de Auth y base de datos')
        }

      } catch (error: any) {
        console.error('Error eliminando usuario:', error)
        toast.error(`Error: ${error.message}`)
        return false
      }
    }

    // Eliminar localmente
    const updatedUsers = users.filter(user => user.id !== userId)
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    if (!isSupabaseConfigured()) {
      toast.success('Usuario eliminado localmente')
    }

    return true
  }

  // Alternar estado del usuario
  const toggleUserStatus = async (userId: string): Promise<boolean> => {
    const user = users.find(u => u.id === userId)
    if (!user) return false

    return await updateUser(userId, { isActive: !user.isActive })
  }

  // Sincronizar usuarios locales con Supabase
  const syncUsersToSupabase = async (): Promise<void> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return
    }

    const localUsers = getLocalUsers()
    let syncedCount = 0

    for (const user of localUsers) {
      try {
        // Verificar si el usuario ya existe en Supabase
        const { data: existingUsers } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)

        if (!existingUsers || existingUsers.length === 0) {
          // Crear usuario en Supabase
          const password = 'changeme123'
          const passwordHash = `hashed_${password}_${Date.now()}`

          const { data: newSupabaseUser, error } = await supabase
            .from('users')
            .insert([
              {
                name: user.name,
                email: user.email,
                password_hash: passwordHash,
                is_active: user.isActive,
                created_by: null
              }
            ])
            .select()

          if (!error && newSupabaseUser && newSupabaseUser.length > 0) {
            syncedCount++
            console.log(`📤 Usuario sincronizado: ${user.email}`)
          }
        }
      } catch (error) {
        console.error(`Error sincronizando usuario ${user.email}:`, error)
      }
    }

    if (syncedCount > 0) {
      toast.success(`${syncedCount} usuarios sincronizados con Supabase`)
      await loadUsers() // Recargar para obtener los IDs correctos
    } else {
      toast.info('Todos los usuarios ya están sincronizados')
    }
  }

  // Limpiar usuarios duplicados en Supabase
  const cleanDuplicateUsers = async (): Promise<void> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return
    }

    try {
      console.log('🧹 Iniciando limpieza de duplicados...')
      toast.info('Limpiando usuarios duplicados...')

      // Obtener todos los usuarios
      const { data: allUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      console.log(`📊 Total usuarios: ${allUsers.length}`)

      // Agrupar por email
      const emailGroups: { [key: string]: any[] } = {}
      allUsers.forEach(user => {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = []
        }
        emailGroups[user.email].push(user)
      })

      // Encontrar duplicados
      const duplicateEmails = Object.keys(emailGroups).filter(email => emailGroups[email].length > 1)

      if (duplicateEmails.length === 0) {
        toast.success('No se encontraron duplicados')
        console.log('✅ No hay duplicados para limpiar')
        return
      }

      console.log(`⚠️ Encontrados ${duplicateEmails.length} emails duplicados`)

      let deletedCount = 0

      for (const email of duplicateEmails) {
        const duplicateUsers = emailGroups[email]

        // Mantener el más antiguo
        duplicateUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const keepUser = duplicateUsers[0]
        const deleteUsers = duplicateUsers.slice(1)

        console.log(`📧 ${email}: manteniendo ${keepUser.id}, eliminando ${deleteUsers.length}`)

        for (const user of deleteUsers) {
          try {
            // Eliminar relaciones primero
            await supabase.from('bets').delete().eq('user_id', user.id)
            await supabase.from('taquilla_sales').delete().eq('created_by', user.id)
            await supabase.from('api_keys').delete().eq('created_by', user.id)
            await supabase.from('taquillas').update({ activated_by: null }).eq('activated_by', user.id)
            await supabase.from('transfers').update({ created_by: null }).eq('created_by', user.id)
            await supabase.from('withdrawals').update({ created_by: null }).eq('created_by', user.id)

            await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', user.id)

            // Eliminar usuario
            const { error: deleteError } = await supabase
              .from('users')
              .delete()
              .eq('id', user.id)

            if (deleteError) {
              console.error(`❌ Error eliminando ${user.email}:`, deleteError)
            } else {
              deletedCount++
              console.log(`🗑️ Eliminado: ${user.name} (${user.email})`)
            }
          } catch (error) {
            console.error(`Error eliminando ${user.email}:`, error)
          }
        }
      }

      toast.success(`Limpieza completada! ${deletedCount} usuarios duplicados eliminados`)
      console.log(`✅ Limpieza completada: ${deletedCount} usuarios eliminados`)

      // Recargar usuarios
      await loadUsers()

    } catch (error: any) {
      console.error('Error limpiando duplicados:', error)
      toast.error(`Error limpiando duplicados: ${error.message}`)
    }
  }

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return {
    users,
    isLoading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    syncUsersToSupabase,
    cleanDuplicateUsers,
  }
}