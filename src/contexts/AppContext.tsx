import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Bet, DrawResult, Lottery, Transfer, Withdrawal, User, Role, ApiKey, Taquilla } from '@/lib/types'
import { INITIAL_POTS, formatCurrency } from '@/lib/pot-utils'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { useSupabaseRoles } from '@/hooks/use-supabase-roles'
import { useSupabaseUsers } from '@/hooks/use-supabase-users'
import { useSupabaseLotteries } from '@/hooks/use-supabase-lotteries'
import { useSupabaseDraws } from '@/hooks/use-supabase-draws'
import { useSupabaseBets } from '@/hooks/use-supabase-bets'
import { useSupabasePots } from '@/hooks/use-supabase-pots'
import { useSupabaseWithdrawals } from '@/hooks/use-supabase-withdrawals'
import { useSupabaseApiKeys } from '@/hooks/use-supabase-apikeys'
import { useSupabaseTaquillas } from '@/hooks/use-supabase-taquillas'
import { useSupabaseTaquillaSales } from '@/hooks/use-supabase-taquilla-sales'
import { useAutoPlayTomorrow } from '@/hooks/use-auto-play-tomorrow'
import { toast } from 'sonner'

interface AppContextType {
  // Auth
  currentUser: ReturnType<typeof useSupabaseAuth>['currentUser']
  currentUserId: string
  isLoading: boolean
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  canViewModule: (module: string) => boolean

  // Pots
  pots: any[]
  transfers: Transfer[]
  distributeBetToPots: (amount: number) => Promise<void>
  createTransfer: (from: string, to: string, amount: number) => Promise<void>
  deductFromPot: (potName: string, amount: number) => Promise<void>
  updatePotBalance: (potName: string, balance: number) => Promise<void>

  // Withdrawals
  withdrawals: Withdrawal[]
  withdrawalsLoading: boolean
  createWithdrawal: (pot: any, amount: number, updatePotBalanceWrapper: any) => Promise<boolean>
  withdrawalStats: any

  // API Keys
  apiKeys: ApiKey[]
  apiKeysLoading: boolean
  createApiKey: any
  updateApiKey: any
  deleteApiKey: any
  apiKeysStats: any

  // Taquillas
  taquillas: any[]
  taquillasLoading: boolean
  createTaquilla: (input: any) => Promise<boolean>
  updateTaquilla: (id: string, updates: any) => Promise<boolean>
  deleteTaquilla: (id: string) => Promise<boolean>
  approveTaquilla: (id: string) => Promise<boolean>
  toggleTaquillaStatus: (id: string) => Promise<boolean>

  // Taquilla Sales
  taquillaSales: any[]
  createTaquillaSale: any
  deleteTaquillaSale: any

  // Users
  users: User[]
  usersLoading: boolean
  createUser: any
  updateUser: any
  deleteUser: any
  toggleUserStatus: any
  syncUsersToSupabase: any
  cleanDuplicateUsers: any

  // Roles
  roles: Role[]
  rolesLoading: boolean
  createRole: any
  updateRole: any
  deleteRole: any

  // Lotteries
  lotteries: Lottery[]
  lotteriesLoading: boolean
  loadLotteries: () => Promise<void>
  createLottery: any
  updateLottery: any
  deleteLottery: any
  toggleLotteryStatus: any

  // Draws
  draws: DrawResult[]
  drawsLoading: boolean
  createDraw: any
  updateDraw: any
  deleteDraw: any

  // Bets
  bets: Bet[]
  betsLoading: boolean
  createBet: any
  updateBet: any
  deleteBet: any
  markWinners: any
  betsConnected: boolean

  // Comercializadoras
  comercializadorasLoading: boolean
  createComercializadora: (input: any) => Promise<boolean>
  updateComercializadora: (id: string, updates: any) => Promise<boolean>
  deleteComercializadora: (id: string) => Promise<boolean>

  // Agencies
  agenciesLoading: boolean

  // Derived data
  agencies: any[]
  comercializadoras: any[]
  visibleAgencies: any[]
  visibleTaquillas: any[]
  winners: Bet[]
  activeBets: Bet[]
  defaultAgencyId?: string
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { currentUser, currentUserId, isLoading, logout, hasPermission } = useSupabaseAuth()

  // Helper para determinar si el usuario puede ver un módulo
  const canViewModule = (module: string): boolean => {
    if (!currentUser) return false

    if (currentUser.userType === 'admin' || !currentUser.userType) {
      return hasPermission(module)
    }

    if (currentUser.userType === 'comercializadora') {
      return module === 'agencias'
    }

    if (currentUser.userType === 'agencia') {
      return ['taquillas'].includes(module)
    }

    if (currentUser.userType === 'taquilla') {
      return ['taquillas'].includes(module)
    }

    return false
  }

