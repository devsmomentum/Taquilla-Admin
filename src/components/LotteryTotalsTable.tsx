import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/pot-utils'

export interface LotteryTotalsRow {
  lotteryName: string
  sales: number
  prizes: number
  commission: number
  total: number
  profit: number
  participationAmount: number
  participationPercent: number
}

interface LotteryTotalsTableProps {
  rows: LotteryTotalsRow[]
  periodLabel: string
}

export function LotteryTotalsTable({ rows, periodLabel }: LotteryTotalsTableProps) {
  const totals = rows.reduce(
    (acc, row) => ({
      sales: acc.sales + row.sales,
      prizes: acc.prizes + row.prizes,
      commission: acc.commission + row.commission,
      total: acc.total + row.total,
      profit: acc.profit + row.profit,
      participationAmount: acc.participationAmount + row.participationAmount,
    }),
    {
      sales: 0,
      prizes: 0,
      commission: 0,
      total: 0,
      profit: 0,
      participationAmount: 0,
    }
  )

  const totalParticipationPercent =
    totals.profit !== 0 ? (totals.participationAmount / totals.profit) * 100 : 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold">Totales por Tipo de Loteria</h3>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loteria</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Premios</TableHead>
              <TableHead className="text-right">Comision</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Utilidad</TableHead>
              <TableHead className="text-right">Participacion</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.lotteryName}>
                <TableCell className="font-medium">{row.lotteryName}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.sales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.prizes)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.commission)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.profit)}</TableCell>
                <TableCell className="text-right">
                  <span>{formatCurrency(row.participationAmount)}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({row.participationPercent.toFixed(2)}%)
                  </span>
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="bg-muted/30 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.sales)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.prizes)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.commission)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.profit)}</TableCell>
              <TableCell className="text-right">
                <span>{formatCurrency(totals.participationAmount)}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({totalParticipationPercent.toFixed(2)}%)
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
