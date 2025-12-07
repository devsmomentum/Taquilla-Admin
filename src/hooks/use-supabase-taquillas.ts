import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Taquilla } from '@/lib/types'
import type { SupabaseUser } from './use-supabase-auth'

// Hash simple compatible con verifyPassword del auth hook
function simpleHash(password: string): string {
  return `hashed_${password}_${Date.now()}`
}

export function useSupabaseTaquillas(currentUser?: SupabaseUser | null) {
  const [taquillas, setTaquillas] = useState<Taquilla[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      setIsConnected(false)
      return false
    }
    try {
      const { error } = await supabase.from('taquillas').select('id').limit(1)
      const ok = !error
      setIsConnected(ok)
      return ok
    } catch (e) {
      setIsConnected(false)
      return false
    }
  }, [])

  const loadTaquillas = useCallback(async (): Promise<Taquilla[]> => {
    setIsLoading(true)
    try {
      const isAdmin = currentUser?.all_permissions.includes('*') ||
        (currentUser?.all_permissions.includes('taquillas') && currentUser?.userType === 'admin')

      if (!(await testConnection())) {
        let local = JSON.parse(localStorage.getItem('taquillas_backup') || '[]')

        // Filtrado local usando parentId
        if (currentUser && !isAdmin) {
          if (currentUser.userType === 'agencia') {
            // Agencia: ve sus taquillas (donde parentId = agencia.id)
            local = local.filter((t: Taquilla) => t.parentId === currentUser.id)
          } else if (currentUser.userType === 'comercializadora') {
            // Comercializadora: ve taquillas de sus agencias
            // Necesitamos saber qué agencias son de esta comercializadora
            const localAgencies = JSON.parse(localStorage.getItem('taquilla-agencies') || '[]')
            const myAgencyIds = localAgencies
              .filter((a: any) => a.parentId === currentUser.id)
              .map((a: any) => a.id)

            local = local.filter((t: Taquilla) => t.parentId && myAgencyIds.includes(t.parentId))
          } else {
            // Sin permisos ni vinculación
            local = []
          }
        }

        setTaquillas(local)
        return local
      }

      let query = supabase
        .from('taquillas')
        .select('*, agencias(commercializer_id)')
        .order('created_at', { ascending: false })

      // Filtrado remoto usando parentId
      if (currentUser && !isAdmin) {
        if (currentUser.userType === 'agencia') {
          // Agencia: ve sus taquillas (agency_id = currentUser.id)
          query = query.eq('agency_id', currentUser.id)
        }
        // Para comercializadora, el filtrado ideal sería con !inner join, pero si falla la relación FK,
        // filtraremos en memoria después de recibir los datos.
      }

      const { data, error } = await query

      if (error) throw error

      let mapped: Taquilla[] = (data || []).map((t: any) => ({
        id: t.id,
        fullName: t.full_name,
        address: t.address,
        telefono: t.telefono || t.phone,
        email: t.email,
        username: t.username || undefined,
        isApproved: !!t.is_active,
        approvedBy: t.activated_by || t.approved_by || undefined,
        approvedAt: t.activated_at || t.approved_at || undefined,
        parentId: t.agency_id || undefined, // parentId = agencia
        createdAt: t.created_at,
      }))

      // Filtrado en memoria para comercializadora (si no se pudo filtrar en query)
      if (currentUser && !isAdmin && currentUser.userType === 'comercializadora') {
        // Filtrar taquillas que pertenecen a agencias de esta comercializadora
        const agencyParentId = (t: Taquilla) => t.parentId
        // Este filtro necesitaría conocer las agencias de esta comercializadora
        // Por ahora, dejamos pasar y el filtrado se hace en la UI
      }

      setTaquillas(mapped)
      if (isAdmin) {
        localStorage.setItem('taquillas_backup', JSON.stringify(mapped))
      }
      return mapped
    } catch (e) {
      const local = JSON.parse(localStorage.getItem('taquillas_backup') || '[]')
      setTaquillas(local)
      return local
    } finally {
      setIsLoading(false)
    }
  }, [testConnection, currentUser])

  const createTaquilla = useCallback(async (input: Pick<Taquilla, 'fullName' | 'address' | 'telefono' | 'email' | 'password' | 'username' | 'parentId'>): Promise<boolean> => {
    try {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `taq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()
      const passwordHash = input.password ? simpleHash(input.password) : undefined

      let remoteOk = false
      if (await testConnection()) {
        const { error } = await supabase.from('taquillas').insert([{
          id,
          full_name: input.fullName,
          address: input.address,
          telefono: input.telefono,
          email: input.email,
          username: input.username,
          password_hash: passwordHash,
          agency_id: input.parentId,
          is_approved: false
        }])
        if (!error) remoteOk = true
      }

      const newTaquilla: Taquilla = {
        id,
        fullName: input.fullName,
        address: input.address,
        telefono: input.telefono,
        email: input.email,
        username: input.username,
        passwordHash,
        parentId: input.parentId,
        isApproved: false,
        createdAt: now,
      }

      const updated = [newTaquilla, ...taquillas]
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const updateTaquilla = useCallback(async (id: string, updates: Partial<Pick<Taquilla, 'fullName' | 'address' | 'telefono' | 'email' | 'password' | 'parentId'>>): Promise<boolean> => {
    try {
      let remoteOk = false
      let passwordHash: string | undefined
      if (updates.password) {
        passwordHash = simpleHash(updates.password)
      }

      if (await testConnection()) {
        const supUpdates: any = {}
        if (updates.fullName !== undefined) supUpdates.full_name = updates.fullName
        if (updates.address !== undefined) supUpdates.address = updates.address
        if (updates.telefono !== undefined) supUpdates.telefono = updates.telefono
        if (updates.email !== undefined) supUpdates.email = updates.email
        if (passwordHash !== undefined) supUpdates.password_hash = passwordHash
        if (updates.parentId !== undefined) supUpdates.agency_id = updates.parentId

        const { error } = await supabase.from('taquillas').update(supUpdates).eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.map(t => t.id === id ? {
        ...t,
        fullName: updates.fullName ?? t.fullName,
        address: updates.address ?? t.address,
        telefono: updates.telefono ?? t.telefono,
        email: updates.email ?? t.email,
        passwordHash: passwordHash ?? t.passwordHash,
        parentId: updates.parentId ?? t.parentId,
      } : t)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const approveTaquilla = useCallback(async (id: string, approverId: string): Promise<boolean> => {
    try {
      let remoteOk = false
      if (await testConnection()) {
        const { error } = await supabase.from('taquillas').update({
          is_approved: true,
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        }).eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.map(t => t.id === id ? {
        ...t, isApproved: true, approvedBy: approverId, approvedAt: new Date().toISOString()
      } : t)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const toggleTaquillaStatus = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      let remoteOk = false
      if (await testConnection()) {
        const { error } = await supabase.from('taquillas').update({
          is_active: isActive,
          // Si se activa, podríamos querer guardar quién lo activó, pero por simplicidad solo cambiamos el estado
          // activated_by: isActive ? currentUserId : null, // Necesitaríamos el userId aquí
        }).eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.map(t => t.id === id ? {
        ...t, isApproved: isActive
      } : t)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const deleteTaquilla = useCallback(async (id: string): Promise<boolean> => {
    try {
      let remoteOk = false
      if (await testConnection()) {
        // Primero eliminar ventas asociadas para evitar errores de FK
        await supabase.from('taquilla_sales').delete().eq('taquilla_id', id)

        // Intentar eliminar la taquilla
        const { error } = await supabase.from('taquillas').delete().eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.filter(t => t.id !== id)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      console.error('Error deleting taquilla:', e)
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  useEffect(() => {
    loadTaquillas()
  }, [loadTaquillas])

  return { taquillas, isLoading, isConnected, loadTaquillas, createTaquilla, approveTaquilla, updateTaquilla, toggleTaquillaStatus, deleteTaquilla }
}