  // Pots
  const {
    pots,
    transfers,
    distributeBetToPots,
    createTransfer,
    deductFromPot,
    updatePotBalance
  } = useSupabasePots(!!currentUser)

  // Withdrawals
  const {
    withdrawals,
    isLoading: withdrawalsLoading,
    createWithdrawal,
    withdrawalStats
  } = useSupabaseWithdrawals()

  // API Keys
  const {
    apiKeys,
    isLoading: apiKeysLoading,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    stats: apiKeysStats
  } = useSupabaseApiKeys(!!currentUser)

  // Taquillas (old hook for compatibility)
  const {
    taquillas: oldTaquillas,
    isLoading: oldTaquillasLoading,
    approveTaquilla,
    toggleTaquillaStatus
  } = useSupabaseTaquillas(currentUser)

  // Taquilla Sales
  const {
    sales: taquillaSales,
    createSale: createTaquillaSale,
    deleteSale: deleteTaquillaSale
  } = useSupabaseTaquillaSales()

  // Roles
  const {
    roles,
    isLoading: rolesLoading,
    createRole,
    updateRole,
    deleteRole
  } = useSupabaseRoles()

  // Users
  const {
    users: supabaseUsers,
    isLoading: usersLoading,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    syncUsersToSupabase,
    cleanDuplicateUsers
  } = useSupabaseUsers()

  // Lotteries
  const {
    lotteries,
    isLoading: lotteriesLoading,
    loadLotteries,
    createLottery,
    updateLottery,
    deleteLottery,
    toggleLotteryStatus
  } = useSupabaseLotteries()

  // Wrapper para recargar loterías
  const reloadLotteries = async () => {
    await loadLotteries()
  }

  // Draws
  const {
    draws,
    isLoading: drawsLoading,
    createDraw,
    updateDraw,
    deleteDraw
  } = useSupabaseDraws()

  // Bets
  const {
    bets,
    isLoading: betsLoading,
    createBet,
    updateBet,
    deleteBet,
    markWinners,
    isConnected: betsConnected
  } = useSupabaseBets(!!currentUser)

  // Auto-play tomorrow
  useAutoPlayTomorrow(lotteries, updateLottery)

