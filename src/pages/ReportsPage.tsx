import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/contexts/AppContext'
import { useLotteryTypePreference } from '@/contexts/LotteryTypeContext'
import { useBetsStats } from '@/hooks/use-bets-stats'
import { useSalesStatsLola } from '@/hooks/use-sales-stats-lola'
import { useSalesStatsPolloLleno } from '@/hooks/use-sales-stats-pollo-lleno'
import { useComercializadoraStats } from '@/hooks/use-comercializadora-stats'
import { useAgencyStats } from '@/hooks/use-agency-stats'
import { useTaquillaStats } from '@/hooks/use-taquilla-stats'
import { formatCurrency } from '@/lib/pot-utils'
import { supabase } from '@/lib/supabase'
// Note: useSalesStats was removed as calculations are now done per comercializadora/agencia/taquilla
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO, subDays } from 'date-fns'
import {
  ChartBar,
  Trophy,
  CurrencyDollar,
  TrendUp,
  Storefront,
  CalendarBlank,
  Funnel,
  Target,
  ArrowsClockwise,
  CaretUp,
  CaretDown,
  Coins,
  Receipt,
  Hash,
  Money,
  MagnifyingGlass,
  Ticket
} from '@phosphor-icons/react'

export function ReportsPage() {
  const {
    dailyResults,
    dailyResultsLola,
    dailyResultsPolloLleno,
    dailyResultsLoading,
    loadDailyResults,
    loadDailyResultsLola,
    loadDailyResultsPolloLleno,
    lotteries,
    winners,
    users,
    visibleTaquillas,
    visibleTaquillaIds,
    currentUser,
    comercializadoras,
    subdistribuidores,
    agencies,
    visibleAgencies
  } = useApp()
  const { lotteryType } = useLotteryTypePreference()
  const { topMostPlayed, topHighestAmount, loading: betsStatsLoading, loadBetsStats } = useBetsStats({ visibleTaquillaIds })

  const isLolaLotteryId = (lotteryId: string) => lotteryId.startsWith('lola-')
  const polloLlenoLottery = useMemo(() => ({
    id: 'pollo-lleno',
    name: 'Pollo Lleno',
    openingTime: '00:00',
    closingTime: '20:00',
    drawTime: '20:00',
    isActive: true,
    playsTomorrow: false,
    prizes: [],
    createdAt: ''
  }), [])

  const activeLotteriesForType = useMemo(() => {
    const active = lotteries.filter(l => l.isActive)
    if (lotteryType === 'lola') {
      return active.filter(l => isLolaLotteryId(l.id))
    }
    if (lotteryType === 'pollo_lleno') {
      return [polloLlenoLottery]
    }
    return active.filter(l => !isLolaLotteryId(l.id))
  }, [lotteries, lotteryType, polloLlenoLottery])

  // Determinar tipo de usuario
  const isAdmin = currentUser?.userType === 'admin' || !currentUser?.userType
  const isComercializadora = currentUser?.userType === 'comercializadora'
  const isSubdistribuidor = currentUser?.userType === 'subdistribuidor'
  const isAgencia = currentUser?.userType === 'agencia'

  // Estado de fechas aplicadas (solo se actualiza con el botón o filtros rápidos)
  const [appliedDateRange, setAppliedDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date()
    return {
      from: startOfMonth(now),
      to: startOfDay(now)
    }
  })

  // Stats de comercializadoras (para admin)
  const { stats: comercializadoraStats, refresh: refreshComercializadoraStats } = useComercializadoraStats({
    comercializadoras: comercializadoras || [],
    agencies: visibleAgencies || agencies || [],
    subdistribuidores: subdistribuidores || [],
    taquillas: visibleTaquillas || [],
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to,
    enabled: lotteryType !== 'lola'
  })

  // Stats de agencias (para comercializadora)
  const { stats: agencyStats, refresh: refreshAgencyStats } = useAgencyStats({
    agencies: visibleAgencies || [],
    taquillas: visibleTaquillas || [],
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to,
    enabled: lotteryType !== 'lola'
  })

  // Stats de taquillas (para agencia)
  const { stats: taquillaStats, refresh: refreshTaquillaStats } = useTaquillaStats({
    taquillas: visibleTaquillas || [],
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to,
    enabled: lotteryType !== 'lola'
  })

  const { stats: lolaSalesStats, refresh: refreshLolaSales } = useSalesStatsLola({
    visibleTaquillaIds,
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to,
    enabled: lotteryType === 'lola'
  })

  const { stats: polloSalesStats, refresh: refreshPolloSales } = useSalesStatsPolloLleno({
    visibleTaquillaIds,
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to,
    enabled: lotteryType === 'pollo_lleno'
  })

  const [periodFilter, setPeriodFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month')
  const [selectedLottery, setSelectedLottery] = useState<string>('all')
  const [polloTickets, setPolloTickets] = useState<Array<{
    id: string
    bets_id?: string | null
    user_id?: string | null
    key_gamble: string | null
    numbers: number[] | null
    status: string | null
    prize: string | number | null
    description_prize: string | null
    amount: string | number | null
    created_at: string
  }>>([])
  const [polloTicketsLoading, setPolloTicketsLoading] = useState(false)

  // Si cambia el tipo (header), resetear la lotería seleccionada si no aplica
  useEffect(() => {
    if (selectedLottery === 'all') return
    const existsInType = activeLotteriesForType.some(l => l.id === selectedLottery)
    if (!existsInType) setSelectedLottery('all')
  }, [selectedLottery, activeLotteriesForType])

  // Calcular fechas de filtros
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = startOfDay(subDays(now, 1))
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  const getDateKey = (value: unknown): string => {
    const s = String(value ?? '')
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }

  const formatSequence = (value: unknown): string => {
    const digits = String(value ?? '').replace(/\D+/g, '')
    if (!digits) return ''
    if (digits.length <= 2) return digits
    if (digits.length % 2 === 0) {
      return (digits.match(/.{1,2}/g) || []).join('-')
    }
    return digits
  }

  const formatTicketNumbers = (numbers: number[] | null, keyGamble: string | null) => {
    if (Array.isArray(numbers) && numbers.length > 0) {
      return numbers
        .slice()
        .sort((a, b) => a - b)
        .map((n) => String(n).padStart(2, '0'))
        .join('-')
    }
    return formatSequence(keyGamble)
  }

  // Estado de fechas - inicializado con "Este Mes"
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: monthStart,
    to: todayStart
  })

  // Filtrar resultados por período usando dateRange
  const filteredResults = useMemo(() => {
    const list = lotteryType === 'lola'
      ? dailyResultsLola
      : lotteryType === 'pollo_lleno'
      ? dailyResultsPolloLleno
      : dailyResults
    return list.filter(result => {
      const resultDateValue = (result as any).resultDate
      const resultDate = lotteryType === 'pollo_lleno'
        ? getDateKey(resultDateValue)
        : parseISO(resultDateValue)

      // Filtro por tipo de lotería (Mikaela vs Lola)
      const matchesType = lotteryType === 'lola'
        ? (result as any).lotteryId?.startsWith('lola-')
        : lotteryType === 'pollo_lleno'
        ? true
        : !(result as any).lotteryId?.startsWith('lola-')
      if (!matchesType) return false

      // Filtro por lotería
      if (lotteryType === 'pollo_lleno') {
        if (selectedLottery !== 'all' && selectedLottery !== 'pollo-lleno') return false
      } else if (selectedLottery !== 'all' && (result as any).lotteryId !== selectedLottery) {
        return false
      }

      // Filtro por rango de fechas
      const fromDate = startOfDay(dateRange.from)
      const toDate = endOfDay(dateRange.to)
      if (lotteryType === 'pollo_lleno') {
        if (!resultDate) return false
        const fromKey = format(fromDate, 'yyyy-MM-dd')
        const toKey = format(toDate, 'yyyy-MM-dd')
        return resultDate >= fromKey && resultDate <= toKey
      }
      return resultDate >= fromDate && resultDate <= toDate
    })
  }, [dailyResults, dailyResultsLola, dailyResultsPolloLleno, selectedLottery, dateRange, lotteryType])

  // Filtrar ganadores por período usando dateRange
  const filteredWinners = useMemo(() => {
    if (lotteryType === 'pollo_lleno') return []
    return winners.filter(winner => {
      const winnerDate = new Date(winner.createdAt)

      // Filtro por tipo de lotería (Mikaela vs Lola)
      const matchesType = lotteryType === 'lola'
        ? (winner.lotteryId || '').startsWith('lola-')
        : !(winner.lotteryId || '').startsWith('lola-') && winner.lotteryId !== 'pollo-lleno'
      if (!matchesType) return false

      // Filtro por lotería
      if (selectedLottery !== 'all' && winner.lotteryId !== selectedLottery) {
        return false
      }

      // Filtro por rango de fechas
      const fromDate = startOfDay(dateRange.from)
      const toDate = endOfDay(dateRange.to)
      return winnerDate >= fromDate && winnerDate <= toDate
    })
  }, [winners, selectedLottery, dateRange, lotteryType])

  const filteredPolloWinners = useMemo(() => {
    if (lotteryType !== 'pollo_lleno') return []
    return winners.filter((winner) => {
      const winnerDate = new Date(winner.createdAt)
      const fromDate = startOfDay(dateRange.from)
      const toDate = endOfDay(dateRange.to)
      if (winnerDate < fromDate || winnerDate > toDate) return false
      if ((winner.lotteryId || '') !== 'pollo-lleno') return false
      if (selectedLottery !== 'all' && winner.lotteryId !== selectedLottery) return false
      return true
    })
  }, [winners, selectedLottery, dateRange, lotteryType])

  const polloWinnersByDate = useMemo(() => {
    const nextMap: Record<string, number> = {}
    filteredPolloWinners.forEach((winner) => {
      const dateKey = getDateKey(winner.createdAt)
      if (!dateKey) return
      nextMap[dateKey] = (nextMap[dateKey] || 0) + 1
    })
    return nextMap
  }, [filteredPolloWinners])

  // Calcular totales desde los hooks de comercializadora/agencia/taquilla según el tipo de usuario
  // Obtener el porcentaje de participación en utilidades del usuario logueado
  const currentUserProfitPercent = useMemo(() => {
    if (!currentUser) return 0

    if (isComercializadora) {
      // Buscar la comercializadora actual
      const currentComercializadora = comercializadoras?.find(c => c.userId === currentUser.id)
      return currentComercializadora?.shareOnProfits || 0
    }

    if (isSubdistribuidor) {
      // Buscar el subdistribuidor actual - usar el id del usuario
      const currentSubdistribuidor = subdistribuidores?.find(s => s.id === currentUser.id)
      return currentSubdistribuidor?.shareOnProfits || 0
    }

    return 0
  }, [currentUser, isComercializadora, isSubdistribuidor, comercializadoras, subdistribuidores])

  const periodTotals = useMemo(() => {
    let totalSales = 0
    let totalPrizes = 0
    let totalCommissions = 0
    let totalBalance = 0

      if (lotteryType === 'lola') {
      totalSales = lolaSalesStats.rangeSales
      totalPrizes = filteredWinners.reduce((sum, w) => sum + w.potentialWin, 0)
      totalCommissions = lolaSalesStats.rangeTaquillaCommissions
      totalBalance = totalSales - totalPrizes - totalCommissions
      return { totalSales, totalPrizes, totalCommissions, totalBalance }
    }

      if (lotteryType === 'pollo_lleno') {
        totalSales = polloSalesStats.rangeSales
        totalPrizes = filteredPolloWinners.reduce((sum, w) => sum + w.potentialWin, 0)
        totalCommissions = polloSalesStats.rangeTaquillaCommissions
        totalBalance = totalSales - totalPrizes - totalCommissions
        return { totalSales, totalPrizes, totalCommissions, totalBalance }
      }

    // Seleccionar el hook correcto según el tipo de usuario
    if (isAdmin && comercializadoraStats && comercializadoraStats.length > 0) {
      // Admin: sumar de todas las comercializadoras
      comercializadoraStats.forEach(stat => {
        if (periodFilter === 'today') {
          totalSales += stat.todaySales
          totalPrizes += stat.todayPrizes
          totalCommissions += stat.todaySalesCommission
          totalBalance += stat.todayBalance
        } else if (periodFilter === 'week') {
          totalSales += stat.weekSales
          totalPrizes += stat.weekPrizes
          totalCommissions += stat.weekSalesCommission
          totalBalance += stat.weekBalance
        } else if (periodFilter === 'custom' || periodFilter === 'yesterday') {
          totalSales += stat.rangeSales
          totalPrizes += stat.rangePrizes
          totalCommissions += stat.rangeSalesCommission
          totalBalance += stat.rangeBalance
        } else {
          // month
          totalSales += stat.monthSales
          totalPrizes += stat.monthPrizes
          totalCommissions += stat.monthSalesCommission
          totalBalance += stat.monthBalance
        }
      })
    } else if ((isComercializadora || isSubdistribuidor) && agencyStats && agencyStats.length > 0) {
      // Comercializadora o Subdistribuidor: sumar ventas y premios de todas sus agencias
      // La comisión se calcula con el % del usuario sobre el total de ventas
      let shareOnSales = 0
      
      if (isComercializadora) {
        // Buscar la comercializadora actual por userId
        const currentComercializadora = comercializadoras?.find(c => c.userId === currentUser?.id)
        shareOnSales = currentComercializadora?.shareOnSales || 0
      } else if (isSubdistribuidor) {
        // Buscar el subdistribuidor actual
        const currentSubdistribuidor = subdistribuidores?.find(s => 
          s.id === currentUser?.id || s.userId === currentUser?.id
        )
        shareOnSales = currentSubdistribuidor?.shareOnSales || 0
      }

      agencyStats.forEach(stat => {
        if (periodFilter === 'today') {
          totalSales += stat.todaySales
          totalPrizes += stat.todayPrizes
          totalBalance += stat.todayBalance
        } else if (periodFilter === 'week') {
          totalSales += stat.weekSales
          totalPrizes += stat.weekPrizes
          totalBalance += stat.weekBalance
        } else if (periodFilter === 'custom' || periodFilter === 'yesterday') {
          totalSales += stat.rangeSales
          totalPrizes += stat.rangePrizes
          totalBalance += stat.rangeBalance
        } else {
          // month
          totalSales += stat.monthSales
          totalPrizes += stat.monthPrizes
          totalBalance += stat.monthBalance
        }
      })

      // Calcular comisión basada en el porcentaje sobre el total de ventas
      totalCommissions = totalSales * (shareOnSales / 100)
    } else if (isAgencia && taquillaStats && taquillaStats.length > 0) {
      // Agencia: sumar ventas y premios de todas sus taquillas
      // La comisión se calcula con el % de la agencia sobre el total de ventas
      // Buscar la agencia actual por id (el usuario ES la agencia)
      const currentAgency = agencies?.find(a => a.id === currentUser?.id)
      const agencyShareOnSales = currentAgency?.shareOnSales || 0

      taquillaStats.forEach(stat => {
        if (periodFilter === 'today') {
          totalSales += stat.todaySales
          totalPrizes += stat.todayPrizes
          totalBalance += stat.todayBalance
        } else if (periodFilter === 'week') {
          totalSales += stat.weekSales
          totalPrizes += stat.weekPrizes
          totalBalance += stat.weekBalance
        } else if (periodFilter === 'custom' || periodFilter === 'yesterday') {
          totalSales += stat.rangeSales
          totalPrizes += stat.rangePrizes
          totalBalance += stat.rangeBalance
        } else {
          // month
          totalSales += stat.monthSales
          totalPrizes += stat.monthPrizes
          totalBalance += stat.monthBalance
        }
      })

      // Calcular comisión de la agencia basada en su porcentaje sobre el total de ventas
      totalCommissions = totalSales * (agencyShareOnSales / 100)
    }

    return { totalSales, totalPrizes, totalCommissions, totalBalance }
  }, [lotteryType, lolaSalesStats, polloSalesStats, filteredWinners, filteredPolloWinners, isAdmin, isComercializadora, isSubdistribuidor, isAgencia, comercializadoraStats, agencyStats, taquillaStats, periodFilter, currentUser, comercializadoras, subdistribuidores, agencies])

  // Estadísticas principales - usando datos filtrados por taquillas visibles
  const stats = useMemo(() => {
    const totalResults = filteredResults.length

    // Total de jugadas ganadoras (filtrado por taquillas visibles)
    const totalWinningBets = lotteryType === 'pollo_lleno'
      ? filteredPolloWinners.length
      : filteredWinners.length
    // Total pagado en premios - usar filteredWinners que ya está filtrado por visibleTaquillaIds
    const totalPayout = lotteryType === 'pollo_lleno'
      ? filteredPolloWinners.reduce((sum, w) => sum + w.potentialWin, 0)
      : filteredWinners.reduce((sum, w) => sum + w.potentialWin, 0)
    const totalBetAmount = lotteryType === 'pollo_lleno'
      ? polloSalesStats.rangeSales
      : filteredWinners.reduce((sum, w) => sum + w.amount, 0)

    // Usar los totales calculados desde los hooks de comercializadora/agencia/taquilla
    const periodSales = periodTotals.totalSales
    const periodPrizes = periodTotals.totalPrizes
    const periodCommissions = periodTotals.totalCommissions

    // Ganancia neta = ventas - premios - comisiones
    const totalRaised = periodSales - periodPrizes - periodCommissions

    // Contar sorteos que tienen al menos un ganador de las taquillas visibles
    // Crear un Set de combinaciones únicas lotteryId-fecha de los ganadores filtrados
    const resultsWithWinnersSet = new Set(
      filteredWinners
        .filter(w => w.lotteryId)
        .map(w => {
          const winnerDate = new Date(w.createdAt).toISOString().split('T')[0]
          return `${w.lotteryId}-${winnerDate}`
        })
    )
    // Contar cuántos resultados filtrados tienen ganadores de las taquillas visibles
    const resultsWithWinners = lotteryType === 'pollo_lleno'
      ? filteredResults.filter(r => {
          const dateKey = getDateKey((r as any).resultDate)
          return !!dateKey && (polloWinnersByDate[dateKey] || 0) > 0
        }).length
      : filteredResults.filter(r => {
          const resultDate = (r as any).resultDate.split('T')[0]
          const lotteryId = (r as any).lotteryId
          return resultsWithWinnersSet.has(`${lotteryId}-${resultDate}`)
        }).length
    const averagePayout = totalWinningBets > 0 ? totalPayout / totalWinningBets : 0

    return {
      totalResults,
      totalPayout,
      totalRaised,
      resultsWithWinners,
      averagePayout,
      totalWinningBets,
      totalWinningAmount: totalPayout,
      totalBetAmount,
      periodSales,
      periodPrizes,
      periodCommissions
    }
  }, [filteredResults, filteredWinners, filteredPolloWinners, polloWinnersByDate, periodTotals, polloSalesStats, lotteryType])

  // Top loterías por premios pagados - usando filteredWinners (filtrado por taquillas visibles)
  const topLotteries = useMemo(() => {
    if (lotteryType === 'pollo_lleno') {
      if (filteredPolloWinners.length === 0) return []
      return [{
        name: 'Pollo Lleno',
        payout: filteredPolloWinners.reduce((sum, winner) => sum + winner.potentialWin, 0),
        wins: filteredPolloWinners.length
      }]
    }
    const lotteryStats = new Map<string, { name: string; payout: number; wins: number }>()

    filteredWinners.forEach((winner) => {
      if (!winner.lotteryId) return
      const lotteryName = winner.lotteryName || 'Desconocida'
      const current = lotteryStats.get(winner.lotteryId) || { name: lotteryName, payout: 0, wins: 0 }
      lotteryStats.set(winner.lotteryId, {
        name: lotteryName,
        payout: current.payout + winner.potentialWin,
        wins: current.wins + 1,
      })
    })

    return Array.from(lotteryStats.values())
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 5)
  }, [filteredWinners, filteredPolloWinners, lotteryType])

  // Top números ganadores - usando filteredWinners (filtrado por taquillas visibles)
  const topWinningNumbers = useMemo(() => {
    if (lotteryType === 'pollo_lleno') {
      const numberStats = new Map<string, { number: string; wins: number; totalPayout: number }>()
      filteredPolloWinners.forEach((winner) => {
        const sequence = winner.animalNumber || '??'
        const current = numberStats.get(sequence) || { number: sequence, wins: 0, totalPayout: 0 }
        numberStats.set(sequence, {
          number: sequence,
          wins: current.wins + 1,
          totalPayout: current.totalPayout + winner.potentialWin
        })
      })

      return Array.from(numberStats.values())
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10)
    }
    const numberStats = new Map<string, { number: string; wins: number; totalPayout: number }>()

    filteredWinners.forEach((winner) => {
      const key = winner.animalNumber
      const current = numberStats.get(key) || {
        number: winner.animalNumber,
        wins: 0,
        totalPayout: 0
      }
      numberStats.set(key, {
        ...current,
        wins: current.wins + 1,
        totalPayout: current.totalPayout + winner.potentialWin
      })
    })

    return Array.from(numberStats.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
  }, [filteredWinners, filteredPolloWinners, lotteryType])

  // Top taquillas por premios ganados
  const topTaquillas = useMemo(() => {
    if (lotteryType === 'pollo_lleno') {
      const taquillaStats = new Map<string, { name: string; wins: number; totalPayout: number; totalBet: number }>()

      filteredPolloWinners.forEach((winner) => {
        const current = taquillaStats.get(winner.taquillaId) || {
          name: winner.taquillaName,
          wins: 0,
          totalPayout: 0,
          totalBet: 0
        }
        taquillaStats.set(winner.taquillaId, {
          name: winner.taquillaName,
          wins: current.wins + 1,
          totalPayout: current.totalPayout + winner.potentialWin,
          totalBet: current.totalBet + winner.amount
        })
      })

      return Array.from(taquillaStats.values())
        .sort((a, b) => b.totalPayout - a.totalPayout)
        .slice(0, 10)
    }
    const taquillaStats = new Map<string, { name: string; wins: number; totalPayout: number; totalBet: number }>()

    filteredWinners.forEach((winner) => {
      const current = taquillaStats.get(winner.taquillaId) || {
        name: winner.taquillaName,
        wins: 0,
        totalPayout: 0,
        totalBet: 0
      }
      taquillaStats.set(winner.taquillaId, {
        name: winner.taquillaName,
        wins: current.wins + 1,
        totalPayout: current.totalPayout + winner.potentialWin,
        totalBet: current.totalBet + winner.amount
      })
    })

    return Array.from(taquillaStats.values())
      .sort((a, b) => b.totalPayout - a.totalPayout)
      .slice(0, 10)
  }, [filteredWinners, filteredPolloWinners, lotteryType])

  // Cargar estadísticas de apuestas cuando cambien los filtros
  useEffect(() => {
    loadBetsStats({
      startDate: startOfDay(dateRange.from).toISOString(),
      endDate: endOfDay(dateRange.to).toISOString(),
      lotteryId: selectedLottery,
      lotteryType
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedLottery, lotteryType])

  useEffect(() => {
    const loadTickets = async () => {
      if (lotteryType !== 'pollo_lleno') {
        setPolloTickets([])
        return
      }

      setPolloTicketsLoading(true)

      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setPolloTickets([])
        setPolloTicketsLoading(false)
        return
      }

      const from = startOfDay(appliedDateRange.from).toISOString()
      const to = endOfDay(appliedDateRange.to).toISOString()

      const query = supabase
        .from('bets_item_pollo_lleno')
        .select('id, bets_id, key_gamble, numbers, status, prize, description_prize, amount, created_at, user_id')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error loading Pollo Lleno tickets:', error)
        setPolloTickets([])
        setPolloTicketsLoading(false)
        return
      }

      const rawTickets = (data || []) as typeof polloTickets
      const ticketsWithMissingUser = rawTickets.filter((ticket) => !ticket.user_id && ticket.bets_id)
      let betsUserMap = new Map<string, string>()

      if (ticketsWithMissingUser.length > 0) {
        const betIds = Array.from(new Set(ticketsWithMissingUser.map((ticket) => String(ticket.bets_id)).filter(Boolean)))

        if (betIds.length > 0) {
          const { data: betsData, error: betsError } = await supabase
            .from('bets')
            .select('id, user_id')
            .in('id', betIds)

          if (betsError) {
            console.error('Error resolving Pollo Lleno ticket taquillas:', betsError)
          } else if (betsData) {
            betsUserMap = new Map(
              betsData
                .filter((bet: any) => bet.id && bet.user_id)
                .map((bet: any) => [String(bet.id), String(bet.user_id)])
            )
          }
        }
      }

      const resolvedTickets = rawTickets
        .map((ticket) => ({
          ...ticket,
          user_id: ticket.user_id || betsUserMap.get(String(ticket.bets_id || '')) || null
        }))
        .filter((ticket) => {
          if (!visibleTaquillaIds || visibleTaquillaIds.length === 0) return true
          return !!ticket.user_id && visibleTaquillaIds.includes(ticket.user_id)
        })

      setPolloTickets(resolvedTickets)
      setPolloTicketsLoading(false)
    }

    loadTickets()
  }, [appliedDateRange.from, appliedDateRange.to, lotteryType, visibleTaquillaIds])

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today': return 'Hoy'
      case 'yesterday': return 'Ayer'
      case 'week': return 'Esta Semana'
      case 'month': return 'Este Mes'
      case 'custom': return 'Personalizado'
      default: return 'Este Mes'
    }
  }

  // Handlers para filtros rápidos - actualizan dateRange y appliedDateRange
  const handlePeriodClick = (period: 'today' | 'yesterday' | 'week' | 'month') => {
    setPeriodFilter(period)
    let newRange: { from: Date; to: Date }
    if (period === 'today') {
      newRange = { from: todayStart, to: todayStart }
    } else if (period === 'yesterday') {
      newRange = { from: yesterdayStart, to: yesterdayStart }
    } else if (period === 'week') {
      newRange = { from: weekStart, to: todayStart }
    } else {
      newRange = { from: monthStart, to: todayStart }
    }
    setDateRange(newRange)
    setAppliedDateRange(newRange)
  }

  // Handlers para inputs de fecha - deseleccionan filtros rápidos
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const date = new Date(e.target.value + 'T00:00:00')
      setDateRange(prev => ({
        from: date,
        to: prev.to < date ? date : prev.to
      }))
      setPeriodFilter('custom')
    }
  }

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const date = new Date(e.target.value + 'T00:00:00')
      setDateRange(prev => ({
        from: prev.from > date ? date : prev.from,
        to: date
      }))
      setPeriodFilter('custom')
    }
  }

  // Aplicar filtro personalizado
  const handleApplyCustomFilter = () => {
    setAppliedDateRange({ from: dateRange.from, to: dateRange.to })
  }

  // Verificar si hay cambios pendientes de aplicar
  const hasUnappliedChanges = periodFilter === 'custom' && (
    dateRange.from.getTime() !== appliedDateRange.from.getTime() ||
    dateRange.to.getTime() !== appliedDateRange.to.getTime()
  )

  const handleRefresh = () => {
    loadDailyResults()
    loadDailyResultsLola()
    loadDailyResultsPolloLleno()
    // Refrescar stats según el tipo de usuario
    if (lotteryType === 'lola') {
      refreshLolaSales()
    } else if (lotteryType === 'pollo_lleno') {
      refreshPolloSales()
    } else if (isAdmin) {
      refreshComercializadoraStats()
    } else if (isComercializadora) {
      refreshAgencyStats()
    } else if (isAgencia) {
      refreshTaquillaStats()
    }
    loadBetsStats({
      startDate: startOfDay(dateRange.from).toISOString(),
      endDate: endOfDay(dateRange.to).toISOString(),
      lotteryId: selectedLottery,
      lotteryType
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes y Estadísticas</h2>
          <p className="text-muted-foreground">
            Análisis de resultados, premios y rendimiento
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={dailyResultsLoading}
          className="gap-2"
        >
          <ArrowsClockwise className={`h-4 w-4 ${dailyResultsLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedLottery} onValueChange={setSelectedLottery}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por lotería" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las loterías</SelectItem>
              {activeLotteriesForType.map((lottery) => (
                <SelectItem key={lottery.id} value={lottery.id}>
                  {lottery.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-sm text-muted-foreground mr-2">
            <Funnel className="h-4 w-4" />
            <span>Período:</span>
          </div>
          <Button
            variant={periodFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick('today')}
            className="cursor-pointer"
          >
            Hoy
          </Button>
          <Button
            variant={periodFilter === 'yesterday' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick('yesterday')}
            className="cursor-pointer"
          >
            Ayer
          </Button>
          <Button
            variant={periodFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick('week')}
            className="cursor-pointer"
          >
            Esta Semana
          </Button>
          <Button
            variant={periodFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick('month')}
            className="cursor-pointer"
          >
            Este Mes
          </Button>

          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            <div className="flex items-center gap-1">
              <Label htmlFor="from-date" className="text-xs text-muted-foreground whitespace-nowrap">Desde:</Label>
              <Input
                id="from-date"
                type="date"
                className="h-8 w-[130px] text-xs"
                value={format(dateRange.from, 'yyyy-MM-dd')}
                onChange={handleFromDateChange}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="flex items-center gap-1">
              <Label htmlFor="to-date" className="text-xs text-muted-foreground whitespace-nowrap">Hasta:</Label>
              <Input
                id="to-date"
                type="date"
                className="h-8 w-[130px] text-xs"
                value={format(dateRange.to, 'yyyy-MM-dd')}
                onChange={handleToDateChange}
                min={format(dateRange.from, 'yyyy-MM-dd')}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <Button
              variant={hasUnappliedChanges ? 'default' : 'outline'}
              size="sm"
              onClick={handleApplyCustomFilter}
              className={`gap-1 ${hasUnappliedChanges ? 'animate-pulse' : ''}`}
              disabled={periodFilter !== 'custom'}
            >
              <MagnifyingGlass className="h-4 w-4" />
              Aplicar
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className={`grid gap-4 md:grid-cols-2 ${lotteryType === 'pollo_lleno' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <CurrencyDollar className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.periodSales)}</p>
                <p className="text-xs text-muted-foreground">Total de Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {lotteryType === 'pollo_lleno' && (
          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-white" weight="bold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{polloSalesStats.rangeBetsCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Tickets Vendidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.periodPrizes)}</p>
                <p className="text-xs text-muted-foreground">Total de Premios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.periodCommissions)}</p>
                <p className="text-xs text-muted-foreground">Total de Comisiones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <TrendUp className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div className="flex-1">
                <div className="space-y-1">
                  <div>
                    <p className={`text-lg font-bold ${stats.totalRaised >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stats.totalRaised < 0 ? '-' : ''}{formatCurrency(Math.abs(stats.totalRaised))}
                    </p>
                    <p className="text-xs text-muted-foreground">Utilidad</p>
                  </div>
                  {(isComercializadora || isSubdistribuidor || isAgencia) && (
                    <>
                      <div className="pt-1 border-t">
                        <p className={`text-sm font-semibold text-gray-600`}>
                          {formatCurrency(stats.totalRaised * (currentUserProfitPercent / 100))}
                        </p>
                        <p className="text-xs text-muted-foreground">Mi Participación ({currentUserProfitPercent}%)</p>
                      </div>
                      <div className="pt-1">
                        <p className={`text-lg font-bold text-gray-900`}>
                          {formatCurrency(stats.totalRaised * (1 - currentUserProfitPercent / 100))}
                        </p>
                        <p className="text-xs text-muted-foreground">Restante</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Loterías */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Loterías con Más Premios Pagados</h3>
            </div>
            {topLotteries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay datos para el período seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topLotteries.map((lottery, index) => (
                  <div key={lottery.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lottery.name}</p>
                      <p className="text-xs text-muted-foreground">{lottery.wins} premios ganados</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{formatCurrency(lottery.payout)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Taquillas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Storefront className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Taquillas con Más Premios</h3>
            </div>
            {topTaquillas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Storefront className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay ganadores para el período seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTaquillas.map((taquilla, index) => (
                  <div key={taquilla.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{taquilla.name}</p>
                      <p className="text-xs text-muted-foreground">{taquilla.wins} premios ganados</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{formatCurrency(taquilla.totalPayout)}</p>
                      <p className="text-xs text-muted-foreground">
                        Apostado: {formatCurrency(taquilla.totalBet)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tickets vendidos (Pollo Lleno) */}
      {lotteryType === 'pollo_lleno' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Tickets Vendidos</h3>
              <Badge variant="outline" className="ml-auto">{getPeriodLabel()}</Badge>
            </div>
            {polloTicketsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowsClockwise className="h-10 w-10 text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando tickets...</p>
              </div>
            ) : polloTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay tickets para el período seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Combinación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Premio</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {polloTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          {formatTicketNumbers(ticket.numbers, ticket.key_gamble)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {ticket.status || 'sin estado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(ticket.prize || 0))}
                        </TableCell>
                        <TableCell>{ticket.description_prize || '-'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(ticket.amount || 0))}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(parseISO(ticket.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Números Ganadores */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ChartBar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Números Más Ganadores</h3>
            <Badge variant="outline" className="ml-auto">Top 10</Badge>
          </div>
          {topWinningNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ChartBar className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No hay datos de ganadores para el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Pos.</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead className="text-right">Veces Ganador</TableHead>
                    <TableHead className="text-right">Total Pagado</TableHead>
                    <TableHead className="w-[200px]">Distribución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topWinningNumbers.map((item, index) => {
                    const maxWins = topWinningNumbers[0]?.wins || 1
                    const percentage = (item.wins / maxWins) * 100
                    return (
                      <TableRow key={item.number}>
                        <TableCell>
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {lotteryType === 'pollo_lleno' ? (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                                      <Hash className="h-4 w-4 text-white" weight="bold" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <span className="text-xs">{item.number}</span>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{item.number}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.wins} {item.wins === 1 ? 'vez' : 'veces'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(item.totalPayout)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dos nuevas tablas en grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 10 Números Más Jugados por Lotería */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Números Más Jugados</h3>
              <Badge variant="outline" className="ml-auto">Top 10</Badge>
            </div>
            {betsStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowsClockwise className="h-10 w-10 text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
              </div>
            ) : topMostPlayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Hash className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay datos de jugadas para el período seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Pos.</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead className="text-right">Veces Jugado</TableHead>
                      <TableHead>Loterías</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMostPlayed.map((item, index) => {
                      const maxPlayed = topMostPlayed[0]?.timesPlayed || 1
                      const percentage = (item.timesPlayed / maxPlayed) * 100
                      return (
                        <TableRow key={item.number}>
                          <TableCell>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold">
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {lotteryType === 'pollo_lleno' ? (
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                        <Hash className="h-4 w-4 text-white" weight="bold" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span className="text-xs">{formatSequence(item.number)}</span>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">{item.number}</span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">{item.animalName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-semibold">{item.timesPlayed}</span>
                              <Progress value={percentage} className="h-1.5 w-16" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.lotteries.map((lottery, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {lottery.lotteryName} ({lottery.count})
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Números con Mayor Monto Jugado */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Money className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Mayor Monto Apostado</h3>
              <Badge variant="outline" className="ml-auto">Top 10</Badge>
            </div>
            {betsStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowsClockwise className="h-10 w-10 text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
              </div>
            ) : topHighestAmount.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Money className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay datos de apuestas para el período seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Pos.</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead className="text-right">Monto Total</TableHead>
                      <TableHead className="text-right">Jugadas</TableHead>
                      <TableHead className="text-right">Promedio</TableHead>
                      <TableHead className="text-right">A Pagar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topHighestAmount.map((item, index) => {
                      const maxAmount = topHighestAmount[0]?.totalAmount || 1
                      const percentage = (item.totalAmount / maxAmount) * 100
                      return (
                        <TableRow key={item.number}>
                          <TableCell>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {lotteryType === 'pollo_lleno' ? (
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                        <Hash className="h-4 w-4 text-white" weight="bold" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span className="text-xs">{formatSequence(item.number)}</span>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">{item.number}</span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">{item.animalName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-emerald-600">{formatCurrency(item.totalAmount)}</span>
                              <Progress value={percentage} className="h-1.5 w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.timesPlayed}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatCurrency(item.avgAmount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatCurrency(item.totalPotentialWin)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen del período */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Resumen del Período: {getPeriodLabel()}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Promedio por Premio</p>
              <p className="text-xl font-bold">{formatCurrency(stats.averagePayout)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Total Apostado (Ganadores)</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalBetAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
