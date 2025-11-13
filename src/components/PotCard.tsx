import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/pot-utils"
import { Pot } from "@/lib/types"
import { ArrowsLeftRight, CurrencyDollar } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface PotCardProps {
  pot: Pot
  index: number
  onTransfer: (potIndex: number) => void
  onWithdraw: (potIndex: number) => void
}

export function PotCard({ pot, index, onTransfer, onWithdraw }: PotCardProps) {
  const isProfit = index === 2
  
  // Colores de fondo más vibrantes para cada pote
  const bgColors = [
    'bg-blue-100/50',     // Pote de Premios - azul claro
    'bg-orange-100/50',   // Costos - naranja claro
    'bg-green-100/50'     // Pote de Ganancias - verde claro
  ]
  
  const titleColors = [
    'text-blue-600',      // Pote de Premios
    'text-orange-600',    // Costos
    'text-green-600'      // Pote de Ganancias
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card className={`hover:shadow-lg transition-shadow h-full flex flex-col ${bgColors[index]}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className={`font-bold ${titleColors[index]}`}>{pot.name}</span>
            <span className="text-sm font-normal text-muted-foreground">{pot.percentage}%</span>
          </CardTitle>
          <CardDescription>{pot.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
          <div className="text-3xl font-bold tabular-nums">{formatCurrency(pot.balance)}</div>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className={isProfit ? "flex-1" : "w-full"}
              onClick={() => onTransfer(index)}
            >
              <ArrowsLeftRight className="mr-2" />
              Transferir
            </Button>
            {isProfit && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => onWithdraw(index)}
                disabled={pot.balance <= 0}
              >
                <CurrencyDollar className="mr-2" />
                Retirar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
