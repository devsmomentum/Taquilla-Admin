import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { endOfDay, startOfDay, format } from 'date-fns'

export interface PolloLlenoSalesStats {
  rangeSales: number
  rangeBetsCount: number
  rangeTaquillaCommissions: number
  rangePrizes: number
  winnersCount: number
  winnersByDate?: Record<string, number>
  salesByTaquilla: Array<{
    taquillaId: string
    taquillaName: string
    sales: number
    betsCount: number
    shareOnSales: number
    commission: number
    winnersCount: number
    prizes: number
  }>
}

export interface UseSalesStatsPolloLlenoOptions {
  visibleTaquillaIds?: string[]
  dateFrom: Date
  dateTo: Date
  enabled?: boolean
}

const emptyStats: PolloLlenoSalesStats = {
  rangeSales: 0,
  rangeBetsCount: 0,
  rangeTaquillaCommissions: 0,
  rangePrizes: 0,
  winnersCount: 0,
  winnersByDate: {},
  salesByTaquilla: []
}

export function useSalesStatsPolloLleno(options: UseSalesStatsPolloLlenoOptions) {
  const [stats, setStats] = useState<PolloLlenoSalesStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDateKey = (value: unknown): string => {
    const s = String(value ?? '')
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }

  const loadStats = useCallback(async () => {
    const enabled = options.enabled ?? true
    if (!enabled) {
      setStats(emptyStats)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const visibleTaquillaIds = options.visibleTaquillaIds

      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setStats(emptyStats)
        return
      }

      const queryStart = startOfDay(options.dateFrom).toISOString()
      const queryEnd = endOfDay(options.dateTo).toISOString()

      const itemsQuery = supabase
        .from('bets_item_pollo_lleno')
        .select('id, bets_id, user_id, amount, prize, status, created_at')
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)

      const { data: items, error: itemsError } = await itemsQuery

      if (itemsError) {
        console.error('Error fetching pollo lleno items:', itemsError)
        setError(itemsError.message)
        setStats(emptyStats)
        return
      }

      const itemsWithMissingUser = (items || []).filter((item: any) => !item.user_id && item.bets_id)
      let betsUserMap = new Map<string, string>()

      if (itemsWithMissingUser.length > 0) {
        const betIds = Array.from(new Set(itemsWithMissingUser.map((item: any) => String(item.bets_id)).filter(Boolean)))

        if (betIds.length > 0) {
          const { data: betsData, error: betsError } = await supabase
            .from('bets')
            .select('id, user_id')
            .in('id', betIds)

          if (betsError) {
            console.error('Error resolving Pollo Lleno taquillas from bets:', betsError)
          } else if (betsData) {
            betsUserMap = new Map(
              betsData
                .filter((bet: any) => bet.id && bet.user_id)
                .map((bet: any) => [String(bet.id), String(bet.user_id)])
            )
          }
        }
      }

      const taquillaMap = new Map<string, { sales: number; betsCount: number; winnersCount: number; prizes: number }>()
      const winnersByDate: Record<string, number> = {}
      let totalSales = 0
      let totalBetsCount = 0
      let totalWinnersCount = 0
      let totalPrizes = 0

      ;(items || []).forEach((item: any) => {
        const taquillaId = String(item.user_id || betsUserMap.get(String(item.bets_id || '')) || '')
        if (!taquillaId) return

        if (visibleTaquillaIds && visibleTaquillaIds.length > 0 && !visibleTaquillaIds.includes(taquillaId)) {
          return
        }

        const amount = Number(item.amount) || 0
        const prize = Number(item.prize) || 0
        const status = String(item.status || '')
        const isCancelled = status === 'cancelled'
        const isWinner = status === 'winner' || status === 'paid'

        const current = taquillaMap.get(taquillaId) || { sales: 0, betsCount: 0, winnersCount: 0, prizes: 0 }

        if (!isCancelled) {
          current.sales += amount
          current.betsCount += 1
          totalSales += amount
          totalBetsCount += 1
        }

        if (isWinner) {
          current.winnersCount += 1
          current.prizes += prize
          totalWinnersCount += 1
          totalPrizes += prize

          const dateKey = getDateKey(item.created_at)
          if (dateKey) {
            winnersByDate[dateKey] = (winnersByDate[dateKey] || 0) + 1
          }
        }

        taquillaMap.set(taquillaId, current)
      })

      const taquillaIds = Array.from(taquillaMap.keys())
      let taquillaInfoMap = new Map<string, { name: string; shareOnSales: number }>()

      if (taquillaIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, share_on_sales')
          .in('id', taquillaIds)

        if (usersError) {
          console.error('Error fetching taquilla info for pollo lleno:', usersError)
        }

        if (users) {
          taquillaInfoMap = new Map(
            users.map((u: any) => [
              u.id,
              {
                name: u.name,
                shareOnSales: Number(u.share_on_sales) || 0
              }
            ])
          )
        }
      }

      const salesByTaquilla = Array.from(taquillaMap.entries())
        .map(([taquillaId, data]) => {
          const info = taquillaInfoMap.get(taquillaId) || { name: 'Desconocida', shareOnSales: 0 }
          const commission = data.sales * (info.shareOnSales / 100)
          return {
            taquillaId,
            taquillaName: info.name,
            sales: data.sales,
            betsCount: data.betsCount,
            shareOnSales: info.shareOnSales,
            commission,
            winnersCount: data.winnersCount,
            prizes: data.prizes
          }
        })
        .sort((a, b) => b.sales - a.sales)

      const rangeTaquillaCommissions = salesByTaquilla.reduce((sum, t) => sum + t.commission, 0)

      setStats({
        rangeSales: totalSales,
        rangeBetsCount: totalBetsCount,
        rangeTaquillaCommissions,
        rangePrizes: totalPrizes,
        winnersCount: totalWinnersCount,
        winnersByDate,
        salesByTaquilla
      })
    } catch (err) {
      console.error('Error in loadStats (pollo lleno):', err)
      setError('Error al cargar estadísticas de ventas (Pollo Lleno)')
      setStats(emptyStats)
    } finally {
      setLoading(false)
    }
  }, [options.dateFrom, options.dateTo, options.enabled, options.visibleTaquillaIds])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
