import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useKV } from '@github/spark/hooks'

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
}

export function useSupabaseAuth() {
  const [currentUserId, setCurrentUserId] = useKV<string>('currentUserId', '')
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentUserId) {
      loadUserData(currentUserId)
    } else {
      setCurrentUser(null)
      setIsLoading(false)
    }
  }, [currentUserId])

  const loadUserData = async (userId: string) => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('users_with_roles')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (error) throw error

      if (data) {
        setCurrentUser(data as unknown as SupabaseUser)
      } else {
        setCurrentUserId('')
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setCurrentUserId('')
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, password_hash, is_active')
        .eq('email', email)
        .single()

      if (error || !user) {
        return { success: false, error: 'Credenciales incorrectas' }
      }

      if (!user.is_active) {
        return { success: false, error: 'Usuario inactivo. Contacte al administrador' }
      }

      const passwordMatch = await verifyPassword(password, user.password_hash)
      
      if (!passwordMatch) {
        return { success: false, error: 'Credenciales incorrectas' }
      }

      setCurrentUserId(user.id)
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error al iniciar sesión. Intente de nuevo' }
    }
  }

  const logout = () => {
    setCurrentUserId('')
    setCurrentUser(null)
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false
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

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash === password) {
    return true
  }
  
  return false
}
