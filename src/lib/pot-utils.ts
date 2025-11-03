import { Pot } from "./types"

export const POT_TYPES = {
  PRIZES: "prizes",
  RESERVE: "reserve",
  PROFIT: "profit",
} as const

export const INITIAL_POTS: Pot[] = [
  {
    name: "Pote de Premios",
    percentage: 70,
    balance: 0,
    color: "text-blue-600",
    description: "Para pagar premios ganadores",
  },
  {
    name: "Pote de Reserva",
    percentage: 20,
    balance: 0,
    color: "text-orange-600",
    description: "Fondo de respaldo",
  },
  {
    name: "Pote de Ganancias",
    percentage: 10,
    balance: 0,
    color: "text-accent",
    description: "Utilidades del negocio",
  },
]

export function distributeBetToPots(betAmount: number, currentPots: Pot[]): Pot[] {
  return currentPots.map((pot) => ({
    ...pot,
    balance: pot.balance + (betAmount * pot.percentage) / 100,
  }))
}

export function deductFromPot(potIndex: number, amount: number, currentPots: Pot[]): Pot[] {
  const newPots = [...currentPots]
  newPots[potIndex] = {
    ...newPots[potIndex],
    balance: newPots[potIndex].balance - amount,
  }
  return newPots
}

export function transferBetweenPots(
  fromIndex: number,
  toIndex: number,
  amount: number,
  currentPots: Pot[]
): Pot[] {
  const newPots = [...currentPots]
  newPots[fromIndex] = {
    ...newPots[fromIndex],
    balance: newPots[fromIndex].balance - amount,
  }
  newPots[toIndex] = {
    ...newPots[toIndex],
    balance: newPots[toIndex].balance + amount,
  }
  return newPots
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(amount)
}
