import { useState, useEffect, useMemo } from "react"
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
  onSave: (lottery: Lottery) => void
  onPlayTomorrowChange?: (lotteryId: string, newValue: boolean) => void
  existingLotteries?: Lottery[]
}

export function LotteryDialog({ open, onOpenChange, lottery, onSave, onPlayTomorrowChange, existingLotteries = [] }: LotteryDialogProps) {
  // Obtener nombres únicos de las loterías existentes para sugerencias
  const uniqueNames = useMemo(() => {
    return Array.from(new Set(existingLotteries.map(l => l.name))).sort()
  }, [existingLotteries])

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
  const [animalsX30, setAnimalsX30] = useState<string[]>(
    lottery?.prizes.filter(p => p.multiplier === 30).map(p => p.animalNumber) || []
  )
  const [animalsX40, setAnimalsX40] = useState<string[]>(
    lottery?.prizes.filter(p => p.multiplier === 40).map(p => p.animalNumber) || []
  )

  // Estados para límites de apuestas
  const [betLimits, setBetLimits] = useState<BetLimit[]>([])
  const [globalLimit, setGlobalLimit] = useState<string>('')
  const [hasGlobalLimit, setHasGlobalLimit] = useState(false)
  const [selectedAnimalForLimit, setSelectedAnimalForLimit] = useState<string>('')
  const [animalLimitAmount, setAnimalLimitAmount] = useState<string>('')

  // Sincronizar estado cuando cambia la lotería seleccionada o se abre el diálogo
  useEffect(() => {
    if (open) {
      if (lottery) {
        // Modo edición
        setName(lottery.name)
        setOpeningTime(lottery.openingTime)
        setClosingTime(lottery.closingTime)
        setDrawTime(lottery.drawTime)
        setIsActive(lottery.isActive)
        setPlaysTomorrow(lottery.playsTomorrow)

        setAnimalsX30(
          lottery.prizes.filter(p => p.multiplier === 30).map(p => p.animalNumber)
        )
        setAnimalsX40(
          lottery.prizes.filter(p => p.multiplier === 40).map(p => p.animalNumber)
        )

        // Determinar si es nombre custom
        const isCustom = uniqueNames.length > 0 && !uniqueNames.includes(lottery.name)
        setIsCustomName(isCustom)
      } else {
        // Modo creación (resetear)
        setName("")
        setOpeningTime("08:00")
        setClosingTime("12:00")
        setDrawTime("13:00")
        setIsActive(true)
        setPlaysTomorrow(true)
        setAnimalsX30([])
        setAnimalsX40([])
        setIsCustomName(uniqueNames.length === 0)

        // Resetear límites
        setBetLimits([])
        setHasGlobalLimit(false)
        setGlobalLimit('')
        setSelectedAnimalForLimit('')
        setAnimalLimitAmount('')
      }
    }
  }, [open, lottery, uniqueNames])

  const handleSave = () => {
    if (!name || !openingTime || !closingTime || !drawTime) {
      toast.error("Por favor complete todos los campos")
      return
    }

    // Crear premios para animales x30
    const prizesX30: Prize[] = animalsX30.map((animalNumber) => {
      const animal = ANIMALS.find(a => a.number === animalNumber)
      return {
        id: `${Date.now()}-${animalNumber}-30`,
        animalNumber,
        multiplier: 30,
        animalName: animal?.name || "",
      }
    })

    // Crear premios para animales x40
    const prizesX40: Prize[] = animalsX40.map((animalNumber) => {
      const animal = ANIMALS.find(a => a.number === animalNumber)
      return {
        id: `${Date.now()}-${animalNumber}-40`,
        animalNumber,
        multiplier: 40,
        animalName: animal?.name || "",
      }
    })

    const allPrizes = [...prizesX30, ...prizesX40]

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
    }

    onSave(lotteryData)
    onOpenChange(false)
    toast.success(lottery ? "Lotería actualizada" : "Lotería creada")
  }

  const toggleAnimalX30 = (animalNumber: string) => {
    setAnimalsX30(prev =>
      prev.includes(animalNumber)
        ? prev.filter(n => n !== animalNumber)
        : [...prev, animalNumber]
    )
  }

  const toggleAnimalX40 = (animalNumber: string) => {
    setAnimalsX40(prev =>
      prev.includes(animalNumber)
        ? prev.filter(n => n !== animalNumber)
        : [...prev, animalNumber]
    )
  }

  const selectAllX30 = () => {
    setAnimalsX30(ANIMALS.map(a => a.number))
    toast.success("Todos los animalitos seleccionados para x30")
  }

  const selectAllX40 = () => {
    setAnimalsX40(ANIMALS.map(a => a.number))
    toast.success("Todos los animalitos seleccionados para x40")
  }

  const clearAllX30 = () => {
    setAnimalsX30([])
  }

  const clearAllX40 = () => {
    setAnimalsX40([])
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
    toast.success('Límite global aplicado a todos los animalitos')
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lottery ? "Editar Lotería" : "Nueva Lotería"}</DialogTitle>
          <DialogDescription>
            Configure los detalles de la lotería y los premios disponibles
          </DialogDescription>
        </DialogHeader>

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
                    ➕ Nuevo nombre...
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

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Animalitos con Multiplicador x30</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllX30}>
                    Todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllX30}>
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg">
                {ANIMALS.map((animal) => (
                  <label
                    key={animal.number}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={animalsX30.includes(animal.number)}
                      onChange={() => toggleAnimalX30(animal.number)}
                      className="rounded"
                    />
                    <span className="text-sm">{animal.number} - {animal.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {animalsX30.length} animalito{animalsX30.length !== 1 ? 's' : ''} seleccionado{animalsX30.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Animalitos con Multiplicador x40</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllX40}>
                    Todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllX40}>
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg">
                {ANIMALS.map((animal) => (
                  <label
                    key={animal.number}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={animalsX40.includes(animal.number)}
                      onChange={() => toggleAnimalX40(animal.number)}
                      className="rounded"
                    />
                    <span className="text-sm">{animal.number} - {animal.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {animalsX40.length} animalito{animalsX40.length !== 1 ? 's' : ''} seleccionado{animalsX40.length !== 1 ? 's' : ''}
              </p>
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
                  <Label htmlFor="global-limit" className="font-medium">Límite global para todos los animalitos</Label>
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

              {/* Límite por Animalito */}
              <div className="space-y-2">
                <Label className="font-medium">Límite por animalito específico</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedAnimalForLimit}
                    onValueChange={setSelectedAnimalForLimit}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona un animalito" />
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
