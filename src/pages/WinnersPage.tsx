import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp } from '@/contexts/AppContext'
import { filterBets } from '@/lib/filter-utils'
import { formatCurrency } from '@/lib/pot-utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MagnifyingGlass } from '@phosphor-icons/react'

export function WinnersPage() {
  const { winners, dailyResults, lotteries } = useApp()

  const [winnerSearch, setWinnerSearch] = useState('')
  const [winnerFilters, setWinnerFilters] = useState<{ lotteryId?: string }>({})

  const filteredWinners = filterBets(winners, winnerSearch, winnerFilters)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Consulta de Ganadores</h2>
          <p className="text-muted-foreground text-sm">Ver y consultar todas las jugadas ganadoras del sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Ganadores</CardTitle>
          <CardDescription>Resumen general de jugadas ganadoras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{winners.length}</div>
              <div className="text-sm text-muted-foreground">Jugadas Ganadoras</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(winners.reduce((sum, b) => sum + b.potentialWin, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Premios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(winners.reduce((sum, b) => sum + b.amount, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Apostado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{dailyResults.length}</div>
              <div className="text-sm text-muted-foreground">Resultados Cargados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Jugadas Ganadoras</CardTitle>
          <CardDescription>Consulta detallada de todas las jugadas que ganaron premios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por lotería o item..."
                value={winnerSearch}
                onChange={(e) => setWinnerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={winnerFilters.lotteryId || 'all'}
              onValueChange={(value) =>
                setWinnerFilters((f) => ({ ...f, lotteryId: value === 'all' ? undefined : value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por sorteo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sorteos</SelectItem>
                {lotteries.map((lottery) => (
                  <SelectItem key={lottery.id} value={lottery.id}>
                    {lottery.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredWinners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {winners.length === 0 ? 'No hay ganadores aún' : 'No se encontraron ganadores'}
            </p>
          ) : (
            <ScrollArea className="h-[400px] md:h-[500px]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="whitespace-nowrap">Lotería</TableHead>
                      <TableHead className="whitespace-nowrap">Item</TableHead>
                      <TableHead className="whitespace-nowrap">Apuesta</TableHead>
                      <TableHead className="whitespace-nowrap">Premio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWinners
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((bet) => (
                        <TableRow key={bet.id}>
                          <TableCell className="whitespace-nowrap text-xs md:text-sm">
                            {format(new Date(bet.timestamp), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs md:text-sm">{bet.lotteryName}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs md:text-sm">
                            {bet.animalNumber} - {bet.animalName}
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap text-xs md:text-sm">
                            {formatCurrency(bet.amount)}
                          </TableCell>
                          <TableCell className="tabular-nums font-semibold text-accent whitespace-nowrap text-xs md:text-sm">
                            {formatCurrency(bet.potentialWin)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
