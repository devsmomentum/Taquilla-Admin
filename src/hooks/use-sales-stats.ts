import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns'

export interface SalesStats {
  // Ventas del día
  todaySales: number
  todayBetsCount: number
  // Ventas de la semana
  weekSales: number
  weekBetsCount: number
  // Ventas del mes
  monthSales: number
  monthBetsCount: number
  // Por taquilla (hoy)
  salesByTaquilla: Array<{
    taquillaId: string
    taquillaName: string
    sales: number
    betsCount: number
  }>
}

export interface UseSalesStatsOptions {
  // IDs de taquillas visibles (si es undefined o vacío, no filtra)
  visibleTaquillaIds?: string[]
}

export function useSalesStats(options?: UseSalesStatsOptions) {
  const [stats, setStats] = useState<SalesStats>({
    todaySales: 0,
    todayBetsCount: 0,
    weekSales: 0,
    weekBetsCount: 0,
    monthSales: 0,
    monthBetsCount: 0,
    salesByTaquilla: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const visibleTaquillaIds = options?.visibleTaquillaIds

      // Si visibleTaquillaIds es un array vacío (usuario sin taquillas), devolver estadísticas vacías
      // undefined significa sin filtro (admin con permiso *)
      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setStats({
          todaySales: 0,
          todayBetsCount: 0,
          weekSales: 0,
          weekBetsCount: 0,
          monthSales: 0,
          monthBetsCount: 0,
          salesByTaquilla: []
        })
        setLoading(false)
        return
      }

      const now = new Date()
      const todayStart = startOfDay(now).toISOString()
      const todayEnd = endOfDay(now).toISOString()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const monthStart = startOfMonth(now).toISOString()

      // Ventas del día
      let todayQuery = supabase
        .from('bets')
        .select('id, amount, user_id')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      // Filtrar por taquillas visibles si se especificaron
      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        todayQuery = todayQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: todayData, error: todayError } = await todayQuery

      if (todayError) {
        console.error('Error fetching today sales:', todayError)
      }

      const todaySales = (todayData || []).reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0)
      const todayBetsCount = (todayData || []).length

      // Agrupar ventas por taquilla (hoy)
      const taquillaMap = new Map<string, { sales: number; betsCount: number }>()
      ;(todayData || []).forEach(bet => {
        if (bet.user_id) {
          const current = taquillaMap.get(bet.user_id) || { sales: 0, betsCount: 0 }
          taquillaMap.set(bet.user_id, {
            sales: current.sales + (Number(bet.amount) || 0),
            betsCount: current.betsCount + 1
          })
        }
      })

      // Obtener nombres de taquillas
      const taquillaIds = Array.from(taquillaMap.keys())
      let taquillaNamesMap = new Map<string, string>()

      if (taquillaIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', taquillaIds)

        if (users) {
          taquillaNamesMap = new Map(users.map(u => [u.id, u.name]))
        }
      }

      const salesByTaquilla = Array.from(taquillaMap.entries())
        .map(([taquillaId, data]) => ({
          taquillaId,
          taquillaName: taquillaNamesMap.get(taquillaId) || 'Desconocida',
          sales: data.sales,
          betsCount: data.betsCount
        }))
        .sort((a, b) => b.sales - a.sales)

      // Ventas de la semana
      let weekQuery = supabase
        .from('bets')
        .select('id, amount, user_id')
        .gte('created_at', weekStart)
        .lte('created_at', todayEnd)

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        weekQuery = weekQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: weekData, error: weekError } = await weekQuery

      if (weekError) {
        console.error('Error fetching week sales:', weekError)
      }

      const weekSales = (weekData || []).reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0)
      const weekBetsCount = (weekData || []).length

      // Ventas del mes
      let monthQuery = supabase
        .from('bets')
        .select('id, amount, user_id')
        .gte('created_at', monthStart)
        .lte('created_at', todayEnd)

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        monthQuery = monthQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: monthData, error: monthError } = await monthQuery

      if (monthError) {
        console.error('Error fetching month sales:', monthError)
      }

      const monthSales = (monthData || []).reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0)
      const monthBetsCount = (monthData || []).length

      setStats({
        todaySales,
        todayBetsCount,
        weekSales,
        weekBetsCount,
        monthSales,
        monthBetsCount,
        salesByTaquilla
      })
    } catch (err) {
      console.error('Error in loadStats:', err)
      setError('Error al cargar estadísticas de ventas')
    } finally {
      setLoading(false)
    }
  }, [options?.visibleTaquillaIds])

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
