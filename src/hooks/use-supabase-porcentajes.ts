import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Porcentaje } from '@/lib/types'
import { toast } from 'sonner'

export function useSupabasePorcentajes() {
    const [porcentajes, setPorcentajes] = useState<Porcentaje[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isConnected, setIsConnected] = useState(false)

    const testConnection = useCallback(async (): Promise<boolean> => {
        if (!isSupabaseConfigured()) {
            setIsConnected(false)
            return false
        }
        try {
            const { error } = await supabase.from('porcentajes').select('id').limit(1)
            const ok = !error
            setIsConnected(ok)
            return ok
        } catch (e) {
            setIsConnected(false)
            return false
        }
    }, [])

    const loadPorcentajes = useCallback(async (): Promise<Porcentaje[]> => {
        setIsLoading(true)
        try {
            if (!(await testConnection())) {
                const local = JSON.parse(localStorage.getItem('porcentajes_backup') || '[]')
                setPorcentajes(local)
                return local
            }

            const { data, error } = await supabase
                .from('porcentajes')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            const mapped: Porcentaje[] = (data || []).map((p: any) => ({
                id: p.id,
                entityType: p.entity_type as 'general' | 'comercializadora' | 'agencia',
                entityId: p.entity_id,
                adminPercentage: parseFloat(p.admin_percentage || 0),
                commercializerPercentage: parseFloat(p.commercializer_percentage || 0),
                agencyPercentage: parseFloat(p.agency_percentage || 0),
                taquillaPercentage: parseFloat(p.taquilla_percentage || 0),
                createdAt: p.created_at,
            }))

            setPorcentajes(mapped)
            localStorage.setItem('porcentajes_backup', JSON.stringify(mapped))
            return mapped
        } catch (e) {
            console.error('Error loading porcentajes:', e)
            const local = JSON.parse(localStorage.getItem('porcentajes_backup') || '[]')
            setPorcentajes(local)
            return local
        } finally {
            setIsLoading(false)
        }
    }, [testConnection])

    const validatePercentages = (
        admin: number,
        commercializer: number,
        agency: number,
        taquilla: number
    ): boolean => {
        const total = admin + commercializer + agency + taquilla
        if (Math.abs(total - 100) > 0.01) { // Tolerancia para decimales
            toast.error(`La suma de porcentajes debe ser 100% (actual: ${total.toFixed(2)}%)`)
            return false
        }

        if (admin < 0 || commercializer < 0 || agency < 0 || taquilla < 0) {
            toast.error('Los porcentajes no pueden ser negativos')
            return false
        }

        if (admin > 100 || commercializer > 100 || agency > 100 || taquilla > 100) {
            toast.error('Ningún porcentaje puede ser mayor a 100%')
            return false
        }

        return true
    }

    const updatePorcentajesGenerales = useCallback(async (
        adminPercentage: number,
        commercializerPercentage: number,
        agencyPercentage: number,
        taquillaPercentage: number
    ): Promise<boolean> => {
        try {
            // Validar suma = 100%
            if (!validatePercentages(adminPercentage, commercializerPercentage, agencyPercentage, taquillaPercentage)) {
                return false
            }

            if (!(await testConnection())) {
                toast.error('No hay conexión con la base de datos')
                return false
            }

            // Buscar si ya existe configuración general
            const { data: existing } = await supabase
                .from('porcentajes')
                .select('*')
                .eq('entity_type', 'general')
                .limit(1)

            if (existing && existing.length > 0) {
                // Actualizar existente
                const { error } = await supabase
                    .from('porcentajes')
                    .update({
                        admin_percentage: adminPercentage,
                        commercializer_percentage: commercializerPercentage,
                        agency_percentage: agencyPercentage,
                        taquilla_percentage: taquillaPercentage,
                    })
                    .eq('id', existing[0].id)

                if (error) {
                    console.error('Error updating porcentajes generales:', error)
                    toast.error('Error al actualizar porcentajes: ' + error.message)
                    return false
                }
            } else {
                // Crear nuevo
                const { error } = await supabase
                    .from('porcentajes')
                    .insert([{
                        entity_type: 'general',
                        admin_percentage: adminPercentage,
                        commercializer_percentage: commercializerPercentage,
                        agency_percentage: agencyPercentage,
                        taquilla_percentage: taquillaPercentage,
                    }])

                if (error) {
                    console.error('Error creating porcentajes generales:', error)
                    toast.error('Error al crear porcentajes: ' + error.message)
                    return false
                }
            }

            await loadPorcentajes()
            toast.success('Porcentajes generales actualizados exitosamente')
            return true
        } catch (e) {
            console.error('Error in updatePorcentajesGenerales:', e)
            toast.error('Error al actualizar porcentajes generales')
            return false
        }
    }, [testConnection, loadPorcentajes])

    const updatePorcentajesComercializadora = useCallback(async (
        commercializadoraId: string,
        adminPercentage: number,
        commercializerPercentage: number,
        agencyPercentage: number,
        taquillaPercentage: number
    ): Promise<boolean> => {
        try {
            if (!validatePercentages(adminPercentage, commercializerPercentage, agencyPercentage, taquillaPercentage)) {
                return false
            }

            if (!(await testConnection())) {
                toast.error('No hay conexión con la base de datos')
                return false
            }

            // Buscar si ya existe configuración para esta comercializadora
            const { data: existing } = await supabase
                .from('porcentajes')
                .select('*')
                .eq('entity_type', 'comercializadora')
                .eq('entity_id', commercializadoraId)
                .limit(1)

            if (existing && existing.length > 0) {
                // Actualizar existente
                const { error } = await supabase
                    .from('porcentajes')
                    .update({
                        admin_percentage: adminPercentage,
                        commercializer_percentage: commercializerPercentage,
                        agency_percentage: agencyPercentage,
                        taquilla_percentage: taquillaPercentage,
                    })
                    .eq('id', existing[0].id)

                if (error) {
                    console.error('Error updating porcentajes comercializadora:', error)
                    toast.error('Error al actualizar porcentajes: ' + error.message)
                    return false
                }
            } else {
                // Crear nuevo
                const { error } = await supabase
                    .from('porcentajes')
                    .insert([{
                        entity_type: 'comercializadora',
                        entity_id: commercializadoraId,
                        admin_percentage: adminPercentage,
                        commercializer_percentage: commercializerPercentage,
                        agency_percentage: agencyPercentage,
                        taquilla_percentage: taquillaPercentage,
                    }])

                if (error) {
                    console.error('Error creating porcentajes comercializadora:', error)
                    toast.error('Error al crear porcentajes: ' + error.message)
                    return false
                }
            }

            await loadPorcentajes()
            toast.success('Porcentajes de comercializadora actualizados')
            return true
        } catch (e) {
            console.error('Error in updatePorcentajesComercializadora:', e)
            toast.error('Error al actualizar porcentajes de comercializadora')
            return false
        }
    }, [testConnection, loadPorcentajes])

    const updatePorcentajesAgencia = useCallback(async (
        agenciaId: string,
        adminPercentage: number,
        commercializerPercentage: number,
        agencyPercentage: number,
        taquillaPercentage: number
    ): Promise<boolean> => {
        try {
            if (!validatePercentages(adminPercentage, commercializerPercentage, agencyPercentage, taquillaPercentage)) {
                return false
            }

            if (!(await testConnection())) {
                toast.error('No hay conexión con la base de datos')
                return false
            }

            // Buscar si ya existe configuración para esta agencia
            const { data: existing } = await supabase
                .from('porcentajes')
                .select('*')
                .eq('entity_type', 'agencia')
                .eq('entity_id', agenciaId)
                .limit(1)

            if (existing && existing.length > 0) {
                // Actualizar existente
                const { error } = await supabase
                    .from('porcentajes')
                    .update({
                        admin_percentage: adminPercentage,
                        commercializer_percentage: commercializerPercentage,
                        agency_percentage: agencyPercentage,
                        taquilla_percentage: taquillaPercentage,
                    })
                    .eq('id', existing[0].id)

                if (error) {
                    console.error('Error updating porcentajes agencia:', error)
                    toast.error('Error al actualizar porcentajes: ' + error.message)
                    return false
                }
            } else {
                // Crear nuevo
                const { error } = await supabase
                    .from('porcentajes')
                    .insert([{
                        entity_type: 'agencia',
                        entity_id: agenciaId,
                        admin_percentage: adminPercentage,
                        commercializer_percentage: commercializerPercentage,
                        agency_percentage: agencyPercentage,
                        taquilla_percentage: taquillaPercentage,
                    }])

                if (error) {
                    console.error('Error creating porcentajes agencia:', error)
                    toast.error('Error al crear porcentajes: ' + error.message)
                    return false
                }
            }

            await loadPorcentajes()
            toast.success('Porcentajes de agencia actualizados')
            return true
        } catch (e) {
            console.error('Error in updatePorcentajesAgencia:', e)
            toast.error('Error al actualizar porcentajes de agencia')
            return false
        }
    }, [testConnection, loadPorcentajes])

    const getPorcentajesForEntity = useCallback((
        entityType: 'general' | 'comercializadora' | 'agencia',
        entityId?: string
    ): Porcentaje | undefined => {
        if (entityType === 'general') {
            return porcentajes.find(p => p.entityType === 'general')
        }
        return porcentajes.find(p => p.entityType === entityType && p.entityId === entityId)
    }, [porcentajes])

    const deletePorcentajes = useCallback(async (id: string): Promise<boolean> => {
        try {
            if (!(await testConnection())) {
                toast.error('No hay conexión con la base de datos')
                return false
            }

            // No permitir eliminar porcentajes generales
            const porcentaje = porcentajes.find(p => p.id === id)
            if (porcentaje?.entityType === 'general') {
                toast.error('No se pueden eliminar los porcentajes generales')
                return false
            }

            const { error } = await supabase
                .from('porcentajes')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting porcentajes:', error)
                toast.error('Error al eliminar porcentajes: ' + error.message)
                return false
            }

            await loadPorcentajes()
            toast.success('Configuración de porcentajes eliminada')
            return true
        } catch (e) {
            console.error('Error in deletePorcentajes:', e)
            toast.error('Error al eliminar porcentajes')
            return false
        }
    }, [porcentajes, testConnection, loadPorcentajes])

    useEffect(() => {
        loadPorcentajes()
    }, [loadPorcentajes])

    return {
        porcentajes,
        isLoading,
        isConnected,
        loadPorcentajes,
        updatePorcentajesGenerales,
        updatePorcentajesComercializadora,
        updatePorcentajesAgencia,
        getPorcentajesForEntity,
        deletePorcentajes
    }
}
