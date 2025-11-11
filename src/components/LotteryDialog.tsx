import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lottery, Prize, ANIMALS } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface LotteryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lottery?: Lottery
  onSave: (lottery: Lottery) => void
}

export function LotteryDialog({ open, onOpenChange, lottery, onSave }: LotteryDialogProps) {
  const [name, setName] = useState(lottery?.name || "")
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
            <Input
              id="name"
              placeholder="Ej: Terminal de La Rinconada"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
            <Switch checked={playsTomorrow} onCheckedChange={setPlaysTomorrow} />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
