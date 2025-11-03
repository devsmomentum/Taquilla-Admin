import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lottery, Prize, ANIMALS } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Trash } from "@phosphor-icons/react"

interface LotteryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lottery?: Lottery
  onSave: (lottery: Lottery) => void
}

export function LotteryDialog({ open, onOpenChange, lottery, onSave }: LotteryDialogProps) {
  const [name, setName] = useState(lottery?.name || "")
  const [closingTime, setClosingTime] = useState(lottery?.closingTime || "12:00")
  const [isActive, setIsActive] = useState(lottery?.isActive ?? true)
  const [playsTomorrow, setPlaysTomorrow] = useState(lottery?.playsTomorrow ?? true)
  const [prizes, setPrizes] = useState<Prize[]>(lottery?.prizes || [])

  const handleSave = () => {
    if (!name || !closingTime) {
      toast.error("Por favor complete todos los campos")
      return
    }

    const lotteryData: Lottery = {
      id: lottery?.id || Date.now().toString(),
      name,
      closingTime,
      isActive,
      playsTomorrow,
      prizes,
      createdAt: lottery?.createdAt || new Date().toISOString(),
    }

    onSave(lotteryData)
    onOpenChange(false)
    toast.success(lottery ? "Lotería actualizada" : "Lotería creada")
  }

  const addPrize = () => {
    const newPrize: Prize = {
      id: Date.now().toString(),
      animalNumber: "00",
      multiplier: 70,
      animalName: "Delfín",
    }
    setPrizes([...prizes, newPrize])
  }

  const updatePrize = (id: string, field: keyof Prize, value: string | number) => {
    setPrizes(prizes.map((p) => {
      if (p.id === id) {
        if (field === "animalNumber") {
          const animal = ANIMALS.find((a) => a.number === value)
          return { ...p, animalNumber: value as string, animalName: animal?.name || "" }
        }
        return { ...p, [field]: value }
      }
      return p
    }))
  }

  const removePrize = (id: string) => {
    setPrizes(prizes.filter((p) => p.id !== id))
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

          <div className="space-y-2">
            <Label htmlFor="closing-time">Hora de Cierre</Label>
            <Input
              id="closing-time"
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
            />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Premios</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPrize}>
                Agregar Premio
              </Button>
            </div>

            <div className="space-y-2">
              {prizes.map((prize) => (
                <div key={prize.id} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Animal</Label>
                    <Select
                      value={prize.animalNumber}
                      onValueChange={(value) => updatePrize(prize.id, "animalNumber", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMALS.map((animal) => (
                          <SelectItem key={animal.number} value={animal.number}>
                            {animal.number} - {animal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32 space-y-2">
                    <Label>Multiplicador</Label>
                    <Input
                      type="number"
                      value={prize.multiplier}
                      onChange={(e) => updatePrize(prize.id, "multiplier", Number(e.target.value))}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removePrize(prize.id)}
                  >
                    <Trash />
                  </Button>
                </div>
              ))}

              {prizes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay premios configurados
                </p>
              )}
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
