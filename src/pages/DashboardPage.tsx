import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/contexts/AppContext'
import { useSalesStats } from '@/hooks/use-sales-stats'
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
  CalendarBlank,
  ChartLineUp
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
    visibleTaquillaIds
  } = useApp()

  const { stats: salesStats, loading: salesLoading, refresh: refreshSales } = useSalesStats({ visibleTaquillaIds })

  // Estadísticas de resultados del día
  const todayStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayResults = dailyResults.filter(r => r.resultDate === today)

    const totalPayout = todayResults.reduce((sum, r) => sum + (r.totalToPay || 0), 0)
    const totalRaised = todayResults.reduce((sum, r) => sum + (r.totalRaised || 0), 0)
    const resultsCount = todayResults.length
    const resultsWithWinners = todayResults.filter(r => (r.totalToPay || 0) > 0).length

    return {
      totalPayout,
      totalRaised,
      resultsCount,
      resultsWithWinners
    }
  }, [dailyResults])

  // Ganadores del día
  const todayWinners = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return winners.filter(w => new Date(w.createdAt) >= today)
  }, [winners])

  // Últimos resultados
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
  }

  const isLoading = dailyResultsLoading || winnersLoading || salesLoading

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
        {/* Últimos resultados */}
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
