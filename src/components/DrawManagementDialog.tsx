import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar as CalendarIcon, Info, Plus, Trash } from "@phosphor-icons/react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DrawFormData, BetLimit } from "@/hooks/use-supabase-draws"
import { ANIMALS, DrawResult, Lottery } from "@/lib/types"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DrawManagementDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    draw?: DrawResult | null
    lotteries: Lottery[]
    onSave: (drawData: DrawFormData) => Promise<boolean>
}

export function DrawManagementDialog({
    open,
    onOpenChange,
    draw,
    lotteries,
    onSave
}: DrawManagementDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Debug: Log cuando cambien las loterías
    useEffect(() => {
        console.log('📊 DrawManagementDialog - Loterías recibidas:', lotteries.length)
        if (lotteries.length > 0) {
            console.log('Primera lotería:', lotteries[0])
        }
    }, [lotteries])

    // Estados del formulario
    const [formData, setFormData] = useState<DrawFormData>({
        lotteryId: '',
        animalNumber: '',
        animalName: '',
        drawDate: format(new Date(), 'yyyy-MM-dd'),
        drawTime: '',
        isWinner: false,
        prizeAmount: undefined,
        betLimits: []
    })

    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    // Estados para límites de apuestas
    const [globalLimit, setGlobalLimit] = useState<string>('')
    const [hasGlobalLimit, setHasGlobalLimit] = useState(false)
    const [selectedAnimalForLimit, setSelectedAnimalForLimit] = useState<string>('')
    const [animalLimitAmount, setAnimalLimitAmount] = useState<string>('')

    // Resetear formulario cuando se abre/cierra el diálogo
    useEffect(() => {
        if (open) {
            if (draw) {
                // Modo edición (mapear desde DrawResult con camelCase)
                const dt = new Date(draw.drawTime)
                const yyyy = dt.getFullYear()
                const mm = String(dt.getMonth() + 1).padStart(2, '0')
                const dd = String(dt.getDate()).padStart(2, '0')
                const hh = String(dt.getHours()).padStart(2, '0')
                const mi = String(dt.getMinutes()).padStart(2, '0')

                setFormData({
                    lotteryId: draw.lotteryId,
                    animalNumber: draw.winningAnimalNumber,
                    animalName: draw.winningAnimalName,
                    drawDate: `${yyyy}-${mm}-${dd}`,
                    drawTime: `${hh}:${mi}`,
                    isWinner: (draw.winnersCount || 0) > 0,
                    prizeAmount: draw.totalPayout || undefined,
                    betLimits: []
                })
                setSelectedDate(dt)
            } else {
                // Modo creación
                const today = new Date()
                setFormData({
                    lotteryId: '',
                    animalNumber: '',
                    animalName: '',
                    drawDate: format(today, 'yyyy-MM-dd'),
                    drawTime: '',
                    isWinner: false,
                    prizeAmount: undefined,
                    betLimits: []
                })
                setSelectedDate(today)
                setHasGlobalLimit(false)
                setGlobalLimit('')
                setSelectedAnimalForLimit('')
                setAnimalLimitAmount('')
            }
        }
    }, [open, draw])

    // Manejar selección de animal
    const handleAnimalSelect = (animalNumber: string) => {
        const animal = ANIMALS.find(a => a.number === animalNumber)
        if (animal) {
            setFormData(prev => ({
                ...prev,
                animalNumber: animal.number,
                animalName: animal.name
            }))
        }
    }

    // Manejar selección de lotería
    const handleLotterySelect = (lotteryId: string) => {
        const lottery = lotteries.find(l => l.id === lotteryId)
        if (lottery) {
            // Normalizar drawTime: extraer solo HH:mm (eliminar segundos si existen)
            let drawTime = lottery.drawTime
            if (drawTime.includes(':')) {
                const timeParts = drawTime.split(':')
                drawTime = `${timeParts[0]}:${timeParts[1]}` // Solo HH:mm
            }

            setFormData(prev => ({
                ...prev,
                lotteryId: lotteryId,
                drawTime: drawTime
            }))
        }
    }

    // Manejar cambio de fecha
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date)
            setFormData(prev => ({
                ...prev,
                drawDate: format(date, 'yyyy-MM-dd')
            }))
            setDatePickerOpen(false)
        }
    }

    // Agregar límite global
    const handleAddGlobalLimit = () => {
        if (!globalLimit || parseFloat(globalLimit) <= 0) {
            toast.error('Ingrese un monto válido para el límite global')
            return
        }

        const limits: BetLimit[] = ANIMALS.map(animal => ({
            animalNumber: animal.number,
            animalName: animal.name,
            maxAmount: parseFloat(globalLimit)
        }))

        setFormData(prev => ({
            ...prev,
            betLimits: limits
        }))

        toast.success('Límite global aplicado a todos los animalitos')
    }

    // Agregar límite por animalito
    const handleAddAnimalLimit = () => {
        if (!selectedAnimalForLimit) {
            toast.error('Seleccione un animalito')
            return
        }

        if (!animalLimitAmount || parseFloat(animalLimitAmount) <= 0) {
            toast.error('Ingrese un monto válido')
            return
        }

        const animal = ANIMALS.find(a => a.number === selectedAnimalForLimit)
        if (!animal) return

        const existingLimitIndex = formData.betLimits?.findIndex(
            l => l.animalNumber === selectedAnimalForLimit
        )

        if (existingLimitIndex !== undefined && existingLimitIndex >= 0) {
            // Actualizar límite existente
            const newLimits = [...(formData.betLimits || [])]
            newLimits[existingLimitIndex] = {
                animalNumber: animal.number,
                animalName: animal.name,
                maxAmount: parseFloat(animalLimitAmount)
            }
            setFormData(prev => ({ ...prev, betLimits: newLimits }))
            toast.success('Límite actualizado')
        } else {
            // Agregar nuevo límite
            setFormData(prev => ({
                ...prev,
                betLimits: [
                    ...(prev.betLimits || []),
                    {
                        animalNumber: animal.number,
                        animalName: animal.name,
                        maxAmount: parseFloat(animalLimitAmount)
                    }
                ]
            }))
            toast.success('Límite agregado')
        }

        setSelectedAnimalForLimit('')
        setAnimalLimitAmount('')
    }

    // Eliminar límite por animalito
    const handleRemoveLimit = (animalNumber: string) => {
        setFormData(prev => ({
            ...prev,
            betLimits: (prev.betLimits || []).filter(l => l.animalNumber !== animalNumber)
        }))
        toast.success('Límite eliminado')
    }

    // Limpiar todos los límites
    const handleClearAllLimits = () => {
        setFormData(prev => ({ ...prev, betLimits: [] }))
        setHasGlobalLimit(false)
        setGlobalLimit('')
        toast.success('Todos los límites eliminados')
    }

    // Validar formulario
    const isFormValid = () => {
        return (
            formData.lotteryId &&
            formData.animalNumber &&
            formData.animalName &&
            formData.drawDate &&
            formData.drawTime &&
            (!formData.isWinner || (formData.isWinner && formData.prizeAmount && formData.prizeAmount > 0))
        )
    }

    // Manejar envío del formulario
    const handleSubmit = async () => {
        if (!isFormValid()) {
            console.log('❌ Formulario inválido:', formData)
            toast.error('Por favor completa todos los campos requeridos')
            return
        }

        console.log('✅ Formulario válido, enviando:', formData)
        setIsSubmitting(true)
        try {
            const success = await onSave(formData)
            if (success) {
                onOpenChange(false)
            } else {
                toast.error('Error al crear el sorteo')
            }
        } catch (error) {
            console.error('Error saving draw:', error)
            toast.error(`Error al guardar el sorteo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {draw ? 'Editar Sorteo' : 'Nuevo Sorteo'}
                    </DialogTitle>
                    <DialogDescription>
                        {draw
                            ? 'Modifica los datos del sorteo seleccionado'
                            : 'Crea un nuevo sorteo para una lotería específica'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Mensaje si no hay loterías */}
                    {lotteries.length === 0 && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                No hay loterías disponibles. Por favor, crea una lotería primero en la pestaña "Loterías".
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Selección de Lotería */}
                    <div className="grid gap-2">
                        <Label htmlFor="lottery">Lotería *</Label>
                        <Select
                            value={formData.lotteryId}
                            onValueChange={handleLotterySelect}
                            disabled={isSubmitting || lotteries.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={lotteries.length === 0 ? "No hay loterías disponibles" : "Selecciona una lotería"} />
                            </SelectTrigger>
                            <SelectContent>
                                {lotteries.map((lottery) => (
                                    <SelectItem key={lottery.id} value={lottery.id}>
                                        {lottery.name} - {lottery.drawTime}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selección de Animal */}
                    <div className="grid gap-2">
                        <Label htmlFor="animal">Animal *</Label>
                        <Select
                            value={formData.animalNumber}
                            onValueChange={handleAnimalSelect}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un animal" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {ANIMALS.map((animal) => (
                                    <SelectItem key={animal.number} value={animal.number}>
                                        {animal.number} - {animal.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Fecha del Sorteo */}
                    <div className="grid gap-2">
                        <Label>Fecha del Sorteo *</Label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                    disabled={isSubmitting}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? (
                                        format(selectedDate, "PPP", { locale: es })
                                    ) : (
                                        <span>Selecciona una fecha</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    locale={es}
                                    initialFocus
                                    className="rounded-md border"
                                    classNames={{
                                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                        month: "space-y-4",
                                        caption: "flex justify-center pt-1 relative items-center",
                                        caption_label: "text-sm font-medium",
                                        nav: "space-x-1 flex items-center",
                                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                                        nav_button_previous: "absolute left-1",
                                        nav_button_next: "absolute right-1",
                                        table: "w-full border-collapse space-y-1",
                                        head_row: "flex",
                                        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex items-center justify-center",
                                        row: "flex w-full mt-2",
                                        cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                        day_today: "bg-accent text-accent-foreground",
                                        day_outside: "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                        day_disabled: "text-muted-foreground opacity-50",
                                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                        day_hidden: "invisible"
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Hora del Sorteo - Solo mostrar en modo edición */}
                    {draw && (
                        <div className="grid gap-2">
                            <Label htmlFor="time">Hora del Sorteo *</Label>
                            <Input
                                id="time"
                                type="time"
                                value={formData.drawTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, drawTime: e.target.value }))}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {/* Mostrar hora seleccionada en modo creación */}
                    {!draw && formData.drawTime && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Hora del sorteo: <span className="font-semibold">{formData.drawTime}</span> (según la lotería seleccionada)
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* ¿Es Ganador? */}
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="winner"
                            checked={formData.isWinner}
                            onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                isWinner: checked,
                                prizeAmount: checked ? prev.prizeAmount : undefined
                            }))}
                            disabled={isSubmitting}
                        />
                        <Label htmlFor="winner">¿Es resultado ganador?</Label>
                    </div>

                    {/* Monto del Premio (solo si es ganador) */}
                    {formData.isWinner && (
                        <div className="grid gap-2">
                            <Label htmlFor="prize">Monto del Premio *</Label>
                            <Input
                                id="prize"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.prizeAmount || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    prizeAmount: e.target.value ? parseFloat(e.target.value) : undefined
                                }))}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {/* Información adicional */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            {draw
                                ? 'Los cambios se aplicarán inmediatamente al sorteo seleccionado'
                                : 'El sorteo se registrará con la fecha y hora especificadas'
                            }
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <div className="flex items-center gap-2 flex-1">
                        <Button
                            onClick={async () => {
                                const { testConnection } = await import('../hooks/use-supabase-draws')
                                const result = await testConnection()
                                if (result) {
                                    toast.success('✅ Conexión OK: Supabase accesible')
                                } else {
                                    toast.error('❌ Conexión Fallida: revisa la consola para detalles')
                                }
                            }}
                            type="button"
                            variant="outline"
                            size="sm"
                        >
                            Test DB
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : (draw ? 'Actualizar' : 'Crear')} Sorteo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}