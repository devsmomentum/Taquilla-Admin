import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Taquilla } from "@/lib/types"
import { formatCurrency } from "@/lib/pot-utils"
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import {
  ChartBar,
  Ticket,
  CurrencyDollar,
  Trophy,
  Percent,
  TrendUp,
  TrendDown,
  Calendar,
  Spinner,
  CaretLeft,
  CaretRight,
  Receipt,
  CaretDown,
  CaretUp,
  Eye
} from "@phosphor-icons/react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  taquilla: Taquilla | null
}

interface CashRegister {
  id: string
  userId: string
  email: string
  openingDate: number
  closingDate?: number
  sales: number
  grossSale: number
  ticketCount: number
  activeTickets: number
  cancelledTickets: number
  shareOnSales: number
  shareOnSaleAmount: number
  totalPrizes: number
  status: 'open' | 'closed'
}

interface ReportMetrics {
  totalTickets: number
  totalCancelledTickets: number
  totalSales: number
  totalPrizes: number
  totalCommission: number
  totalNet: number
  totalRegisters: number
}

interface TicketItem {
  id: string
  animalNumber: string
  animalName: string
  lotteryName: string
  drawTime: string
  amount: number
  status: string
  potentialBetAmount: number
}

export function TaquillaStatsDialog({ open, onOpenChange, taquilla }: Props) {
  const [loading, setLoading] = useState(false)
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month' | 'all'>('month')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [useCustomDates, setUseCustomDates] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Modal de tickets
  const [ticketsDialogOpen, setTicketsDialogOpen] = useState(false)
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null)
  const [registerTickets, setRegisterTickets] = useState<any[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  // Expandir ticket para ver items
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Cargar registros de caja (RLS permite acceso jerárquico)
  useEffect(() => {
    const fetchRegisters = async () => {
      if (!open || !taquilla || !isSupabaseConfigured()) return

      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('user_id', taquilla.id)
          .order('opening_date', { ascending: false })

        if (queryError) throw queryError

        const mappedRegisters: CashRegister[] = (data || []).map((register: any) => ({
          id: register.id,
          userId: register.user_id,
          email: register.email,
          openingDate: new Date(register.opening_date).getTime(),
          closingDate: register.closing_date ? new Date(register.closing_date).getTime() : undefined,
          sales: Number(register.sales || 0),
          grossSale: Number(register.gross_sale || 0),
          ticketCount: register.ticket_count || 0,
          activeTickets: 0,
          cancelledTickets: 0,
          shareOnSales: Number(register.share_on_sales || 0),
          shareOnSaleAmount: Number(register.share_on_sale_amount || 0),
          totalPrizes: 0,
          status: register.status as 'open' | 'closed'
        }))

        // Calcular premios y tickets para cada caja
        for (const register of mappedRegisters) {
          const { data: bets } = await supabase
            .from('bets')
            .select('id, status, amount')
            .eq('cash_register', register.id)

          if (bets && bets.length > 0) {
            register.activeTickets = bets.filter(b => b.status === 'active').length
            register.cancelledTickets = bets.filter(b => b.status === 'cancelled').length

            if (register.status === 'open') {
              const activeBets = bets.filter(b => b.status === 'active')
              register.grossSale = activeBets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0)
              register.ticketCount = activeBets.length
            }

            const activeBetIds = bets.filter(b => b.status === 'active').map(b => b.id)
            if (activeBetIds.length > 0) {
              const { data: winningItems } = await supabase
                .from('bets_item_lottery_clasic')
                .select('potential_bet_amount')
                .in('bets_id', activeBetIds)
                .in('status', ['winner', 'paid'])

              if (winningItems) {
                register.totalPrizes = winningItems.reduce((sum, item) =>
                  sum + Number(item.potential_bet_amount || 0), 0)
              }
            }
          }
        }

        setRegisters(mappedRegisters)
      } catch (err: any) {
        console.error('Error fetching registers:', err)
        setError(err.message || 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    fetchRegisters()
  }, [open, taquilla])

  // Filtrar registros por período
  const filteredRegisters = useMemo(() => {
    let filtered = registers

    if (useCustomDates && startDate && endDate) {
      // Filtro personalizado: mostrar caja abierta solo si el rango abarca su fecha de apertura o posterior
      const start = new Date(startDate).getTime()
      const end = new Date(endDate + 'T23:59:59').getTime()

      filtered = registers.filter(r => {
        if (r.status === 'open') {
          // La caja abierta se muestra si la fecha fin del rango es >= fecha de apertura
          return end >= r.openingDate
        }
        // Para cerradas usar closingDate
        const relevantDate = r.closingDate || r.openingDate
        return relevantDate >= start && relevantDate <= end
      })
    } else if (periodFilter !== 'all') {
      // Filtros rápidos (día, semana, mes): siempre incluir caja abierta
      const now = new Date()
      let startDateTs: number

      switch (periodFilter) {
        case 'day':
          startDateTs = startOfDay(now).getTime()
          break
        case 'week':
          startDateTs = startOfWeek(now, { weekStartsOn: 1 }).getTime()
          break
        case 'month':
          startDateTs = startOfMonth(now).getTime()
          break
        default:
          startDateTs = 0
      }

      filtered = registers.filter(r => {
        // Siempre incluir cajas abiertas en filtros rápidos
        if (r.status === 'open') return true
        // Para cerradas usar closingDate
        const relevantDate = r.closingDate || r.openingDate
        return relevantDate >= startDateTs
      })
    }

    return filtered
  }, [registers, periodFilter, useCustomDates, startDate, endDate])

  // Calcular métricas totales
  const metrics: ReportMetrics = useMemo(() => {
    const shareOnSales = taquilla?.shareOnSales || 0

    return filteredRegisters.reduce((acc, register) => {
      const sales = register.grossSale || 0
      const prizes = register.totalPrizes || 0
      const commission = register.shareOnSaleAmount || (sales * shareOnSales / 100)
      const net = sales - prizes - commission

      return {
        totalTickets: acc.totalTickets + (register.activeTickets || 0),
        totalCancelledTickets: acc.totalCancelledTickets + (register.cancelledTickets || 0),
        totalSales: acc.totalSales + sales,
        totalPrizes: acc.totalPrizes + prizes,
        totalCommission: acc.totalCommission + commission,
        totalNet: acc.totalNet + net,
        totalRegisters: acc.totalRegisters + 1
      }
    }, {
      totalTickets: 0,
      totalCancelledTickets: 0,
      totalSales: 0,
      totalPrizes: 0,
      totalCommission: 0,
      totalNet: 0,
      totalRegisters: 0
    })
  }, [filteredRegisters, taquilla?.shareOnSales])

  // Paginación
  const totalPages = Math.ceil(filteredRegisters.length / pageSize)
  const paginatedRegisters = filteredRegisters.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1)
  }, [periodFilter, useCustomDates, startDate, endDate])

  const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'all') => {
    setUseCustomDates(false)
    setPeriodFilter(period)
  }

  const handleCustomDatesApply = () => {
    if (startDate && endDate) {
      setUseCustomDates(true)
    }
  }

  // Función para abrir modal de tickets
  const handleViewTickets = async (register: CashRegister) => {
    setSelectedRegister(register)
    setTicketsDialogOpen(true)
    setLoadingTickets(true)
    setRegisterTickets([])
    setExpandedTicketId(null)
    setTicketItems([])

    try {
      const { data: bets, error } = await supabase
        .from('bets')
        .select('id, cash_register_serial, amount, status, created_at')
        .eq('cash_register', register.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Cargar premios para cada ticket
      const betsWithPrizes = await Promise.all((bets || []).map(async (bet: any) => {
        const { data: winningItems } = await supabase
          .from('bets_item_lottery_clasic')
          .select('potential_bet_amount')
          .eq('bets_id', bet.id)
          .in('status', ['winner', 'paid'])

        const totalPrize = winningItems?.reduce((sum, item) =>
          sum + Number(item.potential_bet_amount || 0), 0) || 0

        return {
          ...bet,
          totalPrize
        }
      }))

      setRegisterTickets(betsWithPrizes)
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoadingTickets(false)
    }
  }

  // Función para expandir/colapsar ticket y ver items
  const toggleTicketExpand = async (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null)
      setTicketItems([])
      return
    }

    setExpandedTicketId(ticketId)
    setLoadingItems(true)
    setTicketItems([])

    try {
      const { data: items, error: itemsError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('*')
        .eq('bets_id', ticketId)

      if (itemsError) throw itemsError

      if (items && items.length > 0) {
        const prizeIds = items.map((item: any) => item.prize_id).filter(Boolean)

        let prizesMap = new Map()
        let lotteriesMap = new Map()

        if (prizeIds.length > 0) {
          const [prizesResult, lotteriesResult] = await Promise.all([
            supabase
              .from('prizes')
              .select('id, lottery_id, animal_number, animal_name')
              .in('id', prizeIds),
            supabase
              .from('lotteries')
              .select('id, name, draw_time')
          ])

          if (prizesResult.data) {
            prizesMap = new Map(prizesResult.data.map((p: any) => [p.id, p]))
          }
          if (lotteriesResult.data) {
            lotteriesMap = new Map(lotteriesResult.data.map((l: any) => [l.id, l]))
          }
        }

        const mappedItems: TicketItem[] = items.map((item: any) => {
          const prize = item.prize_id ? prizesMap.get(item.prize_id) : null
          const lottery = prize ? lotteriesMap.get(prize.lottery_id) : null

          return {
            id: item.id,
            animalNumber: prize?.animal_number || item.item_number || '',
            animalName: prize?.animal_name || 'Desconocido',
            lotteryName: lottery?.name || 'Desconocida',
            drawTime: lottery?.draw_time || '',
            amount: Number(item.amount) || 0,
            status: item.status || '',
            potentialBetAmount: Number(item.potential_bet_amount) || 0
          }
        })

        setTicketItems(mappedItems)
      }
    } catch (err) {
      console.error('Error fetching ticket items:', err)
    } finally {
      setLoadingItems(false)
    }
  }

  if (!taquilla) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChartBar className="h-5 w-5 text-primary" />
              Reportes - {taquilla.fullName}
            </DialogTitle>
            <DialogDescription>
              Resumen de ventas, premios y cajas registradoras
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                {/* Filtros rápidos */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant={!useCustomDates && periodFilter === 'day' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodChange('day')}
                    >
                      Hoy
                    </Button>
                    <Button
                      variant={!useCustomDates && periodFilter === 'week' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodChange('week')}
                    >
                      Semana
                    </Button>
                    <Button
                      variant={!useCustomDates && periodFilter === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodChange('month')}
                    >
                      Mes
                    </Button>
                    <Button
                      variant={!useCustomDates && periodFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodChange('all')}
                    >
                      Todo
                    </Button>
                  </div>
                </div>

                {/* Selector de fechas personalizado */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant={useCustomDates ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleCustomDatesApply}
                    disabled={!startDate || !endDate}
                  >
                    <Calendar size={16} className="mr-1" />
                    Aplicar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Métricas principales */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Spinner className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Cargando estadísticas...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                {/* Fila 1: Tickets Activos, Anulados, Ventas */}
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Ticket size={14} />
                      <span className="text-xs">Tickets Activos</span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.totalTickets}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Ticket size={14} />
                      <span className="text-xs">Anulados</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-500">{metrics.totalCancelledTickets}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CurrencyDollar size={14} />
                      <span className="text-xs">Ventas</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalSales)}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Fila 2: Premios, Comisión, Neto */}
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Trophy size={14} />
                      <span className="text-xs">Premios</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalPrizes)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Percent size={14} />
                      <span className="text-xs">Comisión ({taquilla.shareOnSales || 0}%)</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.totalCommission)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {metrics.totalNet >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />}
                      <span className="text-xs">Neto</span>
                    </div>
                    <p className={`text-2xl font-bold ${metrics.totalNet < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(metrics.totalNet)}
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Detalle por caja */}
          {!loading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detalle por Caja</CardTitle>
                <CardDescription className="text-xs">
                  {filteredRegisters.length} cajas en el período seleccionado
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredRegisters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ChartBar size={48} className="text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {registers.length === 0
                        ? 'No se encontraron cajas registradoras para esta taquilla'
                        : 'No hay cajas en el período seleccionado'}
                    </p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="max-h-[250px]">
                      <div className="rounded-md border mx-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Fecha</TableHead>
                              <TableHead className="text-xs">Estado</TableHead>
                              <TableHead className="text-xs text-center">Activos</TableHead>
                              <TableHead className="text-xs text-center">Anulados</TableHead>
                              <TableHead className="text-xs text-right">Ventas</TableHead>
                              <TableHead className="text-xs text-right">Premios</TableHead>
                              <TableHead className="text-xs text-right">% Taq</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                              <TableHead className="text-xs text-center">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedRegisters.map(register => {
                              const commission = register.shareOnSaleAmount || (register.grossSale * (taquilla.shareOnSales || 0) / 100)
                              const total = register.grossSale - register.totalPrizes - commission
                              const isOpen = register.status === 'open'
                              const displayDate = isOpen ? register.openingDate : register.closingDate
                              return (
                                <TableRow key={register.id} className={isOpen ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                  <TableCell className="text-xs">
                                    {displayDate
                                      ? format(new Date(displayDate), "dd/MM/yy HH:mm", { locale: es })
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {isOpen ? (
                                      <Badge className="bg-green-500 text-xs">Abierta</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">Cerrada</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-center">{register.activeTickets}</TableCell>
                                  <TableCell className="text-xs text-center">
                                    {register.cancelledTickets > 0 ? (
                                      <span className="text-orange-500 font-medium">{register.cancelledTickets}</span>
                                    ) : (
                                      <span className="text-muted-foreground">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-right">{formatCurrency(register.grossSale)}</TableCell>
                                  <TableCell className="text-xs text-right">{formatCurrency(register.totalPrizes)}</TableCell>
                                  <TableCell className="text-xs text-right">
                                    {formatCurrency(commission)}
                                  </TableCell>
                                  <TableCell className={`text-xs text-right font-semibold ${total < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(total)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleViewTickets(register)}
                                    >
                                      <Eye size={14} className="mr-1" />
                                      Ver
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>

                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4">
                        <p className="text-xs text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <CaretLeft size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <CaretRight size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Tickets de Caja */}
      <Dialog open={ticketsDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setTicketsDialogOpen(false)
          setSelectedRegister(null)
          setExpandedTicketId(null)
          setTicketItems([])
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Tickets de Caja
            </DialogTitle>
            <DialogDescription>
              {selectedRegister && (
                <>
                  Caja {selectedRegister.status === 'open' ? 'abierta' : 'cerrada'} el{' '}
                  {selectedRegister.status === 'open'
                    ? format(new Date(selectedRegister.openingDate), "dd/MM/yyyy HH:mm", { locale: es })
                    : selectedRegister.closingDate
                      ? format(new Date(selectedRegister.closingDate), "dd/MM/yyyy HH:mm", { locale: es })
                      : '-'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingTickets ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size={32} className="animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Cargando tickets...</p>
            </div>
          ) : registerTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Receipt size={48} className="text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No hay tickets en esta caja</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {registerTickets.map((ticket: any) => (
                  <Card key={ticket.id} className={`p-3 ${ticket.status === 'cancelled' ? 'opacity-50 bg-muted/50' : ''} ${ticket.totalPrize > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}>
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleTicketExpand(ticket.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">
                          {expandedTicketId === ticket.id ? (
                            <CaretUp size={16} weight="bold" />
                          ) : (
                            <CaretDown size={16} weight="bold" />
                          )}
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-sm">
                            #{ticket.cash_register_serial || ticket.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ticket.created_at), "dd/MM/yy HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(Number(ticket.amount) || 0)}</span>
                          {ticket.totalPrize > 0 && (
                            <p className="text-xs font-semibold text-red-600">
                              Premio: {formatCurrency(ticket.totalPrize)}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={ticket.status === 'cancelled' ? 'destructive' : 'default'}
                          className={ticket.status === 'active' ? 'bg-green-600' : ''}
                        >
                          {ticket.status === 'active' ? 'Activo' : ticket.status === 'cancelled' ? 'Anulado' : ticket.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Items del ticket expandido */}
                    {expandedTicketId === ticket.id && (
                      <div className="mt-3 pt-3 border-t">
                        {loadingItems ? (
                          <div className="flex items-center justify-center py-4">
                            <Spinner size={20} className="animate-spin text-muted-foreground mr-2" />
                            <span className="text-sm text-muted-foreground">Cargando items...</span>
                          </div>
                        ) : ticketItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">Sin items</p>
                        ) : (
                          <div className="space-y-2">
                            {ticketItems.map((item, idx) => (
                              <div key={item.id || idx} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {item.animalNumber}
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {item.animalName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.lotteryName} {item.drawTime && `(${item.drawTime.slice(0, 5)})`}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{formatCurrency(item.amount)}</p>
                                  {item.status === 'winner' && (
                                    <Badge variant="default" className="bg-yellow-600 text-xs">
                                      Ganador ({formatCurrency(item.potentialBetAmount)})
                                    </Badge>
                                  )}
                                  {item.status === 'paid' && (
                                    <Badge variant="default" className="bg-green-600 text-xs">
                                      Pagado ({formatCurrency(item.potentialBetAmount)})
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Total: <span className="font-semibold">{registerTickets.filter((t: any) => t.status === 'active').length} tickets</span>
                  {' - '}
                  <span className="font-semibold">
                    {formatCurrency(registerTickets.filter((t: any) => t.status === 'active').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0))}
                  </span>
                </p>
                {registerTickets.some((t: any) => t.totalPrize > 0) && (
                  <p className="text-red-600">
                    Premios: <span className="font-semibold">
                      {formatCurrency(registerTickets.reduce((sum: number, t: any) => sum + (Number(t.totalPrize) || 0), 0))}
                    </span>
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={() => setTicketsDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
