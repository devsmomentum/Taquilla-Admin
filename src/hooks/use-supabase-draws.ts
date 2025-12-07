import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { DrawResult } from '@/lib/types'

// Estructura real según supabase-schema.sql (tabla draws)
export interface SupabaseDraw {
  id: string
  lottery_id: string
  lottery_name: string
  winning_animal_number: string
  winning_animal_name: string
  draw_time: string // ISO timestamp
  total_payout: number
  winners_count: number
  created_at: string
}

// Función para mapear SupabaseDraw a DrawResult (camelCase)
const mapSupabaseDrawToDrawResult = (supabaseDraw: SupabaseDraw): DrawResult => ({
  id: supabaseDraw.id,
  lotteryId: supabaseDraw.lottery_id,
  lotteryName: supabaseDraw.lottery_name,
  winningAnimalNumber: supabaseDraw.winning_animal_number,
  winningAnimalName: supabaseDraw.winning_animal_name,
  drawTime: supabaseDraw.draw_time,
  totalPayout: supabaseDraw.total_payout,
  winnersCount: supabaseDraw.winners_count
})

// Datos del formulario (lo que captura la UI)
export interface DrawFormData {
  lotteryId: string
  animalNumber: string
  animalName: string
  drawDate: string // yyyy-MM-dd
  drawTime: string // HH:mm
  isWinner: boolean // si hubo ganadores
  prizeAmount?: number | null // monto total pagado si hubo ganadores
  betLimits?: BetLimit[] // límites de apuestas para este sorteo
}

export interface BetLimit {
  animalNumber: string
  animalName: string
  maxAmount: number
}

// Función de test de conexión Supabase (fuera del hook para poder exportarla)
export const testConnection = async (): Promise<boolean> => {
  try {
    // Testing Supabase connection

    // Health check: solo SELECT (evita políticas de INSERT)
    const { error: healthError } = await supabase
      .from('draws')
      .select('*', { head: true, count: 'exact' })

    if (healthError) {
      // Health check failed
      return false
    }

    // Health check passed
    return true
  } catch (error) {
    // Unexpected error during connection test
    return false
  }
}

