// Formatea una hora string ("HH:mm" o "HH:mm:ss") a formato 12h con AM/PM
export function formatHour12(time: string): string {
  if (!time) return '';
  // Soporta "HH:mm" o "HH:mm:ss"
  const [h, m, s] = time.split(':');
  let hour = parseInt(h, 10);
  const minute = m || '00';
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.padStart(2, '0')} ${ampm}`;
}
import { Pot } from "./types"

export const POT_TYPES = {
  PRIZES: "prizes",
  RESERVE: "reserve",
  PROFIT: "profit",
} as const

export const INITIAL_POTS: Pot[] = [
  {
    name: "Pote de Premios",
    percentage: 60,
    balance: 0,
    color: "text-blue-600",
    description: "Para pagar premios ganadores",
  },
  {
    name: "Costos",
    percentage: 30,
    balance: 0,
    color: "text-orange-600",
    description: "Costos operativos y gastos",
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
