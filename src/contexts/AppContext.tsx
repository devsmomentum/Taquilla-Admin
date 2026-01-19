import { createContext, useContext, ReactNode, useMemo } from 'react'
import { Bet, Lottery, User, Role, ApiKey, DailyResult, Pot, Transfer } from '@/lib/types'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { useSupabaseRoles } from '@/hooks/use-supabase-roles'
import { useSupabaseUsers } from '@/hooks/use-supabase-users'
import { useSupabaseLotteries } from '@/hooks/use-supabase-lotteries'
import { useSupabaseBets } from '@/hooks/use-supabase-bets'
import { useSupabaseApiKeys } from '@/hooks/use-supabase-apikeys'
import { useSupabasePots } from '@/hooks/use-supabase-pots'
import { useAutoPlayTomorrow } from '@/hooks/use-auto-play-tomorrow'
import { useDailyResults } from '@/hooks/use-daily-results'
import { useWinners, Winner } from '@/hooks/use-winners'

interface AppContextType {
  // Auth
  currentUser: ReturnType<typeof useSupabaseAuth>['currentUser']
  currentUserId: string
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  canViewModule: (module: string) => boolean

  // Pots
  pots: Pot[]
  transfers: Transfer[]
  distributeBetToPots: (amount: number) => Promise<boolean>
  createTransfer: (from: string, to: string, amount: number) => Promise<boolean>
  deductFromPot: (potName: string, amount: number) => Promise<boolean>
  updatePotBalance: (potName: string, balance: number) => Promise<boolean>

  // API Keys
  apiKeys: ApiKey[]
  apiKeysLoading: boolean
  createApiKey: any
  updateApiKey: any
  deleteApiKey: any
  apiKeysStats: any

  // Taquillas (derived from users)
  taquillas: any[]
  taquillasLoading: boolean
  createTaquilla: (input: any) => Promise<boolean>
  updateTaquilla: (id: string, updates: any) => Promise<boolean>
  deleteTaquilla: (id: string) => Promise<boolean>

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

  // Daily Results
  dailyResults: DailyResult[]
  dailyResultsLoading: boolean
  loadDailyResults: (startDate?: string, endDate?: string) => Promise<void>
  createDailyResult: (lotteryId: string, prizeId: string, resultDate: string) => Promise<boolean>
  updateDailyResult: (id: string, updates: Partial<{ prizeId: string; totalToPay: number; totalRaised: number }>) => Promise<boolean>
  deleteDailyResult: (id: string) => Promise<boolean>
  getResultForLotteryAndDate: (lotteryId: string, date: string) => DailyResult | undefined
  getWinnersForResult: (prizeId: string, resultDate: string) => Promise<Array<{
    id: string
    amount: number
    potentialWin: number
    taquillaId: string
    taquillaName: string
    createdAt: string
  }>>

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

  // Subdistribuidores
  subdistribuidoresLoading: boolean
  createSubdistribuidor: (input: any) => Promise<boolean>
  updateSubdistribuidor: (id: string, updates: any) => Promise<boolean>
  deleteSubdistribuidor: (id: string) => Promise<boolean>

  // Agencies
  agenciesLoading: boolean

  // Derived data
  agencies: any[]
  subdistribuidores: any[]
  comercializadoras: any[]
  visibleAgencies: any[]
  visibleTaquillas: any[]
  visibleTaquillaIds?: string[] // IDs de taquillas visibles para filtrar en hooks
  activeBets: Bet[]
  defaultAgencyId?: string

  // Winners from bets_item_lottery_clasic
  winners: Winner[]
  winnersLoading: boolean
  loadWinners: (startDate?: string, endDate?: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { currentUser, currentUserId, isLoading, login, logout, hasPermission } = useSupabaseAuth()

  // Helper para determinar si el usuario puede ver un módulo
  const canViewModule = (module: string): boolean => {
    if (!currentUser) return false

    // Admin usa el sistema de permisos por roles
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      return hasPermission(module)
    }

    // Comercializadora tiene acceso fijo a: dashboard, reports y comercializadoras (sus subdistribuidores)
    if (currentUser.userType === 'comercializadora') {
      return ['dashboard', 'reports', 'comercializadoras'].includes(module)
    }

    // Subdistribuidor tiene acceso fijo a: dashboard y reports (accede a agencias por navegación directa)
    if (currentUser.userType === 'subdistribuidor') {
      return ['dashboard', 'reports'].includes(module)
    }

    // Agencia tiene acceso fijo a: dashboard y reports (accede a taquillas por navegación directa)
    if (currentUser.userType === 'agencia') {
      return ['dashboard', 'reports'].includes(module)
    }

    // Taquilla tiene acceso básico
    if (currentUser.userType === 'taquilla') {
      return ['dashboard'].includes(module)
    }

    return false
  }

