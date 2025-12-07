/**
 * Hook para gestión de API Keys con Supabase + localStorage
 */

import { useState, useEffect, useCallback } from 'react'
import type { ApiKey, ApiKeyPermission } from '@/lib/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Tipos específicos para el hook
interface ApiKeyStats {
  totalKeys: number
  activeKeys: number
  inactiveKeys: number
  usedToday: number
  usedThisWeek: number
  createdThisMonth: number
  avgPermissionsPerKey: number
  mostRecentUsage?: string
}

interface UseSupabaseApiKeysReturn {
  apiKeys: ApiKey[]
  isLoading: boolean
  error: string | null
  stats: ApiKeyStats | null

  // CRUD Operations
  createApiKey: (apiKeyData: Omit<ApiKey, 'id' | 'createdAt' | 'key'>) => Promise<{ key: string; success: boolean }>
  updateApiKey: (id: string, updates: Partial<ApiKey>) => Promise<boolean>
  deleteApiKey: (id: string) => Promise<boolean>
  revokeApiKey: (id: string) => Promise<boolean>

  // Utilities
  verifyApiKey: (keyHash: string) => Promise<{ isValid: boolean; permissions: ApiKeyPermission[]; keyInfo?: any }>
  generateSecureApiKey: () => string
  refreshApiKeys: () => Promise<void>
  testConnection: () => Promise<boolean>
  syncWithSupabase: () => Promise<void>
}

// Funciones stub para cuando el hook está deshabilitado
const noopCreateApiKey = async () => ({ key: '', success: false })
const noopAsync = async () => false
const noopAsyncVoid = async () => {}
const noopVerifyApiKey = async () => ({ isValid: false, permissions: [] as ApiKeyPermission[] })
const noopGenerateKey = () => 'sk_disabled'

/**
 * Hook para gestionar API Keys con integración Supabase + localStorage fallback
 */
