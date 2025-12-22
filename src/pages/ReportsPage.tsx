import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { useApp } from '@/contexts/AppContext'
import { useBetsStats } from '@/hooks/use-bets-stats'
import { useComercializadoraStats } from '@/hooks/use-comercializadora-stats'
import { useAgencyStats } from '@/hooks/use-agency-stats'
import { useTaquillaStats } from '@/hooks/use-taquilla-stats'
import { formatCurrency } from '@/lib/pot-utils'
// Note: useSalesStats was removed as calculations are now done per comercializadora/agencia/taquilla
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO } from 'date-fns'
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
  Money
} from '@phosphor-icons/react'

export function ReportsPage() {
  const {
    dailyResults,
    dailyResultsLoading,
    loadDailyResults,
    lotteries,
    winners,
    users,
    visibleTaquillas,
    visibleTaquillaIds,
    currentUser,
    comercializadoras,
    agencies,
    visibleAgencies
  } = useApp()
  const { topMostPlayed, topHighestAmount, loading: betsStatsLoading, loadBetsStats } = useBetsStats({ visibleTaquillaIds })

  // Determinar tipo de usuario
  const isAdmin = currentUser?.userType === 'admin' || !currentUser?.userType
  const isComercializadora = currentUser?.userType === 'comercializadora'
  const isAgencia = currentUser?.userType === 'agencia'

  // Stats de comercializadoras (para admin)
  const { stats: comercializadoraStats, refresh: refreshComercializadoraStats } = useComercializadoraStats({
    comercializadoras: comercializadoras || [],
    agencies: visibleAgencies || agencies || [],
    taquillas: visibleTaquillas || []
  })

  // Stats de agencias (para comercializadora)
  const { stats: agencyStats, refresh: refreshAgencyStats } = useAgencyStats({
    agencies: visibleAgencies || [],
    taquillas: visibleTaquillas || []
  })

  // Stats de taquillas (para agencia)
  const { stats: taquillaStats, refresh: refreshTaquillaStats } = useTaquillaStats({
    taquillas: visibleTaquillas || []
  })

  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month')
  const [selectedLottery, setSelectedLottery] = useState<string>('all')

  // Calcular fechas de filtros
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Estado de fechas - inicializado con "Este Mes"
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: monthStart,
    to: todayStart
  })

  // Filtrar resultados por período usando dateRange
  const filteredResults = useMemo(() => {
    return dailyResults.filter(result => {
      const resultDate = parseISO(result.resultDate)

      // Filtro por lotería
      if (selectedLottery !== 'all' && result.lotteryId !== selectedLottery) {
        return false
      }

      // Filtro por rango de fechas
      const fromDate = startOfDay(dateRange.from)
      const toDate = endOfDay(dateRange.to)
      return resultDate >= fromDate && resultDate <= toDate
    })
  }, [dailyResults, selectedLottery, dateRange])

  // Filtrar ganadores por período usando dateRange
  const filteredWinners = useMemo(() => {
    return winners.filter(winner => {
      const winnerDate = new Date(winner.createdAt)

      // Filtro por lotería
      if (selectedLottery !== 'all' && winner.lotteryId !== selectedLottery) {
        return false
      }

      // Filtro por rango de fechas
      const fromDate = startOfDay(dateRange.from)
      const toDate = endOfDay(dateRange.to)
      return winnerDate >= fromDate && winnerDate <= toDate
    })
  }, [winners, selectedLottery, dateRange])

  // Calcular totales desde los hooks de comercializadora/agencia/taquilla según el tipo de usuario
  const periodTotals = useMemo(() => {
    let totalSales = 0
    let totalPrizes = 0
    let totalCommissions = 0
    let totalBalance = 0

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
        } else {
          // month o custom
          totalSales += stat.monthSales
          totalPrizes += stat.monthPrizes
          totalCommissions += stat.monthSalesCommission
          totalBalance += stat.monthBalance
        }
      })
    } else if (isComercializadora && agencyStats && agencyStats.length > 0) {
      // Comercializadora: sumar de todas sus agencias
      agencyStats.forEach(stat => {
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
        } else {
          totalSales += stat.monthSales
          totalPrizes += stat.monthPrizes
          totalCommissions += stat.monthSalesCommission
          totalBalance += stat.monthBalance
        }
      })
    } else if (isAgencia && taquillaStats && taquillaStats.length > 0) {
      // Agencia: sumar de todas sus taquillas
      taquillaStats.forEach(stat => {
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
        } else {
          totalSales += stat.monthSales
          totalPrizes += stat.monthPrizes
          totalCommissions += stat.monthSalesCommission
          totalBalance += stat.monthBalance
        }
      })
    }

    return { totalSales, totalPrizes, totalCommissions, totalBalance }
  }, [isAdmin, isComercializadora, isAgencia, comercializadoraStats, agencyStats, taquillaStats, periodFilter])

  // Estadísticas principales - usando datos filtrados por taquillas visibles
  const stats = useMemo(() => {
    const totalResults = filteredResults.length

    // Total de jugadas ganadoras (filtrado por taquillas visibles)
    const totalWinningBets = filteredWinners.length
    // Total pagado en premios - usar filteredWinners que ya está filtrado por visibleTaquillaIds
    const totalPayout = filteredWinners.reduce((sum, w) => sum + w.potentialWin, 0)
    const totalBetAmount = filteredWinners.reduce((sum, w) => sum + w.amount, 0)

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
    const resultsWithWinners = filteredResults.filter(r => {
      const resultDate = r.resultDate.split('T')[0]
      return resultsWithWinnersSet.has(`${r.lotteryId}-${resultDate}`)
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
  }, [filteredResults, filteredWinners, periodTotals])

  // Top loterías por premios pagados - usando filteredWinners (filtrado por taquillas visibles)
  const topLotteries = useMemo(() => {
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
  }, [filteredWinners])

  // Top números ganadores - usando filteredWinners (filtrado por taquillas visibles)
  const topWinningNumbers = useMemo(() => {
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
  }, [filteredWinners])

  // Top taquillas por premios ganados
  const topTaquillas = useMemo(() => {
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
  }, [filteredWinners])

  // Cargar estadísticas de apuestas cuando cambien los filtros
  useEffect(() => {
    loadBetsStats({
      startDate: startOfDay(dateRange.from).toISOString(),
      endDate: endOfDay(dateRange.to).toISOString(),
      lotteryId: selectedLottery
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedLottery])

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today': return 'Hoy'
      case 'week': return 'Esta Semana'
      case 'month': return 'Este Mes'
      case 'custom': return 'Personalizado'
      default: return 'Este Mes'
    }
  }

  // Handlers para filtros rápidos - actualizan dateRange
  const handlePeriodClick = (period: 'today' | 'week' | 'month') => {
    setPeriodFilter(period)
    if (period === 'today') {
      setDateRange({ from: todayStart, to: todayStart })
    } else if (period === 'week') {
      setDateRange({ from: weekStart, to: todayStart })
    } else if (period === 'month') {
      setDateRange({ from: monthStart, to: todayStart })
    }
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

  const handleRefresh = () => {
    loadDailyResults()
    // Refrescar stats según el tipo de usuario
    if (isAdmin) {
      refreshComercializadoraStats()
    } else if (isComercializadora) {
      refreshAgencyStats()
    } else if (isAgencia) {
      refreshTaquillaStats()
    }
    loadBetsStats({
      startDate: startOfDay(dateRange.from).toISOString(),
      endDate: endOfDay(dateRange.to).toISOString(),
      lotteryId: selectedLottery
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
              {lotteries.filter(l => l.isActive).map((lottery) => (
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
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <div>
                <p className={`text-2xl font-bold ${stats.totalRaised >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(stats.totalRaised))}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {stats.totalRaised >= 0 ? (
                    <>
                      <CaretUp className="h-3 w-3 text-emerald-600" weight="bold" />
                      Ganancia Neta
                    </>
                  ) : (
                    <>
                      <CaretDown className="h-3 w-3 text-red-600" weight="bold" />
                      Pérdida Neta
                    </>
                  )}
                </p>
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
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                              <span className="text-sm font-bold text-white">{item.number}</span>
                            </div>
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
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{item.number}</span>
                              </div>
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
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{item.number}</span>
                              </div>
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
