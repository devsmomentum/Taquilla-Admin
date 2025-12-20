import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, endOfDay } from 'date-fns'

export interface AgencyStats {
  agencyId: string
  agencyName: string
  weekSales: number
  weekPrizes: number
  salesCommission: number
  shareOnSales: number
  balance: number // weekSales - weekPrizes - salesCommission
}

export interface UseAgencyStatsOptions {
  agencies: Array<{
    id: string
    name: string
    shareOnSales: number
  }>
  taquillas: Array<{
    id: string
    parentId?: string
  }>
}

export function useAgencyStats(options: UseAgencyStatsOptions) {
  const [stats, setStats] = useState<AgencyStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create stable keys for dependencies
  const agenciesKey = useMemo(() =>
    (options.agencies || []).map(a => a.id).sort().join(','),
    [options.agencies]
  )

  const taquillasKey = useMemo(() =>
    (options.taquillas || []).map(t => t.id).sort().join(','),
    [options.taquillas]
  )

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadStats = useCallback(async () => {
    const { agencies, taquillas } = optionsRef.current

    if (!agencies || agencies.length === 0) {
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

      // Build a map: agencyId -> taquillaIds[]
      const agencyTaquillasMap = new Map<string, string[]>()

      agencies.forEach(agency => {
        // Get taquillas for this agency (taquillas where parentId = agency.id)
        const agencyTaquillaIds = taquillas
          .filter(t => t.parentId === agency.id)
          .map(t => t.id)

        agencyTaquillasMap.set(agency.id, agencyTaquillaIds)
      })

      // Get all taquilla IDs we need to query
      const allTaquillaIds = Array.from(agencyTaquillasMap.values()).flat()

      if (allTaquillaIds.length === 0) {
        // No taquillas, set stats with zeros
        const emptyStats = agencies.map(agency => ({
          agencyId: agency.id,
          agencyName: agency.name,
          weekSales: 0,
          weekPrizes: 0,
          salesCommission: 0,
          shareOnSales: agency.shareOnSales || 0,
          balance: 0
        }))
        setStats(emptyStats)
        return
      }

      // ============================================
      // 1. FETCH SALES from bets table
      // Sum bets.amount where user_id is in taquillas
      // ============================================
      const { data: salesData, error: salesError } = await supabase
        .from('bets')
        .select('user_id, amount')
        .in('user_id', allTaquillaIds)
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
        .in('user_id', allTaquillaIds)
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
      // 3. Calculate stats per agency
      // ============================================
      const computedStats: AgencyStats[] = agencies.map(agency => {
        const taquillaIds = agencyTaquillasMap.get(agency.id) || []

        // Sum sales for this agency
        const weekSales = taquillaIds.reduce((sum, tId) => {
          return sum + (salesByTaquilla.get(tId) || 0)
        }, 0)

        // Sum prizes for this agency
        const weekPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (prizesByTaquilla.get(tId) || 0)
        }, 0)

        // Calculate commission (percentage of sales)
        const shareOnSales = agency.shareOnSales || 0
        const salesCommission = weekSales * (shareOnSales / 100)

        // Calculate balance: sales - prizes - commission
        const balance = weekSales - weekPrizes - salesCommission

        return {
          agencyId: agency.id,
          agencyName: agency.name,
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
      setError('Error al cargar estadísticas de agencias')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - uses ref for latest options

  // Load stats when the keys change (meaning the actual data changed)
  useEffect(() => {
    if (agenciesKey) {
      loadStats()
    }
  }, [agenciesKey, taquillasKey, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
