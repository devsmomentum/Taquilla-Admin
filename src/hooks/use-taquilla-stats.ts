import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, endOfDay } from 'date-fns'

export interface TaquillaStats {
  taquillaId: string
  taquillaName: string
  weekSales: number
  weekPrizes: number
  salesCommission: number
  shareOnSales: number
  balance: number // weekSales - weekPrizes - salesCommission
}

export interface UseTaquillaStatsOptions {
  taquillas: Array<{
    id: string
    fullName: string
    shareOnSales?: number
  }>
}

export function useTaquillaStats(options: UseTaquillaStatsOptions) {
  const [stats, setStats] = useState<TaquillaStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create stable key for dependencies
  const taquillasKey = useMemo(() =>
    (options.taquillas || []).map(t => t.id).sort().join(','),
    [options.taquillas]
  )

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadStats = useCallback(async () => {
    const { taquillas } = optionsRef.current

    if (!taquillas || taquillas.length === 0) {
      setStats([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const todayEnd = endOfDay(now).toISOString()

      const taquillaIds = taquillas.map(t => t.id)

      // ============================================
      // 1. FETCH SALES from bets table
      // Sum bets.amount where user_id is in taquillas
      // ============================================
      const { data: salesData, error: salesError } = await supabase
        .from('bets')
        .select('user_id, amount')
        .in('user_id', taquillaIds)
        .gte('created_at', weekStart)
        .lte('created_at', todayEnd)

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        setError(salesError.message)
        return
      }

      // Sum sales by taquilla
      const salesByTaquilla = new Map<string, number>()
      ;(salesData || []).forEach(bet => {
        const odile = bet.user_id as string
        if (odile) {
          const current = salesByTaquilla.get(odile) || 0
          salesByTaquilla.set(odile, current + (Number(bet.amount) || 0))
        }
      })

      // ============================================
      // 2. FETCH PRIZES from bets_item_lottery_clasic
      // Sum potential_bet_amount where user_id is in taquillas
      // and status is 'winner' or 'paid'
      // ============================================
      const { data: prizesData, error: prizesError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('user_id, potential_bet_amount, status')
        .in('user_id', taquillaIds)
        .in('status', ['winner', 'paid'])
        .gte('created_at', weekStart)
        .lte('created_at', todayEnd)

      if (prizesError) {
        console.error('Error fetching prizes:', prizesError)
        setError(prizesError.message)
        return
      }

      // Sum prizes by taquilla
      const prizesByTaquilla = new Map<string, number>()
      ;(prizesData || []).forEach(item => {
        const odile = item.user_id as string
        if (odile) {
          const current = prizesByTaquilla.get(odile) || 0
          prizesByTaquilla.set(odile, current + (Number(item.potential_bet_amount) || 0))
        }
      })

      // ============================================
      // 3. Calculate stats per taquilla
      // ============================================
      const computedStats: TaquillaStats[] = taquillas.map(taquilla => {
        const weekSales = salesByTaquilla.get(taquilla.id) || 0
        const weekPrizes = prizesByTaquilla.get(taquilla.id) || 0

        // Calculate commission (percentage of sales)
        const shareOnSales = taquilla.shareOnSales || 0
        const salesCommission = weekSales * (shareOnSales / 100)

        // Calculate balance: sales - prizes - commission
        const balance = weekSales - weekPrizes - salesCommission

        return {
          taquillaId: taquilla.id,
          taquillaName: taquilla.fullName,
          weekSales,
          weekPrizes,
          salesCommission,
          shareOnSales,
          balance
        }
      })

      // Sort by sales descending
      computedStats.sort((a, b) => b.weekSales - a.weekSales)

      setStats(computedStats)
    } catch (err) {
      console.error('Error in loadStats:', err)
      setError('Error al cargar estadísticas de taquillas')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - uses ref for latest options

  // Load stats when the key changes (meaning the actual data changed)
  useEffect(() => {
    if (taquillasKey) {
      loadStats()
    }
  }, [taquillasKey, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
