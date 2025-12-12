import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface BetNumberStats {
  animalNumber: string
  animalName: string
  timesPlayed: number
  totalAmount: number
  totalPotentialWin: number
  lotteryBreakdown: Map<string, { lotteryId: string; lotteryName: string; count: number; amount: number }>
}

export interface TopPlayedNumber {
  number: string
  animalName: string
  timesPlayed: number
  lotteries: Array<{ lotteryId: string; lotteryName: string; count: number }>
}

export interface TopAmountNumber {
  number: string
  animalName: string
  totalAmount: number
  timesPlayed: number
  avgAmount: number
  totalPotentialWin: number
}

export interface UseBetsStatsOptions {
  // IDs de taquillas visibles (si es undefined o vacío, no filtra)
  visibleTaquillaIds?: string[]
}

export function useBetsStats(options?: UseBetsStatsOptions) {
  const [topMostPlayed, setTopMostPlayed] = useState<TopPlayedNumber[]>([])
  const [topHighestAmount, setTopHighestAmount] = useState<TopAmountNumber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBetsStats = useCallback(async (queryOptions?: {
    startDate?: string
    endDate?: string
    lotteryId?: string
  }) => {
    setLoading(true)
    setError(null)

    // Si visibleTaquillaIds es un array vacío (usuario sin taquillas), devolver datos vacíos
    // undefined significa sin filtro (admin con permiso *)
    const visibleTaquillaIds = options?.visibleTaquillaIds
    if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
      setTopMostPlayed([])
      setTopHighestAmount([])
      setLoading(false)
      return
    }

    try {
      // Primero obtener todos los prizes para tener el mapeo
      const { data: allPrizes, error: prizesError } = await supabase
        .from('prizes')
        .select('id, animal_number, animal_name, lottery_id')

      if (prizesError) {
        console.error('Error fetching prizes:', prizesError)
        setError(prizesError.message)
        setLoading(false)
        return
      }

      const prizesMap = new Map<string, { animalNumber: string; animalName: string; lotteryId: string }>()
      if (allPrizes) {
        allPrizes.forEach(p => {
          prizesMap.set(p.id, {
            animalNumber: p.animal_number,
            animalName: p.animal_name,
            lotteryId: p.lottery_id
          })
        })
      }

      // Obtener todas las loterías
      const { data: allLotteries, error: lotteriesError } = await supabase
        .from('lotteries')
        .select('id, name')

      if (lotteriesError) {
        console.error('Error fetching lotteries:', lotteriesError)
        setError(lotteriesError.message)
        setLoading(false)
        return
      }

      const lotteriesMap = new Map<string, string>()
      if (allLotteries) {
        allLotteries.forEach(l => {
          lotteriesMap.set(l.id, l.name)
        })
      }

      // Consultar las apuestas de bets_item_lottery_clasic con límite
      let query = supabase
        .from('bets_item_lottery_clasic')
        .select('id, prize_id, user_id, amount, potential_bet_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(10000) // Limitar para evitar timeouts

      if (queryOptions?.startDate) {
        query = query.gte('created_at', queryOptions.startDate)
      }
      if (queryOptions?.endDate) {
        query = query.lte('created_at', queryOptions.endDate)
      }

      // Filtrar por taquillas visibles si se especificaron
      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        query = query.in('user_id', visibleTaquillaIds)
      }

      const { data: betsItems, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching bets items:', fetchError)
        setError(fetchError.message)
        setLoading(false)
        return
      }

      if (!betsItems || betsItems.length === 0) {
        setTopMostPlayed([])
        setTopHighestAmount([])
        setLoading(false)
        return
      }

      // Filtrar por lotería si se especificó
      let filteredBetsItems = betsItems
      if (queryOptions?.lotteryId && queryOptions.lotteryId !== 'all') {
        filteredBetsItems = betsItems.filter(item => {
          const prizeInfo = prizesMap.get(item.prize_id)
          return prizeInfo?.lotteryId === queryOptions.lotteryId
        })
      }

      // Agregar estadísticas por número
      const numberStats = new Map<string, BetNumberStats>()

      filteredBetsItems.forEach((item) => {
        const prizeInfo = prizesMap.get(item.prize_id)
        if (!prizeInfo) return

        const key = prizeInfo.animalNumber
        const current = numberStats.get(key) || {
          animalNumber: prizeInfo.animalNumber,
          animalName: prizeInfo.animalName,
          timesPlayed: 0,
          totalAmount: 0,
          totalPotentialWin: 0,
          lotteryBreakdown: new Map()
        }

        current.timesPlayed += 1
        current.totalAmount += Number(item.amount) || 0
        current.totalPotentialWin += Number(item.potential_bet_amount) || 0

        // Actualizar desglose por lotería
        const lotteryId = prizeInfo.lotteryId
        const lotteryData = current.lotteryBreakdown.get(lotteryId) || {
          lotteryId,
          lotteryName: lotteriesMap.get(lotteryId) || 'Desconocida',
          count: 0,
          amount: 0
        }
        lotteryData.count += 1
        lotteryData.amount += Number(item.amount) || 0
        current.lotteryBreakdown.set(lotteryId, lotteryData)

        numberStats.set(key, current)
      })

      // Procesar Top 10 números más jugados
      const mostPlayed: TopPlayedNumber[] = Array.from(numberStats.values())
        .map(item => ({
          number: item.animalNumber,
          animalName: item.animalName,
          timesPlayed: item.timesPlayed,
          lotteries: Array.from(item.lotteryBreakdown.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(l => ({ lotteryId: l.lotteryId, lotteryName: l.lotteryName, count: l.count }))
        }))
        .sort((a, b) => b.timesPlayed - a.timesPlayed)
        .slice(0, 10)

      // Procesar Top 10 números con mayor monto apostado
      const highestAmount: TopAmountNumber[] = Array.from(numberStats.values())
        .map(item => ({
          number: item.animalNumber,
          animalName: item.animalName,
          totalAmount: item.totalAmount,
          timesPlayed: item.timesPlayed,
          avgAmount: item.timesPlayed > 0 ? item.totalAmount / item.timesPlayed : 0,
          totalPotentialWin: item.totalPotentialWin
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)

      setTopMostPlayed(mostPlayed)
      setTopHighestAmount(highestAmount)
      setLoading(false)

    } catch (err) {
      console.error('Error in loadBetsStats:', err)
      setError('Error al cargar estadísticas de apuestas')
      setLoading(false)
    }
  }, [options?.visibleTaquillaIds])

  return {
    topMostPlayed,
    topHighestAmount,
    loading,
    error,
    loadBetsStats
  }
}
