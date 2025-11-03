import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pot } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/pot-utils"

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pots: Pot[]
  initialFromIndex?: number
  onTransfer: (fromIndex: number, toIndex: number, amount: number) => void
}

export function TransferDialog({
  open,
  onOpenChange,
  pots,
  initialFromIndex,
  onTransfer,
}: TransferDialogProps) {
  const [fromIndex, setFromIndex] = useState(initialFromIndex?.toString() || "")
  const [toIndex, setToIndex] = useState("")
  const [amount, setAmount] = useState("")

  const fromPot = fromIndex ? pots[Number(fromIndex)] : undefined
  const toPot = toIndex ? pots[Number(toIndex)] : undefined

  const handleTransfer = () => {
    if (!fromIndex || !toIndex || !amount || Number(amount) <= 0) {
      toast.error("Por favor complete todos los campos")
      return
    }

    if (fromIndex === toIndex) {
      toast.error("Debe seleccionar potes diferentes")
      return
    }

    const transferAmount = Number(amount)
    if (fromPot && transferAmount > fromPot.balance) {
      toast.error("Saldo insuficiente en el pote de origen")
      return
    }

    onTransfer(Number(fromIndex), Number(toIndex), transferAmount)
    setFromIndex("")
    setToIndex("")
    setAmount("")
    onOpenChange(false)
    toast.success("Transferencia realizada")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Entre Potes</DialogTitle>
          <DialogDescription>Mover fondos de un pote a otro</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="from-pot">Pote de Origen</Label>
            <Select value={fromIndex} onValueChange={setFromIndex}>
              <SelectTrigger id="from-pot">
                <SelectValue placeholder="Seleccione pote de origen" />
              </SelectTrigger>
              <SelectContent>
                {pots.map((pot, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {pot.name} - {formatCurrency(pot.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-pot">Pote de Destino</Label>
            <Select value={toIndex} onValueChange={setToIndex}>
              <SelectTrigger id="to-pot">
                <SelectValue placeholder="Seleccione pote de destino" />
              </SelectTrigger>
              <SelectContent>
                {pots.map((pot, index) => (
                  <SelectItem key={index} value={index.toString()} disabled={index.toString() === fromIndex}>
                    {pot.name} - {formatCurrency(pot.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Transferir (Bs.)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {fromPot && (
              <p className="text-xs text-muted-foreground">
                Disponible: {formatCurrency(fromPot.balance)}
              </p>
            )}
          </div>

          {fromPot && toPot && amount && Number(amount) > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">De: {fromPot.name}</span>
                <span className="font-medium">
                  {formatCurrency(fromPot.balance - Number(amount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Para: {toPot.name}</span>
                <span className="font-medium">
                  {formatCurrency(toPot.balance + Number(amount))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer}>Transferir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
