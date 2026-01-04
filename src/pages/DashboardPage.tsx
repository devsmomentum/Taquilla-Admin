import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useApp } from '@/contexts/AppContext'
import { useSalesStats } from '@/hooks/use-sales-stats'
import { useComercializadoraStats } from '@/hooks/use-comercializadora-stats'
import { useAgencyStats } from '@/hooks/use-agency-stats'
import { useTaquillaStats } from '@/hooks/use-taquilla-stats'
import { useHierarchicalStats } from '@/hooks/use-hierarchical-stats'
import { HierarchicalStatsTable } from '@/components/HierarchicalStatsTable'
import { formatCurrency } from '@/lib/pot-utils'
import { format, parseISO, startOfDay, endOfDay, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CurrencyDollar,
  TrendUp,
  Trophy,
  Storefront,
  Target,
  Receipt,
  ArrowsClockwise,
  CaretUp,
  CaretDown,
  Clock,
  CheckCircle,
  CalendarBlank,
  Buildings,
  FunnelSimple,
  TreeStructure
} from '@phosphor-icons/react'

export function DashboardPage() {
  const {
    lotteries,
    dailyResults,
    dailyResultsLoading,
    loadDailyResults,
    winners,
    winnersLoading,
    loadWinners,
    visibleTaquillas,
    visibleTaquillaIds,
    currentUser,
    comercializadoras,
    agencies,
    visibleAgencies,
    users: allUsers
  } = useApp()

  // Fechas de referencia
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Estado del período seleccionado (para resaltar el botón activo)
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week')

  // Estado del rango de fechas pendientes (lo que el usuario está seleccionando)
  const [pendingDateRange, setPendingDateRange] = useState<{ from: Date; to: Date }>({
    from: weekStart,
    to: todayStart
  })

  // Estado del rango de fechas aplicado (lo que se usa para los cálculos)
  const [appliedDateRange, setAppliedDateRange] = useState<{ from: Date; to: Date }>({
    from: weekStart,
    to: todayStart
  })

  // Estado para indicar si hay cambios pendientes por aplicar
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false)

  // Estado para indicar que se está aplicando el filtro
  const [isApplyingFilter, setIsApplyingFilter] = useState(false)

  // Determinar si el usuario es admin (puede ver datos globales)
  const isAdmin = currentUser?.userType === 'admin' || !currentUser?.userType

  const { stats: salesStats, loading: salesLoading, refresh: refreshSales } = useSalesStats({ visibleTaquillaIds })

  // Determinar tipo de usuario
  const isComercializadora = currentUser?.userType === 'comercializadora'
  const isAgencia = currentUser?.userType === 'agencia'

  // Stats de comercializadoras para la tabla (solo para admin)
  const { stats: comercializadoraStats, loading: comercializadoraStatsLoading, refresh: refreshComercializadoraStats } = useComercializadoraStats({
    comercializadoras: comercializadoras || [],
    agencies: visibleAgencies || agencies || [],
    taquillas: visibleTaquillas || [],
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to
  })

  // Stats de agencias para la tabla (para comercializadoras)
  const { stats: agencyStats, loading: agencyStatsLoading, refresh: refreshAgencyStats } = useAgencyStats({
    agencies: visibleAgencies || [],
    taquillas: visibleTaquillas || [],
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to
  })

  // Stats de taquillas para la tabla (para agencias)
  const { stats: taquillaStats, loading: taquillaStatsLoading, refresh: refreshTaquillaStats } = useTaquillaStats({
    taquillas: visibleTaquillas || [],
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to
  })

  // Stats jerárquicos (para la tabla expandible)
  const {
    rootType: hierarchyRootType,
    rootEntities: hierarchyRootEntities,
    loading: hierarchyLoading,
    refresh: refreshHierarchy
  } = useHierarchicalStats({
    currentUser,
    allUsers,
    dateFrom: appliedDateRange.from,
    dateTo: appliedDateRange.to
  })

  // Determinar qué período usar basándose en el rango de fechas aplicado
  // Ahora siempre usamos 'range' para los cálculos personalizados
  const periodType = useMemo(() => {
    const fromDate = startOfDay(appliedDateRange.from)
    const toDate = startOfDay(appliedDateRange.to)
    const today = startOfDay(new Date())
    const weekStartDate = startOfWeek(today, { weekStartsOn: 1 })

    // Si from y to son el mismo día y es hoy -> 'today'
    if (fromDate.getTime() === toDate.getTime() && fromDate.getTime() === today.getTime()) {
      return 'today'
    }

    // Si el rango es aproximadamente una semana (desde inicio de semana hasta hoy) -> 'week'
    if (fromDate.getTime() === weekStartDate.getTime() && toDate.getTime() === today.getTime()) {
      return 'week'
    }

    // Para cualquier otro rango usar 'range' (rango personalizado)
    return 'range'
  }, [appliedDateRange])

  // Ganadores filtrados por rango de fechas aplicado
  const filteredWinners = useMemo(() => {
    const fromDate = startOfDay(appliedDateRange.from)
    const toDate = endOfDay(appliedDateRange.to)
    return winners.filter(w => {
      const winnerDate = new Date(w.createdAt)
      return isWithinInterval(winnerDate, { start: fromDate, end: toDate })
    })
  }, [winners, appliedDateRange])

  // Totales desde comercializadoras (para admin)
  const comercializadoraTotals = useMemo(() => {
    if (!comercializadoraStats || comercializadoraStats.length === 0) {
      return {
        totalSales: 0,
        totalPrizes: 0,
        totalCommissions: 0,
        totalBalance: 0,
        totalProfit: 0
      }
    }
    return comercializadoraStats.reduce((acc, stat) => {
      if (periodType === 'today') {
        return {
          totalSales: acc.totalSales + stat.todaySales,
          totalPrizes: acc.totalPrizes + stat.todayPrizes,
          totalCommissions: acc.totalCommissions + stat.todaySalesCommission,
          totalBalance: acc.totalBalance + stat.todayBalance,
          totalProfit: acc.totalProfit + stat.todayProfit
        }
      } else if (periodType === 'week') {
        return {
          totalSales: acc.totalSales + stat.weekSales,
          totalPrizes: acc.totalPrizes + stat.weekPrizes,
          totalCommissions: acc.totalCommissions + stat.weekSalesCommission,
          totalBalance: acc.totalBalance + stat.weekBalance,
          totalProfit: acc.totalProfit + stat.weekProfit
        }
      } else {
        // Usar datos del rango personalizado
        return {
          totalSales: acc.totalSales + stat.rangeSales,
          totalPrizes: acc.totalPrizes + stat.rangePrizes,
          totalCommissions: acc.totalCommissions + stat.rangeSalesCommission,
          totalBalance: acc.totalBalance + stat.rangeBalance,
          totalProfit: acc.totalProfit + stat.rangeProfit
        }
      }
    }, {
      totalSales: 0,
      totalPrizes: 0,
      totalCommissions: 0,
      totalBalance: 0,
      totalProfit: 0
    })
  }, [comercializadoraStats, periodType])

  // Totales desde agencias (para comercializadora)
  const agencyTotals = useMemo(() => {
    if (!agencyStats || agencyStats.length === 0) {
      return {
        totalSales: 0,
        totalPrizes: 0,
        totalCommissions: 0,
        totalBalance: 0
      }
    }
    return agencyStats.reduce((acc, stat) => {
      if (periodType === 'today') {
        return {
          totalSales: acc.totalSales + stat.todaySales,
          totalPrizes: acc.totalPrizes + stat.todayPrizes,
          totalCommissions: acc.totalCommissions + stat.todaySalesCommission,
          totalBalance: acc.totalBalance + stat.todayBalance
        }
      } else if (periodType === 'week') {
        return {
          totalSales: acc.totalSales + stat.weekSales,
          totalPrizes: acc.totalPrizes + stat.weekPrizes,
          totalCommissions: acc.totalCommissions + stat.weekSalesCommission,
          totalBalance: acc.totalBalance + stat.weekBalance
        }
      } else {
        // Usar datos del rango personalizado
        return {
          totalSales: acc.totalSales + stat.rangeSales,
          totalPrizes: acc.totalPrizes + stat.rangePrizes,
          totalCommissions: acc.totalCommissions + stat.rangeSalesCommission,
          totalBalance: acc.totalBalance + stat.rangeBalance
        }
      }
    }, {
      totalSales: 0,
      totalPrizes: 0,
      totalCommissions: 0,
      totalBalance: 0
    })
  }, [agencyStats, periodType])

  // Totales desde taquillas (para agencia)
  const taquillaTotals = useMemo(() => {
    if (!taquillaStats || taquillaStats.length === 0) {
      return {
        totalSales: 0,
        totalPrizes: 0,
        totalCommissions: 0,
        totalBalance: 0
      }
    }
    return taquillaStats.reduce((acc, stat) => {
      if (periodType === 'today') {
        return {
          totalSales: acc.totalSales + stat.todaySales,
          totalPrizes: acc.totalPrizes + stat.todayPrizes,
          totalCommissions: acc.totalCommissions + stat.todaySalesCommission,
          totalBalance: acc.totalBalance + stat.todayBalance
        }
      } else if (periodType === 'week') {
        return {
          totalSales: acc.totalSales + stat.weekSales,
          totalPrizes: acc.totalPrizes + stat.weekPrizes,
          totalCommissions: acc.totalCommissions + stat.weekSalesCommission,
          totalBalance: acc.totalBalance + stat.weekBalance
        }
      } else {
        // Usar datos del rango personalizado
        return {
          totalSales: acc.totalSales + stat.rangeSales,
          totalPrizes: acc.totalPrizes + stat.rangePrizes,
          totalCommissions: acc.totalCommissions + stat.rangeSalesCommission,
          totalBalance: acc.totalBalance + stat.rangeBalance
        }
      }
    }, {
      totalSales: 0,
      totalPrizes: 0,
      totalCommissions: 0,
      totalBalance: 0
    })
  }, [taquillaStats, periodType])

  // Obtener el porcentaje de comisión del usuario logueado
  const currentUserCommissionPercent = useMemo(() => {
    if (!currentUser) return 0

    if (isComercializadora) {
      // Buscar la comercializadora actual
      const currentComercializadora = comercializadoras?.find(c => c.userId === currentUser.id)
      return currentComercializadora?.shareOnSales || 0
    }

    if (isAgencia) {
      // Buscar la agencia actual
      const currentAgency = agencies?.find(a => a.id === currentUser.id)
      return currentAgency?.shareOnSales || 0
    }

    return 0
  }, [currentUser, isComercializadora, isAgencia, comercializadoras, agencies])

  // Estadísticas de resultados - usando datos según el perfil del usuario
  const periodStats = useMemo(() => {
    const fromDate = startOfDay(appliedDateRange.from)
    const toDate = endOfDay(appliedDateRange.to)
    const filteredResults = dailyResults.filter(r => {
      const resultDate = parseISO(r.resultDate)
      return isWithinInterval(resultDate, { start: fromDate, end: toDate })
    })
    const resultsCount = filteredResults.length
    const resultsWithWinners = filteredResults.filter(r => (r.totalToPay || 0) > 0).length

    // Para ADMIN: usar datos de comercializadoras
    if (isAdmin && comercializadoraStats && comercializadoraStats.length > 0) {
      return {
        totalSales: comercializadoraTotals.totalSales,
        totalPayout: comercializadoraTotals.totalPrizes,
        totalCommissions: comercializadoraTotals.totalCommissions,
        totalRaised: comercializadoraTotals.totalBalance,
        resultsCount,
        resultsWithWinners
      }
    }

    // Para COMERCIALIZADORA: usar datos de agencias pero calcular comisión con el % del usuario
    if (isComercializadora && agencyStats && agencyStats.length > 0) {
      const totalSales = agencyTotals.totalSales
      const totalPrizes = agencyTotals.totalPrizes
      // Calcular comisión basada en el % de la comercializadora logueada
      const totalCommissions = totalSales * (currentUserCommissionPercent / 100)
      const totalRaised = totalSales - totalPrizes - totalCommissions

      return {
        totalSales,
        totalPayout: totalPrizes,
        totalCommissions,
        totalRaised,
        resultsCount,
        resultsWithWinners
      }
    }

    // Para AGENCIA: usar datos de taquillas pero calcular comisión con el % del usuario
    if (isAgencia && taquillaStats && taquillaStats.length > 0) {
      const totalSales = taquillaTotals.totalSales
      const totalPrizes = taquillaTotals.totalPrizes
      // Calcular comisión basada en el % de la agencia logueada
      const totalCommissions = totalSales * (currentUserCommissionPercent / 100)
      const totalRaised = totalSales - totalPrizes - totalCommissions

      return {
        totalSales,
        totalPayout: totalPrizes,
        totalCommissions,
        totalRaised,
        resultsCount,
        resultsWithWinners
      }
    }

    // Fallback: usar datos de salesStats
    const sales = periodType === 'today' ? salesStats.todaySales : salesStats.weekSales
    const totalPayout = filteredWinners.reduce((sum, w) => sum + w.potentialWin, 0)
    const taquillaCommissions = periodType === 'today' ? salesStats.todayTaquillaCommissions : (salesStats.weekTaquillaCommissions || 0)
    const totalRaised = sales - totalPayout - taquillaCommissions

    return {
      totalSales: sales,
      totalPayout,
      totalCommissions: taquillaCommissions,
      totalRaised,
      resultsCount,
      resultsWithWinners
    }
  }, [dailyResults, appliedDateRange, filteredWinners, salesStats, comercializadoraStats, comercializadoraTotals, agencyStats, agencyTotals, taquillaStats, taquillaTotals, isAdmin, isComercializadora, isAgencia, periodType, currentUserCommissionPercent])

  // Últimos resultados (para todos los usuarios)
  const latestResults = useMemo(() => {
    return [...dailyResults]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [dailyResults])

  // Loterías activas
  const activeLotteries = lotteries.filter(l => l.isActive)

  // Taquillas activas (filtradas por visibilidad del usuario)
  const activeTaquillas = visibleTaquillas.filter(t => t.isApproved)

  const handleRefreshAll = () => {
    loadDailyResults()
    loadWinners()
    refreshSales()
    refreshHierarchy()
    if (isAgencia) {
      refreshTaquillaStats()
    } else if (isComercializadora) {
      refreshAgencyStats()
    } else {
      refreshComercializadoraStats()
    }
  }

  // Función para parsear fecha del input sin problemas de timezone
  const parseDateInput = (dateString: string): Date => {
    // El input type="date" devuelve 'yyyy-MM-dd'
    // Parseamos manualmente para evitar problemas de timezone
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day) // month es 0-indexed
  }

  // Handler para filtros rápidos - actualizan y aplican inmediatamente
  const handlePeriodClick = (period: 'today' | 'week' | 'month') => {
    setPeriodFilter(period)
    let newRange: { from: Date; to: Date }
    if (period === 'today') {
      newRange = { from: todayStart, to: todayStart }
    } else if (period === 'week') {
      newRange = { from: weekStart, to: todayStart }
    } else {
      newRange = { from: monthStart, to: todayStart }
    }
    setPendingDateRange(newRange)
    setAppliedDateRange(newRange)
    setHasUnappliedChanges(false)
  }

  // Handlers para cambio de fechas pendientes
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = parseDateInput(e.target.value)
    if (!isNaN(newFrom.getTime())) {
      setPendingDateRange(prev => ({
        ...prev,
        from: newFrom,
        // Ajustar fecha "hasta" si es menor a la nueva fecha "desde"
        to: newFrom > prev.to ? newFrom : prev.to
      }))
      setPeriodFilter('custom')
      setHasUnappliedChanges(true)
    }
  }

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = parseDateInput(e.target.value)
    if (!isNaN(newTo.getTime())) {
      // No permitir que "hasta" sea menor que "desde"
      if (newTo < pendingDateRange.from) {
        return // No hacer nada si la fecha es inválida
      }
      setPendingDateRange(prev => ({
        ...prev,
        to: newTo
      }))
      setPeriodFilter('custom')
      setHasUnappliedChanges(true)
    }
  }

  // Aplicar el filtro de fechas
  const handleApplyFilter = useCallback(async () => {
    setIsApplyingFilter(true)
    setAppliedDateRange(pendingDateRange)
    setHasUnappliedChanges(false)

    // Esperar un pequeño delay para que los hooks se actualicen
    await new Promise(resolve => setTimeout(resolve, 100))
    setIsApplyingFilter(false)
  }, [pendingDateRange])

  const isLoading = dailyResultsLoading || winnersLoading || salesLoading || comercializadoraStatsLoading || agencyStatsLoading || taquillaStatsLoading || hierarchyLoading || isApplyingFilter

  // Validar si las fechas pendientes son válidas
  const isDateRangeValid = pendingDateRange.to >= pendingDateRange.from

  // Etiqueta del período aplicado
  const getPeriodLabel = () => {
    const fromStr = format(appliedDateRange.from, "dd/MM/yyyy", { locale: es })
    const toStr = format(appliedDateRange.to, "dd/MM/yyyy", { locale: es })
    if (fromStr === toStr) {
      return fromStr
    }
    return `${fromStr} - ${toStr}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Resumen general del sistema de loterías
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isLoading}
          className="gap-2"
        >
          <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtro de rango de fechas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarBlank className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">Período:</span>
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center gap-2">
              <Button
                variant={periodFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodClick('today')}
                disabled={isApplyingFilter}
              >
                Hoy
              </Button>
              <Button
                variant={periodFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodClick('week')}
                disabled={isApplyingFilter}
              >
                Esta Semana
              </Button>
              <Button
                variant={periodFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodClick('month')}
                disabled={isApplyingFilter}
              >
                Este Mes
              </Button>
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-border" />

            {/* Rango personalizado */}
            <div className="flex items-center gap-2">
              <label htmlFor="from-date" className="text-xs text-muted-foreground">Desde:</label>
              <Input
                id="from-date"
                type="date"
                className="h-8 w-[130px] text-xs"
                value={format(pendingDateRange.from, 'yyyy-MM-dd')}
                onChange={handleFromDateChange}
                max={format(new Date(), 'yyyy-MM-dd')}
                disabled={isApplyingFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="to-date" className="text-xs text-muted-foreground">Hasta:</label>
              <Input
                id="to-date"
                type="date"
                className={`h-8 w-[130px] text-xs ${!isDateRangeValid ? 'border-destructive' : ''}`}
                value={format(pendingDateRange.to, 'yyyy-MM-dd')}
                onChange={handleToDateChange}
                min={format(pendingDateRange.from, 'yyyy-MM-dd')}
                max={format(new Date(), 'yyyy-MM-dd')}
                disabled={isApplyingFilter}
              />
            </div>
            <Button
              variant={hasUnappliedChanges ? 'default' : 'outline'}
              size="sm"
              onClick={handleApplyFilter}
              disabled={periodFilter !== 'custom' || !isDateRangeValid || isApplyingFilter}
              className={`gap-2 ${hasUnappliedChanges ? 'animate-pulse' : ''}`}
            >
              {isApplyingFilter ? (
                <>
                  <ArrowsClockwise className="h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <FunnelSimple className="h-4 w-4" weight="bold" />
                  Aplicar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      <div className={`grid gap-4 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <CurrencyDollar className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(periodStats.totalSales)}</p>
                <p className="text-xs text-muted-foreground">Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(periodStats.totalPayout)}</p>
                <p className="text-xs text-muted-foreground">Premios</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {filteredWinners.length} jugadas ganadoras
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
                    <p className={`text-lg font-bold ${periodStats.totalRaised >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {periodStats.totalRaised < 0 ? '-' : ''}{formatCurrency(Math.abs(periodStats.totalRaised))}
                    </p>
                    <p className="text-xs text-muted-foreground">Utilidad</p>
                  </div>
                  {(isComercializadora || isAgencia) && currentUserCommissionPercent > 0 && (
                    <>
                      <div>
                        <p className={`text-sm font-semibold ${periodStats.totalRaised >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
                          {periodStats.totalRaised < 0 ? '-' : ''}{formatCurrency(Math.abs(periodStats.totalRaised) * (currentUserCommissionPercent / 100))}
                        </p>
                        <p className="text-xs text-muted-foreground">Participación ({currentUserCommissionPercent}%)</p>
                      </div>
                      <div className="pt-1 border-t">
                        <p className={`text-lg font-bold ${periodStats.totalRaised >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                          {periodStats.totalRaised < 0 ? '-' : ''}{formatCurrency(Math.abs(periodStats.totalRaised) * (1 - currentUserCommissionPercent / 100))}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sorteos - Solo visible para admin */}
        {isAdmin && (
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-white" weight="fill" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{periodStats.resultsCount}</p>
                  <p className="text-xs text-muted-foreground">Sorteos</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {periodStats.resultsWithWinners} con ganadores
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Segunda fila de métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" weight="fill" />
                </div>
                <div>
                  <p className="text-xl font-bold">{activeLotteries.length}</p>
                  <p className="text-xs text-muted-foreground">Loterías Activas</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                de {lotteries.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <Storefront className="h-5 w-5 text-white" weight="fill" />
                </div>
                <div>
                  <p className="text-xl font-bold">{activeTaquillas.length}</p>
                  <p className="text-xs text-muted-foreground">Taquillas Activas</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                de {visibleTaquillas.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-white" weight="bold" />
                </div>
                <div>
                  <p className="text-xl font-bold">{formatCurrency(periodStats.totalCommissions)}</p>
                  <p className="text-xs text-muted-foreground">Comisiones</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <div className={`grid gap-4 ${isAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {/* Últimos resultados - Solo visible para admin */}
        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Últimos Resultados</h3>
              </div>
              {latestResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay resultados cargados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {latestResults.map((result) => (
                    <div key={result.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {result.prize?.animalNumber || '??'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.lottery?.name || 'Lotería'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(result.resultDate), "dd/MM/yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        {(result.totalToPay || 0) > 0 ? (
                          <>
                            <p className="text-sm font-bold text-red-600">{formatCurrency(result.totalToPay || 0)}</p>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Con ganadores
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Sin ganadores
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Taquillas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Storefront className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Top Taquillas</h3>
              <Badge variant="outline" className="ml-auto text-xs">Ventas</Badge>
            </div>
            {salesStats.salesByTaquilla.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Storefront className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay ventas registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salesStats.salesByTaquilla.slice(0, 5).map((taquilla, index) => (
                  <div key={taquilla.taquillaId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{taquilla.taquillaName}</p>
                      <p className="text-xs text-muted-foreground">{taquilla.betsCount} jugadas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(taquilla.sales)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose Jerárquico */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TreeStructure className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {hierarchyRootType === 'admin' && 'Desglose por Administrador'}
              {hierarchyRootType === 'comercializadora' && 'Desglose por Comercializadora'}
              {hierarchyRootType === 'agencia' && 'Desglose por Agencia'}
              {hierarchyRootType === 'taquilla' && 'Desglose por Taquilla'}
            </h3>
            <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-700 border-blue-200">
              {getPeriodLabel()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Haz clic en una fila para ver el desglose de sus hijos
          </p>
          <HierarchicalStatsTable
            rootType={hierarchyRootType}
            rootEntities={hierarchyRootEntities}
            dateFrom={appliedDateRange.from}
            dateTo={appliedDateRange.to}
            allUsers={allUsers}
            isLoading={hierarchyLoading}
          />
        </CardContent>
      </Card>

      {/* Loterías activas */}
      {activeLotteries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Loterías Activas</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeLotteries.map((lottery) => (
                <div key={lottery.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                  <CheckCircle className="h-4 w-4 text-emerald-500" weight="fill" />
                  <span className="text-sm font-medium truncate">{lottery.name}</span>
                  {lottery.drawTime && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {lottery.drawTime}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
