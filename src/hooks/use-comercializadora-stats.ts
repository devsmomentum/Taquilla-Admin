import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, startOfDay, endOfDay, startOfMonth } from 'date-fns'

export interface ComercializadoraStats {
  comercializadoraId: string
  comercializadoraName: string
  // Datos del día
  todaySales: number
  todayPrizes: number
  todaySalesCommission: number
  todayBalance: number
  todayProfit: number
  // Datos de la semana
  weekSales: number
  weekPrizes: number
  weekSalesCommission: number
  weekBalance: number
  weekProfit: number
  // Datos del mes
  monthSales: number
  monthPrizes: number
  monthSalesCommission: number
  monthBalance: number
  monthProfit: number
  // Datos del rango personalizado
  rangeSales: number
  rangePrizes: number
  rangeSalesCommission: number
  rangeBalance: number
  rangeProfit: number
  // Legacy (para compatibilidad con dashboard)
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
  subdistribuidores?: Array<{
    id: string
    parentId: string
  }>
  taquillas: Array<{
    id: string
    parentId?: string
  }>
  // Rango de fechas personalizado (opcional)
  dateFrom?: Date
  dateTo?: Date
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

  // Key para detectar cambios en el rango de fechas
  const dateRangeKey = useMemo(() => {
    const from = options.dateFrom ? startOfDay(options.dateFrom).toISOString() : 'default'
    const to = options.dateTo ? endOfDay(options.dateTo).toISOString() : 'default'
    return `${from}-${to}`
  }, [options.dateFrom, options.dateTo])

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadStats = useCallback(async () => {
    const { comercializadoras, agencies, subdistribuidores, taquillas, dateFrom, dateTo } = optionsRef.current

    if (!comercializadoras || comercializadoras.length === 0) {
      setStats([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      // Usar fechas personalizadas si se proporcionan
      const queryStart = dateFrom ? startOfDay(dateFrom).toISOString() : startOfMonth(now).toISOString()
      const queryEnd = dateTo ? endOfDay(dateTo).toISOString() : endOfDay(now).toISOString()

      // Para compatibilidad, mantener referencias fijas
      const todayStart = startOfDay(now).toISOString()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const monthStart = startOfMonth(now).toISOString()
      const todayEnd = endOfDay(now).toISOString()

      // Build a map: comercializadoraId -> taquillaIds[]
      const comercializadoraTaquillasMap = new Map<string, string[]>()

      comercializadoras.forEach(com => {
        // Get direct agencies for this comercializadora
        const directAgencyIds = agencies
          .filter(a => a.parentId === com.id)
          .map(a => a.id)

        // Get subdistribuidores for this comercializadora
        const comSubdistribuidorIds = subdistribuidores
          ?.filter(s => s.parentId === com.id)
          .map(s => s.id) || []

        // Get agencies under subdistribuidores
        const subdistAgencyIds = subdistribuidores && comSubdistribuidorIds.length > 0
          ? agencies
              .filter(a => comSubdistribuidorIds.includes(a.parentId))
              .map(a => a.id)
          : []

        // Combine all agency IDs
        const allComAgencyIds = [...directAgencyIds, ...subdistAgencyIds]

        // Get taquillas for all these agencies
        const comTaquillaIds = taquillas
          .filter(t => allComAgencyIds.includes(t.parentId || ''))
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
          todaySales: 0,
          todayPrizes: 0,
          todaySalesCommission: 0,
          todayBalance: 0,
          todayProfit: 0,
          weekSales: 0,
          weekPrizes: 0,
          weekSalesCommission: 0,
          weekBalance: 0,
          weekProfit: 0,
          monthSales: 0,
          monthPrizes: 0,
          monthSalesCommission: 0,
          monthBalance: 0,
          monthProfit: 0,
          rangeSales: 0,
          rangePrizes: 0,
          rangeSalesCommission: 0,
          rangeBalance: 0,
          rangeProfit: 0,
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
      // Sum bets.amount where user_id is in taquillas and status is active (excluir anulados)
      // ============================================
      const { data: salesData, error: salesError } = await supabase
        .from('bets')
        .select('user_id, amount, created_at')
        .in('user_id', allTaquillaIds)
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)
        .neq('status', 'cancelled')

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        setError(salesError.message)
        return
      }

      // Sum sales by taquilla (rango personalizado, mes, semana y día)
      const rangeSalesByTaquilla = new Map<string, number>()
      const monthSalesByTaquilla = new Map<string, number>()
      const weekSalesByTaquilla = new Map<string, number>()
      const todaySalesByTaquilla = new Map<string, number>()
      ;(salesData || []).forEach(bet => {
        const odile = bet.user_id as string
        if (odile) {
          const amount = Number(bet.amount) || 0
          // Ventas del rango personalizado (todos los datos del query)
          const currentRange = rangeSalesByTaquilla.get(odile) || 0
          rangeSalesByTaquilla.set(odile, currentRange + amount)
          // Ventas del mes (si está dentro del mes actual)
          if (bet.created_at >= monthStart) {
            const currentMonth = monthSalesByTaquilla.get(odile) || 0
            monthSalesByTaquilla.set(odile, currentMonth + amount)
          }
          // Ventas de la semana
          if (bet.created_at >= weekStart) {
            const currentWeek = weekSalesByTaquilla.get(odile) || 0
            weekSalesByTaquilla.set(odile, currentWeek + amount)
          }
          // Ventas del día
          if (bet.created_at >= todayStart) {
            const currentToday = todaySalesByTaquilla.get(odile) || 0
            todaySalesByTaquilla.set(odile, currentToday + amount)
          }
        }
      })

      // ============================================
      // 2. FETCH PRIZES from bets_item_lottery_clasic
      // Sum potential_bet_amount where user_id is in taquillas
      // and status is 'winner' or 'paid'
      // ============================================
      const { data: prizesData, error: prizesError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('user_id, potential_bet_amount, status, created_at')
        .in('user_id', allTaquillaIds)
        .in('status', ['winner', 'paid'])
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)

      if (prizesError) {
        console.error('Error fetching prizes:', prizesError)
        setError(prizesError.message)
        return
      }

      // Sum prizes by taquilla (rango personalizado, mes, semana y día)
      const rangePrizesByTaquilla = new Map<string, number>()
      const monthPrizesByTaquilla = new Map<string, number>()
      const weekPrizesByTaquilla = new Map<string, number>()
      const todayPrizesByTaquilla = new Map<string, number>()
      ;(prizesData || []).forEach(item => {
        const odile = item.user_id as string
        if (odile) {
          const amount = Number(item.potential_bet_amount) || 0
          // Premios del rango personalizado (todos los datos del query)
          const currentRange = rangePrizesByTaquilla.get(odile) || 0
          rangePrizesByTaquilla.set(odile, currentRange + amount)
          // Premios del mes (si está dentro del mes actual)
          if (item.created_at >= monthStart) {
            const currentMonth = monthPrizesByTaquilla.get(odile) || 0
            monthPrizesByTaquilla.set(odile, currentMonth + amount)
          }
          // Premios de la semana
          if (item.created_at >= weekStart) {
            const currentWeek = weekPrizesByTaquilla.get(odile) || 0
            weekPrizesByTaquilla.set(odile, currentWeek + amount)
          }
          // Premios del día
          if (item.created_at >= todayStart) {
            const currentToday = todayPrizesByTaquilla.get(odile) || 0
            todayPrizesByTaquilla.set(odile, currentToday + amount)
          }
        }
      })

      // ============================================
      // 3. Calculate stats per comercializadora
      // ============================================
      const computedStats: ComercializadoraStats[] = comercializadoras.map(com => {
        const taquillaIds = comercializadoraTaquillasMap.get(com.id) || []
        const shareOnSales = com.shareOnSales || 0
        const shareOnProfits = com.shareOnProfits || 0

        // ---- Datos del DÍA ----
        const todaySales = taquillaIds.reduce((sum, tId) => {
          return sum + (todaySalesByTaquilla.get(tId) || 0)
        }, 0)

        const todayPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (todayPrizesByTaquilla.get(tId) || 0)
        }, 0)

        const todaySalesCommission = todaySales * (shareOnSales / 100)
        const todayBalance = todaySales - todayPrizes - todaySalesCommission
        const todayProfit = todayBalance > 0 ? todayBalance * (shareOnProfits / 100) : 0

        // ---- Datos de la SEMANA ----
        const weekSales = taquillaIds.reduce((sum, tId) => {
          return sum + (weekSalesByTaquilla.get(tId) || 0)
        }, 0)

        const weekPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (weekPrizesByTaquilla.get(tId) || 0)
        }, 0)

        const weekSalesCommission = weekSales * (shareOnSales / 100)
        const weekBalance = weekSales - weekPrizes - weekSalesCommission
        const weekProfit = weekBalance > 0 ? weekBalance * (shareOnProfits / 100) : 0

        // ---- Datos del MES ----
        const monthSales = taquillaIds.reduce((sum, tId) => {
          return sum + (monthSalesByTaquilla.get(tId) || 0)
        }, 0)

        const monthPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (monthPrizesByTaquilla.get(tId) || 0)
        }, 0)

        const monthSalesCommission = monthSales * (shareOnSales / 100)
        const monthBalance = monthSales - monthPrizes - monthSalesCommission
        const monthProfit = monthBalance > 0 ? monthBalance * (shareOnProfits / 100) : 0

        // ---- Datos del RANGO PERSONALIZADO ----
        const rangeSales = taquillaIds.reduce((sum, tId) => {
          return sum + (rangeSalesByTaquilla.get(tId) || 0)
        }, 0)

        const rangePrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (rangePrizesByTaquilla.get(tId) || 0)
        }, 0)

        const rangeSalesCommission = rangeSales * (shareOnSales / 100)
        const rangeBalance = rangeSales - rangePrizes - rangeSalesCommission
        const rangeProfit = rangeBalance > 0 ? rangeBalance * (shareOnProfits / 100) : 0

        // Legacy fields (para compatibilidad con dashboard)
        const salesCommission = weekSalesCommission
        const balance = weekBalance
        const profit = weekProfit

        return {
          comercializadoraId: com.id,
          comercializadoraName: com.name,
          todaySales,
          todayPrizes,
          todaySalesCommission,
          todayBalance,
          todayProfit,
          weekSales,
          weekPrizes,
          weekSalesCommission,
          weekBalance,
          weekProfit,
          monthSales,
          monthPrizes,
          monthSalesCommission,
          monthBalance,
          monthProfit,
          rangeSales,
          rangePrizes,
          rangeSalesCommission,
          rangeBalance,
          rangeProfit,
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
  }, [comercializadorasKey, agenciesKey, taquillasKey, dateRangeKey, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
