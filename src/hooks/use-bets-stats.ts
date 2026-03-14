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
    lotteryType?: 'mikaela' | 'lola' | 'pollo_lleno'
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
      const isLola = queryOptions?.lotteryType === 'lola'
      const isPollo = queryOptions?.lotteryType === 'pollo_lleno'

      if (isPollo) {
        let polloQuery = supabase
          .from('bets_item_pollo_lleno')
          .select('id, bets_id, user_id, key_gamble, numbers, amount, prize, status, created_at')
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10000)

        if (queryOptions?.startDate) {
          polloQuery = polloQuery.gte('created_at', queryOptions.startDate)
        }
        if (queryOptions?.endDate) {
          polloQuery = polloQuery.lte('created_at', queryOptions.endDate)
        }

        const { data: polloItems, error: polloError } = await polloQuery

        if (polloError) {
          console.error('Error fetching pollo lleno items:', polloError)
          setError(polloError.message)
          setLoading(false)
          return
        }

        const itemsWithMissingUser = (polloItems || []).filter((item: any) => !item.user_id && item.bets_id)
        let betsUserMap = new Map<string, string>()

        if (itemsWithMissingUser.length > 0) {
          const betIds = Array.from(new Set(itemsWithMissingUser.map((item: any) => String(item.bets_id)).filter(Boolean)))

          if (betIds.length > 0) {
            const { data: betsData, error: betsError } = await supabase
              .from('bets')
              .select('id, user_id')
              .in('id', betIds)

            if (betsError) {
              console.error('Error resolving Pollo Lleno taquillas for bet stats:', betsError)
            } else if (betsData) {
              betsUserMap = new Map(
                betsData
                  .filter((bet: any) => bet.id && bet.user_id)
                  .map((bet: any) => [String(bet.id), String(bet.user_id)])
              )
            }
          }
        }

        const numberStats = new Map<string, BetNumberStats>()

        ;(polloItems || []).forEach((item: any) => {
          const taquillaId = String(item.user_id || betsUserMap.get(String(item.bets_id || '')) || '')
          if (visibleTaquillaIds && visibleTaquillaIds.length > 0 && !visibleTaquillaIds.includes(taquillaId)) {
            return
          }

          const keyGamble = String(item.key_gamble ?? '')
          const numbers = Array.isArray(item.numbers)
            ? item.numbers.map((n: any) => String(n).padStart(2, '0')).join('-')
            : ''
          const key = keyGamble || numbers || '??'

          const current = numberStats.get(key) || {
            animalNumber: key,
            animalName: key ? 'Combinación' : 'Pollo Lleno',
            timesPlayed: 0,
            totalAmount: 0,
            totalPotentialWin: 0,
            lotteryBreakdown: new Map()
          }

          current.timesPlayed += 1
          current.totalAmount += Number(item.amount) || 0
          current.totalPotentialWin += Number(item.prize) || 0

          const lotteryId = 'pollo-lleno'
          const lotteryData = current.lotteryBreakdown.get(lotteryId) || {
            lotteryId,
            lotteryName: 'Pollo Lleno',
            count: 0,
            amount: 0
          }

          lotteryData.count += 1
          lotteryData.amount += Number(item.amount) || 0
          current.lotteryBreakdown.set(lotteryId, lotteryData)

          numberStats.set(key, current)
        })

        const mostPlayed = Array.from(numberStats.values())
          .sort((a, b) => b.timesPlayed - a.timesPlayed)
          .slice(0, 10)
          .map((item) => ({
            number: item.animalNumber,
            animalName: item.animalName,
            timesPlayed: item.timesPlayed,
            lotteries: Array.from(item.lotteryBreakdown.values()).map((l) => ({
              lotteryId: l.lotteryId,
              lotteryName: l.lotteryName,
              count: l.count
            }))
          }))

        const highestAmount = Array.from(numberStats.values())
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 10)
          .map((item) => ({
            number: item.animalNumber,
            animalName: item.animalName,
            totalAmount: item.totalAmount,
            timesPlayed: item.timesPlayed,
            avgAmount: item.timesPlayed > 0 ? item.totalAmount / item.timesPlayed : 0,
            totalPotentialWin: item.totalPotentialWin
          }))

        setTopMostPlayed(mostPlayed)
        setTopHighestAmount(highestAmount)
        setLoading(false)
        return
      }

      if (isLola) {
        const toLolaDbId = (lotteryId?: string) => {
          const s = String(lotteryId ?? '').trim()
          if (!s) return null
          const m = s.match(/^lola-(\d+)$/)
          const raw = m ? m[1] : s
          const n = Number.parseInt(raw, 10)
          return Number.isFinite(n) ? n : null
        }

        // Loterías Lola
        const { data: lolaLotteries, error: lolaLotteriesError } = await supabase
          .from('lola_lotteries')
          .select('id, name')

        if (lolaLotteriesError) {
          console.error('Error fetching lola lotteries:', lolaLotteriesError)
          setError(lolaLotteriesError.message)
          setLoading(false)
          return
        }

        const lolaLotteriesMap = new Map<string, string>()
        if (lolaLotteries) {
          lolaLotteries.forEach(l => {
            lolaLotteriesMap.set(String(l.id), l.name || `Lola #${l.id}`)
          })
        }

        let lolaQuery = supabase
          .from('bets_item_lola_lottery')
          .select('id, user_id, lola_lottery_id, number, amount, prize, status, created_at')
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10000)

        if (queryOptions?.startDate) {
          lolaQuery = lolaQuery.gte('created_at', queryOptions.startDate)
        }
        if (queryOptions?.endDate) {
          lolaQuery = lolaQuery.lte('created_at', queryOptions.endDate)
        }

        if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
          lolaQuery = lolaQuery.in('user_id', visibleTaquillaIds)
        }

        if (queryOptions?.lotteryId && queryOptions.lotteryId !== 'all') {
          const dbId = toLolaDbId(queryOptions.lotteryId)
          if (dbId !== null) {
            lolaQuery = lolaQuery.eq('lola_lottery_id', dbId)
          }
        }

        const { data: lolaItems, error: lolaFetchError } = await lolaQuery

        if (lolaFetchError) {
          console.error('Error fetching lola bets items:', lolaFetchError)
          setError(lolaFetchError.message)
          setLoading(false)
          return
        }

        if (!lolaItems || lolaItems.length === 0) {
          setTopMostPlayed([])
          setTopHighestAmount([])
          setLoading(false)
          return
        }

        const numberStats = new Map<string, BetNumberStats>()

        lolaItems.forEach((item: any) => {
          const key = String(item.number ?? '') || '??'
          const current = numberStats.get(key) || {
            animalNumber: key,
            animalName: key ? `Número ${key}` : 'Lola',
            timesPlayed: 0,
            totalAmount: 0,
            totalPotentialWin: 0,
            lotteryBreakdown: new Map()
          }

          current.timesPlayed += 1
          current.totalAmount += Number(item.amount) || 0
          current.totalPotentialWin += Number(item.prize) || 0

          const lotteryId = `lola-${item.lola_lottery_id}`
          const lotteryData = current.lotteryBreakdown.get(lotteryId) || {
            lotteryId,
            lotteryName: lolaLotteriesMap.get(String(item.lola_lottery_id)) || `Lola #${item.lola_lottery_id}`,
            count: 0,
            amount: 0
          }
          lotteryData.count += 1
          lotteryData.amount += Number(item.amount) || 0
          current.lotteryBreakdown.set(lotteryId, lotteryData)

          numberStats.set(key, current)
        })

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
        return
      }

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

      // Filtrar por tipo de lotería (Mikaela vs Lola) si se especificó
      let filteredBetsItems = betsItems
      if (queryOptions?.lotteryType) {
        filteredBetsItems = filteredBetsItems.filter(item => {
          const prizeInfo = prizesMap.get(item.prize_id)
          if (!prizeInfo?.lotteryId) return false
          const isLolaLottery = prizeInfo.lotteryId.startsWith('lola-')
          return queryOptions.lotteryType === 'lola' ? isLolaLottery : !isLolaLottery
        })
      }

      // Filtrar por lotería específica si se especificó
      if (queryOptions?.lotteryId && queryOptions.lotteryId !== 'all') {
        filteredBetsItems = filteredBetsItems.filter(item => {
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
