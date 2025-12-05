import { useState, useEffect } from 'react'
import { Agency } from '@/lib/types'
import type { SupabaseUser } from './use-supabase-auth'

const STORAGE_KEY = 'taquilla-agencies'

export function useLocalAgencies(currentUser?: SupabaseUser | null) {
    const [agencies, setAgencies] = useState<Agency[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Cargar agencias del localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                const loadedAgencies: Agency[] = JSON.parse(stored)
                console.log('📦 Agencias cargadas:', loadedAgencies.length)
                setAgencies(loadedAgencies)
            } catch (error) {
                console.error('Error loading agencies:', error)
                setAgencies([])
            }
        }
    }, [currentUser]) // Re-cargar cuando cambie el usuario

    // Guardar cuando cambien
    useEffect(() => {
        if (agencies.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(agencies))
        }
    }, [agencies])

    const createAgency = async (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>): Promise<boolean> => {
        try {
            const newAgency: Agency = {
                ...agency,
                id: `agency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                currentBalance: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            }

            console.log('📝 Creando agencia:', newAgency.name)

            // Cargar todas las agencias existentes del localStorage
            const stored = localStorage.getItem(STORAGE_KEY)
            const existing = stored ? JSON.parse(stored) : []
            const updated = [newAgency, ...existing]

            // Guardar inmediatamente
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            setAgencies(updated)

            console.log('💾 Guardado. Total:', updated.length)
            return true
        } catch (error) {
            console.error('Error creating agency:', error)
            return false
        }
    }

    const updateAgency = async (id: string, updates: Partial<Agency>): Promise<boolean> => {
        try {
            const updated = agencies.map(a => a.id === id ? { ...a, ...updates } : a)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            setAgencies(updated)
            return true
        } catch (error) {
            console.error('Error updating agency:', error)
            return false
        }
    }

    const deleteAgency = async (id: string): Promise<boolean> => {
        try {
            const updated = agencies.filter(a => a.id !== id)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            setAgencies(updated)
            return true
        } catch (error) {
            console.error('Error deleting agency:', error)
            return false
        }
    }

    return {
        agencies,
        isLoading,
        createAgency,
        updateAgency,
        deleteAgency
    }
}