  // Pots (local storage, no Supabase table)
  const {
    pots,
    transfers,
    distributeBetToPots,
    createTransfer,
    deductFromPot,
    updatePotBalance
  } = useSupabasePots(!!currentUser)

  // API Keys
  const {
    apiKeys,
    isLoading: apiKeysLoading,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    stats: apiKeysStats
  } = useSupabaseApiKeys(!!currentUser)

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

  // Daily Results
  const {
    dailyResults,
    loading: dailyResultsLoading,
    loadDailyResults,
    createDailyResult,
    updateDailyResult,
    deleteDailyResult,
    getResultForLotteryAndDate,
    getWinnersForResult
  } = useDailyResults()

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

  // Calcular IDs de taquillas visibles para filtrar datos en los hooks
  // Esto se calcula temprano para poder pasarlo a useWinners
  const visibleTaquillaIds = useMemo(() => {
    if (!currentUser) return undefined

    // Obtener todas las taquillas
    const allTaquillas = (supabaseUsers || []).filter(u => u.userType === 'taquilla')

    // Obtener todas las agencias
    const allAgencies = (supabaseUsers || []).filter(u => u.userType === 'agencia')

    // Obtener todas las comercializadoras
    const allComercializadoras = (supabaseUsers || []).filter(u => u.userType === 'comercializadora')
    
    // Obtener todos los subdistribuidores
    const allSubdistribuidores = (supabaseUsers || []).filter(u => u.userType === 'subdistribuidor')

    // Admin con permiso '*' ve todo
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      const hasFullAccess = currentUser.all_permissions.includes('*')
      if (hasFullAccess) {
        return undefined // Sin filtro, ve todo
      }
      // Admin sin permiso '*' solo ve las taquillas a través de la jerarquía
      const myComercializadoraIds = allComercializadoras
        .filter(c => c.parentId === currentUser.id)
        .map(c => c.id)
      const mySubdistribuidorIds = allSubdistribuidores
        .filter(s => myComercializadoraIds.includes(s.parentId || ''))
        .map(s => s.id)
      const myAgencyIds = allAgencies
        .filter(a => mySubdistribuidorIds.includes(a.parentId || ''))
        .map(a => a.id)
      return allTaquillas
        .filter(t => myAgencyIds.includes(t.parentId || ''))
        .map(t => t.id)
    }

    // Comercializadora ve las taquillas a través de agencias directas y subdistribuidores
    if (currentUser.userType === 'comercializadora') {
      // Agencias directas
      const directAgencyIds = allAgencies
        .filter(a => a.parentId === currentUser.id)
        .map(a => a.id)
      
      // Subdistribuidores de esta comercializadora
      const mySubdistribuidorIds = allSubdistribuidores
        .filter(s => s.parentId === currentUser.id)
        .map(s => s.id)
      
      // Agencias bajo subdistribuidores
      const subdistAgencyIds = allAgencies
        .filter(a => mySubdistribuidorIds.includes(a.parentId || ''))
        .map(a => a.id)
      
      // Combinar todas las agencias
      const allMyAgencyIds = [...directAgencyIds, ...subdistAgencyIds]
      
      // Obtener todas las taquillas de estas agencias
      return allTaquillas
        .filter(t => allMyAgencyIds.includes(t.parentId || ''))
        .map(t => t.id)
    }

    // Subdistribuidor ve las taquillas de sus agencias
    if (currentUser.userType === 'subdistribuidor') {
      const myAgencyIds = allAgencies
        .filter(a => a.parentId === currentUser.id)
        .map(a => a.id)
      return allTaquillas
        .filter(t => myAgencyIds.includes(t.parentId || ''))
        .map(t => t.id)
    }

    // Agencia solo ve sus taquillas
    if (currentUser.userType === 'agencia') {
      return allTaquillas
        .filter(t => t.parentId === currentUser.id)
        .map(t => t.id)
    }

    // Taquilla solo se ve a sí misma
    if (currentUser.userType === 'taquilla') {
      return [currentUser.id]
    }

    return []
  }, [currentUser, supabaseUsers])

  // Winners from bets_item_lottery_clasic
  const {
    winners,
    loading: winnersLoading,
    loadWinners
  } = useWinners({ visibleTaquillaIds })

  // Auto-play tomorrow
  useAutoPlayTomorrow(lotteries, updateLottery)

  // Derived: agencies from users (parentId = comercializadora)
  const agencies = (supabaseUsers || []).filter(u => u.userType === 'agencia').map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address || '',
    logo: undefined,
    userId: user.id,  // Agregar userId para consistencia
    parentId: user.parentId || '',
    shareOnSales: user.shareOnSales || 0,
    shareOnProfits: user.shareOnProfits || 0,
    currentBalance: 0,
    isActive: user.isActive,
    lotteries: (user as any).lotteries ?? null,
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
    shareOnProfits: user.shareOnProfits || 0,
    salesLimit: user.salesLimit || 0
  }))

  // Derived: comercializadoras from users (todas, sin filtrar)
  const allComercializadoras = (supabaseUsers || [])
    .filter(u => u.userType === 'comercializadora')
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      logo: undefined,
      userId: user.id,
      parentId: user.parentId,
      shareOnSales: user.shareOnSales || 0,
      shareOnProfits: user.shareOnProfits || 0,
      isActive: user.isActive,
      createdAt: user.createdAt,
      createdBy: user.createdBy,
    }))

  // Filtrar comercializadoras según permisos del usuario
  const getVisibleComercializadoras = () => {
    if (!currentUser) return []

    // Si es comercializadora, solo ve su propia comercializadora
    if (currentUser.userType === 'comercializadora') {
      return allComercializadoras.filter(c => c.id === currentUser.id)
    }

    // Si es agencia, ve su comercializadora padre
    if (currentUser.userType === 'agencia') {
      return allComercializadoras.filter(c => c.id === currentUser.parentId)
    }

    // Si es admin con permiso '*', ve todas las comercializadoras
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      const hasFullAccess = currentUser.all_permissions.includes('*')
      if (hasFullAccess) {
        return allComercializadoras
      }
      // Admin sin permiso '*' solo ve las comercializadoras que él creó
      return allComercializadoras.filter(c => c.parentId === currentUser.id)
    }

    return []
  }

  const comercializadoras = getVisibleComercializadoras()

  // Derived: subdistribuidores from users (todas, sin filtrar)
  const allSubdistribuidores = (supabaseUsers || [])
    .filter(u => u.userType === 'subdistribuidor')
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      logo: undefined,
      userId: user.id,
      parentId: user.parentId, // ID de la comercializadora
      shareOnSales: user.shareOnSales || 0,
      shareOnProfits: user.shareOnProfits || 0,
      isActive: user.isActive,
      createdAt: user.createdAt,
      createdBy: user.createdBy,
    }))

  // Filtrar subdistribuidores según permisos del usuario
  const getVisibleSubdistribuidores = () => {
    if (!currentUser) return []

    // Si es subdistribuidor, solo ve su propio registro
    if (currentUser.userType === 'subdistribuidor') {
      return allSubdistribuidores.filter(s => s.id === currentUser.id)
    }

    // Si es comercializadora, ve sus subdistribuidores
    if (currentUser.userType === 'comercializadora') {
      return allSubdistribuidores.filter(s => s.parentId === currentUser.id)
    }

    // Si es agencia, ve su subdistribuidor padre
    if (currentUser.userType === 'agencia') {
      return allSubdistribuidores.filter(s => s.id === currentUser.parentId)
    }

    // Si es admin con permiso '*', ve todos los subdistribuidores
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      const hasFullAccess = currentUser.all_permissions.includes('*')
      if (hasFullAccess) {
        return allSubdistribuidores
      }
      // Admin sin permiso '*' solo ve los subdistribuidores de las comercializadoras que él creó
      const myComercializadoraIds = comercializadoras.map(c => c.id)
      return allSubdistribuidores.filter(s => s.parentId && myComercializadoraIds.includes(s.parentId))
    }

    return []
  }

  const subdistribuidores = getVisibleSubdistribuidores()

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
      salesLimit: input.salesLimit || 0,
      parentId: parentId
    })
    return success
  }

  const updateTaquilla = async (id: string, updates: any) => {
    return await updateUser(id, {
      name: updates.fullName,
      address: updates.address,
      phone: updates.telefono,
      email: updates.email,
      parentId: updates.agencyId,
      isActive: updates.isApproved,
      shareOnSales: updates.shareOnSales,
      shareOnProfits: updates.shareOnProfits,
      salesLimit: updates.salesLimit,
      // Solo incluir password si se proporcionó
      ...(updates.password ? { password: updates.password } : {})
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
      isActive: updates.isActive,
      parentId: updates.parentId,
      // Solo incluir password si se proporcionó
      ...(updates.password ? { password: updates.password } : {})
    })
  }

  const deleteComercializadora = async (id: string) => {
    return await deleteUser(id)
  }

  // Subdistribuidores CRUD functions
  const createSubdistribuidor = async (input: any) => {
    return await createUser({
      name: input.name,
      email: input.email,
      password: input.password || 'temp-password',
      userType: 'subdistribuidor',
      isActive: input.isActive,
      roleIds: [],
      createdBy: currentUser?.id || 'system',
      parentId: input.parentId || currentUser?.id, // La comercializadora que lo crea
      address: input.address,
      shareOnSales: input.shareOnSales,
      shareOnProfits: input.shareOnProfits
    })
  }

  const updateSubdistribuidor = async (id: string, updates: any) => {
    return await updateUser(id, {
      name: updates.name,
      email: updates.email,
      address: updates.address,
      shareOnSales: updates.shareOnSales,
      shareOnProfits: updates.shareOnProfits,
      isActive: updates.isActive,
      parentId: updates.parentId,
      // Solo incluir password si se proporcionó
      ...(updates.password ? { password: updates.password } : {})
    })
  }

  const deleteSubdistribuidor = async (id: string) => {
    return await deleteUser(id)
  }

  // Visibility filters
  const getVisibleAgencies = () => {
    if (!currentUser) return []

    // Admin con permiso '*' ve todas las agencias
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      const hasFullAccess = currentUser.all_permissions.includes('*')
      if (hasFullAccess) {
        return agencies
      }
      // Admin sin permiso '*' solo ve las agencias de los subdistribuidores de las comercializadoras que él creó
      const mySubdistribuidorIds = subdistribuidores.map(s => s.id)
      return agencies.filter(a => mySubdistribuidorIds.includes(a.parentId))
    }

    // Comercializadora ve las agencias directas Y las de sus subdistribuidores
    if (currentUser.userType === 'comercializadora') {
      // Agencias directas
      const directAgencies = agencies.filter(a => a.parentId === currentUser.id)
      
      // Agencias bajo subdistribuidores
      const mySubdistribuidorIds = subdistribuidores.filter(s => s.parentId === currentUser.id).map(s => s.id)
      const subdistAgencies = agencies.filter(a => mySubdistribuidorIds.includes(a.parentId))
      
      // Combinar ambas listas
      return [...directAgencies, ...subdistAgencies]
    }

    // Subdistribuidor ve las agencias que le pertenecen (parentId = su id)
    if (currentUser.userType === 'subdistribuidor') {
      return agencies.filter(a => a.parentId === currentUser.id)
    }
    // Agencia solo ve su propia agencia
    if (currentUser.userType === 'agencia') {
      return agencies.filter(a => a.id === currentUser.id)
    }
    return []
  }

  const getVisibleTaquillas = () => {
    if (!currentUser) return []

    // Admin con permiso '*' ve todas las taquillas
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      const hasFullAccess = currentUser.all_permissions.includes('*')
      if (hasFullAccess) {
        return taquillas
      }
      // Admin sin permiso '*' solo ve las taquillas de las agencias de los subdistribuidores de sus comercializadoras
      const myAgencyIds = visibleAgencies.map(a => a.id)
      return taquillas.filter(t => myAgencyIds.includes(t.parentId || ''))
    }

    // Comercializadora ve las taquillas de las agencias de sus subdistribuidores
    if (currentUser.userType === 'comercializadora') {
      const myAgencyIds = visibleAgencies.map(a => a.id)
      return taquillas.filter(t => myAgencyIds.includes(t.parentId || ''))
    }
    
    // Subdistribuidor ve las taquillas de sus agencias
    if (currentUser.userType === 'subdistribuidor') {
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

  const activeBets = (bets || []).filter(b => !b.isWinner)

  const value: AppContextType = {
    currentUser,
    currentUserId,
    isLoading,
    login,
    logout,
    hasPermission,
    canViewModule,

    pots,
    transfers,
    distributeBetToPots,
    createTransfer,
    deductFromPot,
    updatePotBalance,

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

    dailyResults: dailyResults || [],
    dailyResultsLoading,
    loadDailyResults,
    createDailyResult,
    updateDailyResult,
    deleteDailyResult,
    getResultForLotteryAndDate,
    getWinnersForResult,

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

    // Subdistribuidores
    subdistribuidoresLoading: usersLoading,
    createSubdistribuidor,
    updateSubdistribuidor,
    deleteSubdistribuidor,

    // Agencies
    agenciesLoading: usersLoading,

    agencies,
    subdistribuidores,
    comercializadoras,
    visibleAgencies,
    visibleTaquillas,
    visibleTaquillaIds,
    activeBets,
    defaultAgencyId: getDefaultAgencyId(),

    // Winners from bets_item_lottery_clasic
    winners: winners || [],
    winnersLoading,
    loadWinners
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