  // Derived: agencies from users (parentId = comercializadora)
  const agencies = (supabaseUsers || []).filter(u => u.userType === 'agencia').map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address || '',
    logo: undefined,
    parentId: user.parentId || '',
    shareOnSales: user.shareOnSales || 0,
    shareOnProfits: user.shareOnProfits || 0,
    currentBalance: 0,
    isActive: user.isActive,
    createdAt: user.createdAt
  }))

  // Derived: taquillas from users (parentId = agencia)
  const taquillas = (supabaseUsers || []).filter(u => u.userType === 'taquilla').map(user => ({
    id: user.id,
    fullName: user.name,
    address: user.address || '',
    telefono: user.phone || '',
    email: user.email,
    username: user.email.split('@')[0],
    isApproved: user.isActive,
    parentId: user.parentId,
    createdAt: user.createdAt,
    shareOnSales: user.shareOnSales || 0,
    shareOnProfits: user.shareOnProfits || 0
  }))

  // Derived: comercializadoras from users
  const comercializadoras = (supabaseUsers || [])
    .filter(u => u.userType === 'comercializadora')
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      logo: undefined,
      userId: user.id,
      shareOnSales: user.shareOnSales || 0,
      shareOnProfits: user.shareOnProfits || 0,
      isActive: user.isActive,
      createdAt: user.createdAt,
      createdBy: user.createdBy,
    }))

  // Taquilla CRUD using createUser/updateUser/deleteUser
  const createTaquilla = async (input: any) => {
    // parentId para taquilla = agencyId (la agencia a la que pertenece)
    const parentId = input.agencyId || input.parentId

    const success = await createUser({
      name: input.fullName,
      email: input.email,
      password: input.password || '123456',
      userType: 'taquilla',
      isActive: false,
      roleIds: [],
      createdBy: currentUser?.id || 'system',
      address: input.address || '',
      phone: input.telefono || '',
      shareOnSales: input.shareOnSales || 0,
      shareOnProfits: input.shareOnProfits || 0,
      parentId: parentId
    })
    return success
  }

  const updateTaquilla = async (id: string, updates: any) => {
    return await updateUser(id, {
      name: updates.fullName,
      address: updates.address,
      phone: updates.telefono,
      parentId: updates.agencyId,
      isActive: updates.isApproved,
      shareOnSales: updates.shareOnSales,
      shareOnProfits: updates.shareOnProfits
    })
  }

  const deleteTaquilla = async (id: string) => {
    return await deleteUser(id)
  }

  // Comercializadoras CRUD functions
  const createComercializadora = async (input: any) => {
    return await createUser({
      name: input.name,
      email: input.email,
      password: 'temp-password',
      userType: 'comercializadora',
      isActive: input.isActive,
      roleIds: [],
      createdBy: currentUser?.id || 'system',
      address: input.address,
      shareOnSales: input.shareOnSales,
      shareOnProfits: input.shareOnProfits
    })
  }

  const updateComercializadora = async (id: string, updates: any) => {
    return await updateUser(id, {
      name: updates.name,
      email: updates.email,
      address: updates.address,
      shareOnSales: updates.shareOnSales,
      shareOnProfits: updates.shareOnProfits,
      isActive: updates.isActive
    })
  }

  const deleteComercializadora = async (id: string) => {
    return await deleteUser(id)
  }

  // Visibility filters
  const getVisibleAgencies = () => {
    if (!currentUser) return []
    // Admin ve todas las agencias
    if (currentUser.userType === 'admin' || !currentUser.userType) return agencies
    // Comercializadora solo ve las agencias que le pertenecen (parentId = su id)
    if (currentUser.userType === 'comercializadora') {
      return agencies.filter(a => a.parentId === currentUser.id)
    }
    // Agencia no ve otras agencias
    return []
  }

  const getVisibleTaquillas = () => {
    if (!currentUser) return []
    // Admin ve todas las taquillas
    if (currentUser.userType === 'admin' || !currentUser.userType) return taquillas
    // Comercializadora ve las taquillas de sus agencias
    if (currentUser.userType === 'comercializadora') {
      const myAgencyIds = agencies.filter(a => a.parentId === currentUser.id).map(a => a.id)
      return taquillas.filter(t => myAgencyIds.includes(t.parentId || ''))
    }
    // Agencia solo ve las taquillas que le pertenecen (parentId = su id)
    if (currentUser.userType === 'agencia') {
      return taquillas.filter(t => t.parentId === currentUser.id)
    }
    // Taquilla solo ve su propia información
    if (currentUser.userType === 'taquilla') {
      return taquillas.filter(t => t.id === currentUser.id)
    }
    return []
  }

  const visibleAgencies = getVisibleAgencies()
  const visibleTaquillas = getVisibleTaquillas()

  // Default agency ID
  const getDefaultAgencyId = () => {
    // Si el usuario es una agencia, su propio ID es la agencia
    if (currentUser?.userType === 'agencia') return currentUser.id
    if (visibleAgencies.length === 1) return visibleAgencies[0].id
    if (currentUser?.email && visibleAgencies.length > 0) {
      const emailPrefix = currentUser.email.split('@')[0].toLowerCase().replace('agencia', '')
      const myAgency = visibleAgencies.find(a => {
        const agencyName = a.name?.toLowerCase().replace(/\s+/g, '').replace('agencia', '') || ''
        return agencyName === emailPrefix || agencyName.includes(emailPrefix) || emailPrefix.includes(agencyName)
      })
      if (myAgency) return myAgency.id
    }
    return undefined
  }

  const winners = (bets || []).filter(b => b.isWinner)
  const activeBets = (bets || []).filter(b => !b.isWinner)

  const value: AppContextType = {
    currentUser,
    currentUserId,
    isLoading,
    logout,
    hasPermission,
    canViewModule,

    pots: pots || INITIAL_POTS,
    transfers: transfers || [],
    distributeBetToPots,
    createTransfer,
    deductFromPot,
    updatePotBalance,

    withdrawals: withdrawals || [],
    withdrawalsLoading,
    createWithdrawal,
    withdrawalStats,

    apiKeys: apiKeys || [],
    apiKeysLoading,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    apiKeysStats,

    taquillas,
    taquillasLoading: usersLoading,
    createTaquilla,
    updateTaquilla,
    deleteTaquilla,
    approveTaquilla,
    toggleTaquillaStatus,

    taquillaSales,
    createTaquillaSale,
    deleteTaquillaSale,

    users: supabaseUsers || [],
    usersLoading,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    syncUsersToSupabase,
    cleanDuplicateUsers,

    roles: roles || [],
    rolesLoading,
    createRole,
    updateRole,
    deleteRole,

    lotteries: lotteries || [],
    lotteriesLoading,
    loadLotteries: reloadLotteries,
    createLottery,
    updateLottery,
    deleteLottery,
    toggleLotteryStatus,

    draws: draws || [],
    drawsLoading,
    createDraw,
    updateDraw,
    deleteDraw,

    bets: bets || [],
    betsLoading,
    createBet,
    updateBet,
    deleteBet,
    markWinners,
    betsConnected,

    // Comercializadoras
    comercializadorasLoading: usersLoading,
    createComercializadora,
    updateComercializadora,
    deleteComercializadora,

    // Agencies
    agenciesLoading: usersLoading,

    agencies,
    comercializadoras,
    visibleAgencies,
    visibleTaquillas,
    winners,
    activeBets,
    defaultAgencyId: getDefaultAgencyId()
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
