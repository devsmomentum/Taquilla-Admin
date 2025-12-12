import { useState, useEffect, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lottery, Prize, ANIMALS } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash, X } from "@phosphor-icons/react"

interface BetLimit {
  animalNumber: string
  animalName: string
  maxAmount: number
}

interface LotteryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lottery?: Lottery
  onSave: (lottery: Lottery) => Promise<void> | void
  onPlayTomorrowChange?: (lotteryId: string, newValue: boolean) => void
  existingLotteries?: Lottery[]
}

export function LotteryDialog({ open, onOpenChange, lottery, onSave, onPlayTomorrowChange, existingLotteries = [] }: LotteryDialogProps) {
  // Obtener nombres únicos de las loterías existentes para sugerencias
  const uniqueNames = useMemo(() => {
    return Array.from(new Set(existingLotteries.map(l => l.name))).sort()
  }, [existingLotteries])

  // Ref para evitar re-renders innecesarios con uniqueNames
  const uniqueNamesRef = useRef(uniqueNames)
  uniqueNamesRef.current = uniqueNames

  // Estado para demorar el renderizado del contenido (fix para React 19 + Radix)
  const [isContentReady, setIsContentReady] = useState(false)

  const [name, setName] = useState(lottery?.name || "")
  const [isCustomName, setIsCustomName] = useState(() => {
    if (!lottery?.name) return uniqueNames.length === 0 // Si no hay nombres previos, empezar en modo custom
    return !uniqueNames.includes(lottery.name)
  })
  const [openingTime, setOpeningTime] = useState(lottery?.openingTime || "08:00")
  const [closingTime, setClosingTime] = useState(lottery?.closingTime || "12:00")
  const [drawTime, setDrawTime] = useState(lottery?.drawTime || "13:00")
  const [isActive, setIsActive] = useState(lottery?.isActive ?? true)
  const [playsTomorrow, setPlaysTomorrow] = useState(lottery?.playsTomorrow ?? true)
  // Estado para multiplicadores: cada item tiene x30 por defecto, se marca si es x40
  const [itemsWithX40, setItemsWithX40] = useState<Set<string>>(new Set())

  // Estados para límites de apuestas
  const [betLimits, setBetLimits] = useState<BetLimit[]>([])
  const [globalLimit, setGlobalLimit] = useState<string>('')
  const [hasGlobalLimit, setHasGlobalLimit] = useState(false)
  const [selectedAnimalForLimit, setSelectedAnimalForLimit] = useState<string>('')
  const [animalLimitAmount, setAnimalLimitAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [maxToCancel, setMaxToCancel] = useState<string>('')

  // Sincronizar estado cuando cambia la lotería seleccionada o se abre el diálogo
  useEffect(() => {
    if (open) {
      // Demorar el contenido para evitar loop infinito con React 19 + Radix
      setIsContentReady(false)
      const timer = setTimeout(() => setIsContentReady(true), 0)

      const currentUniqueNames = uniqueNamesRef.current
      if (lottery) {
        // Modo edición
        setName(lottery.name)
        setOpeningTime(lottery.openingTime)
        setClosingTime(lottery.closingTime)
        setDrawTime(lottery.drawTime)
        setIsActive(lottery.isActive)
        setPlaysTomorrow(lottery.playsTomorrow)
        setMaxToCancel(lottery.maxToCancel?.toString() || '0')

        // Cargar items con multiplicador x40
        const prizes = lottery.prizes ?? []
        const x40Items = new Set(prizes.filter(p => p.multiplier === 40).map(p => p.animalNumber))
        setItemsWithX40(x40Items)

        // Determinar si es nombre custom
        const isCustom = currentUniqueNames.length > 0 && !currentUniqueNames.includes(lottery.name)
        setIsCustomName(isCustom)
      } else {
        // Modo creación (resetear)
        setName("")
        setOpeningTime("08:00")
        setClosingTime("12:00")
        setDrawTime("13:00")
        setIsActive(true)
        setPlaysTomorrow(true)
        setItemsWithX40(new Set())
        setIsCustomName(currentUniqueNames.length === 0)
        setMaxToCancel('0')

        // Resetear límites
        setBetLimits([])
        setHasGlobalLimit(false)
        setGlobalLimit('')
        setSelectedAnimalForLimit('')
        setAnimalLimitAmount('')
      }

      return () => clearTimeout(timer)
    } else {
      setIsContentReady(false)
    }
  }, [open, lottery])

  const handleSave = async () => {
    if (!name || !openingTime || !closingTime || !drawTime) {
      toast.error("Por favor complete todos los campos")
      return
    }

    // Validar tiempos
    if (openingTime >= closingTime) {
      toast.error("La hora de apertura debe ser anterior a la hora de cierre")
      return
    }

    if (openingTime >= drawTime) {
      toast.error("La hora de apertura debe ser anterior a la hora de jugada")
      return
    }

    // Crear premios para todos los items (40 items)
    // Cada item tiene multiplicador x30 por defecto, o x40 si está marcado
    const allPrizes: Prize[] = ANIMALS.map((animal) => {
      const isX40 = itemsWithX40.has(animal.number)
      // Mantener el ID existente si estamos editando
      const existingPrize = lottery?.prizes?.find(p => p.animalNumber === animal.number)
      return {
        id: existingPrize?.id || `${Date.now()}-${animal.number}`,
        animalNumber: animal.number,
        multiplier: isX40 ? 40 : 30,
        animalName: animal.name,
      }
    })

    const lotteryData: Lottery = {
      id: lottery?.id || Date.now().toString(),
      name,
      openingTime,
      closingTime,
      drawTime,
      isActive,
      playsTomorrow,
      prizes: allPrizes,
      createdAt: lottery?.createdAt || new Date().toISOString(),
      maxToCancel: parseFloat(maxToCancel) || 0,
    }

    setIsSubmitting(true)
    try {
      await onSave(lotteryData)
      toast.success(lottery ? "Lotería actualizada" : "Lotería creada")
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "Error desconocido"
      console.error("Error al guardar lotería:", error)
      toast.error(`${lottery ? "Error al actualizar" : "Error al crear"}: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle multiplicador para un item (x30 <-> x40)
  const toggleMultiplier = (animalNumber: string) => {
    setItemsWithX40(prev => {
      const newSet = new Set(prev)
      if (newSet.has(animalNumber)) {
        newSet.delete(animalNumber)
      } else {
        newSet.add(animalNumber)
      }
      return newSet
    })
  }

  // Marcar todos como x40
  const setAllX40 = () => {
    setItemsWithX40(new Set(ANIMALS.map(a => a.number)))
    toast.success("Todos los items marcados como x40")
  }

  // Marcar todos como x30 (limpiar x40)
  const setAllX30 = () => {
    setItemsWithX40(new Set())
    toast.success("Todos los items marcados como x30")
  }

  // Funciones para límites de apuestas
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

    setBetLimits(limits)
    toast.success('Límite global aplicado a todos los items')
  }

  const handleAddAnimalLimit = () => {
    if (!selectedAnimalForLimit) {
      toast.error('Seleccione un item')
      return
    }

    if (!animalLimitAmount || parseFloat(animalLimitAmount) <= 0) {
      toast.error('Ingrese un monto válido')
      return
    }

    const animal = ANIMALS.find(a => a.number === selectedAnimalForLimit)
    if (!animal) return

    const existingLimitIndex = betLimits.findIndex(
      l => l.animalNumber === selectedAnimalForLimit
    )

    if (existingLimitIndex >= 0) {
      const newLimits = [...betLimits]
      newLimits[existingLimitIndex] = {
        animalNumber: animal.number,
        animalName: animal.name,
        maxAmount: parseFloat(animalLimitAmount)
      }
      setBetLimits(newLimits)
      toast.success('Límite actualizado')
    } else {
      setBetLimits([
        ...betLimits,
        {
          animalNumber: animal.number,
          animalName: animal.name,
          maxAmount: parseFloat(animalLimitAmount)
        }
      ])
      toast.success('Límite agregado')
    }

    setSelectedAnimalForLimit('')
    setAnimalLimitAmount('')
  }

  const handleRemoveLimit = (animalNumber: string) => {
    setBetLimits(betLimits.filter(l => l.animalNumber !== animalNumber))
    toast.success('Límite eliminado')
  }

  const handleClearAllLimits = () => {
    setBetLimits([])
    setHasGlobalLimit(false)
    setGlobalLimit('')
    toast.success('Todos los límites eliminados')
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lottery ? "Editar Lotería" : "Nueva Lotería"}</DialogTitle>
          <DialogDescription>
            Configure los detalles de la lotería y los premios disponibles
          </DialogDescription>
        </DialogHeader>

        {!isContentReady ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Lotería</Label>
            {!isCustomName && uniqueNames.length > 0 ? (
              <Select
                value={uniqueNames.includes(name) ? name : ""}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setIsCustomName(true)
                    setName("")
                  } else {
                    setName(value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una lotería existente" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="font-semibold text-primary">
                    + Nuevo nombre...
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="name"
                  placeholder="Escriba el nombre de la lotería"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                {uniqueNames.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsCustomName(false)
                      setName("")
                    }}
                    title="Seleccionar existente"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening-time">Hora de Apertura</Label>
              <Input
                id="opening-time"
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing-time">Hora de Cierre</Label>
              <Input
                id="closing-time"
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="draw-time">Hora de Jugada</Label>
              <Input
                id="draw-time"
                type="time"
                value={drawTime}
                onChange={(e) => setDrawTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lotería Activa</Label>
              <p className="text-sm text-muted-foreground">Aceptar nuevas jugadas</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Juega Mañana</Label>
              <p className="text-sm text-muted-foreground">Disponible para el próximo sorteo</p>
            </div>
            <Switch
              checked={playsTomorrow}
              onCheckedChange={(value) => {
                setPlaysTomorrow(value)
                // Notificar el cambio si hay una lotería en edición
                if (lottery?.id && onPlayTomorrowChange) {
                  onPlayTomorrowChange(lottery.id, value)
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-to-cancel">Máximo de Tickets a Cancelar por Taquilla</Label>
            <Input
              id="max-to-cancel"
              type="number"
              min="0"
              step="1"
              placeholder="0 = sin límite"
              value={maxToCancel}
              onChange={(e) => setMaxToCancel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Cantidad máxima de tickets que una taquilla puede cancelar para esta lotería. Dejar en 0 para sin límite.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Configuración de Multiplicadores</Label>
                <p className="text-xs text-muted-foreground">
                  Todos los items están incluidos. Marque los que tendrán multiplicador x40 (el resto será x30)
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={setAllX30}>
                  Todos x30
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={setAllX40}>
                  Todos x40
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-3 border rounded-lg">
              {ANIMALS.map((animal) => {
                const isX40 = itemsWithX40.has(animal.number)
                return (
                  <label
                    key={animal.number}
                    className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isX40
                        ? 'bg-primary/10 hover:bg-primary/20 border border-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="text-sm">{animal.number} - {animal.name}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      isX40
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      x{isX40 ? '40' : '30'}
                    </span>
                    <input
                      type="checkbox"
                      checked={isX40}
                      onChange={() => toggleMultiplier(animal.number)}
                      className="sr-only"
                    />
                  </label>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{ANIMALS.length - itemsWithX40.size} items con x30</span>
              <span>{itemsWithX40.size} items con x40</span>
            </div>
          </div>

          {/* Sección de Límites de Apuestas */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Límites de Apuestas</CardTitle>
              <CardDescription>Configure límites máximos de apuesta para esta lotería (opcional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Límite Global */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="global-limit"
                    checked={hasGlobalLimit}
                    onCheckedChange={setHasGlobalLimit}
                  />
                  <Label htmlFor="global-limit" className="font-medium">Límite global para todos los items</Label>
                </div>

                {hasGlobalLimit && (
                  <div className="flex gap-2 ml-6">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monto máximo (Bs.)"
                      value={globalLimit}
                      onChange={(e) => setGlobalLimit(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddGlobalLimit}
                      disabled={!globalLimit}
                      size="sm"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Aplicar
                    </Button>
                  </div>
                )}
              </div>

              {/* Límite por Item */}
              <div className="space-y-2">
                <Label className="font-medium">Límite por item específico</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedAnimalForLimit}
                    onValueChange={setSelectedAnimalForLimit}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona un item" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {ANIMALS.map((animal) => (
                        <SelectItem key={animal.number} value={animal.number}>
                          {animal.number} - {animal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto máximo"
                    value={animalLimitAmount}
                    onChange={(e) => setAnimalLimitAmount(e.target.value)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    onClick={handleAddAnimalLimit}
                    disabled={!selectedAnimalForLimit || !animalLimitAmount}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Límites Configurados */}
              {betLimits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Límites configurados ({betLimits.length})</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllLimits}
                    >
                      Limpiar todos
                    </Button>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-md p-2">
                    {betLimits.map((limit) => (
                      <div
                        key={limit.animalNumber}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <span className="font-mono">
                          {limit.animalNumber} - {limit.animalName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Bs.S {limit.maxAmount.toFixed(2)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLimit(limit.animalNumber)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isContentReady || isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
