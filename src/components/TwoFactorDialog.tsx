import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ShieldCheck } from "@phosphor-icons/react"

interface TwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: (code: string) => void
  userEmail: string
}

export function TwoFactorDialog({ open, onOpenChange, onVerify, userEmail }: TwoFactorDialogProps) {
  const [code, setCode] = useState("")

  const handleVerify = () => {
    if (code.length === 6) {
      onVerify(code)
      setCode("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length === 6) {
      handleVerify()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyPress}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-accent" weight="fill" />
            </div>
          </div>
          <DialogTitle className="text-center">Verificación de Dos Factores</DialogTitle>
          <DialogDescription className="text-center">
            Ingrese el código de autenticación de 6 dígitos para {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="space-y-2 w-full flex flex-col items-center">
            <Label htmlFor="2fa-code">Código de Verificación</Label>
            <InputOTP
              id="2fa-code"
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            onClick={handleVerify}
            disabled={code.length !== 6}
            className="w-full sm:w-auto"
          >
            Verificar Código
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
