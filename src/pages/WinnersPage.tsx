import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useApp } from '@/contexts/AppContext'
import { formatCurrency } from '@/lib/pot-utils'
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MagnifyingGlass,
  Trophy,
  CurrencyDollar,
  CheckCircle,
  Clock,
  Target,
  CalendarBlank,
  Storefront,
  Eye,
  Wallet,
  TrendUp,
  ChartBar,
  Funnel,
  SpinnerGap
} from '@phosphor-icons/react'
import { Winner } from '@/hooks/use-winners'

export function WinnersPage() {
  const { winners, winnersLoading, loadWinners, lotteries } = useApp()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [lotteryFilter, setLotteryFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null)

  // Calcular fechas de filtros
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)

  // Filtrar ganadores
  const filteredWinners = useMemo(() => {
    return winners.filter(winner => {
      // Búsqueda
      const matchesSearch = search === '' ||
        winner.lotteryName.toLowerCase().includes(search.toLowerCase()) ||
        winner.animalName.toLowerCase().includes(search.toLowerCase()) ||
        winner.animalNumber.includes(search) ||
        winner.taquillaName.toLowerCase().includes(search.toLowerCase())

      // Filtro de lotería
      const matchesLottery = lotteryFilter === 'all' || winner.lotteryId === lotteryFilter

      // Filtro de período
      const winnerDate = new Date(winner.createdAt)
      let matchesPeriod = true
      if (periodFilter === 'today') {
        matchesPeriod = winnerDate >= todayStart
      } else if (periodFilter === 'week') {
        matchesPeriod = winnerDate >= weekStart
      } else if (periodFilter === 'month') {
        matchesPeriod = winnerDate >= monthStart
      } else if (periodFilter === 'custom' && customDateRange.from) {
        const fromDate = startOfDay(customDateRange.from)
        const toDate = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from)
        matchesPeriod = winnerDate >= fromDate && winnerDate <= toDate
      }

      // Por ahora todos están pendientes (se puede agregar campo isPaid al modelo)
      const matchesStatus = statusFilter === 'all' || statusFilter === 'pending'

      return matchesSearch && matchesLottery && matchesPeriod && matchesStatus
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [winners, search, lotteryFilter, periodFilter, statusFilter, todayStart, weekStart, monthStart, customDateRange])

  // Estadísticas
  const stats = useMemo(() => {
    const totalPremios = filteredWinners.reduce((sum, w) => sum + w.potentialWin, 0)
    const totalApostado = filteredWinners.reduce((sum, w) => sum + w.amount, 0)
    const cantidadGanadores = filteredWinners.length
    const promedioPremioPorGanador = cantidadGanadores > 0 ? totalPremios / cantidadGanadores : 0

    // Agrupar por lotería
    const porLoteria = new Map<string, { count: number; total: number }>()
    filteredWinners.forEach(w => {
      if (w.lotteryId) {
        const current = porLoteria.get(w.lotteryId) || { count: 0, total: 0 }
        porLoteria.set(w.lotteryId, {
          count: current.count + 1,
          total: current.total + w.potentialWin
        })
      }
    })

    // Agrupar por taquilla
    const porTaquilla = new Map<string, { name: string; count: number; total: number }>()
    filteredWinners.forEach(w => {
      const current = porTaquilla.get(w.taquillaId) || { name: w.taquillaName, count: 0, total: 0 }
      porTaquilla.set(w.taquillaId, {
        name: w.taquillaName,
        count: current.count + 1,
        total: current.total + w.potentialWin
      })
    })

    return {
      totalPremios,
      totalApostado,
      cantidadGanadores,
      promedioPremioPorGanador,
      porLoteria,
      porTaquilla
    }
  }, [filteredWinners])

  const handleViewDetail = (winner: Winner) => {
    setSelectedWinner(winner)
    setDetailDialogOpen(true)
  }

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
      default: return 'Hoy'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Ganadores</h2>
          <p className="text-muted-foreground">
            Administra y controla los premios de las jugadas ganadoras
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cantidadGanadores}</p>
                <p className="text-xs text-muted-foreground">Jugadas Ganadoras</p>
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
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPremios)}</p>
                <p className="text-xs text-muted-foreground">Total a Pagar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalApostado)}</p>
                <p className="text-xs text-muted-foreground">Total Apostado</p>
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
                <p className="text-2xl font-bold">{formatCurrency(stats.promedioPremioPorGanador)}</p>
                <p className="text-xs text-muted-foreground">Promedio por Premio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por lotería, número o animal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={lotteryFilter} onValueChange={setLotteryFilter}>
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
                    setPeriodFilter('today')
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

      {/* Contenido */}
      {filteredWinners.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              {search || lotteryFilter !== 'all' || periodFilter !== 'today'
                ? 'No se encontraron ganadores'
                : 'No hay ganadores de hoy'}
            </p>
            <p className="text-muted-foreground text-sm">
              {search || lotteryFilter !== 'all' || periodFilter !== 'today'
                ? 'Intenta con otros criterios de búsqueda'
                : 'Los ganadores aparecerán aquí cuando se carguen resultados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Resumen por período */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{filteredWinners.length}</span> ganadores - {getPeriodLabel()}
            </p>
          </div>

          {/* Grid de ganadores */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredWinners.map((winner) => (
              <Card
                key={winner.id}
                className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500"
              >
                <CardContent className="p-4">
                  {/* Header de la card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{winner.animalNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm leading-tight">
                          {winner.animalName}
                        </h3>
                        <p className="text-xs text-muted-foreground">{winner.lotteryName}</p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200"
                        >
                          <Clock weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Pendiente
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(winner)}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                      <span>{format(new Date(winner.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Storefront className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{winner.taquillaName}</span>
                    </div>
                  </div>

                  {/* Montos */}
                  <div className="pt-3 border-t mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/50 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Apostado</p>
                        <p className="text-sm font-bold">{formatCurrency(winner.amount)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-amber-600">Premio</p>
                        <p className="text-sm font-bold text-amber-700">{formatCurrency(winner.potentialWin)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resumen por Lotería */}
      {stats.porLoteria.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <ChartBar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumen por Lotería</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(stats.porLoteria.entries()).map(([lotteryId, data]) => {
                const lottery = lotteries.find(l => l.id === lotteryId)
                return (
                  <div key={lotteryId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{lottery?.name || 'Desconocida'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(data.total)}</p>
                      <p className="text-xs text-muted-foreground">{data.count} ganadores</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen por Taquilla */}
      {stats.porTaquilla.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Storefront className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumen por Taquilla</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(stats.porTaquilla.entries()).map(([taquillaId, data]) => (
                <div key={taquillaId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Storefront className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{data.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(data.total)}</p>
                    <p className="text-xs text-muted-foreground">{data.count} ganadores</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalles */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                <Trophy className="h-6 w-6 text-white" weight="fill" />
              </div>
              <div>
                <DialogTitle>Detalle de Premio</DialogTitle>
                <DialogDescription>
                  Información completa del ganador
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedWinner && (
            <div className="space-y-4">
              {/* Número ganador */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 mb-2">
                  <span className="text-2xl font-bold text-white">{selectedWinner.animalNumber}</span>
                </div>
                <p className="text-lg font-semibold text-amber-800">{selectedWinner.animalName}</p>
                <p className="text-sm text-amber-600">{selectedWinner.lotteryName}</p>
              </div>

              {/* Información */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarBlank className="h-4 w-4" />
                    <span className="text-sm">Fecha</span>
                  </div>
                  <span className="text-sm font-medium">
                    {format(new Date(selectedWinner.createdAt), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Hora</span>
                  </div>
                  <span className="text-sm font-medium">
                    {format(new Date(selectedWinner.createdAt), "HH:mm", { locale: es })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Storefront className="h-4 w-4" />
                    <span className="text-sm">Taquilla</span>
                  </div>
                  <span className="text-sm font-medium">{selectedWinner.taquillaName}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm">Monto Apostado</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(selectedWinner.amount)}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm font-medium">Premio a Pagar</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{formatCurrency(selectedWinner.potentialWin)}</span>
                </div>
              </div>

              {/* Estado */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Clock className="mr-1 h-3 w-3" />
                  Pendiente de Pago
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
