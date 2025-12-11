import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { useApp } from '@/contexts/AppContext'
import { useBetsStats } from '@/hooks/use-bets-stats'
import { formatCurrency } from '@/lib/pot-utils'
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
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
  const { dailyResults, dailyResultsLoading, loadDailyResults, lotteries, winners, users, visibleTaquillas, visibleTaquillaIds } = useApp()
  const { topMostPlayed, topHighestAmount, loading: betsStatsLoading, loadBetsStats } = useBetsStats({ visibleTaquillaIds })

  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month')
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [selectedLottery, setSelectedLottery] = useState<string>('all')

  // Calcular fechas de filtros
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Filtrar resultados por período
  const filteredResults = useMemo(() => {
    return dailyResults.filter(result => {
      const resultDate = parseISO(result.resultDate)

      // Filtro por lotería
      if (selectedLottery !== 'all' && result.lotteryId !== selectedLottery) {
        return false
      }

      // Filtro por período
      if (periodFilter === 'today') {
        return resultDate >= todayStart
      } else if (periodFilter === 'week') {
        return resultDate >= weekStart
      } else if (periodFilter === 'month') {
        return resultDate >= monthStart
      } else if (periodFilter === 'custom' && customDateRange.from) {
        const fromDate = startOfDay(customDateRange.from)
        const toDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from)
        return resultDate >= fromDate && resultDate <= toDate
      }
      return true
    })
  }, [dailyResults, periodFilter, selectedLottery, todayStart, weekStart, monthStart, customDateRange])

  // Filtrar ganadores por período
  const filteredWinners = useMemo(() => {
    return winners.filter(winner => {
      const winnerDate = new Date(winner.createdAt)

      // Filtro por lotería
      if (selectedLottery !== 'all' && winner.lotteryId !== selectedLottery) {
        return false
      }

      // Filtro por período
      if (periodFilter === 'today') {
        return winnerDate >= todayStart
      } else if (periodFilter === 'week') {
        return winnerDate >= weekStart
      } else if (periodFilter === 'month') {
        return winnerDate >= monthStart
      } else if (periodFilter === 'custom' && customDateRange.from) {
        const fromDate = startOfDay(customDateRange.from)
        const toDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from)
        return winnerDate >= fromDate && winnerDate <= toDate
      }
      return true
    })
  }, [winners, periodFilter, selectedLottery, todayStart, weekStart, monthStart, customDateRange])

  // Estadísticas principales
  const stats = useMemo(() => {
    const totalResults = filteredResults.length
    const totalPayout = filteredResults.reduce((sum, r) => sum + (r.totalToPay || 0), 0)
    const totalRaised = filteredResults.reduce((sum, r) => sum + (r.totalRaised || 0), 0)
    const resultsWithWinners = filteredResults.filter(r => (r.totalToPay || 0) > 0).length
    const averagePayout = resultsWithWinners > 0 ? totalPayout / resultsWithWinners : 0

    // Total de jugadas ganadoras
    const totalWinningBets = filteredWinners.length
    const totalWinningAmount = filteredWinners.reduce((sum, w) => sum + w.potentialWin, 0)
    const totalBetAmount = filteredWinners.reduce((sum, w) => sum + w.amount, 0)

    return {
      totalResults,
      totalPayout,
      totalRaised,
      resultsWithWinners,
      averagePayout,
      totalWinningBets,
      totalWinningAmount,
      totalBetAmount
    }
  }, [filteredResults, filteredWinners])

  // Top loterías por premios pagados
  const topLotteries = useMemo(() => {
    const lotteryStats = new Map<string, { name: string; payout: number; raised: number; results: number }>()

    filteredResults.forEach((result) => {
      const lotteryName = result.lottery?.name || 'Desconocida'
      const current = lotteryStats.get(result.lotteryId) || { name: lotteryName, payout: 0, raised: 0, results: 0 }
      lotteryStats.set(result.lotteryId, {
        name: lotteryName,
        payout: current.payout + (result.totalToPay || 0),
        raised: current.raised + (result.totalRaised || 0),
        results: current.results + 1,
      })
    })

    return Array.from(lotteryStats.values())
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 5)
  }, [filteredResults])

  // Top números ganadores
  const topWinningNumbers = useMemo(() => {
    const numberStats = new Map<string, { number: string; wins: number; totalPayout: number }>()

    filteredResults.filter(r => (r.totalToPay || 0) > 0).forEach((result) => {
      if (result.prize) {
        const key = result.prize.animalNumber
        const current = numberStats.get(key) || {
          number: result.prize.animalNumber,
          wins: 0,
          totalPayout: 0
        }
        numberStats.set(key, {
          ...current,
          wins: current.wins + 1,
          totalPayout: current.totalPayout + (result.totalToPay || 0)
        })
      }
    })

    return Array.from(numberStats.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
  }, [filteredResults])

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
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    if (periodFilter === 'today') {
      startDate = startOfDay(now).toISOString()
    } else if (periodFilter === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
    } else if (periodFilter === 'month') {
      startDate = startOfMonth(now).toISOString()
    } else if (periodFilter === 'custom' && customDateRange.from) {
      startDate = startOfDay(customDateRange.from).toISOString()
      endDate = customDateRange.to ? endOfDay(customDateRange.to).toISOString() : endOfDay(customDateRange.from).toISOString()
    }

    loadBetsStats({
      startDate,
      endDate,
      lotteryId: selectedLottery
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, selectedLottery, customDateRange.from, customDateRange.to])

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'today': return 'Hoy'
      case 'week': return 'Esta Semana'
      case 'month': return 'Este Mes'
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`
        } else if (customDateRange.from) {
          return format(customDateRange.from, 'dd/MM/yyyy')
        }
        return 'Personalizado'
      default: return 'Este Mes'
    }
  }

  const handleCustomDateSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setCustomDateRange(range)
      if (range.from) {
        setPeriodFilter('custom')
      }
    }
  }

  const handleRefresh = () => {
    loadDailyResults()
    // Recargar estadísticas de apuestas con los filtros actuales
    let startDate: string | undefined
    let endDate: string | undefined

    if (periodFilter === 'today') {
      startDate = todayStart.toISOString()
    } else if (periodFilter === 'week') {
      startDate = weekStart.toISOString()
    } else if (periodFilter === 'month') {
      startDate = monthStart.toISOString()
    } else if (periodFilter === 'custom' && customDateRange.from) {
      startDate = startOfDay(customDateRange.from).toISOString()
      endDate = customDateRange.to ? endOfDay(customDateRange.to).toISOString() : endOfDay(customDateRange.from).toISOString()
    }

    loadBetsStats({
      startDate,
      endDate,
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
            onClick={() => setPeriodFilter('today')}
            className="cursor-pointer"
          >
            Hoy
          </Button>
          <Button
            variant={periodFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('week')}
            className="cursor-pointer"
          >
            Esta Semana
          </Button>
          <Button
            variant={periodFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('month')}
            className="cursor-pointer"
          >
            Este Mes
          </Button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={periodFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="cursor-pointer gap-2"
              >
                <CalendarBlank className="h-4 w-4" />
                {periodFilter === 'custom' && customDateRange.from
                  ? customDateRange.to
                    ? `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`
                    : format(customDateRange.from, 'dd/MM/yyyy')
                  : 'Personalizado'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customDateRange}
                onSelect={handleCustomDateSelect}
                locale={es}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
              />
              <div className="p-3 border-t flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomDateRange({ from: undefined, to: undefined })
                    setPeriodFilter('month')
                    setDatePickerOpen(false)
                  }}
                >
                  Limpiar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDatePickerOpen(false)}
                  disabled={!customDateRange.from}
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalResults}</p>
                <p className="text-xs text-muted-foreground">Sorteos Realizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <CurrencyDollar className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPayout)}</p>
                <p className="text-xs text-muted-foreground">Total Pagado en Premios</p>
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
                <p className={`text-2xl font-bold ${stats.totalRaised >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
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
                      <CaretDown className="h-3 w-3 text-amber-600" weight="bold" />
                      Pérdida Neta
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalWinningBets}</p>
                <p className="text-xs text-muted-foreground">Jugadas Ganadoras</p>
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
                      <p className="text-xs text-muted-foreground">{lottery.results} sorteos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{formatCurrency(lottery.payout)}</p>
                      <p className={`text-xs ${lottery.raised >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {lottery.raised >= 0 ? '+' : ''}{formatCurrency(lottery.raised)}
                      </p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Sorteos Realizados</p>
              <p className="text-xl font-bold">{stats.totalResults}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Con Ganadores</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{stats.resultsWithWinners}</p>
                <Badge variant="outline" className="text-xs">
                  {stats.totalResults > 0 ? ((stats.resultsWithWinners / stats.totalResults) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
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
