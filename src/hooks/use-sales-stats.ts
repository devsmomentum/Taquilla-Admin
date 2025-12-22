import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns'

export interface SalesStats {
  // Ventas del día (excluyendo jugadas canceladas)
  todaySales: number
  todayBetsCount: number
  // Comisiones totales de taquillas del día
  todayTaquillaCommissions: number
  // Ventas de la semana (excluyendo jugadas canceladas)
  weekSales: number
  weekBetsCount: number
  // Comisiones totales de taquillas de la semana
  weekTaquillaCommissions: number
  // Ventas del mes (excluyendo jugadas canceladas)
  monthSales: number
  monthBetsCount: number
  // Comisiones totales de taquillas del mes
  monthTaquillaCommissions: number
  // Por taquilla (hoy)
  salesByTaquilla: Array<{
    taquillaId: string
    taquillaName: string
    sales: number
    betsCount: number
    shareOnSales: number
    commission: number
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
    todayTaquillaCommissions: 0,
    weekSales: 0,
    weekBetsCount: 0,
    weekTaquillaCommissions: 0,
    monthSales: 0,
    monthBetsCount: 0,
    monthTaquillaCommissions: 0,
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
          todayTaquillaCommissions: 0,
          weekSales: 0,
          weekBetsCount: 0,
          weekTaquillaCommissions: 0,
          monthSales: 0,
          monthBetsCount: 0,
          monthTaquillaCommissions: 0,
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

      // Ventas del día (excluyendo jugadas canceladas)
      let todayQuery = supabase
        .from('bets')
        .select('id, amount, user_id')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .neq('status', 'cancelled')

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

      // Obtener nombres y shareOnSales de taquillas
      const taquillaIds = Array.from(taquillaMap.keys())
      let taquillaInfoMap = new Map<string, { name: string; shareOnSales: number }>()

      if (taquillaIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, share_on_sales')
          .in('id', taquillaIds)

        if (users) {
          taquillaInfoMap = new Map(users.map(u => [u.id, {
            name: u.name,
            shareOnSales: Number(u.share_on_sales) || 0
          }]))
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
            commission
          }
        })
        .sort((a, b) => b.sales - a.sales)

      // Calcular comisiones totales de taquillas del día
      const todayTaquillaCommissions = salesByTaquilla.reduce((sum, t) => sum + t.commission, 0)

      // Ventas de la semana (excluyendo jugadas canceladas)
      let weekQuery = supabase
        .from('bets')
        .select('id, amount, user_id')
        .gte('created_at', weekStart)
        .lte('created_at', todayEnd)
        .neq('status', 'cancelled')

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        weekQuery = weekQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: weekData, error: weekError } = await weekQuery

      if (weekError) {
        console.error('Error fetching week sales:', weekError)
      }

      const weekSales = (weekData || []).reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0)
      const weekBetsCount = (weekData || []).length

      // Calcular comisiones de la semana agrupando por taquilla
      const weekTaquillaMap = new Map<string, number>()
      ;(weekData || []).forEach(bet => {
        if (bet.user_id) {
          const current = weekTaquillaMap.get(bet.user_id) || 0
          weekTaquillaMap.set(bet.user_id, current + (Number(bet.amount) || 0))
        }
      })

      // Obtener info de taquillas de la semana si hay nuevas que no estaban en hoy
      const weekTaquillaIds = Array.from(weekTaquillaMap.keys())
      const missingTaquillaIds = weekTaquillaIds.filter(id => !taquillaInfoMap.has(id))
      if (missingTaquillaIds.length > 0) {
        const { data: moreUsers } = await supabase
          .from('users')
          .select('id, name, share_on_sales')
          .in('id', missingTaquillaIds)
        if (moreUsers) {
          moreUsers.forEach(u => {
            taquillaInfoMap.set(u.id, { name: u.name, shareOnSales: Number(u.share_on_sales) || 0 })
          })
        }
      }

      const weekTaquillaCommissions = Array.from(weekTaquillaMap.entries()).reduce((sum, [taquillaId, sales]) => {
        const info = taquillaInfoMap.get(taquillaId)
        const shareOnSales = info?.shareOnSales || 0
        return sum + (sales * (shareOnSales / 100))
      }, 0)

      // Ventas del mes (excluyendo jugadas canceladas)
      let monthQuery = supabase
        .from('bets')
        .select('id, amount, user_id')
        .gte('created_at', monthStart)
        .lte('created_at', todayEnd)
        .neq('status', 'cancelled')

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        monthQuery = monthQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: monthData, error: monthError } = await monthQuery

      if (monthError) {
        console.error('Error fetching month sales:', monthError)
      }

      const monthSales = (monthData || []).reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0)
      const monthBetsCount = (monthData || []).length

      // Calcular comisiones del mes agrupando por taquilla
      const monthTaquillaMap = new Map<string, number>()
      ;(monthData || []).forEach(bet => {
        if (bet.user_id) {
          const current = monthTaquillaMap.get(bet.user_id) || 0
          monthTaquillaMap.set(bet.user_id, current + (Number(bet.amount) || 0))
        }
      })

      // Obtener info de taquillas del mes si hay nuevas que no estaban antes
      const monthTaquillaIds = Array.from(monthTaquillaMap.keys())
      const missingMonthTaquillaIds = monthTaquillaIds.filter(id => !taquillaInfoMap.has(id))
      if (missingMonthTaquillaIds.length > 0) {
        const { data: monthUsers } = await supabase
          .from('users')
          .select('id, name, share_on_sales')
          .in('id', missingMonthTaquillaIds)
        if (monthUsers) {
          monthUsers.forEach(u => {
            taquillaInfoMap.set(u.id, { name: u.name, shareOnSales: Number(u.share_on_sales) || 0 })
          })
        }
      }

      const monthTaquillaCommissions = Array.from(monthTaquillaMap.entries()).reduce((sum, [taquillaId, sales]) => {
        const info = taquillaInfoMap.get(taquillaId)
        const shareOnSales = info?.shareOnSales || 0
        return sum + (sales * (shareOnSales / 100))
      }, 0)

      setStats({
        todaySales,
        todayBetsCount,
        todayTaquillaCommissions,
        weekSales,
        weekBetsCount,
        weekTaquillaCommissions,
        monthSales,
        monthBetsCount,
        monthTaquillaCommissions,
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