export function useSupabaseApiKeys(enabled: boolean = true): UseSupabaseApiKeysReturn {
  // TODOS los hooks deben declararse antes de cualquier return condicional
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ApiKeyStats | null>(null)

  // Función para generar API Key segura
  const generateSecureApiKey = useCallback((): string => {
    if (!enabled) return 'sk_disabled'
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let key = "sk_"

    // Agregar timestamp para unicidad
    const timestamp = Date.now().toString(36)
    key += timestamp.slice(-4) + "_"

    // Generar 40 caracteres aleatorios adicionales
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return key
  }, [enabled])

  // Función para crear hash SHA-256 de la API key
  const createKeyHash = async (apiKey: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Función para obtener el prefijo de la key
  const getKeyPrefix = (key: string): string => {
    return key.substring(0, 7) // sk_xxxx
  }

  // Función para guardar en localStorage como respaldo
  const saveToLocalStorage = (keys: ApiKey[]): void => {
    try {
      localStorage.setItem('apiKeys', JSON.stringify(keys))
      localStorage.setItem('apiKeys_lastSync', new Date().toISOString())
    } catch (err) {
      // Error guardando en localStorage
    }
  }

  // Función para cargar desde localStorage
  const loadFromLocalStorage = (): ApiKey[] => {
    try {
      const localKeys = localStorage.getItem('apiKeys')
      if (localKeys) {
        const parsedKeys = JSON.parse(localKeys)
        return Array.isArray(parsedKeys) ? parsedKeys : []
      }
    } catch (err) {
      // Error cargando desde localStorage
    }
    return []
  }

  // Test connection to Supabase
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false
    try {
      if (!isSupabaseConfigured()) {
        return false
      }
      const { error } = await supabase
        .from('api_keys')
        .select('count')
        .limit(1)

      return !error
    } catch (err) {
      return false
    }
  }, [enabled])

  // Cargar estadísticas
  const loadStats = useCallback(async (): Promise<void> => {
    if (!enabled) return
    try {
      const { data, error } = await supabase
        .from('api_keys_stats')
        .select('*')
        .single()

      if (!error && data) {
        setStats({
          totalKeys: data.total_keys || 0,
          activeKeys: data.active_keys || 0,
          inactiveKeys: data.inactive_keys || 0,
          usedToday: data.used_today || 0,
          usedThisWeek: data.used_this_week || 0,
          createdThisMonth: data.created_this_month || 0,
          avgPermissionsPerKey: data.avg_permissions_per_key || 0,
          mostRecentUsage: data.most_recent_usage
        })
      }
    } catch (err) {
      // No se pudieron cargar las estadísticas
    }
  }, [enabled])

  // Cargar API Keys desde Supabase o localStorage
  const loadApiKeys = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const isConnected = await testConnection()

      if (isConnected) {
        const { data, error: supabaseError } = await supabase
          .from('api_keys')
          .select(`
            id,
            name,
            key_prefix,
            description,
            is_active,
            permissions,
            created_at,
            created_by,
            last_used_at,
            updated_at
          `)
          .order('created_at', { ascending: false })

        if (supabaseError) {
          throw new Error(`Error Supabase: ${supabaseError.message}`)
        }

        // Transformar datos de Supabase al formato local
        const transformedKeys: ApiKey[] = (data || []).map(item => ({
          id: item.id,
          name: item.name,
          key: `${item.key_prefix}••••••••••••••••••••••••••••••••••••••••••••••`,
          description: item.description,
          isActive: item.is_active,
          permissions: Array.isArray(item.permissions) ? item.permissions : [],
          createdAt: item.created_at,
          createdBy: item.created_by,
          lastUsed: item.last_used_at
        }))

        setApiKeys(transformedKeys)

        // Guardar en localStorage como respaldo
        saveToLocalStorage(transformedKeys)

        // Cargar estadísticas si están disponibles
        await loadStats()
      } else {
        // Fallback a localStorage
        const localKeys = loadFromLocalStorage()
        setApiKeys(localKeys)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)

      // Fallback a localStorage en caso de error
      const localKeys = loadFromLocalStorage()
      setApiKeys(localKeys)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, testConnection, loadStats])

  // Crear nueva API Key
  const createApiKey = useCallback(async (apiKeyData: Omit<ApiKey, 'id' | 'createdAt' | 'key'>): Promise<{ key: string; success: boolean }> => {
    if (!enabled) return { key: '', success: false }

    try {
      const newKey = generateSecureApiKey()
      const keyHash = await createKeyHash(newKey)
      const keyPrefix = getKeyPrefix(newKey)

      const newApiKey: ApiKey = {
        id: crypto.randomUUID(),
        key: newKey,
        createdAt: new Date().toISOString(),
        ...apiKeyData
      }

      let supabaseSuccess = false
      const isConnected = await testConnection()

      // Intentar guardar en Supabase si hay conexión y created_by válido
      if (isConnected && apiKeyData.createdBy) {
        const { error } = await supabase
          .from('api_keys')
          .insert({
            id: newApiKey.id,
            name: apiKeyData.name,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            description: apiKeyData.description,
            is_active: apiKeyData.isActive,
            permissions: apiKeyData.permissions,
            created_by: apiKeyData.createdBy
          })

        if (!error) {
          supabaseSuccess = true
        }
      }

      // Siempre actualizar estado local y localStorage
      const updatedKeys = [newApiKey, ...apiKeys]
      setApiKeys(updatedKeys)
      saveToLocalStorage(updatedKeys)

      // Solo recargar si guardó exitosamente en Supabase
      if (supabaseSuccess) {
        await loadApiKeys()
      }

      return { key: newKey, success: true }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando API Key'

      // Intentar guardar al menos localmente
      try {
        const newKey = generateSecureApiKey()
        const newApiKey: ApiKey = {
          id: crypto.randomUUID(),
          key: newKey,
          createdAt: new Date().toISOString(),
          ...apiKeyData
        }

        const updatedKeys = [newApiKey, ...apiKeys]
        setApiKeys(updatedKeys)
        saveToLocalStorage(updatedKeys)

        return { key: newKey, success: true }
      } catch (localErr) {
        setError(errorMessage)
        return { key: '', success: false }
      }
    }
  }, [enabled, apiKeys, generateSecureApiKey, testConnection, loadApiKeys])

  // Actualizar API Key
  const updateApiKey = useCallback(async (id: string, updates: Partial<ApiKey>): Promise<boolean> => {
    if (!enabled) return false

    try {
      const isConnected = await testConnection()
      let supabaseSuccess = false

      if (isConnected) {
        // Preparar datos para Supabase
        const supabaseUpdates: any = {}
        if (updates.name !== undefined) supabaseUpdates.name = updates.name
        if (updates.description !== undefined) supabaseUpdates.description = updates.description
        if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive
        if (updates.permissions !== undefined) supabaseUpdates.permissions = updates.permissions

        const { error } = await supabase
          .from('api_keys')
          .update(supabaseUpdates)
          .eq('id', id)

        if (!error) {
          supabaseSuccess = true
        }
      }

      // Siempre actualizar estado local
      const updatedKeys = apiKeys.map(key =>
        key.id === id ? { ...key, ...updates } : key
      )
      setApiKeys(updatedKeys)
      saveToLocalStorage(updatedKeys)

      // Solo recargar si actualizó exitosamente en Supabase
      if (supabaseSuccess) {
        await loadApiKeys()
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando API Key'

      // Intentar actualizar al menos localmente
      try {
        const updatedKeys = apiKeys.map(key =>
          key.id === id ? { ...key, ...updates } : key
        )
        setApiKeys(updatedKeys)
        saveToLocalStorage(updatedKeys)
        return true
      } catch (localErr) {
        setError(errorMessage)
        return false
      }
    }
  }, [enabled, apiKeys, testConnection, loadApiKeys])

  // Eliminar API Key
  const deleteApiKey = useCallback(async (id: string): Promise<boolean> => {
    if (!enabled) return false

    try {
      const isConnected = await testConnection()

      if (isConnected) {
        await supabase
          .from('api_keys')
          .delete()
          .eq('id', id)
      }

      // Siempre actualizar estado local
      const updatedKeys = apiKeys.filter(key => key.id !== id)
      setApiKeys(updatedKeys)
      saveToLocalStorage(updatedKeys)

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando API Key'

      // Intentar eliminar al menos localmente
      try {
        const updatedKeys = apiKeys.filter(key => key.id !== id)
        setApiKeys(updatedKeys)
        saveToLocalStorage(updatedKeys)
        return true
      } catch (localErr) {
        setError(errorMessage)
        return false
      }
    }
  }, [enabled, apiKeys, testConnection])

  // Revocar API Key (desactivar)
  const revokeApiKey = useCallback(async (id: string): Promise<boolean> => {
    return await updateApiKey(id, { isActive: false })
  }, [updateApiKey])

  // Verificar API Key
  const verifyApiKey = useCallback(async (keyHash: string): Promise<{ isValid: boolean; permissions: ApiKeyPermission[]; keyInfo?: any }> => {
    if (!enabled) return { isValid: false, permissions: [] }

    try {
      const isConnected = await testConnection()

      if (isConnected) {
        const { data, error } = await supabase
          .rpc('verify_api_key', { api_key_hash: keyHash })

        if (error) {
          throw new Error(`Error verificando API Key: ${error.message}`)
        }

        if (data && data.length > 0) {
          const result = data[0]
          return {
            isValid: result.is_valid,
            permissions: Array.isArray(result.permissions) ? result.permissions : [],
            keyInfo: result
          }
        }
      }

      // Fallback local (búsqueda por hash simulado)
      const localKey = apiKeys.find(key => key.key.includes(keyHash.substring(0, 8)))
      if (localKey && localKey.isActive) {
        return {
          isValid: true,
          permissions: localKey.permissions,
          keyInfo: localKey
        }
      }

      return { isValid: false, permissions: [] }

    } catch (err) {
      return { isValid: false, permissions: [] }
    }
  }, [enabled, apiKeys, testConnection])

  // Refresh manual de los datos
  const refreshApiKeys = useCallback(async (): Promise<void> => {
    await loadApiKeys()
  }, [loadApiKeys])

  // Función de sincronización automática
  const syncWithSupabase = useCallback(async (): Promise<void> => {
    if (!enabled) return
    try {
      const isConnected = await testConnection()

      if (isConnected) {
        await loadApiKeys()
      }
    } catch (err) {
      // Error en sincronización automática
    }
  }, [enabled, testConnection, loadApiKeys])

  // Cargar datos al montar el componente
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    loadApiKeys()
  }, [enabled, loadApiKeys])

  // Si el hook está deshabilitado, retornar valores por defecto
  // IMPORTANTE: Este return debe estar DESPUÉS de todos los hooks
  if (!enabled) {
    return {
      apiKeys: [],
      isLoading: false,
      error: null,
      stats: null,
      createApiKey: noopCreateApiKey,
      updateApiKey: noopAsync,
      deleteApiKey: noopAsync,
      revokeApiKey: noopAsync,
      verifyApiKey: noopVerifyApiKey,
      generateSecureApiKey: noopGenerateKey,
      refreshApiKeys: noopAsyncVoid,
      testConnection: noopAsync,
      syncWithSupabase: noopAsyncVoid
    }
  }

  return {
    apiKeys,
    isLoading,
    error,
    stats,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    revokeApiKey,
    verifyApiKey,
    generateSecureApiKey,
    refreshApiKeys,
    testConnection,
    syncWithSupabase
  }
}
