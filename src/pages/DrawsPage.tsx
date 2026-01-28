import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp } from '@/contexts/AppContext'
import { useLotteryTypePreference } from '@/contexts/LotteryTypeContext'
import { toast } from 'sonner'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isToday, isBefore, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CaretLeft, CaretRight, Target, CheckCircle, Calendar, Warning, Clock, Trophy, CurrencyDollar, Users, Storefront, SpinnerGap } from '@phosphor-icons/react'
import { ANIMALS, Lottery, DailyResult, DailyResultLola } from '@/lib/types'

const PLACEHOLDER_ANIMAL_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect x="2" y="2" width="124" height="124" rx="10" ry="10" fill="none" stroke="black" stroke-width="4"/>
      <circle cx="44" cy="46" r="10" fill="none" stroke="black" stroke-width="4"/>
      <path d="M18 96 L52 62 L74 84 L96 56 L114 96" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  )

const normalizeLolaNumero = (numero: string) => {
  const cleaned = (numero || '').trim()
  const digitsOnly = cleaned.replace(/\D+/g, '')
  if (!digitsOnly) return ''
  const parsed = Number.parseInt(digitsOnly, 10)
  if (Number.isNaN(parsed)) return ''
  const normalized = ((parsed % 100) + 100) % 100
  return String(normalized).padStart(2, '0')
}

