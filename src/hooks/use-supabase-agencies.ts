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
                .from('users')
                .select('*')
                .eq('user_type', 'agencia')
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
                commercializerId: item.parent_id, // Mapped from parent_id
                shareOnSales: parseFloat(item.share_on_sales || 0),
                shareOnProfits: parseFloat(item.share_on_profits || 0),
                currentBalance: parseFloat(item.current_balance || 0),
                isActive: item.is_active,
                createdAt: item.created_at,
                userId: item.id, // Ensure ID is consistent
                userEmail: item.email
            }))

            setAgencies(mappedData)
        } catch (error) {
            console.error('Error loading agencies:', error)
            setAgencies([])
        } finally {
            setIsLoading(false)
        }
    }

    const createAgency = async (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>) => {
        try {
            console.log('📦 Creating agency via users table:', agency)

            // Generate a random password for the user if not provided
            // Agencies are users now, need email/password
            const tempEmail = (agency as any).email || `agencia_${Date.now()}@system.local`
            const tempPassword = (agency as any).password || '123456'

            // IMPORTANT: RLS mandates we can only create if parent_id = auth.uid()
            const { data: userData } = await supabase.auth.getUser()
            const currentUserId = userData.user?.id

            const newAgency = {
                name: agency.name,
                email: tempEmail,
                password_hash: `hash_${tempPassword}`, // Placeholder
                user_type: 'agencia',
                parent_id: agency.commercializerId || currentUserId, // Should be the creator
                address: agency.address,
                logo: agency.logo,
                share_on_sales: agency.shareOnSales || 0,
                share_on_profits: agency.shareOnProfits || 0,
                current_balance: 0,
                is_active: true
            }

            console.log('📤 Sending to Supabase users:', newAgency)

            const { data, error } = await supabase
                .from('users')
                .insert([newAgency])
                .select()
                .single()

            if (error) throw error

            await loadAgencies()
            return true
        } catch (error) {
            console.error('Error creating agency:', error)
            return false
        }
    }

    const updateAgency = async (id: string, updates: Partial<Agency>) => {
        try {
            const supabaseUpdates: any = {}
            if (updates.name !== undefined) supabaseUpdates.name = updates.name
            if (updates.address !== undefined) supabaseUpdates.address = updates.address
            if (updates.logo !== undefined) supabaseUpdates.logo = updates.logo
            if (updates.commercializerId !== undefined) supabaseUpdates.parent_id = updates.commercializerId
            if (updates.shareOnSales !== undefined) supabaseUpdates.share_on_sales = updates.shareOnSales
            if (updates.shareOnProfits !== undefined) supabaseUpdates.share_on_profits = updates.shareOnProfits
            if (updates.currentBalance !== undefined) supabaseUpdates.current_balance = updates.currentBalance
            if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive

            const { error } = await supabase
                .from('users')
                .update(supabaseUpdates)
                .eq('id', id)
                .eq('user_type', 'agencia')

            if (error) throw error

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
                .from('users')
                .delete()
                .eq('id', id)
                .eq('user_type', 'agencia')

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
