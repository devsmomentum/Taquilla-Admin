import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, endOfDay } from 'date-fns'

export interface ComercializadoraStats {
  comercializadoraId: string
  comercializadoraName: string
  weekSales: number
  weekPrizes: number
  salesCommission: number
  shareOnSales: number
  shareOnProfits: number
  balance: number // weekSales - weekPrizes - salesCommission
  profit: number // ganancia de la comercializadora basada en balance * shareOnProfits
}

export interface UseComercializadoraStatsOptions {
  comercializadoras: Array<{
    id: string
    name: string
    shareOnSales: number
    shareOnProfits: number
  }>
  agencies: Array<{
    id: string
    parentId: string
  }>
  taquillas: Array<{
    id: string
    parentId?: string
  }>
}

export function useComercializadoraStats(options: UseComercializadoraStatsOptions) {
  const [stats, setStats] = useState<ComercializadoraStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create stable keys for dependencies
  const comercializadorasKey = useMemo(() =>
    (options.comercializadoras || []).map(c => c.id).sort().join(','),
    [options.comercializadoras]
  )

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
    const { comercializadoras, agencies, taquillas } = optionsRef.current

    if (!comercializadoras || comercializadoras.length === 0) {
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

      // Build a map: comercializadoraId -> taquillaIds[]
      const comercializadoraTaquillasMap = new Map<string, string[]>()

      comercializadoras.forEach(com => {
        // Get agencies for this comercializadora (agencies where parentId = comercializadora.id)
        const comAgencyIds = agencies
          .filter(a => a.parentId === com.id)
          .map(a => a.id)

        // Get taquillas for these agencies (taquillas where parentId is in agencyIds)
        const comTaquillaIds = taquillas
          .filter(t => comAgencyIds.includes(t.parentId || ''))
          .map(t => t.id)

        comercializadoraTaquillasMap.set(com.id, comTaquillaIds)
      })

      // Get all taquilla IDs we need to query
      const allTaquillaIds = Array.from(comercializadoraTaquillasMap.values()).flat()

      if (allTaquillaIds.length === 0) {
        // No taquillas, set stats with zeros
        const emptyStats = comercializadoras.map(com => ({
          comercializadoraId: com.id,
          comercializadoraName: com.name,
          weekSales: 0,
          weekPrizes: 0,
          salesCommission: 0,
          shareOnSales: com.shareOnSales || 0,
          shareOnProfits: com.shareOnProfits || 0,
          balance: 0,
          profit: 0
        }))
        setStats(emptyStats)
        return
      }

      // ============================================
      // 1. FETCH SALES from bets table
      // Sum bets.amount where user_id is in taquillas and status is active
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
      // and status is 'winner' or 'pay'
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
      // 3. Calculate stats per comercializadora
      // ============================================
      const computedStats: ComercializadoraStats[] = comercializadoras.map(com => {
        const taquillaIds = comercializadoraTaquillasMap.get(com.id) || []

        // Sum sales for this comercializadora
        const weekSales = taquillaIds.reduce((sum, tId) => {
          return sum + (salesByTaquilla.get(tId) || 0)
        }, 0)

        // Sum prizes for this comercializadora
        const weekPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (prizesByTaquilla.get(tId) || 0)
        }, 0)

        // Calculate commission (percentage of sales)
        const shareOnSales = com.shareOnSales || 0
        const salesCommission = weekSales * (shareOnSales / 100)

        // Calculate balance: sales - prizes - commission
        const balance = weekSales - weekPrizes - salesCommission

        // Calculate profit for comercializadora (percentage of positive balance)
        const shareOnProfits = com.shareOnProfits || 0
        const profit = balance > 0 ? balance * (shareOnProfits / 100) : 0

        return {
          comercializadoraId: com.id,
          comercializadoraName: com.name,
          weekSales,
          weekPrizes,
          salesCommission,
          shareOnSales,
          shareOnProfits,
          balance,
          profit
        }
      })

      // Sort by sales descending
      computedStats.sort((a, b) => b.weekSales - a.weekSales)

      setStats(computedStats)
    } catch (err) {
      console.error('Error in loadStats:', err)
      setError('Error al cargar estadísticas de comercializadoras')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - uses ref for latest options

  // Load stats when the keys change (meaning the actual data changed)
  useEffect(() => {
    if (comercializadorasKey) {
      loadStats()
    }
  }, [comercializadorasKey, agenciesKey, taquillasKey, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
