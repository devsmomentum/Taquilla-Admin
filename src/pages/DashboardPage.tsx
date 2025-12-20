import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/contexts/AppContext'
import { useSalesStats } from '@/hooks/use-sales-stats'
import { useComercializadoraStats } from '@/hooks/use-comercializadora-stats'
import { useAgencyStats } from '@/hooks/use-agency-stats'
import { useTaquillaStats } from '@/hooks/use-taquilla-stats'
import { formatCurrency } from '@/lib/pot-utils'
import { format, parseISO } from 'date-fns'
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
  Users,
  User,
  CalendarBlank,
  ChartLineUp,
  Buildings
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
    taquillas,
    visibleTaquillas,
    visibleTaquillaIds,
    currentUser,
    comercializadoras,
    agencies,
    visibleAgencies
  } = useApp()

  // Determinar si el usuario es admin (puede ver datos globales)
  const isAdmin = currentUser?.userType === 'admin' || !currentUser?.userType

  const { stats: salesStats, loading: salesLoading, refresh: refreshSales } = useSalesStats({ visibleTaquillaIds })

  // Determinar tipo de usuario
  const isComercializadora = currentUser?.userType === 'comercializadora'
  const isAgencia = currentUser?.userType === 'agencia'

  // Stats de comercializadoras para la tabla semanal (solo para admin)
  const { stats: comercializadoraStats, loading: comercializadoraStatsLoading, refresh: refreshComercializadoraStats } = useComercializadoraStats({
    comercializadoras: comercializadoras || [],
    agencies: visibleAgencies || agencies || [],
    taquillas: visibleTaquillas || []
  })

  // Stats de agencias para la tabla semanal (para comercializadoras)
  const { stats: agencyStats, loading: agencyStatsLoading, refresh: refreshAgencyStats } = useAgencyStats({
    agencies: visibleAgencies || [],
    taquillas: visibleTaquillas || []
  })

  // Stats de taquillas para la tabla semanal (para agencias)
  const { stats: taquillaStats, loading: taquillaStatsLoading, refresh: refreshTaquillaStats } = useTaquillaStats({
    taquillas: visibleTaquillas || []
  })

  // Ganadores del día (ya filtrados por visibleTaquillaIds)
  const todayWinners = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return winners.filter(w => new Date(w.createdAt) >= today)
  }, [winners])

  // Estadísticas de resultados del día - usando datos filtrados por taquillas visibles
  const todayStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayResults = dailyResults.filter(r => r.resultDate === today)

    // Total de premios pagados - usar todayWinners que ya está filtrado por visibleTaquillaIds
    const totalPayout = todayWinners.reduce((sum, w) => sum + w.potentialWin, 0)
    // Ganancia neta = ventas del día - premios pagados (usando datos filtrados)
    const totalRaised = salesStats.todaySales - totalPayout
    const resultsCount = todayResults.length
    const resultsWithWinners = todayResults.filter(r => (r.totalToPay || 0) > 0).length

    return {
      totalPayout,
      totalRaised,
      resultsCount,
      resultsWithWinners
    }
  }, [dailyResults, todayWinners, salesStats.todaySales])

  // Últimos resultados (solo para admin - datos globales)
  const latestResults = useMemo(() => {
    if (!isAdmin) return [] // No mostrar resultados globales para no-admin
    return [...dailyResults]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [dailyResults, isAdmin])

  // Últimos ganadores (para todos los usuarios - filtrados por visibleTaquillaIds)
  const latestWinners = useMemo(() => {
    return [...winners]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [winners])

  // Loterías activas
  const activeLotteries = lotteries.filter(l => l.isActive)

  // Taquillas activas (filtradas por visibilidad del usuario)
  const activeTaquillas = visibleTaquillas.filter(t => t.isApproved)

  const handleRefreshAll = () => {
    loadDailyResults()
    loadWinners()
    refreshSales()
    if (isAgencia) {
      refreshTaquillaStats()
    } else if (isComercializadora) {
      refreshAgencyStats()
    } else {
      refreshComercializadoraStats()
    }
  }

  const isLoading = dailyResultsLoading || winnersLoading || salesLoading || comercializadoraStatsLoading || agencyStatsLoading || taquillaStatsLoading

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

      {/* Estadísticas principales del día */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <CurrencyDollar className="h-5 w-5 text-white" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(salesStats.todaySales)}</p>
                <p className="text-xs text-muted-foreground">Ventas del Día</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {salesStats.todayBetsCount} jugadas registradas
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
                <p className="text-2xl font-bold text-red-600">{formatCurrency(todayStats.totalPayout)}</p>
                <p className="text-xs text-muted-foreground">Premios del Día</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {todayWinners.length} jugadas ganadoras
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
                <p className={`text-2xl font-bold ${todayStats.totalRaised >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatCurrency(Math.abs(todayStats.totalRaised))}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {todayStats.totalRaised >= 0 ? (
                    <>
                      <CaretUp className="h-3 w-3 text-emerald-600" weight="bold" />
                      Ganancia Hoy
                    </>
                  ) : (
                    <>
                      <CaretDown className="h-3 w-3 text-amber-600" weight="bold" />
                      Pérdida Hoy
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayStats.resultsCount}</p>
                <p className="text-xs text-muted-foreground">Sorteos del Día</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {todayStats.resultsWithWinners} con ganadores
            </div>
          </CardContent>
        </Card>
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
                  <ChartLineUp className="h-5 w-5 text-white" weight="bold" />
                </div>
                <div>
                  <p className="text-xl font-bold">{formatCurrency(salesStats.monthSales)}</p>
                  <p className="text-xs text-muted-foreground">Ventas del Mes</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {salesStats.monthBetsCount} jugadas
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Últimos resultados (solo para admin) o Últimos ganadores (para todos) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              {isAdmin ? (
                <>
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Últimos Resultados</h3>
                </>
              ) : (
                <>
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Últimos Ganadores</h3>
                </>
              )}
            </div>
            {isAdmin ? (
              // Vista para admin: Últimos resultados globales
              latestResults.length === 0 ? (
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
              )
            ) : (
              // Vista para comercializadora/agencia/taquilla: Últimos ganadores filtrados
              latestWinners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay ganadores registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {latestWinners.map((winner) => (
                    <div key={winner.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {winner.animalNumber || '??'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{winner.lotteryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {winner.taquillaName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-600">{formatCurrency(winner.potentialWin)}</p>
                        <p className="text-xs text-muted-foreground">
                          Apostó: {formatCurrency(winner.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Top Taquillas del día */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Storefront className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Top Taquillas Hoy</h3>
              <Badge variant="outline" className="ml-auto text-xs">Ventas</Badge>
            </div>
            {salesStats.salesByTaquilla.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Storefront className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay ventas registradas hoy</p>
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

      {/* Resumen semanal y mensual */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarBlank className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Resumen de Ventas</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <p className="text-xs font-medium text-blue-700">Hoy</p>
              </div>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(salesStats.todaySales)}</p>
              <p className="text-xs text-blue-600">{salesStats.todayBetsCount} jugadas</p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs font-medium text-emerald-700">Esta Semana</p>
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(salesStats.weekSales)}</p>
              <p className="text-xs text-emerald-600">{salesStats.weekBetsCount} jugadas</p>
            </div>

            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <p className="text-xs font-medium text-purple-700">Este Mes</p>
              </div>
              <p className="text-xl font-bold text-purple-700">{formatCurrency(salesStats.monthSales)}</p>
              <p className="text-xs text-purple-600">{salesStats.monthBetsCount} jugadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ventas Semanales por Comercializadora (solo para admin) */}
      {!isComercializadora && !isAgencia && comercializadoras && comercializadoras.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Buildings className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Ventas Semanales por Comercializadora</h3>
              <Badge variant="outline" className="ml-auto text-xs">Esta Semana</Badge>
            </div>
            {comercializadoraStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowsClockwise className="h-10 w-10 text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
              </div>
            ) : comercializadoraStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Buildings className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay comercializadoras con ventas esta semana</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comercializadora</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Premios</TableHead>
                      <TableHead className="text-right">Comisión (%)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Ganancia (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comercializadoraStats.map((stat) => (
                      <TableRow key={stat.comercializadoraId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                              <Buildings className="h-4 w-4 text-white" weight="fill" />
                            </div>
                            <span className="font-medium">{stat.comercializadoraName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(stat.weekSales)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(stat.weekPrizes)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-amber-600">{formatCurrency(stat.salesCommission)}</span>
                            <span className="text-xs text-muted-foreground">({stat.shareOnSales}%)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${stat.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(stat.balance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-purple-600">{formatCurrency(stat.profit)}</span>
                            <span className="text-xs text-muted-foreground">({stat.shareOnProfits}%)</span>
                          </div>
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

      {/* Ventas Semanales por Agencia (para comercializadoras) */}
      {isComercializadora && !isAgencia && visibleAgencies && visibleAgencies.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Storefront className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Ventas Semanales por Agencia</h3>
              <Badge variant="outline" className="ml-auto text-xs">Esta Semana</Badge>
            </div>
            {agencyStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowsClockwise className="h-10 w-10 text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
              </div>
            ) : agencyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Storefront className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay agencias con ventas esta semana</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agencia</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Premios</TableHead>
                      <TableHead className="text-right">Comisión (%)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyStats.map((stat) => (
                      <TableRow key={stat.agencyId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                              <Storefront className="h-4 w-4 text-white" weight="fill" />
                            </div>
                            <span className="font-medium">{stat.agencyName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(stat.weekSales)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(stat.weekPrizes)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-amber-600">{formatCurrency(stat.salesCommission)}</span>
                            <span className="text-xs text-muted-foreground">({stat.shareOnSales}%)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${stat.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(stat.balance)}
                          </span>
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

      {/* Ventas Semanales por Taquilla (para agencias) */}
      {isAgencia && visibleTaquillas && visibleTaquillas.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Ventas Semanales por Taquilla</h3>
              <Badge variant="outline" className="ml-auto text-xs">Esta Semana</Badge>
            </div>
            {taquillaStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowsClockwise className="h-10 w-10 text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
              </div>
            ) : taquillaStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay taquillas con ventas esta semana</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taquilla</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Premios</TableHead>
                      <TableHead className="text-right">Comisión (%)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taquillaStats.map((stat) => (
                      <TableRow key={stat.taquillaId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" weight="fill" />
                            </div>
                            <span className="font-medium">{stat.taquillaName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(stat.weekSales)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(stat.weekPrizes)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-amber-600">{formatCurrency(stat.salesCommission)}</span>
                            <span className="text-xs text-muted-foreground">({stat.shareOnSales}%)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${stat.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(stat.balance)}
                          </span>
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
