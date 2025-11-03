export interface Lottery {
  id: string
  name: string
  closingTime: string
  isActive: boolean
  playsTomorrow: boolean
  prizes: Prize[]
  createdAt: string
}

export interface Prize {
  id: string
  animalNumber: string
  multiplier: number
  animalName: string
}

export interface Bet {
  id: string
  lotteryId: string
  lotteryName: string
  animalNumber: string
  animalName: string
  amount: number
  timestamp: string
  potentialWin: number
  isWinner?: boolean
}

export interface DrawResult {
  id: string
  lotteryId: string
  lotteryName: string
  winningAnimalNumber: string
  winningAnimalName: string
  drawTime: string
  totalPayout: number
  winnersCount: number
}

export interface Pot {
  name: string
  percentage: number
  balance: number
  color: string
  description: string
}

export interface Transfer {
  id: string
  fromPot: string
  toPot: string
  amount: number
  timestamp: string
}

export interface Withdrawal {
  id: string
  amount: number
  timestamp: string
  fromPot: string
}

export const ANIMALS = [
  { number: "00", name: "Delfín" },
  { number: "01", name: "Carnero" },
  { number: "02", name: "Toro" },
  { number: "03", name: "Ciempiés" },
  { number: "04", name: "Alacrán" },
  { number: "05", name: "León" },
  { number: "06", name: "Rana" },
  { number: "07", name: "Perico" },
  { number: "08", name: "Ratón" },
  { number: "09", name: "Águila" },
  { number: "10", name: "Tigre" },
  { number: "11", name: "Gato" },
  { number: "12", name: "Caballo" },
  { number: "13", name: "Mono" },
  { number: "14", name: "Paloma" },
  { number: "15", name: "Zorro" },
  { number: "16", name: "Oso" },
  { number: "17", name: "Pavo" },
  { number: "18", name: "Burro" },
  { number: "19", name: "Chivo" },
  { number: "20", name: "Cochino" },
  { number: "21", name: "Gallo" },
  { number: "22", name: "Camello" },
  { number: "23", name: "Cebra" },
  { number: "24", name: "Iguana" },
  { number: "25", name: "Gallina" },
  { number: "26", name: "Vaca" },
  { number: "27", name: "Perro" },
  { number: "28", name: "Zamuro" },
  { number: "29", name: "Elefante" },
  { number: "30", name: "Caimán" },
  { number: "31", name: "Lapa" },
  { number: "32", name: "Ardilla" },
  { number: "33", name: "Pescado" },
  { number: "34", name: "Venado" },
  { number: "35", name: "Jirafa" },
  { number: "36", name: "Cucaracha" },
]
