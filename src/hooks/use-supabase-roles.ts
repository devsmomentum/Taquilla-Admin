import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Role } from '@/lib/types'
import { toast } from 'sonner'

export interface SupabaseRole {
  id: string
  name: string
  description: string
  permissions: string[]
  is_system: boolean
  created_at: string
  updated_at: string
}

export function useSupabaseRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar roles desde Supabase
  const loadRoles = async () => {
    if (!isSupabaseConfigured()) {
      // Fallback: usar roles locales por defecto
      const defaultRoles: Role[] = [
        {
          id: 'admin',
          name: 'Administrador',
          description: 'Acceso completo al sistema',
          permissions: ['dashboard', 'reports', 'lotteries', 'bets', 'winners', 'history', 'users', 'roles', 'api-keys', 'taquillas', 'agencias', 'comercializadoras'],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
        {
          id: 'comercializadora',
          name: 'Comercializadora',
          description: 'Gestiona agencias y supervisa taquillas',
          permissions: ['agencias', 'agencias.read', 'agencias.create', 'taquillas.read'],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
        {
          id: 'agencia',
          name: 'Agencia',
          description: 'Gestiona taquillas bajo su control',
          permissions: ['taquillas', 'taquillas.read', 'taquillas.create'],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
        {
          id: 'operator',
          name: 'Operador',
          description: 'Operaciones básicas',
          permissions: ['dashboard', 'lotteries', 'bets', 'winners', 'taquillas'],
          createdAt: new Date().toISOString(),
          isSystem: false,
        }
      ]
      setRoles(defaultRoles)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transformar datos de Supabase al formato local
      const transformedRoles: Role[] = data.map((role: SupabaseRole) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions as any[],
        createdAt: role.created_at,
        isSystem: role.is_system,
      }))

      // Combinar roles de Supabase con roles locales existentes
      setRoles(current => {
        const localRoles = current.filter(role => role.id.startsWith('local-'))
        const supabaseRoles = transformedRoles

        // Evitar duplicados por nombre
        const uniqueRoles = [...supabaseRoles]
        localRoles.forEach(localRole => {
          if (!supabaseRoles.find(sr => sr.name === localRole.name)) {
            uniqueRoles.push(localRole)
          }
        })

        return uniqueRoles
      })
    } catch (error: any) {
      console.error('Error loading roles:', error)
      setError(error.message || 'Error al cargar roles')
      toast.error('Error al cargar roles desde Supabase')

      // Fallback a roles por defecto en caso de error
      const defaultRoles: Role[] = [
        {
          id: 'admin',
          name: 'Administrador',
          description: 'Acceso completo al sistema',
          permissions: ['dashboard', 'reports', 'lotteries', 'bets', 'winners', 'history', 'users', 'roles', 'api-keys', 'taquillas', 'agencias', 'comercializadoras'],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
        {
          id: 'comercializadora',
          name: 'Comercializadora',
          description: 'Gestiona agencias y supervisa taquillas',
          permissions: ['agencias', 'agencias.read', 'agencias.create', 'taquillas.read'],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
        {
          id: 'agencia',
          name: 'Agencia',
          description: 'Gestiona taquillas bajo su control',
          permissions: ['taquillas', 'taquillas.read', 'taquillas.create'],
          createdAt: new Date().toISOString(),
          isSystem: true,
        }
      ]
      setRoles(defaultRoles)
    } finally {
      setIsLoading(false)
    }
  }

  // Crear nuevo rol
  const createRole = async (roleData: Omit<Role, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      // Fallback local
      const newRole: Role = {
        ...roleData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      setRoles(current => [...current, newRole])
      toast.success('Rol creado exitosamente (modo local)')
      return true
    }

    try {
      const { data: newRoles, error } = await supabase
        .from('roles')
        .insert([
          {
            name: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions,
            is_system: roleData.isSystem || false,
          }
        ])
        .select()

      if (error) {
        // Si es un error de políticas RLS, usar modo local
        if (error.message.includes('row-level security policy')) {
          console.warn('RLS policy error, usando modo local:', error.message)
          const newRole: Role = {
            ...roleData,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }
          setRoles(current => [...current, newRole])
          toast.success('Rol creado exitosamente (modo local)')
          return true
        }
        throw error
      }

      // Obtener el rol creado
      const createdRole = newRoles && newRoles[0]
      if (!createdRole) {
        throw new Error('No se pudo crear el rol en Supabase')
      }

      // Agregar el nuevo rol al estado local
      const newRole: Role = {
        id: createdRole.id,
        name: createdRole.name,
        description: createdRole.description,
        permissions: createdRole.permissions,
        createdAt: createdRole.created_at,
        isSystem: createdRole.is_system,
      }

      setRoles(current => [...current, newRole])
      toast.success('Rol creado exitosamente')
      return true
    } catch (error: any) {
      console.error('Error creating role:', error)
      toast.error(error.message || 'Error al crear rol')
      return false
    }
  }

  // Actualizar rol existente
  const updateRole = async (roleId: string, roleData: Partial<Role>): Promise<boolean> => {
    // Si es un rol local (no de Supabase), actualizarlo directamente
    if (roleId.startsWith('local-')) {
      setRoles(current =>
        current.map(role =>
          role.id === roleId
            ? { ...role, ...roleData }
            : role
        )
      )
      toast.success('Rol actualizado exitosamente')
      return true
    }

    if (!isSupabaseConfigured()) {
      // Fallback local
      setRoles(current =>
        current.map(role =>
          role.id === roleId
            ? { ...role, ...roleData }
            : role
        )
      )
      toast.success('Rol actualizado exitosamente (modo local)')
      return true
    }

    try {
      const { data: updatedRoles, error } = await supabase
        .from('roles')
        .update({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
        })
        .eq('id', roleId)
        .select()

      if (error) {
        // Si es un error de políticas RLS, usar modo local
        if (error.message.includes('row-level security policy')) {
          console.warn('RLS policy error, usando modo local:', error.message)
          setRoles(current =>
            current.map(role =>
              role.id === roleId
                ? { ...role, ...roleData }
                : role
            )
          )
          toast.success('Rol actualizado exitosamente (modo local)')
          return true
        }
        throw error
      }

      // Verificar que se actualizó correctamente
      const updatedRole = updatedRoles && updatedRoles[0]
      if (!updatedRole) {
        throw new Error('No se pudo actualizar el rol en Supabase')
      }

      // Actualizar el rol en el estado local
      setRoles(current =>
        current.map(role =>
          role.id === roleId
            ? {
              ...role,
              name: updatedRole.name,
              description: updatedRole.description,
              permissions: updatedRole.permissions,
            }
            : role
        )
      )

      toast.success('Rol actualizado exitosamente')
      return true
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(error.message || 'Error al actualizar rol')
      return false
    }
  }

  // Eliminar rol
  const deleteRole = async (roleId: string): Promise<boolean> => {
    const role = roles.find(r => r.id === roleId)

    if (role?.isSystem) {
      toast.error('No se pueden eliminar roles del sistema')
      return false
    }

    // Si es un rol local (no de Supabase), eliminarlo directamente
    if (roleId.startsWith('local-')) {
      setRoles(current => current.filter(role => role.id !== roleId))
      toast.success('Rol eliminado exitosamente')
      return true
    }

    if (!isSupabaseConfigured()) {
      // Fallback local
      setRoles(current => current.filter(role => role.id !== roleId))
      toast.success('Rol eliminado exitosamente (modo local)')
      return true
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) {
        // Si es un error de políticas RLS, usar modo local
        if (error.message.includes('row-level security policy')) {
          console.warn('RLS policy error, usando modo local:', error.message)
          setRoles(current => current.filter(role => role.id !== roleId))
          toast.success('Rol eliminado exitosamente (modo local)')
          return true
        }
        throw error
      }

      // Remover del estado local
      setRoles(current => current.filter(role => role.id !== roleId))
      toast.success('Rol eliminado exitosamente')
      return true
    } catch (error: any) {
      console.error('Error deleting role:', error)
      toast.error(error.message || 'Error al eliminar rol')
      return false
    }
  }

  // Cargar roles al montar el componente
  useEffect(() => {
    loadRoles()
  }, [])

  return {
    roles,
    isLoading,
    error,
    loadRoles,
    createRole,
    updateRole,
    deleteRole,
  }
}