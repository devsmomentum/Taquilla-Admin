import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/pot-utils"
import { DailyResult, Lottery, Bet, User } from "@/lib/types"
import { format, startOfDay, startOfWeek, startOfMonth, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Trophy, ChartBar, Storefront } from "@phosphor-icons/react"
import { useState, useMemo } from "react"

interface ReportsCardProps {
  dailyResults: DailyResult[]
  lotteries: Lottery[]
  bets?: Bet[]
  users?: User[]
}

interface ResultsStats {
  totalResults: number
  totalPayout: number
  resultsWithWinners: number
  resultsWithoutWinners: number
  totalRaised: number
  averagePayout: number
}

export function ReportsCard({ dailyResults, lotteries, bets = [], users = [] }: ReportsCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Filtrar resultados por período
  const filteredResults = useMemo(() => {
    return dailyResults.filter(result => {
      const resultDate = parseISO(result.resultDate)
      switch (selectedPeriod) {
        case 'today':
          return resultDate >= todayStart
        case 'week':
          return resultDate >= weekStart
        case 'month':
          return resultDate >= monthStart
        default:
          return true
      }
    })
  }, [dailyResults, selectedPeriod, todayStart, weekStart, monthStart])

  // Calcular estadísticas
  const stats = useMemo((): ResultsStats => {
    const totalResults = filteredResults.length
    const totalPayout = filteredResults.reduce((sum, r) => sum + (r.totalToPay || 0), 0)
    const totalRaised = filteredResults.reduce((sum, r) => sum + (r.totalRaised || 0), 0)
    const resultsWithWinners = filteredResults.filter(r => (r.totalToPay || 0) > 0).length
    const resultsWithoutWinners = totalResults - resultsWithWinners
    const averagePayout = resultsWithWinners > 0 ? totalPayout / resultsWithWinners : 0

    return {
      totalResults,
      totalPayout,
      totalRaised,
      resultsWithWinners,
      resultsWithoutWinners,
      averagePayout
    }
  }, [filteredResults])

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

  // Items más ganadores
  const topWinningAnimals = useMemo(() => {
    const animalStats = new Map<string, { name: string; wins: number; totalPayout: number }>()

    filteredResults.filter(r => (r.totalToPay || 0) > 0).forEach((result) => {
      if (result.prize) {
        const key = `${result.prize.animalNumber}-${result.prize.animalName}`
        const current = animalStats.get(key) || { name: `${result.prize.animalNumber} - ${result.prize.animalName}`, wins: 0, totalPayout: 0 }
        animalStats.set(key, {
          name: current.name,
          wins: current.wins + 1,
          totalPayout: current.totalPayout + (result.totalToPay || 0)
        })
      }
    })

    return Array.from(animalStats.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
  }, [filteredResults])

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Hoy'
      case 'week': return 'Esta Semana'
      case 'month': return 'Este Mes'
      default: return 'Todos los tiempos'
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Selector de período */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Reportes y Estadísticas</h3>
          <p className="text-sm text-muted-foreground">Análisis de resultados diarios</p>
        </div>
        <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Resultados Cargados</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums">{stats.totalResults}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              {getPeriodLabel()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Total a Pagar</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums overflow-hidden text-ellipsis text-red-600">{formatCurrency(stats.totalPayout)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              {stats.resultsWithWinners} resultados con ganadores
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Ganancia Neta</CardDescription>
            <CardTitle className={`text-lg md:text-xl lg:text-2xl tabular-nums ${stats.totalRaised >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatCurrency(Math.abs(stats.totalRaised))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              {stats.totalRaised >= 0 ? 'Utilidad' : 'Pérdida'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Promedio por Premio</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums overflow-hidden text-ellipsis">{formatCurrency(stats.averagePayout)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              Cuando hay ganadores
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y detalles */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Top Loterías */}
        <Card>
          <CardHeader>
            <CardTitle>Loterías con Más Premios Pagados</CardTitle>
            <CardDescription>Ranking por premios pagados</CardDescription>
          </CardHeader>
          <CardContent>
            {topLotteries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay datos disponibles</p>
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
                        <p className="text-xs text-muted-foreground">{lottery.results} resultados</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-red-600">{formatCurrency(lottery.payout)}</p>
                        <p className={`text-xs ${lottery.raised >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {lottery.raised >= 0 ? '+' : ''}{formatCurrency(lottery.raised)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Top Animales Ganadores */}
        <Card>
          <CardHeader>
            <CardTitle>Items Más Ganadores</CardTitle>
            <CardDescription>Top 10 items con más victorias</CardDescription>
          </CardHeader>
          <CardContent>
            {topWinningAnimals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay datos de ganadores</p>
            ) : (
              <ScrollArea className="h-[300px] md:h-[400px]">
                <div className="space-y-2">
                  {topWinningAnimals.map((animal, index) => (
                    <div key={animal.name} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{animal.name}</p>
                          <p className="text-xs text-muted-foreground">{animal.wins} {animal.wins === 1 ? 'vez' : 'veces'} ganador</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(animal.totalPayout)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Taquillas */}
      {bets.length > 0 && users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Storefront className="h-5 w-5" />
              Ventas por Taquilla
            </CardTitle>
            <CardDescription>
              Taquillas con mayores ventas en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-4">
                {(() => {
                  const taquillaStats = new Map<string, number>()

                  // Filtrar apuestas por fecha
                  const periodBets = bets.filter(bet => {
                    const betDate = new Date(bet.timestamp)
                    switch (selectedPeriod) {
                      case 'today': return betDate >= todayStart
                      case 'week': return betDate >= weekStart
                      case 'month': return betDate >= monthStart
                      default: return true
                    }
                  })

                  periodBets.forEach(bet => {
                    if (bet.userId) {
                      const current = taquillaStats.get(bet.userId) || 0
                      taquillaStats.set(bet.userId, current + bet.amount)
                    }
                  })

                  const sortedTaquillas = Array.from(taquillaStats.entries())
                    .map(([userId, amount]) => {
                      const user = users.find(u => u.id === userId)
                      return {
                        name: user?.name || 'Desconocido',
                        amount
                      }
                    })
                    .sort((a, b) => b.amount - a.amount)

                  if (sortedTaquillas.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-4">No hay ventas registradas en este período</p>
                  }

                  return sortedTaquillas.map((t, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted-foreground w-6">#{i + 1}</span>
                        <span className="font-medium">{t.name}</span>
                      </div>
                      <span className="font-bold">{formatCurrency(t.amount)}</span>
                    </div>
                  ))
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Resumen detallado */}
      {filteredResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Período: {getPeriodLabel()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Total de Resultados</p>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.totalResults}</span>
                </div>
              </div>
              <Separator className="md:hidden" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Con Ganadores</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{stats.resultsWithWinners}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({stats.totalResults > 0 ? ((stats.resultsWithWinners / stats.totalResults) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <Separator className="md:hidden" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Sin Ganadores</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stats.resultsWithoutWinners}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({stats.totalResults > 0 ? ((stats.resultsWithoutWinners / stats.totalResults) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
