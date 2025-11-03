import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Bet, DrawResult, Lottery, ANIMALS } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/pot-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "@phosphor-icons/react"

interface DrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lotteries: Lottery[]
  bets: Bet[]
  onDraw: (result: DrawResult, winners: Bet[]) => void
}

export function DrawDialog({ open, onOpenChange, lotteries, bets, onDraw }: DrawDialogProps) {
  const [lotteryId, setLotteryId] = useState("")
  const [winningNumber, setWinningNumber] = useState("")

  const selectedLottery = lotteries.find((l) => l.id === lotteryId)
  const selectedAnimal = ANIMALS.find((a) => a.number === winningNumber)

  const lotteryBets = bets.filter((b) => b.lotteryId === lotteryId && !b.isWinner)
  const potentialWinners = lotteryBets.filter((b) => b.animalNumber === winningNumber)
  const totalPayout = potentialWinners.reduce((sum, bet) => sum + bet.potentialWin, 0)

  const handleDraw = () => {
    if (!lotteryId || !winningNumber) {
      toast.error("Por favor complete todos los campos")
      return
    }

    if (!selectedLottery || !selectedAnimal) {
      toast.error("Selección no válida")
      return
    }

    const result: DrawResult = {
      id: Date.now().toString(),
      lotteryId,
      lotteryName: selectedLottery.name,
      winningAnimalNumber: winningNumber,
      winningAnimalName: selectedAnimal.name,
      drawTime: new Date().toISOString(),
      totalPayout,
      winnersCount: potentialWinners.length,
    }

    onDraw(result, potentialWinners)
    setLotteryId("")
    setWinningNumber("")
    onOpenChange(false)
    toast.success(`Sorteo realizado: ${selectedAnimal.name} (${winningNumber})`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Realizar Sorteo</DialogTitle>
          <DialogDescription>Ingrese el resultado del sorteo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="draw-lottery">Seleccionar Lotería</Label>
            <Select value={lotteryId} onValueChange={setLotteryId}>
              <SelectTrigger id="draw-lottery">
                <SelectValue placeholder="Seleccione una lotería" />
              </SelectTrigger>
              <SelectContent>
                {lotteries.map((lottery) => {
                  const betCount = bets.filter((b) => b.lotteryId === lottery.id && !b.isWinner).length
                  return (
                    <SelectItem key={lottery.id} value={lottery.id}>
                      {lottery.name} ({betCount} jugadas)
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="winning-number">Animal Ganador</Label>
            <Select value={winningNumber} onValueChange={setWinningNumber} disabled={!lotteryId}>
              <SelectTrigger id="winning-number">
                <SelectValue placeholder="Seleccione el animal ganador" />
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

          {lotteryId && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Total de jugadas para esta lotería: <strong>{lotteryBets.length}</strong>
              </AlertDescription>
            </Alert>
          )}

          {winningNumber && lotteryId && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ganadores:</span>
                <span className="font-medium">{potentialWinners.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pago Total:</span>
                <span className="font-semibold text-lg tabular-nums">
                  {formatCurrency(totalPayout)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDraw}>Confirmar Sorteo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
