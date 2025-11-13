import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/pot-utils"
import { DrawResult, Lottery } from "@/lib/types"
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { Trophy, ChartBar } from "@phosphor-icons/react"
import { useState, useMemo } from "react"

interface ReportsCardProps {
  draws: DrawResult[]
  lotteries: Lottery[]
}

interface DrawsStats {
  totalDraws: number
  totalPayout: number
  drawsWithWinners: number
  drawsWithoutWinners: number
  averagePayout: number
}

export function ReportsCard({ draws, lotteries }: ReportsCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Filtrar sorteos por período
  const filteredDraws = useMemo(() => {
    return draws.filter(draw => {
      const drawDate = new Date(draw.drawTime)
      switch (selectedPeriod) {
        case 'today':
          return drawDate >= todayStart
        case 'week':
          return drawDate >= weekStart
        case 'month':
          return drawDate >= monthStart
        default:
          return true
      }
    })
  }, [draws, selectedPeriod, todayStart, weekStart, monthStart])

  // Calcular estadísticas
  const stats = useMemo((): DrawsStats => {
    const totalDraws = filteredDraws.length
    const totalPayout = filteredDraws.reduce((sum, draw) => sum + (draw.totalPayout || 0), 0)
    const drawsWithWinners = filteredDraws.filter(d => (d.winnersCount || 0) > 0).length
    const drawsWithoutWinners = totalDraws - drawsWithWinners
    const averagePayout = drawsWithWinners > 0 ? totalPayout / drawsWithWinners : 0

    return {
      totalDraws,
      totalPayout,
      drawsWithWinners,
      drawsWithoutWinners,
      averagePayout
    }
  }, [filteredDraws])

  // Top loterías por premios pagados
  const topLotteries = useMemo(() => {
    const lotteryStats = new Map<string, { name: string; payout: number; draws: number }>()

    filteredDraws.forEach((draw) => {
      const current = lotteryStats.get(draw.lotteryId) || { name: draw.lotteryName, payout: 0, draws: 0 }
      lotteryStats.set(draw.lotteryId, {
        name: draw.lotteryName,
        payout: current.payout + (draw.totalPayout || 0),
        draws: current.draws + 1,
      })
    })

    return Array.from(lotteryStats.values())
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 5)
  }, [filteredDraws])

  // Animales más ganadores
  const topWinningAnimals = useMemo(() => {
    const animalStats = new Map<string, { name: string; wins: number; totalPayout: number }>()

    filteredDraws.filter(d => (d.winnersCount || 0) > 0).forEach((draw) => {
      const key = `${draw.winningAnimalNumber}-${draw.winningAnimalName}`
      const current = animalStats.get(key) || { name: `${draw.winningAnimalNumber} - ${draw.winningAnimalName}`, wins: 0, totalPayout: 0 }
      animalStats.set(key, {
        name: current.name,
        wins: current.wins + 1,
        totalPayout: current.totalPayout + (draw.totalPayout || 0)
      })
    })

    return Array.from(animalStats.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
  }, [filteredDraws])

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
          <p className="text-sm text-muted-foreground">Análisis de sorteos realizados</p>
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
            <CardDescription className="text-xs md:text-sm">Sorteos Realizados</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums">{stats.totalDraws}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              {getPeriodLabel()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Premios Pagados</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums overflow-hidden text-ellipsis">{formatCurrency(stats.totalPayout)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              {stats.drawsWithWinners} sorteos con ganadores
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs md:text-sm">Con Ganadores</CardDescription>
            <CardTitle className="text-lg md:text-xl lg:text-2xl tabular-nums">{stats.drawsWithWinners}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs md:text-sm text-muted-foreground">
              {stats.totalDraws > 0 ? ((stats.drawsWithWinners / stats.totalDraws) * 100).toFixed(1) : 0}% del total
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
            <CardTitle>Loterías con Más Premios</CardTitle>
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
                        <p className="text-xs text-muted-foreground">{lottery.draws} sorteos</p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatCurrency(lottery.payout)}</p>
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
            <CardTitle>Animales Más Ganadores</CardTitle>
            <CardDescription>Top 10 animales con más victorias</CardDescription>
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

      {/* Resumen detallado */}
      {filteredDraws.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Período: {getPeriodLabel()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Total de Sorteos</p>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.totalDraws}</span>
                </div>
              </div>
              <Separator className="md:hidden" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Con Ganadores</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{stats.drawsWithWinners}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({stats.totalDraws > 0 ? ((stats.drawsWithWinners / stats.totalDraws) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <Separator className="md:hidden" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Sin Ganadores</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stats.drawsWithoutWinners}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({stats.totalDraws > 0 ? ((stats.drawsWithoutWinners / stats.totalDraws) * 100).toFixed(1) : 0}%)
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
