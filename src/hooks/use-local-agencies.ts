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
                let loadedAgencies: Agency[] = JSON.parse(stored)

                // Filtrar según permisos del usuario
                if (currentUser) {
                    const isAdmin = currentUser.all_permissions.includes('*') ||
                        (currentUser.all_permissions.includes('agencias') && !currentUser.comercializadoraId)

                    if (!isAdmin) {
                        if (currentUser.comercializadoraId) {
                            // Si es comercializadora, ver solo sus agencias
                            loadedAgencies = loadedAgencies.filter(a => a.commercializerId === currentUser.comercializadoraId)
                        } else if (currentUser.agenciaId) {
                            // Si es agencia, ver solo su propia agencia
                            loadedAgencies = loadedAgencies.filter(a => a.id === currentUser.agenciaId)
                        } else {
                            // Si no tiene permisos ni vinculación, no ve nada
                            loadedAgencies = []
                        }
                    }
                }

                setAgencies(loadedAgencies)
            } catch (error) {
                console.error('Error loading agencies from localStorage:', error)
                setAgencies([])
            }
        }
    }, [currentUser])

    // Guardar agencias en localStorage cada vez que cambien
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

            setAgencies(prev => [newAgency, ...prev])
            return true
        } catch (error) {
            console.error('Error creating agency:', error)
            return false
        }
    }

    const updateAgency = async (id: string, updates: Partial<Agency>): Promise<boolean> => {
        try {
            setAgencies(prev => prev.map(a =>
                a.id === id ? { ...a, ...updates } : a
            ))
            return true
        } catch (error) {
            console.error('Error updating agency:', error)
            return false
        }
    }

    const deleteAgency = async (id: string): Promise<boolean> => {
        try {
            setAgencies(prev => prev.filter(a => a.id !== id))
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
