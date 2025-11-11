import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/pot-utils"
import { Bet, DrawResult, Lottery } from "@/lib/types"
import { useSupabaseReports, ReportData } from "@/hooks/use-supabase-reports"
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { 
  TrendUp, 
  TrendDown, 
  Minus, 
  Calendar, 
  Ticket, 
  Trophy, 
  ChartBar, 
  Download, 
  ArrowsClockwise,
  CloudArrowUp,
  Archive 
} from "@phosphor-icons/react"
import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"

interface ReportsCardProps {
  bets: Bet[]
  draws: DrawResult[]
  lotteries: Lottery[]
}

interface SalesStats {
  totalSales: number
  totalBets: number
  averageBet: number
  totalPayout: number
  netProfit: number
  winners: number
}

export function ReportsCard({ bets, draws, lotteries }: ReportsCardProps) {
  const [selectedReportType, setSelectedReportType] = useState<'current' | 'daily' | 'weekly' | 'monthly'>('current')
  const [selectedReportId, setSelectedReportId] = useState<string>('')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Hook de reportes con Supabase
  const {
    reports,
    isLoading: reportsLoading,
    error: reportsError,
    generateReport,
    syncReportsWithSupabase,
    clearOldReports
  } = useSupabaseReports(bets, draws, lotteries)

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Funciones helper
  const calculateStats = (filteredBets: Bet[], filteredDraws: DrawResult[]): SalesStats => {
    const totalSales = filteredBets.reduce((sum, bet) => sum + bet.amount, 0)
    const totalBets = filteredBets.length
    const averageBet = totalBets > 0 ? totalSales / totalBets : 0
    const totalPayout = filteredDraws.reduce((sum, draw) => sum + draw.totalPayout, 0)
    const netProfit = totalSales - totalPayout
    const winners = filteredBets.filter((b) => b.isWinner).length

    return { totalSales, totalBets, averageBet, totalPayout, netProfit, winners }
  }

  const getTopLotteries = (betsData: Bet[]) => {
    const lotteryStats = new Map<string, { name: string; sales: number; bets: number }>()

    betsData.forEach((bet) => {
      const current = lotteryStats.get(bet.lotteryId) || { name: bet.lotteryName, sales: 0, bets: 0 }
      lotteryStats.set(bet.lotteryId, {
        name: bet.lotteryName,
        sales: current.sales + bet.amount,
        bets: current.bets + 1,
      })
    })

    return Array.from(lotteryStats.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
  }

  const getTopAnimals = (betsData: Bet[]) => {
    const animalStats = new Map<string, { name: string; bets: number; amount: number }>()

    betsData.forEach((bet) => {
      const key = `${bet.animalNumber}-${bet.animalName}`
      const current = animalStats.get(key) || { name: bet.animalName, bets: 0, amount: 0 }
      animalStats.set(key, {
        name: bet.animalName,
        bets: current.bets + 1,
        amount: current.amount + bet.amount,
      })
    })

    return Array.from(animalStats.entries())
      .sort((a, b) => b[1].bets - a[1].bets)
      .slice(0, 10)
      .map(([key, value]) => ({ number: key.split("-")[0], ...value }))
  }

  const getHourlyData = (betsData: Bet[]) => {
    const hourlyData = new Map<number, { bets: number; sales: number }>()

    betsData.forEach((bet) => {
      const hour = new Date(bet.timestamp).getHours()
      const current = hourlyData.get(hour) || { bets: 0, sales: 0 }
      hourlyData.set(hour, {
        bets: current.bets + 1,
        sales: current.sales + bet.amount,
      })
    })

    return Array.from(hourlyData.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        ...data,
      }))
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendUp className="text-accent" weight="bold" />
    if (current < previous) return <TrendDown className="text-destructive" weight="bold" />
    return <Minus className="text-muted-foreground" />
  }

  // Obtener datos del reporte seleccionado o calcular en tiempo real
  const currentReportData = useMemo(() => {
    if (selectedReportType === 'current') {
      // Calcular estadísticas en tiempo real como antes
      const todayBets = bets.filter((b) => new Date(b.timestamp) >= todayStart)
      const todayDraws = draws.filter((d) => new Date(d.drawTime) >= todayStart)
      const todayStats = calculateStats(todayBets, todayDraws)

      const weekBets = bets.filter((b) => new Date(b.timestamp) >= weekStart)
      const weekDraws = draws.filter((d) => new Date(d.drawTime) >= weekStart)
      const weekStats = calculateStats(weekBets, weekDraws)

      const monthBets = bets.filter((b) => new Date(b.timestamp) >= monthStart)
      const monthDraws = draws.filter((d) => new Date(d.drawTime) >= monthStart)
      const monthStats = calculateStats(monthBets, monthDraws)

      const allTimeStats = calculateStats(bets, draws)

      return {
        todayStats,
        weekStats,
        monthStats,
        allTimeStats,
        topLotteries: getTopLotteries(bets),
        topAnimals: getTopAnimals(bets),
        hourlyData: getHourlyData(todayBets),
        isFromCache: false
      }
    } else {
      // Buscar reporte guardado
      const report = reports.find(r => r.id === selectedReportId)
      if (report) {
        return {
          todayStats: {
            totalSales: report.data.totalSales,
            totalBets: report.data.totalBets,
            averageBet: report.data.averageBet,
            totalPayout: report.data.totalPayout,
            netProfit: report.data.netProfit,
            winners: report.data.winners
          },
          weekStats: { totalSales: 0, totalBets: 0, averageBet: 0, totalPayout: 0, netProfit: 0, winners: 0 },
          monthStats: { totalSales: 0, totalBets: 0, averageBet: 0, totalPayout: 0, netProfit: 0, winners: 0 },
          allTimeStats: { totalSales: 0, totalBets: 0, averageBet: 0, totalPayout: 0, netProfit: 0, winners: 0 },
          topLotteries: report.data.topLotteries,
          topAnimals: report.data.topAnimals,
          hourlyData: report.data.hourlyData,
          trends: report.data.trends,
          isFromCache: true,
          report
        }
      }
      return null
    }
  }, [selectedReportType, selectedReportId, bets, draws, reports, todayStart, weekStart, monthStart])

  // Generar nuevo reporte
  const handleGenerateReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    setIsGeneratingReport(true)
    try {
      const report = await generateReport(type)
      if (report) {
        setSelectedReportType(type)
        setSelectedReportId(report.id)
        toast.success(`Reporte ${type} generado y guardado`)
      }
    } catch (error) {
      toast.error('Error generando reporte')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Sincronizar con Supabase
  const handleSync = async () => {
    try {
      await syncReportsWithSupabase()
      toast.success('Reportes sincronizados')
    } catch (error) {
      toast.error('Error sincronizando reportes')
    }
  }

  // Limpiar reportes antiguos
  const handleCleanOldReports = async () => {
    try {
      await clearOldReports(90)
      toast.success('Reportes antiguos eliminados')
    } catch (error) {
      toast.error('Error limpiando reportes')
    }
  }

  // Filtrar reportes por tipo
  const filteredReports = useMemo(() => {
    if (selectedReportType === 'current') return []
    return reports.filter(r => r.type === selectedReportType)
  }, [reports, selectedReportType])

  if (!currentReportData) {
    return (
      <div className="space-y-4 md:space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              {reportsLoading ? 'Cargando reportes...' : 'Selecciona un reporte para visualizar'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { todayStats, weekStats, monthStats, allTimeStats, topLotteries, topAnimals, hourlyData, trends, isFromCache, report } = currentReportData
  const peakHour = hourlyData?.length > 0 ? hourlyData.reduce((max, curr) => (curr.bets > max.bets ? curr : max)) : null

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Controles de reportes */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Select value={selectedReportType} onValueChange={(value: any) => {
            setSelectedReportType(value)
            if (value === 'current') {
              setSelectedReportId('')
            }
          }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo de reporte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Tiempo Real</SelectItem>
              <SelectItem value="daily">Reportes Diarios</SelectItem>
              <SelectItem value="weekly">Reportes Semanales</SelectItem>
              <SelectItem value="monthly">Reportes Mensuales</SelectItem>
            </SelectContent>
          </Select>

          {selectedReportType !== 'current' && (
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Seleccionar reporte..." />
              </SelectTrigger>
              <SelectContent>
                {filteredReports.map(report => (
                  <SelectItem key={report.id} value={report.id}>
                    <div className="flex items-center gap-2">
                      <span>{report.title}</span>
                      {report.syncedToSupabase && (
                        <CloudArrowUp size={14} className="text-accent" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          {selectedReportType !== 'current' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateReport(selectedReportType as any)}
                disabled={isGeneratingReport}
              >
                <Download size={16} className="mr-2" />
                {isGeneratingReport ? 'Generando...' : 'Generar'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync}>
                <ArrowsClockwise size={16} className="mr-2" />
                Sincronizar
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleCleanOldReports}>
            <Archive size={16} className="mr-2" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Indicador de fuente de datos */}
      {isFromCache && report && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Archive className="text-accent" size={16} />
              <span className="font-medium">Reporte guardado:</span>
              <span>{report.title}</span>
              <span className="text-muted-foreground">
                ({format(new Date(report.generatedAt), 'dd/MM/yyyy HH:mm', { locale: es })})
              </span>
              {report.syncedToSupabase && (
                <Badge variant="secondary" className="ml-2">
                  <CloudArrowUp size={12} className="mr-1" />
                  Supabase
                </Badge>
              )}
              {trends && (
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    Ventas: {getTrendIcon(trends.salesTrend, 0)} {trends.salesTrend.toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    Jugadas: {getTrendIcon(trends.betsTrend, 0)} {trends.betsTrend.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {reportsError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">Error: {reportsError}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Ventas de Hoy</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums overflow-hidden text-ellipsis">{formatCurrency(todayStats.totalSales)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              {!isFromCache && getTrendIcon(todayStats.totalSales, weekStats.totalSales / 7)}
              <span className="text-muted-foreground truncate">
                {!isFromCache ? `vs promedio semanal (${formatCurrency(weekStats.totalSales / 7)})` : 'Del período seleccionado'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Jugadas de Hoy</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums">{todayStats.totalBets}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              {!isFromCache && getTrendIcon(todayStats.totalBets, weekStats.totalBets / 7)}
              <span className="text-muted-foreground truncate">
                {!isFromCache ? `vs promedio semanal (${Math.round(weekStats.totalBets / 7)})` : 'Del período seleccionado'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Premios Pagados</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums overflow-hidden text-ellipsis">{formatCurrency(todayStats.totalPayout)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="text-muted-foreground">{todayStats.winners} ganadores</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Ganancia Neta</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums overflow-hidden text-ellipsis">{formatCurrency(todayStats.netProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="text-muted-foreground">
                Margen: {todayStats.totalSales > 0 ? ((todayStats.netProfit / todayStats.totalSales) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isFromCache && (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Período</CardTitle>
              <CardDescription>Comparativa de ventas y premios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Hoy</span>
                    <Badge>{todayStats.totalBets} jugadas</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ventas:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(todayStats.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Premios:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(todayStats.totalPayout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neto:</span>
                      <span className="font-semibold tabular-nums text-accent">
                        {formatCurrency(todayStats.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Esta Semana</span>
                    <Badge variant="secondary">{weekStats.totalBets} jugadas</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ventas:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(weekStats.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Premios:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(weekStats.totalPayout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neto:</span>
                      <span className="font-semibold tabular-nums text-accent">
                        {formatCurrency(weekStats.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Este Mes</span>
                    <Badge variant="outline">{monthStats.totalBets} jugadas</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ventas:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(monthStats.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Premios:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(monthStats.totalPayout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neto:</span>
                      <span className="font-semibold tabular-nums text-accent">
                        {formatCurrency(monthStats.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Acumulado</span>
                    <Badge variant="outline">{allTimeStats.totalBets} jugadas</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ventas:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(allTimeStats.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Premios:</span>
                      <span className="font-medium tabular-nums">{formatCurrency(allTimeStats.totalPayout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neto:</span>
                      <span className="font-semibold tabular-nums text-accent">
                        {formatCurrency(allTimeStats.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loterías Más Vendidas</CardTitle>
              <CardDescription>Ranking por volumen de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              {topLotteries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay datos de ventas</p>
              ) : (
                <ScrollArea className="h-[300px] md:h-[400px]">
                  <div className="space-y-3">
                    {topLotteries.map((lottery, index) => (
                      <div key={lottery.name} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{lottery.name}</p>
                          <p className="text-xs text-muted-foreground">{lottery.bets} jugadas</p>
                        </div>
                        <p className="font-semibold tabular-nums">{formatCurrency(lottery.sales)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Animalitos Más Jugados</CardTitle>
            <CardDescription>Top 10 por cantidad de jugadas</CardDescription>
          </CardHeader>
          <CardContent>
            {topAnimals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay datos de jugadas</p>
            ) : (
              <ScrollArea className="h-[280px] md:h-[350px]">
                <div className="space-y-2">
                  {topAnimals.map((animal, index) => (
                    <div key={animal.number} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {animal.number}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{animal.name}</p>
                          <p className="text-xs text-muted-foreground">{animal.bets} jugadas</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(animal.amount)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad por Hora {isFromCache ? '(Del Reporte)' : '(Hoy)'}</CardTitle>
            <CardDescription>Distribución de jugadas durante el día</CardDescription>
          </CardHeader>
          <CardContent>
            {hourlyData?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay datos</p>
            ) : (
              <div className="space-y-4">
                {peakHour && (
                  <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
                    <ChartBar className="text-accent" weight="bold" size={20} />
                    <div className="text-sm">
                      <p className="font-medium">Hora pico: {peakHour.hour}</p>
                      <p className="text-muted-foreground">
                        {peakHour.bets} jugadas · {formatCurrency(peakHour.sales)}
                      </p>
                    </div>
                  </div>
                )}
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {hourlyData?.map((data) => (
                      <div key={data.hour} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono">{data.hour}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{data.bets} jugadas</span>
                            <span className="font-medium tabular-nums">{formatCurrency(data.sales)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all"
                            style={{
                              width: `${peakHour ? (data.bets / peakHour.bets) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}