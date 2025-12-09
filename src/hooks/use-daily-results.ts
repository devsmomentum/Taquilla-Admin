import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyResult } from '@/lib/types'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'

export function useDailyResults() {
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDailyResults = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('daily_results')
        .select(`
          id,
          lottery_id,
          prize_id,
          result_date,
          created_at,
          total_to_pay,
          total_raised,
          lotteries (
            id,
            name,
            opening_time,
            closing_time,
            draw_time,
            is_active,
            plays_tomorrow
          ),
          prizes (
            id,
            animal_number,
            animal_name,
            multiplier
          )
        `)
        .order('result_date', { ascending: false })

      if (startDate) {
        query = query.gte('result_date', startDate)
      }
      if (endDate) {
        query = query.lte('result_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching daily results:', fetchError)
        setError(fetchError.message)
        return
      }

      const mapped: DailyResult[] = (data || []).map((item: any) => ({
        id: item.id,
        lotteryId: item.lottery_id,
        prizeId: item.prize_id,
        resultDate: item.result_date,
        createdAt: item.created_at,
        totalToPay: item.total_to_pay || 0,
        totalRaised: item.total_raised || 0,
        lottery: item.lotteries ? {
          id: item.lotteries.id,
          name: item.lotteries.name,
          openingTime: item.lotteries.opening_time,
          closingTime: item.lotteries.closing_time,
          drawTime: item.lotteries.draw_time,
          isActive: item.lotteries.is_active,
          playsTomorrow: item.lotteries.plays_tomorrow,
          prizes: [],
          createdAt: ''
        } : undefined,
        prize: item.prizes ? {
          id: item.prizes.id,
          animalNumber: item.prizes.animal_number,
          animalName: item.prizes.animal_name,
          multiplier: item.prizes.multiplier
        } : undefined
      }))

      setDailyResults(mapped)
    } catch (err) {
      console.error('Error in loadDailyResults:', err)
      setError('Error al cargar resultados diarios')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Calcula el total a pagar buscando en bets_item_lottery_clasic
   * los items con el prize_id ganador y actualiza su status a 'winner'
   */
  const calculateWinnersAndTotals = useCallback(async (
    lotteryId: string,
    prizeId: string,
    resultDate: string
  ): Promise<{ totalToPay: number; totalRaised: number }> => {
    try {
      // Parsear la fecha para obtener el rango del día
      const dateObj = parseISO(resultDate)
      const dayStart = startOfDay(dateObj).toISOString()
      const dayEnd = endOfDay(dateObj).toISOString()

      // 1. Buscar todos los items de apuesta con el prize_id ganador para ese día
      // Primero obtenemos los bets del día que correspondan a esta lotería
      const { data: betsOfDay, error: betsError } = await supabase
        .from('bets')
        .select('id, amount')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      if (betsError) {
        console.error('Error fetching bets:', betsError)
        return { totalToPay: 0, totalRaised: 0 }
      }

      const betIds = (betsOfDay || []).map(b => b.id)

      if (betIds.length === 0) {
        return { totalToPay: 0, totalRaised: 0 }
      }

      // 2. Buscar los items de lotería clásica con el premio ganador
      const { data: winningItems, error: itemsError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('id, potential_bet_amount, amount')
        .in('bets_id', betIds)
        .eq('prize_id', prizeId)
        .eq('status', 'active')

      if (itemsError) {
        console.error('Error fetching winning items:', itemsError)
        return { totalToPay: 0, totalRaised: 0 }
      }

      // 3. Calcular total a pagar (suma de potential_bet_amount de ganadores)
      const totalToPay = (winningItems || []).reduce((sum, item) => {
        return sum + (Number(item.potential_bet_amount) || 0)
      }, 0)

      // 4. Actualizar status a 'winner' para los items ganadores
      if (winningItems && winningItems.length > 0) {
        const winningIds = winningItems.map(w => w.id)

        const { error: updateError } = await supabase
          .from('bets_item_lottery_clasic')
          .update({ status: 'winner' })
          .in('id', winningIds)

        if (updateError) {
          console.error('Error updating winner status:', updateError)
        }
      }

      // 5. Calcular total recaudado del día para esta lotería
      // Obtener todos los items de lotería clásica del día (no solo ganadores)
      const { data: allItems, error: allItemsError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('amount')
        .in('bets_id', betIds)

      if (allItemsError) {
        console.error('Error fetching all items:', allItemsError)
        return { totalToPay, totalRaised: 0 }
      }

      // Total recaudado = suma de amounts de todos los items - total a pagar
      const totalSales = (allItems || []).reduce((sum, item) => {
        return sum + (Number(item.amount) || 0)
      }, 0)

      const totalRaised = totalSales - totalToPay

      return { totalToPay, totalRaised }
    } catch (err) {
      console.error('Error in calculateWinnersAndTotals:', err)
      return { totalToPay: 0, totalRaised: 0 }
    }
  }, [])

  const createDailyResult = useCallback(async (
    lotteryId: string,
    prizeId: string,
    resultDate: string
  ): Promise<boolean> => {
    try {
      // 1. Calcular ganadores y totales
      const { totalToPay, totalRaised } = await calculateWinnersAndTotals(
        lotteryId,
        prizeId,
        resultDate
      )

      // 2. Crear el registro de resultado diario
      const { data, error: insertError } = await supabase
        .from('daily_results')
        .insert({
          lottery_id: lotteryId,
          prize_id: prizeId,
          result_date: resultDate,
          total_to_pay: totalToPay,
          total_raised: totalRaised
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating daily result:', insertError)
        return false
      }

      // 3. Recargar resultados
      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in createDailyResult:', err)
      return false
    }
  }, [loadDailyResults, calculateWinnersAndTotals])

  const updateDailyResult = useCallback(async (
    id: string,
    updates: Partial<{ prizeId: string; totalToPay: number; totalRaised: number }>
  ): Promise<boolean> => {
    try {
      const updateData: any = {}
      if (updates.prizeId !== undefined) updateData.prize_id = updates.prizeId
      if (updates.totalToPay !== undefined) updateData.total_to_pay = updates.totalToPay
      if (updates.totalRaised !== undefined) updateData.total_raised = updates.totalRaised

      const { error: updateError } = await supabase
        .from('daily_results')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        console.error('Error updating daily result:', updateError)
        return false
      }

      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in updateDailyResult:', err)
      return false
    }
  }, [loadDailyResults])

  const deleteDailyResult = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('daily_results')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting daily result:', deleteError)
        return false
      }

      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in deleteDailyResult:', err)
      return false
    }
  }, [loadDailyResults])

  const getResultForLotteryAndDate = useCallback((lotteryId: string, date: string): DailyResult | undefined => {
    return dailyResults.find(r => r.lotteryId === lotteryId && r.resultDate === date)
  }, [dailyResults])

  const getResultsForWeek = useCallback((weekStart: string, weekEnd: string): DailyResult[] => {
    return dailyResults.filter(r => r.resultDate >= weekStart && r.resultDate <= weekEnd)
  }, [dailyResults])

  /**
   * Obtiene los ganadores de un resultado específico
   * Busca en bets_item_lottery_clasic los items con status 'winner' y el prize_id correspondiente
   */
  const getWinnersForResult = useCallback(async (
    prizeId: string,
    resultDate: string
  ): Promise<Array<{
    id: string
    amount: number
    potentialWin: number
    taquillaId: string
    taquillaName: string
    createdAt: string
  }>> => {
    try {
      const dateObj = parseISO(resultDate)
      const dayStart = startOfDay(dateObj).toISOString()
      const dayEnd = endOfDay(dateObj).toISOString()

      // 1. Obtener bets del día
      const { data: betsOfDay, error: betsError } = await supabase
        .from('bets')
        .select('id, user_id, created_at')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      if (betsError || !betsOfDay || betsOfDay.length === 0) {
        return []
      }

      const betIds = betsOfDay.map(b => b.id)
      const betMap = new Map<string, { userId: string | null; createdAt: string }>(
        betsOfDay.map(b => [b.id, { userId: b.user_id, createdAt: b.created_at }])
      )

      // 2. Buscar items ganadores
      const { data: winningItems, error: itemsError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('id, bets_id, amount, potential_bet_amount')
        .in('bets_id', betIds)
        .eq('prize_id', prizeId)
        .eq('status', 'winner')

      if (itemsError || !winningItems) {
        return []
      }

      // 3. Obtener información de usuarios (taquillas)
      const userIds = [...new Set(betsOfDay.map(b => b.user_id).filter(Boolean))]

      let usersMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds)

        if (users) {
          usersMap = new Map(users.map(u => [u.id, u.name]))
        }
      }

      // 4. Mapear resultados
      return winningItems.map(item => {
        const betInfo = betMap.get(item.bets_id)
        const taquillaId = betInfo?.userId || ''
        const taquillaName = usersMap.get(taquillaId) || 'Desconocida'

        return {
          id: item.id,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.potential_bet_amount) || 0,
          taquillaId,
          taquillaName,
          createdAt: betInfo?.createdAt || ''
        }
      })
    } catch (err) {
      console.error('Error in getWinnersForResult:', err)
      return []
    }
  }, [])

  useEffect(() => {
    loadDailyResults()
  }, [loadDailyResults])

  return {
    dailyResults,
    loading,
    error,
    loadDailyResults,
    createDailyResult,
    updateDailyResult,
    deleteDailyResult,
    getResultForLotteryAndDate,
    getResultsForWeek,
    getWinnersForResult
  }
}
