import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Lottery, Prize } from '@/lib/types'
import { toast } from 'sonner'

export interface SupabaseLottery {
  id: string
  name: string
  opening_time: string
  closing_time: string
  draw_time: string
  is_active: boolean
  plays_tomorrow: boolean
  created_at: string
  updated_at: string
  // Relación con premios
  prizes?: Array<{
    id: string
    animal_number: string
    animal_name: string
    multiplier: number
  }>
}

export function useSupabaseLotteries() {
  const [lotteries, setLotteries] = useState<Lottery[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar loterías desde Supabase
  const loadLotteries = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Fallback: usar loterías por defecto si Supabase no está configurado
      const defaultLotteries: Lottery[] = [
        {
          id: 'lottery-default-1',
          name: 'Lotto Activo',
          openingTime: '06:00',
          closingTime: '18:00',
          drawTime: '19:00',
          isActive: true,
          playsTomorrow: false,
          prizes: [
            {
              id: 'prize-1',
              animalNumber: '00',
              animalName: 'Delfín',
              multiplier: 50
            }
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'lottery-default-2',
          name: 'Granja Millonaria',
          openingTime: '07:00',
          closingTime: '17:30',
          drawTime: '18:00',
          isActive: true,
          playsTomorrow: false,
          prizes: [
            {
              id: 'prize-2',
              animalNumber: '00',
              animalName: 'Delfín',
              multiplier: 45
            }
          ],
          createdAt: new Date().toISOString(),
        }
      ]
      setLotteries(defaultLotteries)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Cargar loterías con sus premios desde Supabase
      const { data, error } = await supabase
        .from('lotteries')
        .select(`
          *,
          prizes (
            id,
            animal_number,
            animal_name,
            multiplier
          )
        `)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transformar datos de Supabase al formato local
      const transformedLotteries: Lottery[] = data.map((lottery: SupabaseLottery) => ({
        id: lottery.id,
        name: lottery.name,
        openingTime: lottery.opening_time,
        closingTime: lottery.closing_time,
        drawTime: lottery.draw_time,
        isActive: lottery.is_active,
        playsTomorrow: lottery.plays_tomorrow,
        prizes: lottery.prizes?.map(prize => ({
          id: prize.id,
          animalNumber: prize.animal_number,
          animalName: prize.animal_name,
          multiplier: prize.multiplier
        })) || [],
        createdAt: lottery.created_at,
      }))

      setLotteries(transformedLotteries)
      console.log(`✅ Cargadas ${transformedLotteries.length} loterías desde Supabase`)

    } catch (error: any) {
      console.error('Error loading lotteries:', error)
      setError(error.message || 'Error al cargar loterías')
      toast.error('Error al cargar loterías desde Supabase')

      // Fallback a loterías por defecto en caso de error
      const defaultLotteries: Lottery[] = [
        {
          id: 'lottery-fallback-1',
          name: 'Lotto Activo',
          openingTime: '06:00',
          closingTime: '18:00',
          drawTime: '19:00',
          isActive: true,
          playsTomorrow: false,
          prizes: [],
          createdAt: new Date().toISOString(),
        }
      ]
      setLotteries(defaultLotteries)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crear nueva lotería (solo en Supabase)
  const createLottery = async (lotteryData: Omit<Lottery, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return false
    }

    try {
      // Verificar si ya existe una lotería con el mismo nombre
      console.log(`🔍 Verificando nombre de lotería: ${lotteryData.name}`)

      const { data: existingLotteries, error: checkError } = await supabase
        .from('lotteries')
        .select('id, name')
        .eq('name', lotteryData.name)
        .limit(1)

      if (checkError) {
        throw checkError
      }

      if (existingLotteries && existingLotteries.length > 0) {
        const existing = existingLotteries[0]
        console.log(`❌ Lotería con nombre "${lotteryData.name}" ya existe (ID: ${existing.id})`)
        toast.error(`Ya existe una lotería con el nombre: ${lotteryData.name}`)
        return false
      }

      console.log(`✅ Nombre de lotería "${lotteryData.name}" disponible`)
      console.log(`📝 Creando lotería en Supabase...`)
      // Primero crear la lotería en la tabla lotteries
      const { data: newLotteries, error: lotteryError } = await supabase
        .from('lotteries')
        .insert([
          {
            name: lotteryData.name,
            opening_time: lotteryData.openingTime,
            closing_time: lotteryData.closingTime,
            draw_time: lotteryData.drawTime,
            is_active: lotteryData.isActive,
            plays_tomorrow: lotteryData.playsTomorrow
          }
        ])
        .select()

      if (lotteryError) throw lotteryError

      // Obtener la lotería creada
      const newLottery = newLotteries && newLotteries[0]
      if (!newLottery) {
        throw new Error('No se pudo crear la lotería en Supabase')
      }

      // Luego insertar los premios si se proporcionaron
      if (lotteryData.prizes && lotteryData.prizes.length > 0) {
        const lotteryPrizes = lotteryData.prizes.map(prize => ({
          lottery_id: newLottery.id,
          animal_number: prize.animalNumber,
          animal_name: prize.animalName,
          multiplier: prize.multiplier
        }))

        const { error: prizesError } = await supabase
          .from('prizes')
          .insert(lotteryPrizes)

        if (prizesError) {
          console.error('Error insertando premios:', prizesError)
          // No fallar completamente, la lotería se creó
        }
      }

      // Transformar al formato local
      const createdLottery: Lottery = {
        id: newLottery.id,
        name: newLottery.name,
        openingTime: newLottery.opening_time,
        closingTime: newLottery.closing_time,
        drawTime: newLottery.draw_time,
        isActive: newLottery.is_active,
        playsTomorrow: newLottery.plays_tomorrow,
        prizes: lotteryData.prizes || [],
        createdAt: newLottery.created_at
      }

      setLotteries(current => [...current, createdLottery])
      console.log(`✅ Lotería creada exitosamente: ${createdLottery.name}`)
      toast.success('Lotería creada exitosamente en Supabase')
      return true

    } catch (error: any) {
      console.error('❌ Error creating lottery:', error)

      // Manejo específico de errores de duplicate key
      if (error.message.includes('duplicate key') ||
        error.message.includes('unique constraint') ||
        error.message.includes('lotteries_name_key')) {
        console.log(`🚫 Duplicate lottery name detected: ${lotteryData.name}`)
        toast.error(`Ya existe una lotería con el nombre: ${lotteryData.name}`)
        return false
      }

      // Otros errores
      console.log(`⚠️ Supabase error creating lottery: ${error.message}`)
      toast.error(`Error al crear lotería: ${error.message}`)
      return false
    }
  }

  // Actualizar lotería
  const updateLottery = async (lotteryId: string, lotteryData: Partial<Lottery>): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return false
    }

    try {
      // Actualizar datos básicos de la lotería
      const { data: updatedLotteries, error } = await supabase
        .from('lotteries')
        .update({
          name: lotteryData.name,
          opening_time: lotteryData.openingTime,
          closing_time: lotteryData.closingTime,
          draw_time: lotteryData.drawTime,
          is_active: lotteryData.isActive,
          plays_tomorrow: lotteryData.playsTomorrow,
        })
        .eq('id', lotteryId)
        .select()

      if (error) throw error

      // Verificar que se actualizó correctamente
      const updatedLottery = updatedLotteries && updatedLotteries[0]
      if (!updatedLottery) {
        throw new Error('No se pudo actualizar la lotería en Supabase')
      }

      // Actualizar premios si se proporcionaron
      if (lotteryData.prizes !== undefined) {
        // Primero eliminar premios existentes
        await supabase
          .from('prizes')
          .delete()
          .eq('lottery_id', lotteryId)

        // Luego insertar nuevos premios
        if (lotteryData.prizes.length > 0) {
          const lotteryPrizes = lotteryData.prizes.map(prize => ({
            lottery_id: lotteryId,
            animal_number: prize.animalNumber,
            animal_name: prize.animalName,
            multiplier: prize.multiplier
          }))

          const { error: prizesError } = await supabase
            .from('prizes')
            .insert(lotteryPrizes)

          if (prizesError) {
            console.error('Error actualizando premios:', prizesError)
          }
        }
      }

      // Actualizar estado local
      setLotteries(current =>
        current.map(lottery =>
          lottery.id === lotteryId ? { ...lottery, ...lotteryData } : lottery
        )
      )

      toast.success('Lotería actualizada exitosamente')
      return true

    } catch (error: any) {
      console.error('Error updating lottery:', error)
      toast.error(`Error al actualizar lotería: ${error.message}`)
      return false
    }
  }

  // Eliminar lotería
  const deleteLottery = async (lotteryId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return false
    }

    try {
      // Los premios se eliminan automáticamente por CASCADE en la foreign key
      const { error } = await supabase
        .from('lotteries')
        .delete()
        .eq('id', lotteryId)

      if (error) {
        // Si es un error de políticas RLS, usar modo local
        if (error.message.includes('row-level security policy')) {
          toast.error('No se puede eliminar la lotería debido a políticas de seguridad')
          return false
        }
        throw error
      }

      // Actualizar estado local
      setLotteries(current => current.filter(lottery => lottery.id !== lotteryId))
      toast.success('Lotería eliminada exitosamente')
      return true

    } catch (error: any) {
      console.error('Error deleting lottery:', error)
      toast.error(`Error al eliminar lotería: ${error.message}`)
      return false
    }
  }

  // Alternar estado de la lotería
  const toggleLotteryStatus = async (lotteryId: string): Promise<boolean> => {
    const lottery = lotteries.find(l => l.id === lotteryId)
    if (!lottery) return false

    return await updateLottery(lotteryId, { isActive: !lottery.isActive })
  }

  // Cargar loterías al montar el componente
  useEffect(() => {
    loadLotteries()
  }, [loadLotteries])

  return {
    lotteries,
    isLoading,
    error,
    loadLotteries,
    createLottery,
    updateLottery,
    deleteLottery,
    toggleLotteryStatus,
  }
}