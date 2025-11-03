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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className={pot.color}>{pot.name}</span>
            <span className="text-sm font-normal text-muted-foreground">{pot.percentage}%</span>
          </CardTitle>
          <CardDescription>{pot.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-semibold tabular-nums">{formatCurrency(pot.balance)}</div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
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
