import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Bet, DailyResult, Lottery } from "@/lib/types"
import { formatCurrency } from "@/lib/pot-utils"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ChartBar } from "@phosphor-icons/react"

interface DrawStatsCardProps {
  bets: Bet[]
  dailyResults: DailyResult[]
  lotteries: Lottery[]
}

interface AnimalStats {
  animalNumber: string
  animalName: string
  totalBets: number
  totalAmount: number
  percentage: number
  betCount: number
}

export function DrawStatsCard({ bets, dailyResults, lotteries }: DrawStatsCardProps) {
  const [selectedResultId, setSelectedResultId] = useState<string>("")

  const sortedResults = useMemo(() => {
    return [...dailyResults].sort((a, b) => new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime())
  }, [dailyResults])

  const animalStats = useMemo<AnimalStats[]>(() => {
    if (!selectedResultId) return []

    const selectedResult = dailyResults.find((r) => r.id === selectedResultId)
    if (!selectedResult) return []

    const resultDate = parseISO(selectedResult.resultDate)
    const dayStart = new Date(resultDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(resultDate)
    dayEnd.setHours(23, 59, 59, 999)

    const dayBets = bets.filter((bet) => {
      const betDate = new Date(bet.timestamp)
      return (
        bet.lotteryId === selectedResult.lotteryId &&
        betDate >= dayStart &&
        betDate <= dayEnd
      )
    })

    const totalAmount = dayBets.reduce((sum, bet) => sum + bet.amount, 0)

    const statsMap = new Map<string, AnimalStats>()

    dayBets.forEach((bet) => {
      const key = bet.animalNumber
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          animalNumber: bet.animalNumber,
          animalName: bet.animalName,
          totalBets: 0,
          totalAmount: 0,
          percentage: 0,
          betCount: 0,
        })
      }

      const stats = statsMap.get(key)!
      stats.totalAmount += bet.amount
      stats.betCount += 1
      stats.totalBets += bet.amount
    })

    const statsArray = Array.from(statsMap.values()).map((stat) => ({
      ...stat,
      percentage: totalAmount > 0 ? (stat.totalAmount / totalAmount) * 100 : 0,
    }))

    return statsArray.sort((a, b) => b.totalAmount - a.totalAmount)
  }, [selectedResultId, bets, dailyResults])

  const selectedResult = dailyResults.find((r) => r.id === selectedResultId)
  const totalAmount = animalStats.reduce((sum, stat) => sum + stat.totalAmount, 0)
  const totalBetCount = animalStats.reduce((sum, stat) => sum + stat.betCount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar className="h-5 w-5" />
          Estadísticas por Animalito
        </CardTitle>
        <CardDescription>
          Seleccione un resultado para ver el porcentaje de jugadas por animalito
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar Resultado</label>
          <Select value={selectedResultId} onValueChange={setSelectedResultId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un resultado..." />
            </SelectTrigger>
            <SelectContent>
              {sortedResults.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No hay resultados cargados</div>
              ) : (
                sortedResults.map((result) => (
                  <SelectItem key={result.id} value={result.id}>
                    {result.lottery?.name || 'Lotería'} - {format(parseISO(result.resultDate), "dd/MM/yyyy", { locale: es })} - Ganador: {result.prize?.animalNumber || '??'} {result.prize?.animalName || ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedResultId && selectedResult && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xl md:text-2xl font-bold tabular-nums">{formatCurrency(totalAmount)}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Jugado</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xl md:text-2xl font-bold tabular-nums">{totalBetCount}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Jugadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xl md:text-2xl font-bold tabular-nums">{animalStats.length}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">Animalitos Jugados</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-medium">Animalito Ganador</h3>
                <Badge variant="default" className="text-xs">
                  {selectedResult.prize?.animalNumber || '??'} - {selectedResult.prize?.animalName || 'Desconocido'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-medium">Fecha del Resultado</h3>
                <div className="text-xs md:text-sm font-semibold">
                  {format(parseISO(selectedResult.resultDate), "dd/MM/yyyy", { locale: es })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-medium">Total a Pagar</h3>
                <div className="text-xs md:text-sm font-semibold text-red-600">
                  {formatCurrency(selectedResult.totalToPay || 0)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-medium">Ganancia Neta</h3>
                <div className={`text-xs md:text-sm font-semibold ${(selectedResult.totalRaised || 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatCurrency(selectedResult.totalRaised || 0)}
                </div>
              </div>
            </div>

            {animalStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No hay jugadas registradas para este resultado
              </p>
            ) : (
              <ScrollArea className="h-[400px] md:h-[500px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] md:w-[60px] whitespace-nowrap">Pos.</TableHead>
                        <TableHead className="whitespace-nowrap">Animalito</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Jugadas</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                        <TableHead className="text-right whitespace-nowrap">%</TableHead>
                        <TableHead className="w-[120px] md:w-[200px] whitespace-nowrap">Distribución</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {animalStats.map((stat, index) => {
                      const isWinner = stat.animalNumber === selectedResult.prize?.animalNumber
                      return (
                        <TableRow key={stat.animalNumber} className={isWinner ? "bg-accent/20" : ""}>
                          <TableCell className="font-medium text-xs md:text-sm">
                            {index + 1}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{stat.animalNumber}</span>
                              <span className="truncate">{stat.animalName}</span>
                              {isWinner && (
                                <Badge variant="default" className="text-xs shrink-0">
                                  Ganador
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs md:text-sm">
                            {stat.betCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-xs md:text-sm">
                            {formatCurrency(stat.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-xs md:text-sm">
                            {stat.percentage.toFixed(2)}%
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={stat.percentage} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground tabular-nums min-w-[40px] md:min-w-[45px]">
                                {stat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {!selectedResultId && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ChartBar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Seleccione un resultado</p>
            <p className="text-muted-foreground">
              Elija un resultado del menú desplegable para ver las estadísticas detalladas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
