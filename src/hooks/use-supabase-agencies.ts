import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Agency } from '@/lib/types'

export function useSupabaseAgencies() {
    const [agencies, setAgencies] = useState<Agency[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadAgencies = async () => {
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('agencias')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('❌ Supabase error:', error)
                throw error
            }

            // Map snake_case from Supabase to camelCase for frontend
            const mappedData = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                address: item.address,
                logo: item.logo,
                commercializerId: item.commercializer_id,
                creditLimit: item.credit_limit,
                commissionPercentage: item.commission_percentage,
                currentBalance: item.current_balance,
                isActive: item.is_active,
                createdAt: item.created_at
            }))

            setAgencies(mappedData)
        } catch (error) {
            console.error('Error loading agencies:', error)
            setAgencies([]) // Set empty array on error
        } finally {
            setIsLoading(false)
        }
    }

    const createAgency = async (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>) => {
        try {
            // Map camelCase to snake_case for Supabase
            const newAgency = {
                name: agency.name,
                address: agency.address,
                logo: agency.logo,
                commercializer_id: agency.commercializerId,
                credit_limit: agency.creditLimit,
                commission_percentage: agency.commissionPercentage,
                current_balance: 0,
                is_active: true
            }

            const { data, error } = await supabase
                .from('agencias')
                .insert([newAgency])
                .select()
                .single()

            if (error) throw error

            // Reload agencies to get fresh data
            await loadAgencies()
            return true
        } catch (error) {
            console.error('Error creating agency:', error)
            return false
        }
    }

    const updateAgency = async (id: string, updates: Partial<Agency>) => {
        try {
            // Map camelCase to snake_case for Supabase
            const supabaseUpdates: any = {}
            if (updates.name !== undefined) supabaseUpdates.name = updates.name
            if (updates.address !== undefined) supabaseUpdates.address = updates.address
            if (updates.logo !== undefined) supabaseUpdates.logo = updates.logo
            if (updates.commercializerId !== undefined) supabaseUpdates.commercializer_id = updates.commercializerId
            if (updates.creditLimit !== undefined) supabaseUpdates.credit_limit = updates.creditLimit
            if (updates.commissionPercentage !== undefined) supabaseUpdates.commission_percentage = updates.commissionPercentage
            if (updates.currentBalance !== undefined) supabaseUpdates.current_balance = updates.currentBalance
            if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive

            const { error } = await supabase
                .from('agencias')
                .update(supabaseUpdates)
                .eq('id', id)

            if (error) throw error

            // Reload agencies to get fresh data
            await loadAgencies()
            return true
        } catch (error) {
            console.error('Error updating agency:', error)
            return false
        }
    }

    const deleteAgency = async (id: string) => {
        try {
            const { error } = await supabase
                .from('agencias')
                .delete()
                .eq('id', id)

            if (error) throw error
            setAgencies(prev => prev.filter(a => a.id !== id))
            return true
        } catch (error) {
            console.error('Error deleting agency:', error)
            return false
        }
    }

    useEffect(() => {
        loadAgencies()
    }, [])

    return {
        agencies,
        isLoading,
        loadAgencies,
        createAgency,
        updateAgency,
        deleteAgency
    }
}
