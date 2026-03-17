import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Winner {
  id: string
  betsId: string
  odile: string
  prizeId: string | null
  amount: number
  potentialWin: number
  status: string
  createdAt: string
  // Datos de la taquilla (user)
  taquillaId: string
  taquillaName: string
  taquillaEmail: string
  // Datos del premio
  animalNumber: string
  animalName: string
  // Datos de la lotería (a través del daily_result)
  lotteryId: string | null
  lotteryName: string
}

export interface UseWinnersOptions {
  // IDs de taquillas visibles (si es undefined o vacío, no filtra)
  visibleTaquillaIds?: string[]
}

export function useWinners(options?: UseWinnersOptions) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWinners = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true)
      setError(null)

      const visibleTaquillaIds = options?.visibleTaquillaIds

      // Si visibleTaquillaIds es un array vacío (usuario sin taquillas), devolver lista vacía
      // undefined significa sin filtro (admin con permiso *)
      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setWinners([])
        setLoading(false)
        return
      }

      // Consultar bets_item_lottery_clasic con status = 'winner' o 'paid' (sin join)
      let query = supabase
        .from('bets_item_lottery_clasic')
        .select('id, bets_id, user_id, prize_id, amount, potential_bet_amount, status, created_at')
        .in('status', ['winner', 'paid'])
        .order('created_at', { ascending: false })

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      // Filtrar por taquillas visibles si se especificaron
      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        query = query.in('user_id', visibleTaquillaIds)
      }

      const { data: winnerItems, error: fetchError } = await query

      // Consultar ganadores de Lola
      let lolaQuery = supabase
        .from('bets_item_lola_lottery')
        .select('id, bets_id, user_id, lola_lottery_id, number, amount, status, created_at, prize')
        .in('status', ['winner', 'paid'])
        .order('created_at', { ascending: false })

      if (startDate) {
        lolaQuery = lolaQuery.gte('created_at', startDate)
      }
      if (endDate) {
        lolaQuery = lolaQuery.lte('created_at', endDate)
      }

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        lolaQuery = lolaQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: lolaWinnerItems, error: lolaFetchError } = await lolaQuery

      // Consultar ganadores de Pollo Lleno
      let polloQuery = supabase
        .from('bets_item_pollo_lleno')
        .select('id, bets_id, user_id, prize_id, amount, prize, status, created_at, numbers, key_gamble')
        .in('status', ['winner', 'paid'])
        .order('created_at', { ascending: false })

      if (startDate) {
        polloQuery = polloQuery.gte('created_at', startDate)
      }
      if (endDate) {
        polloQuery = polloQuery.lte('created_at', endDate)
      }

      const { data: polloWinnerItems, error: polloFetchError } = await polloQuery

      if (fetchError) {
        console.error('Error fetching winners:', fetchError)
        setError(fetchError.message)
        return
      }

      if (lolaFetchError) {
        console.error('Error fetching lola winners:', lolaFetchError)
        setError(lolaFetchError.message)
        return
      }

      if (polloFetchError) {
        console.error('Error fetching pollo winners:', polloFetchError)
        setError(polloFetchError.message)
        return
      }

      const classicItems = winnerItems || []
      const lolaItems = lolaWinnerItems || []
      const polloItemsRaw = polloWinnerItems || []

      const polloItemsWithMissingUser = polloItemsRaw.filter((item: any) => !item.user_id && item.bets_id)
      let betsUserMap = new Map<string, string>()

      if (polloItemsWithMissingUser.length > 0) {
        const betIds = Array.from(new Set(polloItemsWithMissingUser.map((item: any) => String(item.bets_id)).filter(Boolean)))

        if (betIds.length > 0) {
          const { data: betsData, error: betsError } = await supabase
            .from('bets')
            .select('id, user_id')
            .in('id', betIds)

          if (betsError) {
            console.error('Error resolving Pollo Lleno winners taquillas from bets:', betsError)
          } else if (betsData) {
            betsUserMap = new Map(
              betsData
                .filter((bet: any) => bet.id && bet.user_id)
                .map((bet: any) => [String(bet.id), String(bet.user_id)])
            )
          }
        }
      }

      const polloItems = polloItemsRaw
        .map((item: any) => ({
          ...item,
          resolved_user_id: String(item.user_id || betsUserMap.get(String(item.bets_id || '')) || '')
        }))
        .filter((item: any) => {
          if (!item.resolved_user_id) return false
          if (!visibleTaquillaIds || visibleTaquillaIds.length === 0) return true
          return visibleTaquillaIds.includes(item.resolved_user_id)
        })

      if (classicItems.length === 0 && lolaItems.length === 0 && polloItems.length === 0) {
        setWinners([])
        return
      }

      // Obtener IDs únicos de usuarios para buscar nombres de taquillas
      const userIds = [...new Set([
        ...classicItems.map(w => w.user_id),
        ...lolaItems.map(w => w.user_id),
        ...polloItems.map((w: any) => w.resolved_user_id)
      ].filter(Boolean))]

      // Obtener información de usuarios (taquillas)
      let usersMap = new Map<string, { name: string; email: string }>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds)

        if (users) {
          usersMap = new Map(users.map(u => [u.id, { name: u.name, email: u.email }]))
        }
      }

      // Obtener IDs únicos de premios para buscar información del animal
      const prizeIds = [...new Set(classicItems.map(w => w.prize_id).filter(Boolean))]

      // Obtener información de premios (animal_number, animal_name, lottery_id)
      let prizesMap = new Map<string, { animalNumber: string; animalName: string; lotteryId: string | null }>()
      if (prizeIds.length > 0) {
        const { data: prizes } = await supabase
          .from('prizes')
          .select('id, animal_number, animal_name, lottery_id')
          .in('id', prizeIds)

        if (prizes) {
          prizesMap = new Map(prizes.map(p => [p.id, {
            animalNumber: p.animal_number,
            animalName: p.animal_name,
            lotteryId: p.lottery_id
          }]))
        }
      }

      // Obtener IDs únicos de loterías para buscar nombres
      const lotteryIds = [...new Set(
        Array.from(prizesMap.values())
          .map(p => p.lotteryId)
          .filter(Boolean)
      )] as string[]

      let lotteriesMap = new Map<string, string>()
      if (lotteryIds.length > 0) {
        const { data: lotteries } = await supabase
          .from('lotteries')
          .select('id, name')
          .in('id', lotteryIds)

        if (lotteries) {
          lotteriesMap = new Map(lotteries.map(l => [l.id, l.name]))
        }
      }

      // Mapear los resultados
      const mappedClassic: Winner[] = classicItems.map((item: any) => {
        const userInfo = usersMap.get(item.user_id) || { name: 'Desconocida', email: '' }
        const prizeInfo = prizesMap.get(item.prize_id) || { animalNumber: '??', animalName: 'Desconocido', lotteryId: null }
        const lotteryId = prizeInfo.lotteryId
        const lotteryName = lotteryId ? (lotteriesMap.get(lotteryId) || 'Desconocida') : 'Desconocida'

        return {
          id: item.id,
          betsId: item.bets_id,
          odile: item.user_id,
          prizeId: item.prize_id,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.potential_bet_amount) || 0,
          status: item.status,
          createdAt: item.created_at,
          taquillaId: item.user_id,
          taquillaName: userInfo.name,
          taquillaEmail: userInfo.email,
          animalNumber: prizeInfo.animalNumber,
          animalName: prizeInfo.animalName,
          lotteryId,
          lotteryName
        }
      })

      // Obtener nombres de loterías Lola
      const lolaLotteryIds = [...new Set(lolaItems.map(i => String(i.lola_lottery_id || '')).filter(Boolean))]
      let lolaLotteriesMap = new Map<string, string>()
      if (lolaLotteryIds.length > 0) {
        const { data: lolaLotteries } = await supabase
          .from('lola_lotteries')
          .select('id, name')
          .in('id', lolaLotteryIds.map(id => Number(id)).filter(n => Number.isFinite(n)))

        if (lolaLotteries) {
          lolaLotteriesMap = new Map(
            lolaLotteries.map((l: any) => [String(l.id), l.name || `Lola #${l.id}`])
          )
        }
      }

      const mappedLola: Winner[] = lolaItems.map((item: any) => {
        const userInfo = usersMap.get(item.user_id) || { name: 'Desconocida', email: '' }
        const rawLolaId = String(item.lola_lottery_id || '')
        const lotteryId = rawLolaId ? `lola-${rawLolaId}` : null
        const lotteryName = rawLolaId ? (lolaLotteriesMap.get(rawLolaId) || `Lola #${rawLolaId}`) : 'Lola'
        const animalNumber = String(item.number ?? '') || '??'
        const animalName = animalNumber ? `Número ${animalNumber}` : 'Lola'

        return {
          id: item.id,
          betsId: item.bets_id,
          odile: item.user_id,
          prizeId: null,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.prize) || 0,
          status: item.status,
          createdAt: item.created_at,
          taquillaId: item.user_id,
          taquillaName: userInfo.name,
          taquillaEmail: userInfo.email,
          animalNumber,
          animalName,
          lotteryId,
          lotteryName
        }
      })

      const mappedPollo: Winner[] = polloItems.map((item: any) => {
        const resolvedUserId = String(item.resolved_user_id || '')
        const userInfo = usersMap.get(resolvedUserId) || { name: 'Desconocida', email: '' }
        const numbers = Array.isArray(item.numbers) ? item.numbers : []
        const numbersLabel = numbers
          .map((n: any) => Number(n))
          .filter((n: number) => Number.isFinite(n))
          .sort((a: number, b: number) => a - b)
          .map((n: number) => String(n).padStart(2, '0'))
          .join('-')
        const animalNumber = numbersLabel || String(item.key_gamble || '') || '??'

        return {
          id: item.id,
          betsId: item.bets_id,
          odile: resolvedUserId,
          prizeId: item.prize_id || null,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.prize) || 0,
          status: item.status,
          createdAt: item.created_at,
          taquillaId: resolvedUserId,
          taquillaName: userInfo.name,
          taquillaEmail: userInfo.email,
          animalNumber,
          animalName: 'Pollo Lleno',
          lotteryId: 'pollo-lleno',
          lotteryName: 'Pollo Lleno'
        }
      })

      const combined = [...mappedClassic, ...mappedLola, ...mappedPollo]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setWinners(combined)
    } catch (err) {
      console.error('Error in loadWinners:', err)
      setError('Error al cargar ganadores')
    } finally {
      setLoading(false)
    }
  }, [options?.visibleTaquillaIds])

  useEffect(() => {
    loadWinners()
  }, [loadWinners])

  return {
    winners,
    loading,
    error,
    loadWinners
  }
}