const parseAmountNumber = (raw: string) => {
  const s = String(raw ?? '').trim()
  if (!s) return 0

  const cleaned = s.replace(/[^0-9.,-]/g, '')

  let normalized = cleaned
  if (cleaned.includes('.') && cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(/,/g, '.')
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(/,/g, '.')
  }

  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

const parseCompradosNumber = (raw: string) => {
  const cleaned = String(raw ?? '').trim().replace(/[^0-9-]/g, '')
  const n = Number.parseInt(cleaned || '0', 10)
  return Number.isFinite(n) ? n : 0
}

const formatAmount = (n: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n)

const getLolaAnimalImageSrc = (numero: string) => {
  const number = Number.parseInt(numero, 10)
  return `/assets/lola/${number}.jpg`
}

interface WinnerItem {
  id: string
  amount: number
  potentialWin: number
  taquillaId: string
  taquillaName: string
  createdAt: string
}

export function DrawsPage() {
  const {
    lotteries,
    dailyResults,
    dailyResultsLoading,
    createDailyResult,
    createDailyResultLola,
    getResultForLotteryAndDate,
    getResultForLotteryAndDateLola,
    getWinnersForResult
  } = useApp()

  const { lotteryType } = useLotteryTypePreference()

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedCell, setSelectedCell] = useState<{ lotteryId: string; date: string } | null>(null)
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('')
  const [savingResult, setSavingResult] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [resultDetailOpen, setResultDetailOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState<DailyResult | null>(null)
  const [lolaResultDetailOpen, setLolaResultDetailOpen] = useState(false)
  const [selectedLolaResultDetail, setSelectedLolaResultDetail] = useState<DailyResultLola | null>(null)
  const [winners, setWinners] = useState<WinnerItem[]>([])
  const [loadingWinners, setLoadingWinners] = useState(false)
  const [lolaLoadDialogOpen, setLolaLoadDialogOpen] = useState(false)
  const [selectedLolaLottery, setSelectedLolaLottery] = useState<Lottery | null>(null)
  const [selectedLolaDate, setSelectedLolaDate] = useState<string>('')
  const [selectedLolaNumero, setSelectedLolaNumero] = useState<string>('')
  const [lolaSort, setLolaSort] = useState<'numero' | 'comprados' | 'total' | 'combined'>('numero')
  const [lolaTotalFrom, setLolaTotalFrom] = useState<string>('')
  const [lolaTotalTo, setLolaTotalTo] = useState<string>('')
  const [lolaConfirmOpen, setLolaConfirmOpen] = useState(false)
  const [lolaSaving, setLolaSaving] = useState(false)

  const isLolaLottery = useCallback((lottery: Lottery) => lottery.id.startsWith('lola-'), [])

  // Loterías activas ordenadas por hora de jugada
  const activeLotteries = useMemo(() => {
    return lotteries
      .filter(l => l.isActive)
      .sort((a, b) => {
        const timeA = a.drawTime.replace(':', '')
        const timeB = b.drawTime.replace(':', '')
        return timeA.localeCompare(timeB)
      })
  }, [lotteries])

  const visibleLotteries = useMemo(() => {
    return activeLotteries.filter((l) => (lotteryType === 'lola' ? isLolaLottery(l) : !isLolaLottery(l)))
  }, [activeLotteries, lotteryType, isLolaLottery])

  useEffect(() => {
    setSelectedCell(null)
    setSelectedPrizeId('')
    setConfirmDialogOpen(false)
    setResultDetailOpen(false)
    setSelectedResult(null)
    setWinners([])
    setLoadingWinners(false)

    setLolaResultDetailOpen(false)
    setSelectedLolaResultDetail(null)

    setLolaLoadDialogOpen(false)
    setSelectedLolaLottery(null)
    setSelectedLolaDate('')
    setSelectedLolaNumero('')
    setLolaSort('numero')
    setLolaTotalFrom('')
    setLolaTotalTo('')
    setLolaConfirmOpen(false)
  }, [lotteryType])

  const openLolaResultDetail = useCallback((result: DailyResultLola) => {
    setSelectedLolaResultDetail(result)
    setLolaResultDetailOpen(true)
  }, [])

  const parseMatrizItem = (raw: string) => {
    const cleaned = (raw || '').trim().replace(/^\(/, '').replace(/\)$/, '')
    const parts = cleaned.split(',').map((p) => p.trim())
    const numero = normalizeLolaNumero(parts[0] ?? '')
    return {
      numero,
      monto: parts[1] ?? '',
      comprados: parts[2] ?? '',
      valor4: parts[3] ?? '',
      valor5: parts[4] ?? ''
    }
  }

  const lolaMontoByNumero = useMemo(() => {
    const map = new Map<string, number>()
    const matriz = selectedLolaLottery?.matriz ?? []
    for (const raw of matriz) {
      const row = parseMatrizItem(raw)
      if (!row.numero) continue
      map.set(row.numero, parseAmountNumber(row.monto))
    }
    return map
  }, [selectedLolaLottery?.id, selectedLolaLottery?.matriz])

  const lolaRows = useMemo(() => {
    const matriz = selectedLolaLottery?.matriz ?? []
    return matriz.map((raw, idx) => {
      const row = parseMatrizItem(raw)
      const currentNumero = row.numero
      const currentMonto = parseAmountNumber(row.monto)
      const compradosNumber = parseCompradosNumber(row.comprados)

      const n = currentNumero ? Number.parseInt(currentNumero, 10) : NaN
      // Adyacentes sin wrap-around:
      // - 00 no tiene anterior
      // - 99 no tiene siguiente
      const prevNumero = Number.isFinite(n) && n > 0 ? String(n - 1).padStart(2, '0') : ''
      const nextNumero = Number.isFinite(n) && n < 99 ? String(n + 1).padStart(2, '0') : ''

      const prevMonto = prevNumero ? lolaMontoByNumero.get(prevNumero) ?? 0 : 0
      const nextMonto = nextNumero ? lolaMontoByNumero.get(nextNumero) ?? 0 : 0

      // Calculos de multiplicadores
      const multiplicador70 = currentMonto * 70;
      const multiplicador5Base = currentMonto * 5;
      const multiplicador5 = prevMonto * 5 + nextMonto * 5;
      const total = multiplicador70 + multiplicador5;

      return {
        raw,
        idx,
        row,
        compradosNumber,
        multiplicador70,
        multiplicador5Base,
        multiplicador5,
        total
      }
    })
  }, [selectedLolaLottery?.id, selectedLolaLottery?.matriz, lolaMontoByNumero])

  const lolaRangeError = useMemo(() => {
    if (!lolaTotalFrom.trim() || !lolaTotalTo.trim()) return null
    const from = parseAmountNumber(lolaTotalFrom)
    const to = parseAmountNumber(lolaTotalTo)
    if (from > to) return 'El monto “Desde” no puede ser mayor a “Hasta”.'
    return null
  }, [lolaTotalFrom, lolaTotalTo])

  const filteredSortedLolaRows = useMemo(() => {
    let rows = lolaRows

    // Filtro por rango de monto total a pagar (total)
    const hasFrom = lolaTotalFrom.trim().length > 0
    const hasTo = lolaTotalTo.trim().length > 0
    if (hasFrom || hasTo) {
      const from = hasFrom ? parseAmountNumber(lolaTotalFrom) : 0
      const to = hasTo ? parseAmountNumber(lolaTotalTo) : Number.POSITIVE_INFINITY
      if (from <= to) {
        rows = rows.filter((r) => r.total >= from && r.total <= to)
      }
    }

    const sorted = [...rows]
    sorted.sort((a, b) => {
      if (lolaSort === 'numero') {
        const na = a.row.numero ? Number.parseInt(a.row.numero, 10) : Number.NaN
        const nb = b.row.numero ? Number.parseInt(b.row.numero, 10) : Number.NaN
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
        if (Number.isFinite(na)) return -1
        if (Number.isFinite(nb)) return 1
        return (a.idx - b.idx)
      }
      if (lolaSort === 'comprados') {
        return (b.compradosNumber - a.compradosNumber) || (b.total - a.total) || (a.idx - b.idx)
      }
      if (lolaSort === 'total') {
        return (b.total - a.total) || (b.compradosNumber - a.compradosNumber) || (a.idx - b.idx)
      }
      // combined: combinación de comprados + total
      return (b.total - a.total) || (b.compradosNumber - a.compradosNumber) || (a.idx - b.idx)
    })
    return sorted
  }, [lolaRows, lolaSort, lolaTotalFrom, lolaTotalTo])

  const selectedLolaTotal = useMemo(() => {
    if (!selectedLolaNumero) return 0
    const selected = lolaRows.find((r) => r.row.numero === selectedLolaNumero)
    return selected?.total ?? 0
  }, [lolaRows, selectedLolaNumero])

  const selectedLolaRaised = useMemo(() => {
    if (!selectedLolaNumero) return 0
    const totalRaised = lolaRows.reduce((sum, r) => sum + parseAmountNumber(r.row.monto), 0)
    return totalRaised
  }, [lolaRows, selectedLolaNumero])

  const openLolaLoadDialog = (lottery: Lottery, dateStr: string) => {
    setSelectedLolaLottery(lottery)
    setSelectedLolaDate(dateStr)
    setSelectedLolaNumero('')
    setLolaSort('numero')
    setLolaTotalFrom('')
    setLolaTotalTo('')
    setLolaConfirmOpen(false)
    setLolaLoadDialogOpen(true)
  }

  // Días de la semana actual
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i))
    }
    return days
  }, [currentWeekStart])

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Verifica si la hora de juego de una lotería ya pasó para un día específico
  const hasDrawTimePassed = useCallback((lottery: Lottery, day: Date): boolean => {
    // Si no es hoy, la hora no aplica (días pasados siempre están disponibles, futuros nunca)
    if (!isToday(day)) {
      return isBefore(day, new Date()) // true para días pasados, false para futuros
    }

    // Para hoy, comparar la hora actual con la hora de juego
    const now = new Date()
    const [hours, minutes] = lottery.drawTime.split(':').map(Number)
    const drawDateTime = new Date(day)
    drawDateTime.setHours(hours, minutes, 0, 0)

    return now >= drawDateTime
  }, [])

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleCellClick = (lotteryId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')

    const lottery = lotteries.find(l => l.id === lotteryId)
    if (!lottery) return

    const existingResult = isLolaLottery(lottery)
      ? getResultForLotteryAndDateLola(lotteryId, dateStr)
      : getResultForLotteryAndDate(lotteryId, dateStr)

    // Si ya hay resultado, no permitir editar
    if (existingResult) {
      return
    }

    // Verificar si la hora de juego ya pasó
    if (!hasDrawTimePassed(lottery, date)) {
      toast.error('La hora de juego de esta lotería aún no ha llegado')
      return
    }

    if (isLolaLottery(lottery)) {
      openLolaLoadDialog(lottery, dateStr)
      return
    }

    setSelectedCell({ lotteryId, date: dateStr })
    setSelectedPrizeId('')
  }

  const handleSaveResult = async () => {
    if (!selectedCell || !selectedPrizeId) {
      toast.error('Selecciona un animal/número')
      return
    }

    setConfirmDialogOpen(true)
  }

  const confirmSaveResult = async () => {
    if (!selectedCell || !selectedPrizeId) return

    const lottery = lotteries.find(l => l.id === selectedCell.lotteryId)
    const hasValidPrize = !!lottery?.prizes?.some(p => p.id === selectedPrizeId)
    if (!hasValidPrize) {
      toast.error('El premio seleccionado no es válido para este sorteo')
      setConfirmDialogOpen(false)
      return
    }

    setSavingResult(true)
    try {
      const success = await createDailyResult(
        selectedCell.lotteryId,
        selectedPrizeId,
        selectedCell.date
      )

      if (success) {
        toast.success('Resultado guardado exitosamente')
        setSelectedCell(null)
        setSelectedPrizeId('')
      } else {
        toast.error('Error al guardar el resultado')
      }
    } catch (error) {
      toast.error('Error al guardar el resultado')
    } finally {
      setSavingResult(false)
      setConfirmDialogOpen(false)
    }
  }

  const getResultDisplay = (lotteryId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const lottery = lotteries.find(l => l.id === lotteryId)
    const isLola = !!lottery && isLolaLottery(lottery)

    if (isLola) {
      const lolaResult = getResultForLotteryAndDateLola(lotteryId, dateStr)
      if (lolaResult) {
        return {
          hasResult: true,
          number: lolaResult.number,
          name: 'Lola',
          hasWinners: (lolaResult.totalToPay || 0) > 0,
          totalToPay: lolaResult.totalToPay || 0,
          totalRaised: lolaResult.totalRaised || 0,
          result: null
        }
      }

      return { hasResult: false, number: '', name: '', hasWinners: false, totalToPay: 0, totalRaised: 0, result: null }
    }

    const result = getResultForLotteryAndDate(lotteryId, dateStr)

    if (result?.prize) {
      return {
        hasResult: true,
        number: result.prize.animalNumber,
        name: result.prize.animalName,
        hasWinners: (result.totalToPay || 0) > 0,
        totalToPay: result.totalToPay || 0,
        totalRaised: result.totalRaised || 0,
        result
      }
    }

    return { hasResult: false, number: '', name: '', hasWinners: false, totalToPay: 0, totalRaised: 0, result: null }
  }

  const handleResultClick = async (result: DailyResult) => {
    setSelectedResult(result)
    setWinners([])
    setResultDetailOpen(true)

    // Cargar ganadores si hay total a pagar
    if ((result.totalToPay || 0) > 0 && result.prizeId) {
      setLoadingWinners(true)
      try {
        const winnersData = await getWinnersForResult(result.prizeId, result.resultDate)
        setWinners(winnersData)
      } catch (err) {
        console.error('Error loading winners:', err)
      } finally {
        setLoadingWinners(false)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const selectedLottery = selectedCell
    ? lotteries.find(l => l.id === selectedCell.lotteryId)
    : null

  const selectedAnimal = selectedPrizeId
    ? ANIMALS.find(a => {
        const prize = selectedLottery?.prizes?.find(p => p.id === selectedPrizeId)
        return prize?.animalNumber === a.number
      })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resultados Semanales</h2>
          <p className="text-muted-foreground">
            Gestiona los resultados de los sorteos por día
          </p>
        </div>
      </div>

      {/* Navegación de semanas */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="gap-1">
          <CaretLeft className="h-4 w-4" />
          Semana Anterior
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="h-4 w-4 mr-2" />
            {format(currentWeekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
          </Badge>
          <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
            Hoy
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToNextWeek} className="gap-1">
          Semana Siguiente
          <CaretRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Matriz semanal */}
      {dailyResultsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando resultados...</p>
        </div>
      ) : visibleLotteries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No hay sorteos activos</p>
            <p className="text-muted-foreground text-sm">
              {lotteryType === 'lola'
                ? 'No hay sorteos activos de Lola para esta vista'
                : 'No hay sorteos activos de Mikaela para esta vista'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-sm sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                    Sorteo / Hora
                  </th>
                  {weekDays.map((day) => {
                    const isTodayDate = isToday(day)
                    const dayName = format(day, 'EEE', { locale: es })
                    const dayNum = format(day, 'd')

                    return (
                      <th
                        key={day.toISOString()}
                        className={`text-center p-3 font-semibold text-sm min-w-[100px] ${
                          isTodayDate ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="capitalize">{dayName}</div>
                        <div className={`text-lg ${isTodayDate ? 'text-primary font-bold' : ''}`}>
                          {dayNum}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleLotteries.map((lottery) => (
                  <tr key={lottery.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 sticky left-0 bg-background z-10 border-r">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                          <Target className="h-4 w-4 text-white" weight="fill" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lottery.name}</p>
                          <p className="text-xs text-muted-foreground">{lottery.drawTime}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const { hasResult, number, name, hasWinners, totalToPay, result } = getResultDisplay(lottery.id, day)
                      const isTodayDate = isToday(day)
                      const isPast = isBefore(day, new Date()) && !isTodayDate
                      const isFuture = isBefore(new Date(), day) && !isTodayDate
                      const isSelected = selectedCell?.lotteryId === lottery.id && selectedCell?.date === dateStr
                      const drawTimePassed = hasDrawTimePassed(lottery, day)
                      // Pendiente: es hoy pero la hora de juego aún no ha pasado
                      const isPendingToday = isTodayDate && !drawTimePassed

                      return (
                        <td
                          key={`${lottery.id}-${dateStr}`}
                          className={`p-2 text-center border-r last:border-r-0 ${
                            isTodayDate ? 'bg-primary/5' : ''
                          }`}
                        >
                          {hasResult ? (
                            <button
                              onClick={() => {
                                if (isLolaLottery(lottery)) {
                                  const lolaResult = getResultForLotteryAndDateLola(lottery.id, dateStr)
                                  if (lolaResult) openLolaResultDetail(lolaResult)
                                  return
                                }
                                if (result) handleResultClick(result)
                              }}
                              className="flex flex-col items-center gap-0.5 w-full cursor-pointer hover:scale-105 transition-transform"
                              title="Ver detalles del resultado"
                            >
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center relative ${
                                hasWinners
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-300 ring-offset-1'
                                  : 'bg-emerald-100'
                              }`}>
                                <span className={`text-lg font-bold ${hasWinners ? 'text-white' : 'text-emerald-700'}`}>
                                  {number}
                                </span>
                                {hasWinners && (
                                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center">
                                    <Trophy className="h-2.5 w-2.5 text-amber-900" weight="fill" />
                                  </div>
                                )}
                              </div>
                              <span className={`text-[10px] truncate max-w-[80px] ${
                                hasWinners ? 'text-blue-600 font-medium' : 'text-muted-foreground'
                              }`}>
                                {name}
                              </span>
                              {hasWinners ? (
                                <Trophy className="h-3 w-3 text-amber-500" weight="fill" />
                              ) : (
                                <CheckCircle className="h-3 w-3 text-emerald-500" weight="fill" />
                              )}
                            </button>
                          ) : isFuture || isPendingToday ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className={`h-10 w-10 mx-auto rounded-lg flex items-center justify-center ${
                                isPendingToday ? 'bg-blue-50 border border-blue-200' : 'bg-muted/30'
                              }`}>
                                {isPendingToday ? (
                                  <Clock className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                              {isPendingToday && (
                                <span className="text-[10px] text-blue-500">{lottery.drawTime}</span>
                              )}
                            </div>
                          ) : isSelected ? (
                            <div className="space-y-1">
                              <Select value={selectedPrizeId} onValueChange={setSelectedPrizeId}>
                                <SelectTrigger className="h-10 w-full text-xs">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(lottery.prizes && lottery.prizes.length > 0)
                                    ? lottery.prizes.map((prize) => (
                                        <SelectItem key={prize.id} value={prize.id}>
                                          {prize.animalNumber} - {prize.animalName}
                                        </SelectItem>
                                      ))
                                    : ANIMALS.map((a, i) => (
                                        <SelectItem key={`fallback-${i}`} value={`fallback-${i}`}>
                                          {a.number} - {a.name}
                                        </SelectItem>
                                      ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs flex-1"
                                  onClick={() => setSelectedCell(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 text-xs flex-1"
                                  onClick={handleSaveResult}
                                  disabled={!selectedPrizeId || !(lottery.prizes && lottery.prizes.some(p => p.id === selectedPrizeId))}
                                >
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(lottery.id, day)}
                              className={`h-10 w-10 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center transition-all cursor-pointer ${
                                isTodayDate
                                  ? 'border-primary/50 hover:border-primary hover:bg-primary/10'
                                  : isPast
                                  ? 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              }`}
                              title={isTodayDate ? 'Cargar resultado de hoy' : isPast ? 'Cargar resultado pendiente' : ''}
                            >
                              <span className={`text-lg font-medium ${
                                isTodayDate ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                +
                              </span>
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-3 w-3 text-emerald-500" weight="fill" />
          </div>
          <span className="text-muted-foreground">Sin ganadores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center relative">
            <span className="text-xs font-bold text-white">!</span>
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 flex items-center justify-center">
              <Trophy className="h-2 w-2 text-amber-900" weight="fill" />
            </div>
          </div>
          <span className="text-muted-foreground">Con ganadores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-dashed border-primary/50"></div>
          <span className="text-muted-foreground">Disponible para cargar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-dashed border-amber-300"></div>
          <span className="text-muted-foreground">Pendiente (días anteriores)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Clock className="h-3 w-3 text-blue-400" />
          </div>
          <span className="text-muted-foreground">Esperando hora de juego</span>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" weight="fill" />
              </div>
              <div>
                <DialogTitle>Confirmar Resultado</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">{selectedLottery?.name}</p>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedCell?.date && format(parseISO(selectedCell.date), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {selectedPrizeId && selectedLottery && (
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {selectedLottery.prizes?.find(p => p.id === selectedPrizeId)?.animalNumber || '??'}
                  </p>
                  <p className="text-lg font-medium">
                    {selectedLottery.prizes?.find(p => p.id === selectedPrizeId)?.animalName || 'Desconocido'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              ¿Está seguro que desea guardar este resultado?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={savingResult}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmSaveResult}
              disabled={savingResult}
            >
              {savingResult ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalles del resultado */}
      <Dialog open={resultDetailOpen} onOpenChange={setResultDetailOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                (selectedResult?.totalToPay || 0) > 0
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-emerald-100'
              }`}>
                {(selectedResult?.totalToPay || 0) > 0 ? (
                  <Trophy className="h-6 w-6 text-white" weight="fill" />
                ) : (
                  <Target className="h-6 w-6 text-emerald-600" weight="fill" />
                )}
              </div>
              <div>
                <DialogTitle>Detalles del Resultado</DialogTitle>
                <DialogDescription>
                  {selectedResult?.lottery?.name || 'Lotería'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Fecha y resultado */}
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedResult.resultDate && format(parseISO(selectedResult.resultDate), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </p>
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-xl mb-2 ${
                  (selectedResult.totalToPay || 0) > 0
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 ring-4 ring-blue-300'
                    : 'bg-emerald-100'
                }`}>
                  <span className={`text-3xl font-bold ${
                    (selectedResult.totalToPay || 0) > 0 ? 'text-white' : 'text-emerald-700'
                  }`}>
                    {selectedResult.prize?.animalNumber || '??'}
                  </span>
                </div>
                <p className="text-lg font-semibold">
                  {selectedResult.prize?.animalName || 'Desconocido'}
                </p>
              </div>

              {/* Montos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CurrencyDollar className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-600">Total a Pagar</span>
                  </div>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(selectedResult.totalToPay || 0)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 border ${
                  (selectedResult.totalRaised || 0) >= 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CurrencyDollar className={`h-4 w-4 ${
                      (selectedResult.totalRaised || 0) >= 0 ? 'text-emerald-500' : 'text-amber-500'
                    }`} />
                    <span className={`text-xs font-medium ${
                      (selectedResult.totalRaised || 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {(selectedResult.totalRaised || 0) >= 0 ? 'Ganancia Neta' : 'Pérdida'}
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${
                    (selectedResult.totalRaised || 0) >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {formatCurrency(Math.abs(selectedResult.totalRaised || 0))}
                  </p>
                </div>
              </div>

              {/* Estado de ganadores y tabla */}
              {(selectedResult.totalToPay || 0) > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Trophy className="h-5 w-5 text-amber-500" weight="fill" />
                    <span className="font-medium">Jugadas Ganadoras ({winners.length})</span>
                  </div>

                  {loadingWinners ? (
                    <div className="flex items-center justify-center py-6">
                      <SpinnerGap className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="ml-2 text-sm text-muted-foreground">Cargando ganadores...</span>
                    </div>
                  ) : winners.length > 0 ? (
                    <ScrollArea className="h-[200px] rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Taquilla</TableHead>
                            <TableHead className="text-xs text-right">Apostado</TableHead>
                            <TableHead className="text-xs text-right">Premio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {winners.map((winner) => (
                            <TableRow key={winner.id}>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-2">
                                  <Storefront className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{winner.taquillaName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums">
                                {formatCurrency(winner.amount)}
                              </TableCell>
                              <TableCell className="py-2 text-right text-sm tabular-nums font-semibold text-emerald-600">
                                {formatCurrency(winner.potentialWin)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No se encontraron detalles de ganadores
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg p-4 text-center bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-400" weight="fill" />
                    <span className="font-medium text-gray-600">Sin ganadores</span>
                  </div>
                </div>
              )}

              {/* Info adicional */}
              <div className="text-xs text-muted-foreground text-center">
                <p>Resultado registrado: {selectedResult.createdAt && format(parseISO(selectedResult.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setResultDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalles del resultado (Lola) */}
      <Dialog
        open={lolaResultDetailOpen}
        onOpenChange={(open) => {
          setLolaResultDetailOpen(open)
          if (!open) setSelectedLolaResultDetail(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  (selectedLolaResultDetail?.totalToPay || 0) > 0
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : 'bg-emerald-100'
                }`}
              >
                {(selectedLolaResultDetail?.totalToPay || 0) > 0 ? (
                  <Trophy className="h-6 w-6 text-white" weight="fill" />
                ) : (
                  <Target className="h-6 w-6 text-emerald-600" weight="fill" />
                )}
              </div>
              <div>
                <DialogTitle>Detalles del Resultado</DialogTitle>
                <DialogDescription>
                  {selectedLolaResultDetail
                    ? lotteries.find((l) => l.id === selectedLolaResultDetail.lotteryId)?.name || 'Lola'
                    : 'Lola'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedLolaResultDetail && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Fecha y número */}
              <div className="bg-muted/50 rounded-lg p-4 text-center relative overflow-hidden">
                <div className="absolute right-4 top-4 z-10 h-14 w-14 overflow-hidden rounded-md bg-muted shadow">
                  <img
                    src={getLolaAnimalImageSrc(selectedLolaResultDetail.number)}
                    alt={`Animalito ${selectedLolaResultDetail.number}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget
                      if (img.dataset.fallbackApplied === '1') return
                      img.dataset.fallbackApplied = '1'
                      img.src = PLACEHOLDER_ANIMAL_IMAGE
                    }}
                  />
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {selectedLolaResultDetail.resultDate &&
                    format(parseISO(selectedLolaResultDetail.resultDate), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </p>

                <div
                  className={`inline-flex items-center justify-center h-16 w-16 rounded-xl mb-2 ${
                    (selectedLolaResultDetail.totalToPay || 0) > 0
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 ring-4 ring-blue-300'
                      : 'bg-emerald-100'
                  }`}
                >
                  <span
                    className={`text-3xl font-bold ${
                      (selectedLolaResultDetail.totalToPay || 0) > 0 ? 'text-white' : 'text-emerald-700'
                    }`}
                  >
                    {selectedLolaResultDetail.number || '??'}
                  </span>
                </div>

                <p className="text-lg font-semibold">Lola</p>
              </div>

              {/* Montos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CurrencyDollar className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-600">Total a Pagar</span>
                  </div>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(selectedLolaResultDetail.totalToPay || 0)}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-3 border ${
                    (selectedLolaResultDetail.totalRaised || 0) >= 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CurrencyDollar
                      className={`h-4 w-4 ${
                        (selectedLolaResultDetail.totalRaised || 0) >= 0 ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        (selectedLolaResultDetail.totalRaised || 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {(selectedLolaResultDetail.totalRaised || 0) >= 0 ? 'Ganancia Neta' : 'Pérdida'}
                    </span>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      (selectedLolaResultDetail.totalRaised || 0) >= 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {formatCurrency(Math.abs(selectedLolaResultDetail.totalRaised || 0))}
                  </p>
                </div>
              </div>

              {/* Info adicional */}
              <div className="text-xs text-muted-foreground text-center">
                <p>
                  Resultado registrado:{' '}
                  {selectedLolaResultDetail.createdAt &&
                    format(parseISO(selectedLolaResultDetail.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setLolaResultDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Lola: cargar resultado seleccionando animalito */}
      <Dialog
        open={lolaLoadDialogOpen}
        onOpenChange={(open) => {
          setLolaLoadDialogOpen(open)
          if (!open) {
            setSelectedLolaLottery(null)
            setSelectedLolaDate('')
            setSelectedLolaNumero('')
            setLolaConfirmOpen(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>
              Números
              {selectedLolaLottery?.name
                ? ` — ${selectedLolaLottery.name}`
                : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedLolaDate ? `Fecha: ${format(parseISO(selectedLolaDate), 'dd/MM/yyyy', { locale: es })}` : ''}
            </DialogDescription>

            {/* Filtros (solo para resultados) */}
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-[260px]">
                <div className="text-xs text-muted-foreground mb-1">Ordenar</div>
                <Select value={lolaSort} onValueChange={(v) => setLolaSort(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="comprados">Mayor cantidad de jugados</SelectItem>
                    <SelectItem value="total">Mayor monto total a pagar</SelectItem>
                    <SelectItem value="combined">Combinados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <div className="text-xs text-muted-foreground mb-1">Rango monto total a pagar</div>
                <div className="flex items-center gap-2">
                  <Input
                    value={lolaTotalFrom}
                    onChange={(e) => {
                      const next = e.target.value
                      setLolaTotalFrom(next)
                      if (!lolaTotalTo.trim()) return
                      const to = parseAmountNumber(lolaTotalTo)
                      const from = next.trim() ? parseAmountNumber(next) : 0
                      if (from > to) setLolaTotalFrom(String(to))
                    }}
                    placeholder="Desde"
                    className="h-9 w-[120px]"
                    inputMode="decimal"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <Input
                    value={lolaTotalTo}
                    onChange={(e) => {
                      const next = e.target.value
                      setLolaTotalTo(next)
                      if (!next.trim()) return
                      const to = parseAmountNumber(next)
                      const from = lolaTotalFrom.trim() ? parseAmountNumber(lolaTotalFrom) : 0
                      if (from > to) setLolaTotalFrom(String(to))
                    }}
                    placeholder="Hasta"
                    className="h-9 w-[120px]"
                    inputMode="decimal"
                  />
                </div>
                {lolaRangeError && (
                  <div className="mt-1 text-xs text-destructive">{lolaRangeError}</div>
                )}
                {lolaTotalTo.trim() && !lolaRangeError && !lolaTotalFrom.trim() && (
                  <div className="mt-1 text-xs text-muted-foreground">“Desde” se asume 0.</div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto rounded-md border p-2">
            {selectedLolaLottery?.matriz &&
            selectedLolaLottery.matriz.length > 0 ? (
              filteredSortedLolaRows.length > 0 ? (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {filteredSortedLolaRows.map(({ idx, row, multiplicador70, multiplicador5Base, multiplicador5, total }) => {
                    const isSelected = !!row.numero && selectedLolaNumero === row.numero

                    return (
                      <button
                        key={`${selectedLolaLottery.id}-${idx}`}
                        type="button"
                        className="text-left cursor-pointer disabled:cursor-not-allowed"
                        onClick={() => {
                          if (!row.numero) return
                          setSelectedLolaNumero((prev) => (prev === row.numero ? '' : row.numero))
                        }}
                        disabled={!row.numero}
                        aria-pressed={isSelected}
                      >
                        <Card
                          className={`${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} transition-shadow hover:shadow-md`}
                        >
                          <CardContent className="relative p-2">
                            <div className="pointer-events-none absolute right-2 top-2 z-10 h-12 w-12 overflow-hidden rounded-md bg-muted shadow">
                              <img
                                src={getLolaAnimalImageSrc(row.numero)}
                                alt={`Animalito ${row.numero}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const img = e.currentTarget
                                  if (img.dataset.fallbackApplied === '1') return
                                  img.dataset.fallbackApplied = '1'
                                  img.src = PLACEHOLDER_ANIMAL_IMAGE
                                }}
                              />
                            </div>

                            <div className="text-sm font-semibold leading-tight">
                              N° {row.numero}
                            </div>
                            <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                              <div>
                                Monto:{' '}
                                <span className="font-medium text-foreground">
                                  {row.monto}
                                </span>
                              </div>
                              <div>
                                Comprados:{' '}
                                <span className="font-medium text-foreground">
                                  {row.comprados}
                                </span>
                              </div>
                              <div>
                                Multiplicador x70:{' '}
                                <span className="font-medium text-foreground">
                                  {formatAmount(multiplicador70)}
                                </span>
                              </div>
                              <div>
                                Multiplicador x5 (base):{' '}
                                <span className="font-medium text-foreground">
                                  {formatAmount(multiplicador5Base)}
                                </span>
                              </div>
                              <div>
                                Multiplicador x5 (adyacentes):{' '}
                                <span className="font-medium text-foreground">
                                  {formatAmount(multiplicador5)}
                                </span>
                              </div>
                              <div>
                                Total:{' '}
                                <span className="font-medium text-foreground">
                                  {formatAmount(total)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No hay coincidencias para el rango seleccionado.
                </div>
              )
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Esta lotería Lola no tiene matriz disponible
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setLolaLoadDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedLolaLottery || !selectedLolaDate || !selectedLolaNumero) return
                setLolaConfirmOpen(true)
              }}
              disabled={!selectedLolaNumero || !!lolaRangeError}
            >
              Cargar resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación Lola: seleccionar y confirmar el número a salir */}
      <Dialog open={lolaConfirmOpen} onOpenChange={setLolaConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Resultado</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">{selectedLolaLottery?.name}</p>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedLolaDate
                  ? format(parseISO(selectedLolaDate), "EEEE d 'de' MMMM", { locale: es })
                  : ''}
              </p>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {selectedLolaNumero || '??'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Número seleccionado
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              ¿Está seguro que desea cargar este resultado?
            </p>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setLolaConfirmOpen(false)}
              disabled={lolaSaving}
            >
              Cancelar
            </Button>
            <Button
              disabled={lolaSaving}
              onClick={async () => {
                if (!selectedLolaLottery || !selectedLolaDate || !selectedLolaNumero) return
                setLolaSaving(true)
                try {
                  const ok = await createDailyResultLola(
                    selectedLolaLottery.id,
                    selectedLolaNumero,
                    selectedLolaTotal,
                    selectedLolaRaised,
                    selectedLolaDate
                  )
                  if (ok) {
                    toast.success('Resultado Lola guardado exitosamente')
                    setLolaConfirmOpen(false)
                    setLolaLoadDialogOpen(false)
                  } else {
                    toast.error('Error al guardar el resultado (Lola)')
                  }
                } catch (err) {
                  toast.error('Error al guardar el resultado (Lola)')
                } finally {
                  setLolaSaving(false)
                }
              }}
            >
              {lolaSaving ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
