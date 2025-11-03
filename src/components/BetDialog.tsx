import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bet, Lottery, ANIMALS } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/pot-utils"

interface BetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lotteries: Lottery[]
  onSave: (bet: Bet) => void
}

export function BetDialog({ open, onOpenChange, lotteries, onSave }: BetDialogProps) {
  const [lotteryId, setLotteryId] = useState("")
  const [animalNumber, setAnimalNumber] = useState("")
  const [amount, setAmount] = useState("")

  const selectedLottery = lotteries.find((l) => l.id === lotteryId)
  const selectedAnimal = ANIMALS.find((a) => a.number === animalNumber)
  const prize = selectedLottery?.prizes.find((p) => p.animalNumber === animalNumber)
  const potentialWin = prize ? Number(amount) * prize.multiplier : 0

  const handleSave = () => {
    if (!lotteryId || !animalNumber || !amount || Number(amount) <= 0) {
      toast.error("Por favor complete todos los campos")
      return
    }

    if (!selectedLottery) {
      toast.error("Lotería no válida")
      return
    }

    const bet: Bet = {
      id: Date.now().toString(),
      lotteryId,
      lotteryName: selectedLottery.name,
      animalNumber,
      animalName: selectedAnimal?.name || "",
      amount: Number(amount),
      timestamp: new Date().toISOString(),
      potentialWin,
    }

    onSave(bet)
    setLotteryId("")
    setAnimalNumber("")
    setAmount("")
    onOpenChange(false)
    toast.success("Jugada registrada")
  }

  const activeLotteries = lotteries.filter((l) => l.isActive)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Jugada</DialogTitle>
          <DialogDescription>Registre una jugada de lotería</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lottery">Seleccionar Lotería</Label>
            <Select value={lotteryId} onValueChange={setLotteryId}>
              <SelectTrigger id="lottery">
                <SelectValue placeholder="Seleccione una lotería" />
              </SelectTrigger>
              <SelectContent>
                {activeLotteries.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">No hay loterías activas</div>
                )}
                {activeLotteries.map((lottery) => (
                  <SelectItem key={lottery.id} value={lottery.id}>
                    {lottery.name} - Cierra: {lottery.closingTime}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal">Seleccionar Animal</Label>
            <Select value={animalNumber} onValueChange={setAnimalNumber} disabled={!lotteryId}>
              <SelectTrigger id="animal">
                <SelectValue placeholder="Seleccione un animal" />
              </SelectTrigger>
              <SelectContent>
                {ANIMALS.map((animal) => {
                  const hasPrize = selectedLottery?.prizes.some((p) => p.animalNumber === animal.number)
                  return (
                    <SelectItem key={animal.number} value={animal.number} disabled={!hasPrize}>
                      {animal.number} - {animal.name}
                      {hasPrize && selectedLottery && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (x{selectedLottery.prizes.find((p) => p.animalNumber === animal.number)?.multiplier})
                        </span>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto de la Apuesta (Bs.)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {potentialWin > 0 && (
            <div className="p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Premio Potencial</p>
              <p className="text-2xl font-semibold text-accent tabular-nums">
                {formatCurrency(potentialWin)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Registrar Jugada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
