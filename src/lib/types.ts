export interface Lottery {
  id: string
  name: string
  openingTime: string
  closingTime: string
  drawTime: string
  isActive: boolean
  playsTomorrow: boolean
  prizes: Prize[]
  createdAt: string
  maxToCancel?: number // Máximo de tickets que puede cancelar una taquilla para esta lotería
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
  isWinner: boolean
  userId?: string
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

export interface DailyResult {
  id: string
  lotteryId: string
  prizeId: string
  resultDate: string // formato YYYY-MM-DD
  createdAt: string
  totalToPay: number // Suma de potential_bet_amount de ganadores
  totalRaised: number // Total ventas - total a pagar
  // Campos poblados desde relaciones
  lottery?: Lottery
  prize?: Prize
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

// Tipos de usuario en el sistema
export type UserType = 'admin' | 'comercializadora' | 'agencia' | 'taquilla'

export interface Taquilla {
  id: string
  fullName: string
  address: string
  telefono?: string
  email: string
  username?: string
  password?: string
  passwordHash?: string
  isApproved: boolean
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  userId?: string // Usuario vinculado (userType: 'taquilla')
  parentId?: string // ID de la agencia (relación jerárquica)
  shareOnSales?: number
  shareOnProfits?: number
  salesLimit?: number // Límite de venta para la taquilla
}

export interface Agency {
  id: string
  name: string
  email?: string
  address: string
  logo?: string
  userId?: string // Usuario vinculado (userType: 'agencia')
  parentId: string // ID de la comercializadora (relación jerárquica)
  shareOnSales: number
  shareOnProfits: number
  currentBalance: number
  isActive: boolean
  createdAt: string
}

export interface Comercializadora {
  id: string
  name: string
  email: string
  address?: string
  logo?: string
  userId?: string // Usuario vinculado (userType: 'comercializadora')
  shareOnSales: number
  shareOnProfits: number
  isActive: boolean
  createdAt: string
  createdBy?: string
}

export interface Porcentaje {
  id: string
  entityType: 'general' | 'comercializadora' | 'agencia'
  entityId?: string
  adminPercentage: number
  commercializerPercentage: number
  agencyPercentage: number
  taquillaPercentage: number
  createdAt: string
}

export type ModulePermission =
  | "dashboard"
  | "reports"
  | "lotteries"
  | "bets"
  | "winners"
  | "history"
  | "users"
  | "roles"
  | "api-keys"
  | "comercializadoras" // Incluye gestión de comercializadoras, agencias y taquillas
  | "porcentajes"

export interface Role {
  id: string
  name: string
  description: string
  permissions: ModulePermission[]
  createdAt: string
  isSystem?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  password?: string
  userType?: UserType // Tipo de usuario en la jerarquía de negocio (opcional, default: 'admin')
  roleIds: string[] // Solo aplicable para userType === 'admin'
  isActive: boolean
  createdAt: string
  createdBy: string
  // Campos de negocio (para comercializadoras, agencias y taquillas)
  address?: string // Dirección física
  phone?: string // Teléfono de contacto
  shareOnSales?: number // Porcentaje de participación sobre ventas
  shareOnProfits?: number // Porcentaje de participación sobre ganancias
  salesLimit?: number // Límite de venta (solo para taquillas)
  // Relación jerárquica: agencia→comercializadora, taquilla→agencia
  parentId?: string // ID del padre jerárquico
}

export interface ApiKey {
  id: string
  name: string
  key: string
  description: string
  isActive: boolean
  createdAt: string
  createdBy: string
  lastUsed?: string
  permissions: ApiKeyPermission[]
}

export type ApiKeyPermission =
  | "create_bets"
  | "read_lotteries"
  | "read_draws"
  | "read_winners"

export const ANIMALS = [
  { number: "01", name: "Sol" },
  { number: "02", name: "Lentes" },
  { number: "03", name: "Bombillo" },
  { number: "04", name: "Silla" },
  { number: "05", name: "Mano" },
  { number: "06", name: "Rana" },
  { number: "07", name: "Perico" },
  { number: "08", name: "Mariposa" },
  { number: "09", name: "Llave" },
  { number: "10", name: "Aguacate" },
  { number: "11", name: "Lápiz" },
  { number: "12", name: "Caballo" },
  { number: "13", name: "Mono" },
  { number: "14", name: "Paloma" },
  { number: "15", name: "León" },
  { number: "16", name: "Machete" },
  { number: "17", name: "Barco" },
  { number: "18", name: "Burro" },
  { number: "19", name: "Limón" },
  { number: "20", name: "Cochino" },
  { number: "21", name: "Mikaela" },
  { number: "22", name: "Pato" },
  { number: "23", name: "Cuchara" },
  { number: "24", name: "Ojo" },
  { number: "25", name: "Piña" },
  { number: "26", name: "Luna" },
  { number: "27", name: "Corona" },
  { number: "28", name: "Mango" },
  { number: "29", name: "Martillo" },
  { number: "30", name: "Huevo" },
  { number: "31", name: "Carro" },
  { number: "32", name: "Bicicleta" },
  { number: "33", name: "Moto" },
  { number: "34", name: "Venado" },
  { number: "35", name: "Cuchillo" },
  { number: "36", name: "Candado" },
  { number: "37", name: "Reloj" },
  { number: "38", name: "Avión" },
  { number: "39", name: "Tijeras" },
  { number: "40", name: "Mesa" },
]
