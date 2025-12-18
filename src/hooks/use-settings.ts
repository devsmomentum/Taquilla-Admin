import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AppSettings } from '@/lib/types'
import { toast } from 'sonner'

interface SupabaseSetting {
  id: number
  created_at: string
  max_number_cancelled_ticket: number
}

const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'createdAt'> = {
  maxNumberCancelledTicket: 5,
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar configuraciones desde Supabase
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Obtener el primer registro de settings (configuraciones generales)
      const { data, error: fetchError } = await supabase
        .from('setting')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single()

      if (fetchError) {
        // Si no existe ningún registro, crear uno con valores por defecto
        if (fetchError.code === 'PGRST116') {
          const newSettings = await createDefaultSettings()
          if (newSettings) {
            setSettings(newSettings)
          }
          return
        }
        throw fetchError
      }

      // Transformar al formato local
      const transformedSettings: AppSettings = {
        id: data.id,
        maxNumberCancelledTicket: data.max_number_cancelled_ticket,
        createdAt: data.created_at,
      }

      setSettings(transformedSettings)
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError(err.message || 'Error al cargar configuraciones')
      // En caso de error, usar valores por defecto localmente
      setSettings({
        id: 0,
        maxNumberCancelledTicket: DEFAULT_SETTINGS.maxNumberCancelledTicket,
        createdAt: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crear registro de configuración por defecto
  const createDefaultSettings = async (): Promise<AppSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('setting')
        .insert([
          {
            max_number_cancelled_ticket: DEFAULT_SETTINGS.maxNumberCancelledTicket,
          }
        ])
        .select()
        .single()

      if (error) throw error

      const newSettings: AppSettings = {
        id: data.id,
        maxNumberCancelledTicket: data.max_number_cancelled_ticket,
        createdAt: data.created_at,
      }

      toast.success('Configuración inicial creada')
      return newSettings
    } catch (err: any) {
      console.error('Error creating default settings:', err)
      toast.error('Error al crear configuración inicial')
      return null
    }
  }

  // Actualizar configuraciones
  const updateSettings = async (updates: Partial<Omit<AppSettings, 'id' | 'createdAt'>>): Promise<boolean> => {
    if (!settings) {
      toast.error('No hay configuraciones cargadas')
      return false
    }

    try {
      const updateData: Partial<SupabaseSetting> = {}

      if (updates.maxNumberCancelledTicket !== undefined) {
        updateData.max_number_cancelled_ticket = updates.maxNumberCancelledTicket
      }

      const { data, error } = await supabase
        .from('setting')
        .update(updateData)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error

      // Actualizar estado local
      const updatedSettings: AppSettings = {
        id: data.id,
        maxNumberCancelledTicket: data.max_number_cancelled_ticket,
        createdAt: data.created_at,
      }

      setSettings(updatedSettings)
      toast.success('Configuración actualizada correctamente')
      return true
    } catch (err: any) {
      console.error('Error updating settings:', err)
      toast.error(`Error al actualizar configuración: ${err.message}`)
      return false
    }
  }

  // Cargar al montar
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    updateSettings,
  }
}