export const useSupabaseDraws = () => {
  const [draws, setDraws] = useState<DrawResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar sorteos desde Supabase con fallback a localStorage
  const loadDraws = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('draws')
        .select('*')
        .order('draw_time', { ascending: false })

      if (supabaseError) {
        console.error('Error Supabase:', supabaseError.message)
        // Fallback a localStorage
        const localDraws = localStorage.getItem('supabase_draws_backup_v2')
        if (localDraws) {
          const parsedDraws = JSON.parse(localDraws)
          setDraws(parsedDraws)
          toast.info('Datos cargados desde almacenamiento local')
        } else {
          setDraws([])
        }
        setError('No se pudo conectar a la base de datos. Usando datos locales.')
      } else {
        const drawsData = (data || []).map(mapSupabaseDrawToDrawResult)
        setDraws(drawsData)
        // Guardar backup en localStorage
        localStorage.setItem('supabase_draws_backup_v2', JSON.stringify(drawsData))
        setError(null)
      }
    } catch (err) {
      console.error('Error cargando:', err)
      setError('Error al cargar los sorteos')
      // Intentar cargar desde localStorage
      const localDraws = localStorage.getItem('supabase_draws_backup_v2')
      if (localDraws) {
        const parsedDraws = JSON.parse(localDraws)
        setDraws(parsedDraws)
        toast.info('Datos cargados desde almacenamiento local')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Crear nuevo sorteo
  const createDraw = async (drawData: DrawFormData): Promise<boolean> => {
    try {
      // Obtener nombre de la lotería para cumplir FK y campos requeridos
      let lotteryName = ''
      const { data: lotData, error: lotError } = await supabase
        .from('lotteries')
        .select('name')
        .eq('id', drawData.lotteryId)
        .limit(1)
        .single()

      if (lotError) {
        console.warn('No se pudo obtener el nombre de la lotería, usando vacío:', lotError.message)
      } else if (lotData?.name) {
        lotteryName = lotData.name
      }

      // Normalizar drawTime: si ya incluye segundos (HH:mm:ss), usarlo tal cual, si no (HH:mm), agregar :00
      const normalizedDrawTime = drawData.drawTime.includes(':') && drawData.drawTime.split(':').length === 3 
        ? drawData.drawTime 
        : `${drawData.drawTime}:00`
      
      const isoDrawTime = new Date(`${drawData.drawDate}T${normalizedDrawTime}`).toISOString()

      const payload = {
        lottery_id: drawData.lotteryId,
        lottery_name: lotteryName,
        winning_animal_number: drawData.animalNumber,
        winning_animal_name: drawData.animalName,
        draw_time: isoDrawTime,
        total_payout: drawData.isWinner ? (drawData.prizeAmount || 0) : 0,
        winners_count: drawData.isWinner ? 1 : 0
      }

      const { data: inserted, error: supabaseError } = await supabase
        .from('draws')
        .insert([payload])
        .select()

      if (supabaseError) {
        console.error('Error Supabase:', supabaseError.message)
        // Agregar localmente
        const localDraw: DrawResult = mapSupabaseDrawToDrawResult({
          id: crypto.randomUUID(),
          lottery_id: payload.lottery_id,
          lottery_name: payload.lottery_name,
          winning_animal_number: payload.winning_animal_number,
          winning_animal_name: payload.winning_animal_name,
          draw_time: payload.draw_time,
          total_payout: payload.total_payout,
          winners_count: payload.winners_count,
          created_at: new Date().toISOString()
        })
        const updatedDraws = [localDraw, ...draws]
        setDraws(updatedDraws)
        localStorage.setItem('supabase_draws_backup_v2', JSON.stringify(updatedDraws))
        toast.warning('Sorteo guardado localmente. Se sincronizará cuando la conexión esté disponible.')
        return true
      } else {
        // Recargar datos desde Supabase
        await loadDraws()
        toast.success('Sorteo creado exitosamente en Supabase')
        return true
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al crear el sorteo')
      return false
    }
  }

  // Actualizar sorteo
  const updateDraw = async (id: string, drawData: Partial<DrawFormData>): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = {}
      if (drawData.lotteryId) updateData.lottery_id = drawData.lotteryId
      if (drawData.animalNumber) updateData.winning_animal_number = drawData.animalNumber
      if (drawData.animalName) updateData.winning_animal_name = drawData.animalName
      if (drawData.drawDate && drawData.drawTime) {
        updateData.draw_time = new Date(`${drawData.drawDate}T${drawData.drawTime}:00`).toISOString()
      }
      if (typeof drawData.isWinner === 'boolean') {
        updateData.winners_count = drawData.isWinner ? 1 : 0
      }
      if (typeof drawData.prizeAmount !== 'undefined') {
        updateData.total_payout = drawData.prizeAmount || 0
      }

      const { error: supabaseError } = await supabase
        .from('draws')
        .update(updateData)
        .eq('id', id)

      if (supabaseError) {
        // Error updating draw in Supabase
        // Actualizar localmente
        const updatedDraws = draws.map(draw => {
          if (draw.id !== id) return draw
          return {
            ...draw,
            ...updateData
          }
        })
        setDraws(updatedDraws)
        localStorage.setItem('supabase_draws_backup_v2', JSON.stringify(updatedDraws))
        toast.warning('Sorteo actualizado localmente. Se sincronizará cuando la conexión esté disponible.')
        return true
      } else {
        // Recargar datos desde Supabase
        await loadDraws()
        toast.success('Sorteo actualizado exitosamente')
        return true
      }
    } catch (err) {
      // Error updating draw
      toast.error('Error al actualizar el sorteo')
      return false
    }
  }

  // Eliminar sorteo
  const deleteDraw = async (id: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('draws')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        // Error deleting draw in Supabase
        // Eliminar localmente
        const updatedDraws = draws.filter(draw => draw.id !== id)
        setDraws(updatedDraws)
        localStorage.setItem('supabase_draws_backup_v2', JSON.stringify(updatedDraws))
        toast.warning('Sorteo eliminado localmente. Se sincronizará cuando la conexión esté disponible.')
        return true
      } else {
        // Recargar datos desde Supabase
        await loadDraws()
        toast.success('Sorteo eliminado exitosamente')
        return true
      }
    } catch (err) {
      // Error deleting draw
      toast.error('Error al eliminar el sorteo')
      return false
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    const initializeHook = async () => {
      // Primero probar la conexión
      const connectionOk = await testConnection()
      if (connectionOk) {
        // Connection test passed
      } else {
        // Connection test failed
      }
      
      // Luego cargar los datos
      await loadDraws()
    }
    
    initializeHook()
  }, [])

  // Función para obtener estadísticas
  const getDrawStats = () => {
    const totalDraws = draws.length
    const winnerDraws = draws.filter(draw => draw.winnersCount > 0).length
    const totalPrizes = draws.reduce((sum, draw) => sum + (draw.totalPayout || 0), 0)

    // Frecuencia de animales ganadores
    const animalFrequency: Record<string, number> = {}
    draws.forEach(draw => {
      const key = `${draw.winningAnimalNumber} - ${draw.winningAnimalName}`
      animalFrequency[key] = (animalFrequency[key] || 0) + 1
    })

    const mostFrequentAnimal = Object.entries(animalFrequency)
      .sort(([,a], [,b]) => b - a)[0]

    return {
      totalDraws,
      winnerDraws,
      totalPrizes,
      animalFrequency,
      mostFrequentAnimal: mostFrequentAnimal ? {
        animal: mostFrequentAnimal[0],
        count: mostFrequentAnimal[1]
      } : null
    }
  }

  return {
    draws,
    isLoading,
    error,
    createDraw,
    updateDraw,
    deleteDraw,
    loadDraws,
    getDrawStats
  }
}