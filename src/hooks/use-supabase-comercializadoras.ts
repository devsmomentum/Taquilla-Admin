import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Comercializadora } from '@/lib/types'
import type { SupabaseUser } from './use-supabase-auth'
import { toast } from 'sonner'

export function useSupabaseComercializadoras(currentUser?: SupabaseUser | null) {
    const [comercializadoras, setComercializadoras] = useState<Comercializadora[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isConnected, setIsConnected] = useState(false)

    const testConnection = useCallback(async (): Promise<boolean> => {
        if (!isSupabaseConfigured()) {
            setIsConnected(false)
            return false
        }
        try {
            const { error } = await supabase.from('comercializadoras').select('id').limit(1)
            const ok = !error
            setIsConnected(ok)
            return ok
        } catch (e) {
            setIsConnected(false)
            return false
        }
    }, [])

    const loadComercializadoras = useCallback(async (): Promise<Comercializadora[]> => {
        setIsLoading(true)
        try {
            const isAdmin = currentUser?.all_permissions.includes('*') || currentUser?.all_permissions.includes('comercializadoras')

            if (!(await testConnection())) {
                console.log('📦 Modo local: Cargando comercializadoras desde localStorage')
                const local = JSON.parse(localStorage.getItem('comercializadoras_backup') || '[]')
                setComercializadoras(local)
                return local
            }

            let query = supabase
                .from('comercializadoras')
                .select('*')
                .order('created_at', { ascending: false })

            // Filtrar remotamente si no es admin
            if (currentUser && !isAdmin) {
                if (currentUser.userType === 'comercializadora') {
                    // Si el usuario es comercializadora, su id es el id de la comercializadora
                    query = query.eq('id', currentUser.id)
                } else {
                    query = query.eq('user_id', currentUser.id)
                }
            }

            const { data, error } = await query

            if (error) throw error

            const mapped: Comercializadora[] = (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                address: c.address,
                logo: c.logo,
                userId: c.user_id,
                shareOnSales: parseFloat(c.share_on_sales || 0),
                shareOnProfits: parseFloat(c.share_on_profits || 0),
                isActive: !!c.is_active,
                createdAt: c.created_at,
                createdBy: c.created_by,
            }))

            setComercializadoras(mapped)
            // Solo guardar en backup si es admin (para tener copia completa) o si es la única data que tenemos
            if (isAdmin) {
                localStorage.setItem('comercializadoras_backup', JSON.stringify(mapped))
            }
            return mapped
        } catch (e) {
            console.error('Error loading comercializadoras:', e)
            const local = JSON.parse(localStorage.getItem('comercializadoras_backup') || '[]')
            setComercializadoras(local)
            return local
        } finally {
            setIsLoading(false)
        }
    }, [testConnection, currentUser])

    const createComercializadora = useCallback(async (
        input: Omit<Comercializadora, 'id' | 'createdAt'>
    ): Promise<boolean> => {
        try {
            const id = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `com_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const now = new Date().toISOString()

            let remoteOk = false
            if (await testConnection()) {
                const { error } = await supabase.from('comercializadoras').insert([{
                    id,
                    name: input.name,
                    email: input.email,
                    address: input.address,
                    logo: input.logo,
                    user_id: input.userId,
                    share_on_sales: input.shareOnSales,
                    share_on_profits: input.shareOnProfits,
                    is_active: input.isActive,
                    created_by: input.createdBy,
                }])

                if (error) {
                    console.error('Error creating comercializadora:', error)
                    toast.error('Error al crear comercializadora: ' + error.message)
                    return false
                }
                remoteOk = true
            }

            const newComercializadora: Comercializadora = {
                ...input,
                userId: input.userId || input.createdBy, // Auto-vincular para pruebas locales
                id,
                createdAt: now,
            }

            const updated = [newComercializadora, ...comercializadoras]
            setComercializadoras(updated)
            localStorage.setItem('comercializadoras_backup', JSON.stringify(updated))

            if (remoteOk) {
                await loadComercializadoras()
                toast.success('Comercializadora creada exitosamente')
            }

            return true
        } catch (e) {
            console.error('Error in createComercializadora:', e)
            toast.error('Error al crear comercializadora')
            return false
        }
    }, [comercializadoras, testConnection, loadComercializadoras])

    const updateComercializadora = useCallback(async (
        id: string,
        updates: Partial<Omit<Comercializadora, 'id' | 'createdAt'>>
    ): Promise<boolean> => {
        try {
            console.log('🔄 updateComercializadora recibido:', { id, updates })
            let remoteOk = false

            if (await testConnection()) {
                const supUpdates: any = {}
                if (updates.name !== undefined) supUpdates.name = updates.name
                if (updates.email !== undefined) supUpdates.email = updates.email
                if (updates.address !== undefined) supUpdates.address = updates.address
                if (updates.logo !== undefined) supUpdates.logo = updates.logo
                if (updates.userId !== undefined) supUpdates.user_id = updates.userId
                if (updates.shareOnSales !== undefined) supUpdates.share_on_sales = updates.shareOnSales
                if (updates.shareOnProfits !== undefined) supUpdates.share_on_profits = updates.shareOnProfits
                if (updates.isActive !== undefined) supUpdates.is_active = updates.isActive

                console.log('📤 Enviando a tabla comercializadoras:', supUpdates)

                const { error } = await supabase
                    .from('comercializadoras')
                    .update(supUpdates)
                    .eq('id', id)

                if (error) {
                    console.error('Error updating comercializadora:', error)
                    toast.error('Error al actualizar comercializadora: ' + error.message)
                    return false
                }
                remoteOk = true
            }

            const updated = comercializadoras.map(c => c.id === id ? {
                ...c,
                name: updates.name ?? c.name,
                email: updates.email ?? c.email,
                address: updates.address ?? c.address,
                logo: updates.logo ?? c.logo,
                userId: updates.userId ?? c.userId,
                shareOnSales: updates.shareOnSales ?? c.shareOnSales,
                shareOnProfits: updates.shareOnProfits ?? c.shareOnProfits,
                isActive: updates.isActive ?? c.isActive,
            } : c)

            setComercializadoras(updated)
            localStorage.setItem('comercializadoras_backup', JSON.stringify(updated))

            if (remoteOk) {
                await loadComercializadoras()
                toast.success('Comercializadora actualizada exitosamente')
            }

            return true
        } catch (e) {
            console.error('Error in updateComercializadora:', e)
            toast.error('Error al actualizar comercializadora')
            return false
        }
    }, [comercializadoras, testConnection, loadComercializadoras])

    const deleteComercializadora = useCallback(async (id: string): Promise<boolean> => {
        try {
            let remoteOk = false

            if (await testConnection()) {
                // Verificar que no tenga agencias asociadas
                const { data: agencias } = await supabase
                    .from('agencias')
                    .select('id')
                    .eq('commercializer_id', id)
                    .limit(1)

                if (agencias && agencias.length > 0) {
                    toast.error('No se puede eliminar una comercializadora con agencias asociadas')
                    return false
                }

                const { error } = await supabase
                    .from('comercializadoras')
                    .delete()
                    .eq('id', id)

                if (error) {
                    console.error('Error deleting comercializadora:', error)
                    toast.error('Error al eliminar comercializadora: ' + error.message)
                    return false
                }
                remoteOk = true
            }

            const updated = comercializadoras.filter(c => c.id !== id)
            setComercializadoras(updated)
            localStorage.setItem('comercializadoras_backup', JSON.stringify(updated))

            if (remoteOk) {
                toast.success('Comercializadora eliminada exitosamente')
            }

            return true
        } catch (e) {
            console.error('Error deleting comercializadora:', e)
            toast.error('Error al eliminar comercializadora')
            return false
        }
    }, [comercializadoras, testConnection])

    useEffect(() => {
        loadComercializadoras()
    }, [loadComercializadoras])

    return {
        comercializadoras,
        isLoading,
        isConnected,
        loadComercializadoras,
        createComercializadora,
        updateComercializadora,
        deleteComercializadora
    }
}
