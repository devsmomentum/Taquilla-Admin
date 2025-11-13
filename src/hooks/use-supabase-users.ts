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
          created_by
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
            roleIds: roleIds,
            isActive: user.is_active,
            createdAt: user.created_at,
            createdBy: user.created_by || 'system',
          }
        })
      )

      console.log(`☁️ Cargados ${usersWithRoles.length} usuarios desde Supabase con sus roles`)

      // Combinar usuarios de Supabase con locales (prioridad a Supabase)
      const combinedUsers = [...usersWithRoles]
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

  // Crear nuevo usuario (Supabase + Local)
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
      roleIds: userData.roleIds || [],
      isActive: userData.isActive,
      createdAt: new Date().toISOString(),
      createdBy: userData.createdBy || 'local-system'
    }

    let supabaseSuccess = false

    // 2. Intentar crear en Supabase primero (con validación robusta)
    if (isSupabaseConfigured()) {
      try {
        console.log(`🔍 Verificando email ${userData.email} en Supabase...`)
        
        // Verificación más robusta de duplicados
        const { data: existingUsers, error: checkError } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('email', userData.email)
          .limit(1)

        if (checkError) {
          console.error('Error en verificación de duplicados:', checkError)
          throw checkError
        }

        if (existingUsers && existingUsers.length > 0) {
          const existingUser = existingUsers[0]
          console.log(`❌ Email ${userData.email} ya existe en Supabase (ID: ${existingUser.id})`)
          toast.error(`Este email ya está registrado en Supabase por: ${existingUser.name}`)
          return false
        }

        console.log(`✅ Email ${userData.email} disponible en Supabase`)

        const password = userData.password || 'changeme123'
        const passwordHash = `hashed_${password}_${Date.now()}`
        
        console.log(`📝 Creando usuario en Supabase...`)
        const { data: supabaseUser, error: userError } = await supabase
          .from('users')
          .insert([
            {
              name: userData.name,
              email: userData.email,
              password_hash: passwordHash,
              is_active: userData.isActive,
              created_by: null // Evitar problema de foreign key
            }
          ])
          .select()

        if (userError) {
          // Si es error de duplicado, mostrar mensaje específico
          if (userError.message.includes('duplicate key') || userError.message.includes('unique constraint')) {
            toast.error('Este email ya está registrado en Supabase')
            return false
          }
          throw userError
        }

        // Obtener el primer usuario creado
        const createdUser = supabaseUser && supabaseUser[0]
        if (!createdUser) {
          throw new Error('No se pudo crear el usuario en Supabase')
        }

        // Asignar roles si se proporcionaron
        if (userData.roleIds && userData.roleIds.length > 0) {
          const userRoles = userData.roleIds.map(roleId => ({
            user_id: createdUser.id,
            role_id: roleId
          }))

          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(userRoles)

          if (rolesError) {
            console.error('Error asignando roles:', rolesError)
          }
        }

        // Usar el ID de Supabase
        newUser.id = createdUser.id
        newUser.createdAt = createdUser.created_at
        supabaseSuccess = true

        console.log('✅ Usuario creado en Supabase:', newUser.email)
        
      } catch (error: any) {
        console.error('❌ Error creating user in Supabase:', error)
        
        // Manejo específico de errores de duplicate key
        if (error.message.includes('duplicate key') || 
            error.message.includes('unique constraint') ||
            error.message.includes('users_email_key')) {
          console.log(`🚫 Duplicate email detected: ${userData.email}`)
          toast.error(`El email ${userData.email} ya está registrado en Supabase`)
          return false
        }
        
        // Otros errores de Supabase - continuar con localStorage
        console.log(`⚠️ Supabase error, saving locally only: ${error.message}`)
        toast.error(`Error en Supabase: ${error.message}. Guardando solo localmente.`)
      }
    }

    // Guardar localmente (siempre, si no hay errores de duplicado)
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)
    
    // Mostrar mensaje apropiado
    if (supabaseSuccess) {
      toast.success('Usuario creado exitosamente en Supabase y localmente')
    } else if (!isSupabaseConfigured()) {
      toast.success('Usuario creado localmente (Supabase no configurado)')
    } else {
      toast.success('Usuario creado localmente')
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
        
        toast.error(`Error en Supabase: ${error.message}. Actualizando solo localmente.`)
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

  // Eliminar usuario (Supabase + Local)
  const deleteUser = async (userId: string): Promise<boolean> => {
    // Intentar eliminar de Supabase primero
    if (isSupabaseConfigured()) {
      try {
        // Eliminar relaciones de roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)

        // Eliminar usuario
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)

        if (error) {
          if (error.message.includes('row-level security policy')) {
            toast.error('No se puede eliminar el usuario debido a políticas de seguridad')
            return false
          }
          throw error
        }

        console.log('✅ Usuario eliminado de Supabase')
        toast.success('Usuario eliminado de Supabase y localmente')
        
      } catch (error: any) {
        console.error('Error deleting user from Supabase:', error)
        toast.error(`Error en Supabase: ${error.message}. Eliminando solo localmente.`)
      }
    }

    // Eliminar localmente (siempre)
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