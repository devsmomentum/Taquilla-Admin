import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { User } from '@/lib/types'
import { toast } from 'sonner'

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

// Función para obtener usuarios desde Supabase
async function fetchUsers(): Promise<User[]> {
  if (!isSupabaseConfigured()) {
    // Usuario por defecto si Supabase no está configurado
    return [{
      id: 'admin-user-default',
      name: 'Administrador Principal',
      email: 'admin@loteria.com',
      roleIds: ['admin'],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    }]
  }

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
      phone,
      share_on_sales,
      share_on_profits,
      parent_id,
      sales_limit,
      lotteries
    `)
    .order('created_at', { ascending: true })

  if (error) throw error

  // Cargar roles para cada usuario
  const usersWithRoles = await Promise.all(
    data.map(async (user: any) => {
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
        phone: user.phone,
        shareOnSales: parseFloat(user.share_on_sales) || 0,
        shareOnProfits: parseFloat(user.share_on_profits) || 0,
        salesLimit: parseFloat(user.sales_limit) || 0,
        lotteries: user.lotteries ?? null,
        roleIds: roleIds,
        isActive: user.is_active,
        createdAt: user.created_at,
        createdBy: user.created_by || 'system',
        parentId: user.parent_id
      }
    })
  )

  return usersWithRoles
}

// Hook principal para obtener usuarios
export function useUsersQuery() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Mutation para crear usuario
export function useCreateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: Omit<User, 'id' | 'createdAt'> & { password?: string }) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado')
      }

      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        throw new Error('Debes estar autenticado para crear usuarios')
      }

      const password = userData.password || '123456'

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
            phone: userData.phone || null,
            shareOnSales: userData.shareOnSales || 0,
            shareOnProfits: userData.shareOnProfits || 0,
            salesLimit: userData.salesLimit || 0,
            parentId: userData.parentId || null,
            lotteries: userData.lotteries ?? null
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario')
      }

      // Asegurar persistencia de loterías (por si la Edge Function no maneja el campo)
      if (userData.lotteries !== undefined && result?.userId) {
        const { error: lotteriesError } = await supabase
          .from('users')
          .update({ lotteries: userData.lotteries })
          .eq('id', result.userId)

        if (lotteriesError) {
          // No fallar la creación completa por esto, pero reportar
          console.error('Error guardando lotteries en users:', lotteriesError)
        }
      }

      return result
    },
    onSuccess: () => {
      // Invalidar cache de usuarios para recargar
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success('Usuario creado exitosamente')
    },
    onError: (error: Error) => {
      if (error.message.includes('ya está registrado')) {
        toast.error(`El email ya está registrado`)
      } else {
        toast.error(`Error: ${error.message}`)
      }
    }
  })
}

// Mutation para actualizar usuario
export function useUpdateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: Partial<User> & { password?: string } }) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado')
      }

      // Verificar duplicados de email
      if (userData.email) {
        const { data: existingUsers, error: checkError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', userData.email)
          .neq('id', userId)

        if (checkError) throw checkError
        if (existingUsers && existingUsers.length > 0) {
          throw new Error('Este email ya está registrado')
        }
      }

      // Si se proporciona una contraseña, actualizar en Supabase Auth
      if (userData.password) {
        const { data: session } = await supabase.auth.getSession()
        const currentUserId = session?.session?.user?.id

        if (currentUserId === userId) {
          // El usuario está cambiando su propia contraseña
          const { error: authError } = await supabase.auth.updateUser({
            password: userData.password
          })

          if (authError) {
            throw new Error(`Error al actualizar contraseña: ${authError.message}`)
          }
        } else {
          // Un admin está cambiando la contraseña de otro usuario - usar edge function
          if (!session?.session) {
            throw new Error('Debes estar autenticado para cambiar contraseñas')
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.session.access_token}`,
              },
              body: JSON.stringify({
                userId: userId,
                password: userData.password
              })
            }
          )

          if (!response.ok) {
            const result = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
            throw new Error(result.error || `Error al actualizar contraseña (${response.status})`)
          }
        }
      }

      const updateData: any = {}
      if (userData.name !== undefined) updateData.name = userData.name
      if (userData.email !== undefined) updateData.email = userData.email
      if (userData.isActive !== undefined) updateData.is_active = userData.isActive
      if (userData.address !== undefined) updateData.address = userData.address
      if (userData.phone !== undefined) updateData.phone = userData.phone
      if (userData.parentId !== undefined) updateData.parent_id = userData.parentId
      if (userData.shareOnSales !== undefined) updateData.share_on_sales = userData.shareOnSales
      if (userData.shareOnProfits !== undefined) updateData.share_on_profits = userData.shareOnProfits
      if (userData.salesLimit !== undefined) updateData.sales_limit = userData.salesLimit
      if (userData.lotteries !== undefined) updateData.lotteries = userData.lotteries

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          throw new Error('Este email ya está registrado')
        }
        throw error
      }

      // Actualizar roles si se proporcionaron
      if (userData.roleIds !== undefined) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)

        if (userData.roleIds.length > 0) {
          const userRoles = userData.roleIds.map(roleId => ({
            user_id: userId,
            role_id: roleId
          }))

          await supabase
            .from('user_roles')
            .insert(userRoles)
        }
      }

      return { userId, userData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success('Usuario actualizado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    }
  })
}

// Mutation para eliminar usuario
export function useDeleteUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado')
      }

      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        throw new Error('Debes estar autenticado para eliminar usuarios')
      }

      // Intentar eliminar con Edge Function
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
        // Fallback: Intentar método RPC
        const { error: rpcError } = await supabase.rpc('delete_user_completely', {
          target_user_id: userId
        })

        if (rpcError) {
          // Último recurso: solo borrar de public
          await supabase.from('user_roles').delete().eq('user_id', userId)
          const { error: deleteError } = await supabase.from('users').delete().eq('id', userId)

          if (deleteError) throw deleteError

          return { userId, partial: true }
        }
      }

      return { userId, partial: false }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      if (data.partial) {
        toast.warning('Usuario eliminado de la base de datos, pero puede permanecer en Auth')
      } else {
        toast.success('Usuario eliminado exitosamente')
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    }
  })
}

// Mutation para alternar estado del usuario
export function useToggleUserStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      return { userId, newStatus: !currentStatus }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success('Estado del usuario actualizado')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    }
  })
}
