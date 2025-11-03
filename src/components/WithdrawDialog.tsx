import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/pot-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "@phosphor-icons/react"

interface WithdrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableBalance: number
  onWithdraw: (amount: number) => void
}

export function WithdrawDialog({
  open,
  onOpenChange,
  availableBalance,
  onWithdraw,
}: WithdrawDialogProps) {
  const [amount, setAmount] = useState("")

  const handleWithdraw = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Ingrese un monto válido")
      return
    }

    const withdrawAmount = Number(amount)
    if (withdrawAmount > availableBalance) {
      toast.error("Saldo insuficiente")
      return
    }

    onWithdraw(withdrawAmount)
    setAmount("")
    onOpenChange(false)
    toast.success("Retiro realizado exitosamente")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar Ganancias</DialogTitle>
          <DialogDescription>Retirar fondos del pote de ganancias</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Saldo disponible para retiro: <strong>{formatCurrency(availableBalance)}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Monto a Retirar (Bs.)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {amount && Number(amount) > 0 && (
            <div className="p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo Restante</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCurrency(availableBalance - Number(amount))}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleWithdraw} className="bg-accent hover:bg-accent/90">
            Confirmar Retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
