import { useKV } from "@github/spark/hooks"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bet, DrawResult, Lottery, Transfer, Withdrawal, User, Role, ModulePermission, ApiKey, Taquilla } from "@/lib/types"
import { INITIAL_POTS, formatCurrency } from "@/lib/pot-utils"
import { filterLotteries, filterBets, filterUsers, filterRoles, filterTaquillas } from "@/lib/filter-utils"
import { PotCard } from "@/components/PotCard"
import { LotteryDialog } from "@/components/LotteryDialog"
import { BetDialog } from "@/components/BetDialog"
import { TransferDialog } from "@/components/TransferDialog"
import { WithdrawDialog } from "@/components/WithdrawDialog"
import { DrawDialog } from "@/components/DrawDialog"
import { RoleDialog } from "@/components/RoleDialog"
import { UserDialog } from "@/components/UserDialog"
import { LoginScreen } from "@/components/LoginScreen"
import { ApiKeyDialog } from "@/components/ApiKeyDialog"
import { ReportsCard } from "@/components/ReportsCard"
import { DrawStatsCard } from "@/components/DrawStatsCard"
import { DrawManagementDialog } from "@/components/DrawManagementDialog"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { useSupabaseRoles } from "@/hooks/use-supabase-roles"
import { useSupabaseUsers } from "@/hooks/use-supabase-users"
import { useSupabaseLotteries } from "@/hooks/use-supabase-lotteries"
import { useSupabaseDraws } from "@/hooks/use-supabase-draws"
import { useSupabaseBets } from "@/hooks/use-supabase-bets"
import { useSupabasePots } from "@/hooks/use-supabase-pots"
import { useSupabaseWithdrawals } from "@/hooks/use-supabase-withdrawals"
import { useSupabaseApiKeys } from "@/hooks/use-supabase-apikeys"
import { useSupabaseTaquillas } from "@/hooks/use-supabase-taquillas"
import { useAutoPlayTomorrow } from "@/hooks/use-auto-play-tomorrow"
import { Plus, Ticket, Trophy, Vault, ListBullets, Calendar, Pencil, Trash, Users, ShieldCheck, SignOut, MagnifyingGlass, Funnel, ChartLine, Key, Copy, Eye, EyeSlash, Target, Storefront } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { TaquillaDialog } from "@/components/TaquillaDialog"
import { TaquillaEditDialog } from "@/components/TaquillaEditDialog"
import { TaquillaStatsDialog } from "@/components/TaquillaStatsDialog"
import { RegisterSaleDialog } from "@/components/RegisterSaleDialog"
import { Switch } from "@/components/ui/switch"
import { useSupabaseTaquillaSales } from "@/hooks/use-supabase-taquilla-sales"

function App() {
  // Ya no usamos useKV para draws, ahora usamos useSupabaseDraws
  
  const { 
    pots, 
    transfers, 
    distributeBetToPots, 
    createTransfer,
    deductFromPot,
    updatePotBalance
  } = useSupabasePots()
  
  // Hook específico para retiros (Módulo 9)
  const {
    withdrawals: moduleWithdrawals,
    isLoading: withdrawalsLoading,
    createWithdrawal: createModuleWithdrawal,
    withdrawalStats,
    testConnection: testWithdrawalsConnection
  } = useSupabaseWithdrawals()
  
  // Hook específico para API Keys (Módulo 10)
  const {
    apiKeys: supabaseApiKeys,
    isLoading: apiKeysLoading,
    createApiKey: createSupabaseApiKey,
    updateApiKey: updateSupabaseApiKey,
    deleteApiKey: deleteSupabaseApiKey,
    stats: apiKeysStats,
    testConnection: testApiKeysConnection
  } = useSupabaseApiKeys()

  // Hook de Taquillas
  const {
    taquillas,
    isLoading: taquillasLoading,
    createTaquilla,
    approveTaquilla,
    updateTaquilla,
    toggleTaquillaStatus,
    deleteTaquilla
  } = useSupabaseTaquillas()

  const {
    sales: taquillaSales,
    createSale: createTaquillaSale,
    deleteSale: deleteTaquillaSale
  } = useSupabaseTaquillaSales()
  
  const [users, setUsers] = useKV<User[]>("users", [])
  // API Keys ahora se manejan completamente por el hook useSupabaseApiKeys

  const { currentUser, currentUserId, isLoading, login, logout, hasPermission } = useSupabaseAuth()
  const { 
    roles, 
    isLoading: rolesLoading, 
    createRole, 
    updateRole, 
    deleteRole,
    loadRoles 
  } = useSupabaseRoles()
  const {
    users: supabaseUsers,
    isLoading: usersLoading,
    createUser,
    updateUser, 
    deleteUser,
    toggleUserStatus,
    loadUsers,
    syncUsersToSupabase,
    cleanDuplicateUsers
  } = useSupabaseUsers()
  const {
    lotteries: supabaseLotteries,
    isLoading: lotteriesLoading,
    createLottery,
    updateLottery,
    deleteLottery,
    toggleLotteryStatus,
    loadLotteries
  } = useSupabaseLotteries()

  // Hook para sorteos
  const {
    draws: supabaseDraws,
    isLoading: drawsLoading,
    createDraw,
    updateDraw,
    deleteDraw,
    getDrawStats
  } = useSupabaseDraws()

  // Hook para jugadas
  const {
    bets: supabaseBets,
    isLoading: betsLoading,
    createBet,
    updateBet,
    deleteBet,
    markWinners,
    isConnected: betsConnected
  } = useSupabaseBets()

  // Hook para auto-reactivación de "Juega Mañana"
  const { onPlayTomorrowChange } = useAutoPlayTomorrow(supabaseLotteries, updateLottery)

  const [lotteryDialogOpen, setLotteryDialogOpen] = useState(false)
  const [editingLottery, setEditingLottery] = useState<Lottery | undefined>()
  const [betDialogOpen, setBetDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferFromIndex, setTransferFromIndex] = useState<number | undefined>()
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [drawDialogOpen, setDrawDialogOpen] = useState(false)
  const [drawManagementDialogOpen, setDrawManagementDialogOpen] = useState(false)
  const [editingDraw, setEditingDraw] = useState<any | undefined>()
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>()
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | undefined>()
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [deleteApiKeyDialogOpen, setDeleteApiKeyDialogOpen] = useState(false)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<string | null>(null)
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null)
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [deleteDrawDialogOpen, setDeleteDrawDialogOpen] = useState(false)
  const [drawToDelete, setDrawToDelete] = useState<any | null>(null)
  const [deleteLotteryDialogOpen, setDeleteLotteryDialogOpen] = useState(false)
  const [lotteryToDelete, setLotteryToDelete] = useState<string | null>(null)
  const [taquillaDialogOpen, setTaquillaDialogOpen] = useState(false)
  const [taquillaEditOpen, setTaquillaEditOpen] = useState(false)
  const [taquillaEditing, setTaquillaEditing] = useState<Taquilla | undefined>()
  const [taquillaStatsOpen, setTaquillaStatsOpen] = useState(false)
  const [taquillaStats, setTaquillaStats] = useState<Taquilla | null>(null)
  const [registerSaleOpen, setRegisterSaleOpen] = useState(false)
  const [saleTaquilla, setSaleTaquilla] = useState<Taquilla | null>(null)
  const [deleteTaquillaDialogOpen, setDeleteTaquillaDialogOpen] = useState(false)
  const [taquillaToDelete, setTaquillaToDelete] = useState<string | null>(null)

  const [taquillaSearch, setTaquillaSearch] = useState("")
  const [taquillaFilters, setTaquillaFilters] = useState<{ isActive?: boolean }>({})

  const [lotterySearch, setLotterySearch] = useState("")
  const [lotteryFilters, setLotteryFilters] = useState<{ isActive?: boolean; playsTomorrow?: boolean }>({})
  const [betSearch, setBetSearch] = useState("")
  const [betFilters, setBetFilters] = useState<{ lotteryId?: string; isWinner?: boolean }>({})
  const [userSearch, setUserSearch] = useState("")
  const [userFilters, setUserFilters] = useState<{ isActive?: boolean; roleId?: string }>({})
  const [roleSearch, setRoleSearch] = useState("")
  const [winnerSearch, setWinnerSearch] = useState("")
  const [winnerFilters, setWinnerFilters] = useState<{ lotteryId?: string }>({})
  const [drawSearch, setDrawSearch] = useState("")
  const [drawFilters, setDrawFilters] = useState<{ lotteryId?: string }>({})
  const [transferSearch, setTransferSearch] = useState("")
  const [withdrawalSearch, setWithdrawalSearch] = useState("")
  const [apiKeySearch, setApiKeySearch] = useState("")

  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    if (!currentUser) return

    // Define tab priority order
    const tabs = [
      { id: "dashboard", permission: "dashboard" },
      { id: "reports", permission: "reports" },
      { id: "lotteries", permission: "lotteries" },
      { id: "draws", permission: "draws.read" },
      { id: "winners", permission: "winners" },
      { id: "history", permission: "history" },
      { id: "users", permission: "users" },
      { id: "roles", permission: "roles" },
      { id: "api-keys", permission: "api-keys" },
      { id: "taquillas", permission: "taquillas" },
    ]

    // Find the first tab the user has permission for
    const firstAllowedTab = tabs.find(tab => hasPermission(tab.permission))

    if (firstAllowedTab) {
      // Only change if current active tab is not allowed
      const currentTabAllowed = tabs.find(t => t.id === activeTab && hasPermission(t.permission))
      if (!currentTabAllowed) {
        setActiveTab(firstAllowedTab.id)
      }
    }
  }, [currentUser, hasPermission])

  useEffect(() => {
    const currentUsers = supabaseUsers || []

    if (currentUsers.length === 0) {
      const adminUser: User = {
        id: "admin-user",
        name: "Administrador Principal",
        email: "admin@loteria.com",
        password: "admin123",
        roleIds: ["admin"],
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: "system",
      }
      setUsers([adminUser])
    }
  }, [])

  const handleSaveLottery = async (lottery: Lottery) => {
    const exists = supabaseLotteries.find((l) => l.id === lottery.id)
    
    if (exists) {
      // Actualizar lotería existente
      await updateLottery(lottery.id, lottery)
    } else {
      // Crear nuevo sorteo
      await createLottery(lottery)
    }
    
    setEditingLottery(undefined)
    setLotteryDialogOpen(false)
  }

  const handleDeleteLottery = async (id: string) => {
    setLotteryToDelete(id)
    setDeleteLotteryDialogOpen(true)
  }

  const confirmDeleteLottery = async () => {
    if (!lotteryToDelete) return
    
    try {
      await deleteLottery(lotteryToDelete)
      toast.success("Lotería eliminada exitosamente")
      setDeleteLotteryDialogOpen(false)
      setLotteryToDelete(null)
    } catch (error) {
      console.error('Error deleting lottery:', error)
      toast.error("Error al eliminar lotería")
    }
  }

  const handleDeleteTaquilla = async (id: string) => {
    setTaquillaToDelete(id)
    setDeleteTaquillaDialogOpen(true)
  }

  const confirmDeleteTaquilla = async () => {
    if (!taquillaToDelete) return
    
    try {
      const success = await deleteTaquilla(taquillaToDelete)
      if (success) {
        toast.success("Taquilla eliminada exitosamente")
        setDeleteTaquillaDialogOpen(false)
        setTaquillaToDelete(null)
      } else {
        toast.error("Error al eliminar taquilla")
      }
    } catch (error) {
      console.error('Error deleting taquilla:', error)
      toast.error("Error al eliminar taquilla")
    }
  }

  const handleEditLottery = (lottery: Lottery) => {
    setEditingLottery(lottery)
    setLotteryDialogOpen(true)
  }

  const handleSaveBet = async (bet: Bet) => {
    console.log('🎯 handleSaveBet llamado con:', bet)
    
    // Crear la jugada en Supabase
    const success = await createBet({
      lotteryId: bet.lotteryId,
      lotteryName: bet.lotteryName,
      animalNumber: bet.animalNumber,
      animalName: bet.animalName,
      amount: bet.amount,
      potentialWin: bet.potentialWin,
      isWinner: false
    })

    console.log('📊 Resultado de createBet:', success)

    if (success) {
      // Distribuir a los potes usando el hook
      await distributeBetToPots(bet.amount)
      console.log('✅ Potes actualizados')
    }
  }

  const handleTransfer = async (fromIndex: number, toIndex: number, amount: number) => {
    const currentPots = pots || INITIAL_POTS
    const fromPotName = currentPots[fromIndex].name
    const toPotName = currentPots[toIndex].name
    
    await createTransfer(fromPotName, toPotName, amount)
  }

  // Función actualizada para el nuevo módulo de retiros
  const handleWithdraw = async (pot: any, amount: number) => {
    const updatePotBalanceWrapper = async (potName: string, newBalance: number) => {
      await updatePotBalance(potName, newBalance)
    }
    
    const success = await createModuleWithdrawal(pot, amount, updatePotBalanceWrapper)
    return success
  }

  // Función para procesar ganadores automáticamente después de crear un sorteo
  const processWinnersAutomatically = async (drawData: any) => {
    try {
      console.log('🎯 Procesando ganadores automáticamente...')
      console.log('Animal ganador:', drawData.animalNumber, drawData.animalName)
      
      // Buscar todas las jugadas que apostaron al animal ganador de esta lotería
      const winningBets = currentBets.filter(bet => 
        bet.lotteryId === drawData.lotteryId &&
        bet.animalNumber === drawData.animalNumber &&
        !bet.isWinner // Solo las que aún no han ganado
      )

      console.log(`📊 Encontradas ${winningBets.length} jugadas ganadoras`)

      if (winningBets.length === 0) {
        toast.info('Sorteo creado. No hay jugadas ganadoras para este animal.')
        return { winnersCount: 0, totalPayout: 0 }
      }

      // Calcular total a pagar
      const totalPayout = winningBets.reduce((sum, bet) => sum + bet.potentialWin, 0)
      console.log(`💰 Total a pagar: Bs. ${totalPayout}`)

      // Marcar todas las jugadas como ganadoras
      for (const bet of winningBets) {
        await updateBet(bet.id, { isWinner: true })
        console.log(`✅ Jugada ${bet.id} marcada como ganadora - Premio: Bs. ${bet.potentialWin}`)
      }

      // Descontar del pote de premios
      if (totalPayout > 0) {
        await deductFromPot("Pote de Premios", totalPayout)
        console.log(`💸 Descontado Bs. ${totalPayout} del Pote de Premios`)
      }

      toast.success(`🎉 ${winningBets.length} ganador${winningBets.length !== 1 ? 'es' : ''} registrado${winningBets.length !== 1 ? 's' : ''} automáticamente!`, {
        description: `Total pagado: Bs. ${totalPayout.toFixed(2)}`
      })

      return { winnersCount: winningBets.length, totalPayout }
    } catch (error) {
      console.error('Error procesando ganadores:', error)
      toast.error('Error al procesar ganadores automáticamente')
      return { winnersCount: 0, totalPayout: 0 }
    }
  }

  const handleDraw = async (result: DrawResult, winners: Bet[]) => {
    // Ya no usamos setDraws, el hook useSupabaseDraws se encarga de todo
    // La función createDraw del hook ya actualiza el estado automáticamente

    // Marcar ganadores usando el hook de Supabase
    if (winners.length > 0) {
      for (const winner of winners) {
        await updateBet(winner.id, { isWinner: true })
      }
    }

    if (result.totalPayout > 0) {
      await deductFromPot("Pote de Premios", result.totalPayout)
    }
  }

  const openTransferDialog = (potIndex: number) => {
    setTransferFromIndex(potIndex)
    setTransferDialogOpen(true)
  }

  const handleSaveRole = async (roleData: Omit<Role, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      let success = false
      
      if (editingRole) {
        // Actualizar rol existente
        success = await updateRole(editingRole.id, roleData)
      } else {
        // Crear nuevo rol
        success = await createRole(roleData)
      }
      
      if (success) {
        setEditingRole(undefined)
      }
      
      return success
    } catch (error) {
      console.error('Error in handleSaveRole:', error)
      return false
    }
  }

  const handleDeleteRole = async (id: string) => {
    const role = roles.find((r) => r.id === id)
    if (role?.isSystem) {
      toast.error("No se pueden eliminar roles del sistema")
      return
    }
    
    setRoleToDelete(id)
    setDeleteRoleDialogOpen(true)
  }

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return
    
    const success = await deleteRole(roleToDelete)
    if (success) {
      setDeleteRoleDialogOpen(false)
      setRoleToDelete(null)
    }
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleDialogOpen(true)
  }

  const handleSaveUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      if (editingUser) {
        // Actualizar usuario existente
        await updateUser(editingUser.id, userData)
      } else {
        // Crear nuevo usuario
        await createUser(userData)
      }
      setEditingUser(undefined)
      return true
    } catch (error) {
      console.error('Error saving user:', error)
      return false
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (id === currentUserId) {
      toast.error("No puede eliminar su propio usuario")
      return
    }
    
    setUserToDelete(id)
    setDeleteUserDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      await deleteUser(userToDelete)
      toast.success("Usuario eliminado exitosamente")
      setDeleteUserDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error("Error al eliminar usuario")
    }
  }

  const handleDeleteDraw = (draw: any) => {
    setDrawToDelete(draw)
    setDeleteDrawDialogOpen(true)
  }

  const confirmDeleteDraw = async () => {
    if (!drawToDelete) return
    
    try {
      await deleteDraw(drawToDelete.id)
      toast.success("Sorteo eliminado exitosamente")
      setDeleteDrawDialogOpen(false)
      setDrawToDelete(null)
    } catch (error) {
      console.error('Error deleting draw:', error)
      toast.error("Error al eliminar sorteo")
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserDialogOpen(true)
  }

  const handleLogout = () => {
    setLogoutDialogOpen(true)
  }

  const confirmLogout = () => {
    logout()
    setLogoutDialogOpen(false)
    toast.success("Sesión cerrada exitosamente")
  }

  const handleSaveApiKey = async (apiKey: ApiKey) => {
    try {
      if (apiKey.id && supabaseApiKeys.find(k => k.id === apiKey.id)) {
        // Actualizar API Key existente
        const success = await updateSupabaseApiKey(apiKey.id, {
          name: apiKey.name,
          description: apiKey.description,
          isActive: apiKey.isActive,
          permissions: apiKey.permissions
        })
        
        if (success) {
          toast.success("API Key actualizada exitosamente")
        } else {
          throw new Error("Error actualizando API Key")
        }
      } else {
        // Crear nueva API Key
        if (!currentUserId) {
          throw new Error("Usuario no autenticado")
        }
        
        const { key: newKey, success } = await createSupabaseApiKey({
          name: apiKey.name,
          description: apiKey.description,
          isActive: apiKey.isActive,
          permissions: apiKey.permissions,
          createdBy: currentUserId
        })
        
        if (success && newKey) {
          toast.success("API Key creada exitosamente")
          
          // Mostrar la key generada
          setTimeout(() => {
            toast.info(`Nueva API Key: ${newKey}`, {
              duration: 10000,
              description: "Copia esta key ahora, no podrás verla de nuevo"
            })
          }, 500)
        } else {
          throw new Error("Error creando API Key")
        }
      }
      
      setEditingApiKey(undefined)
    } catch (error) {
      console.error('Error guardando API Key:', error)
      toast.error("Error guardando la API Key")
    }
  }

  const handleDeleteApiKey = async (id: string) => {
    setApiKeyToDelete(id)
    setDeleteApiKeyDialogOpen(true)
  }

  const confirmDeleteApiKey = async () => {
    if (!apiKeyToDelete) return
    
    try {
      const success = await deleteSupabaseApiKey(apiKeyToDelete)
      
      if (success) {
        toast.success("API Key eliminada exitosamente")
        setDeleteApiKeyDialogOpen(false)
        setApiKeyToDelete(null)
      } else {
        throw new Error("Error eliminando API Key")
      }
    } catch (error) {
      console.error('Error eliminando API Key:', error)
      toast.error("Error eliminando la API Key")
    }
  }

  const handleEditApiKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey)
    setApiKeyDialogOpen(true)
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("API Key copiada al portapapeles")
  }

  const currentBets = supabaseBets || []
  const currentPots = pots || INITIAL_POTS
  const currentLotteries = supabaseLotteries || []
  const currentDraws = supabaseDraws || []
  const currentTransfers = transfers || []
  const currentWithdrawals = moduleWithdrawals || []
  const currentUsers = supabaseUsers || []
  const currentRoles = roles || []
  // API Keys manejadas completamente por el hook
  const currentApiKeys = supabaseApiKeys || []

  const winners = currentBets.filter((b) => b.isWinner)
  const activeBets = currentBets.filter((b) => !b.isWinner)

  const filteredLotteries = filterLotteries(currentLotteries, lotterySearch, lotteryFilters)
  const filteredBets = filterBets(activeBets, betSearch, betFilters)
  const filteredUsers = filterUsers(currentUsers, userSearch, userFilters)
  const filteredRoles = filterRoles(currentRoles, roleSearch)
  const filteredTaquillas = filterTaquillas(taquillas, taquillaSearch, taquillaFilters)
  const filteredWinners = filterBets(winners, winnerSearch, winnerFilters)
  const filteredDraws = currentDraws.filter((draw) => {
    const matchesSearch =
      drawSearch === "" ||
      draw.lotteryName.toLowerCase().includes(drawSearch.toLowerCase()) ||
      draw.winningAnimalName.toLowerCase().includes(drawSearch.toLowerCase()) ||
      draw.winningAnimalNumber.toString().includes(drawSearch)
    const matchesLottery = !drawFilters.lotteryId || draw.lotteryId === drawFilters.lotteryId
    return matchesSearch && matchesLottery
  })
  const filteredTransfers = currentTransfers.filter((transfer) => {
    return (
      transferSearch === "" ||
      transfer.fromPot.toLowerCase().includes(transferSearch.toLowerCase()) ||
      transfer.toPot.toLowerCase().includes(transferSearch.toLowerCase())
    )
  })
  const filteredWithdrawals = currentWithdrawals.filter((withdrawal) => {
    return (
      withdrawalSearch === "" ||
      withdrawal.fromPot.toLowerCase().includes(withdrawalSearch.toLowerCase())
    )
  })
  const filteredApiKeys = currentApiKeys.filter((apiKey) => {
    return (
      apiKeySearch === "" ||
      apiKey.name.toLowerCase().includes(apiKeySearch.toLowerCase()) ||
      apiKey.description.toLowerCase().includes(apiKeySearch.toLowerCase())
    )
  })

  if (!currentUserId || !currentUser || isLoading) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-foreground">Cargando aplicación...</p>
            <p className="text-sm text-muted-foreground">Conectando con Supabase...</p>
          </div>
        </div>
      )
    }
    return <LoginScreen onLogin={login} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <div className="border-b">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight truncate">Sistema Administrativo</h1>
              <p className="text-muted-foreground mt-0.5 md:mt-1 text-xs md:text-sm">Lotería de Animalitos</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium truncate max-w-[150px] md:max-w-none">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-none">{currentUser.email}</p>
              </div>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <SignOut />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 md:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full h-auto flex-wrap gap-1 p-1">
              {hasPermission("dashboard") && (
                <TabsTrigger value="dashboard" className="flex-shrink-0">
                  <Vault className="md:mr-2" />
                  <span className="hidden md:inline">Dashboard</span>
                </TabsTrigger>
              )}
              {hasPermission("reports") && (
                <TabsTrigger value="reports" className="flex-shrink-0">
                  <ChartLine className="md:mr-2" />
                  <span className="hidden md:inline">Reportes</span>
                </TabsTrigger>
              )}
              {hasPermission("lotteries") && (
                <TabsTrigger value="lotteries" className="flex-shrink-0">
                  <Calendar className="md:mr-2" />
                  <span className="hidden md:inline">Sorteos</span>
                </TabsTrigger>
              )}
              {/* Jugadas - Temporalmente oculta */}
              {/* {hasPermission("bets") && (
                <TabsTrigger value="bets" className="flex-shrink-0">
                  <Ticket className="md:mr-2" />
                  <span className="hidden md:inline">Jugadas</span>
                </TabsTrigger>
              )} */}
              {hasPermission("draws.read") && (
                <TabsTrigger value="draws" className="flex-shrink-0">
                  <Target className="md:mr-2" />
                  <span className="hidden md:inline">Resultados</span>
                </TabsTrigger>
              )}
              {hasPermission("winners") && (
                <TabsTrigger value="winners" className="flex-shrink-0">
                  <Trophy className="md:mr-2" />
                  <span className="hidden md:inline">Ganadores</span>
                </TabsTrigger>
              )}
              {hasPermission("history") && (
                <TabsTrigger value="history" className="flex-shrink-0">
                  <ListBullets className="md:mr-2" />
                  <span className="hidden md:inline">Historial</span>
                </TabsTrigger>
              )}
              {hasPermission("users") && (
                <TabsTrigger value="users" className="flex-shrink-0">
                  <Users className="md:mr-2" />
                  <span className="hidden md:inline">Usuarios</span>
                </TabsTrigger>
              )}
              {hasPermission("roles") && (
                <TabsTrigger value="roles" className="flex-shrink-0">
                  <ShieldCheck className="md:mr-2" />
                  <span className="hidden md:inline">Roles</span>
                </TabsTrigger>
              )}
              {hasPermission("api-keys") && (
                <TabsTrigger value="api-keys" className="flex-shrink-0">
                  <Key className="md:mr-2" />
                  <span className="hidden md:inline">API Keys</span>
                </TabsTrigger>
              )}
              {hasPermission("taquillas") && (
                <TabsTrigger value="taquillas" className="flex-shrink-0">
                  <Storefront className="md:mr-2" />
                  <span className="hidden md:inline">Taquillas</span>
                </TabsTrigger>
              )}
            </TabsList>
          </ScrollArea>

          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Balance de Potes</h2>
                <p className="text-muted-foreground text-sm">Gestión de fondos del sistema</p>
              </div>
            </div>

            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
              {currentPots.map((pot, index) => (
                <PotCard
                  key={index}
                  pot={pot}
                  index={index}
                  onTransfer={openTransferDialog}
                  onWithdraw={(potIndex) => {
                    // Abrir diálogo con el pote preseleccionado
                    setWithdrawDialogOpen(true)
                  }}
                />
              ))}
            </div>

            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Sorteos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{currentLotteries.filter((l) => l.isActive).length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Jugadas Activas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{activeBets.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Ganadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{winners.length}</div>
                </CardContent>
              </Card>
            </div>

            {currentPots[0].balance < 10000 && (
              <Alert>
                <AlertDescription>
                  El pote de premios está bajo. Considere transferir fondos desde costos o ganancias.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Taquillas */}
          {hasPermission("taquillas") && (
          <TabsContent value="taquillas" className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Taquillas</h2>
                <p className="text-muted-foreground text-sm">Registrar, ver y aprobar taquillas</p>
              </div>
              <Button onClick={() => setTaquillaDialogOpen(true)}>
                <Plus className="mr-2" /> Registrar Taquilla
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar taquillas..."
                  value={taquillaSearch}
                  onChange={(e) => setTaquillaSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={taquillaFilters.isActive === undefined ? "all" : taquillaFilters.isActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setTaquillaFilters((prev) => ({
                    ...prev,
                    isActive: value === "all" ? undefined : value === "active",
                  }))
                }
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <Funnel className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTaquillas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.fullName}</TableCell>
                      <TableCell>{t.address}</TableCell>
                      <TableCell>{t.telefono || '-'}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          taquillaSales
                            .filter(s => s.taquillaId === t.id)
                            .reduce((sum, s) => sum + s.amount, 0)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.isApproved}
                            onCheckedChange={(checked) => toggleTaquillaStatus(t.id, checked)}
                          />
                          <span className="text-sm">{t.isApproved ? "Activo" : "Inactivo"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => { setSaleTaquilla(t); setRegisterSaleOpen(true) }}
                            title="Registrar Venta"
                          >
                            <Storefront className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => { setTaquillaStats(t); setTaquillaStatsOpen(true) }}
                            title="Ver Estadísticas"
                          >
                            <ChartLine className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => { setTaquillaEditing(t); setTaquillaEditOpen(true) }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTaquilla(t.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </div>
            {/* Diálogo de creación de taquilla */}
            <TaquillaDialog
              open={taquillaDialogOpen}
              onOpenChange={setTaquillaDialogOpen}
              onSave={async (taq) => {
                const success = await createTaquilla(taq)
                if (success) {
                  toast.success("Taquilla creada exitosamente")
                } else {
                  toast.error("Error al crear taquilla")
                }
                return success
              }}
            />
            <TaquillaEditDialog
              open={taquillaEditOpen}
              taquilla={taquillaEditing}
              onOpenChange={setTaquillaEditOpen}
              onSave={async (updates) => {
                const { id, ...rest } = updates
                return await updateTaquilla(id, rest)
              }}
            />
            <TaquillaStatsDialog
              open={taquillaStatsOpen}
              onOpenChange={setTaquillaStatsOpen}
              taquilla={taquillaStats}
              bets={currentBets}
              user={taquillaStats ? supabaseUsers.find(u => u.email === taquillaStats.email) : undefined}
            />
            <RegisterSaleDialog
              open={registerSaleOpen}
              onOpenChange={setRegisterSaleOpen}
              taquilla={saleTaquilla}
              onSave={async (amount, date, notes) => {
                if (!saleTaquilla) return false
                return await createTaquillaSale({
                  taquillaId: saleTaquilla.id,
                  amount,
                  saleDate: date,
                  notes
                })
              }}
            />
          </TabsContent>
          )}

          <TabsContent value="reports" className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">Reportes y Estadísticas</h2>
              <p className="text-muted-foreground text-sm">Análisis en tiempo real de ventas y premios</p>
            </div>

            <ReportsCard 
              draws={currentDraws} 
              lotteries={currentLotteries} 
              bets={currentBets}
              users={supabaseUsers}
            />
            
            <DrawStatsCard bets={currentBets} draws={currentDraws} lotteries={currentLotteries} />
          </TabsContent>

          <TabsContent value="lotteries" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Gestión de Sorteos</h2>
                <p className="text-muted-foreground text-sm">Crear y administrar sorteos disponibles</p>
              </div>
              <Button onClick={() => setLotteryDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2" />
                Nuevo Sorteo
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre u horario..."
                      value={lotterySearch}
                      onChange={(e) => setLotterySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={lotteryFilters.isActive === undefined ? "all" : lotteryFilters.isActive.toString()}
                    onValueChange={(value) =>
                      setLotteryFilters((f) => ({
                        ...f,
                        isActive: value === "all" ? undefined : value === "true",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="true">Activas</SelectItem>
                      <SelectItem value="false">Inactivas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {filteredLotteries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">
                    {currentLotteries.length === 0 ? "No hay sorteos creados" : "No se encontraron sorteos"}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {currentLotteries.length === 0
                      ? "Cree su primera lotería para empezar"
                      : "Intente con otros criterios de búsqueda"}
                  </p>
                  {currentLotteries.length === 0 && (
                    <Button onClick={() => setLotteryDialogOpen(true)}>
                      <Plus className="mr-2" />
                      Crear Primer Sorteo
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLotteries.map((lottery) => {
                  const lotteryBets = currentBets.filter((b) => b.lotteryId === lottery.id)
                  const lotteryWinners = lotteryBets.filter((b) => b.isWinner)

                  return (
                    <Card key={lottery.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle>{lottery.name}</CardTitle>
                            <CardDescription className="space-y-0.5">
                              <div>Abre: {lottery.openingTime}</div>
                              <div>Cierra: {lottery.closingTime}</div>
                              <div>Jugada: {lottery.drawTime}</div>
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditLottery(lottery)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLottery(lottery.id)}
                            >
                              <Trash />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2">
                          <Badge variant={lottery.isActive ? "default" : "secondary"}>
                            {lottery.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                          <Badge variant={lottery.playsTomorrow ? "outline" : "secondary"}>
                            {lottery.playsTomorrow ? "Juega Mañana" : "No Juega"}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Premios:</span>
                            <span className="font-medium">{lottery.prizes.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Jugadas:</span>
                            <span className="font-medium">{lotteryBets.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ganadores:</span>
                            <span className="font-medium">{lotteryWinners.length}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Jugadas - Temporalmente oculta */}
          {/* <TabsContent value="bets" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Jugadas</h2>
                <p className="text-muted-foreground text-sm">Registrar y ver jugadas de usuarios</p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por lotería o animal..."
                      value={betSearch}
                      onChange={(e) => setBetSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={betFilters.lotteryId || "all"}
                    onValueChange={(value) =>
                      setBetFilters((f) => ({ ...f, lotteryId: value === "all" ? undefined : value }))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por lotería" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los sorteos</SelectItem>
                      {currentLotteries.map((lottery) => (
                        <SelectItem key={lottery.id} value={lottery.id}>
                          {lottery.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {filteredBets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">
                    {activeBets.length === 0 ? "No hay jugadas registradas" : "No se encontraron jugadas"}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {activeBets.length === 0
                      ? "Cree una jugada para empezar"
                      : "Intente con otros criterios de búsqueda"}
                  </p>
                  {activeBets.length === 0 && (
                    <Button onClick={() => setBetDialogOpen(true)}>
                      <Plus className="mr-2" />
                      Registrar Primera Jugada
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <ScrollArea className="h-[400px] md:h-[600px]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Fecha/Hora</TableHead>
                          <TableHead className="whitespace-nowrap">Lotería</TableHead>
                          <TableHead className="whitespace-nowrap">Animal</TableHead>
                          <TableHead className="whitespace-nowrap">Monto</TableHead>
                          <TableHead className="whitespace-nowrap">Premio Potencial</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBets
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((bet) => (
                            <TableRow key={bet.id}>
                              <TableCell className="whitespace-nowrap text-xs md:text-sm">
                                {format(new Date(bet.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs md:text-sm">{bet.lotteryName}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs md:text-sm">
                                {bet.animalNumber} - {bet.animalName}
                              </TableCell>
                              <TableCell className="tabular-nums whitespace-nowrap text-xs md:text-sm">{formatCurrency(bet.amount)}</TableCell>
                              <TableCell className="tabular-nums font-medium text-accent whitespace-nowrap text-xs md:text-sm">
                                {formatCurrency(bet.potentialWin)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent> */}

          <TabsContent value="draws" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Administración de Sorteos</h2>
                <p className="text-muted-foreground text-sm">Crear, editar y eliminar resultados de sorteos realizados</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingDraw(undefined)
                  setDrawManagementDialogOpen(true)
                }} 
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2" />
                Crear Sorteo
              </Button>
            </div>

            {/* Estadísticas Administrativas */}
            <Card>
              <CardHeader>
                <CardTitle>Panel de Control de Sorteos</CardTitle>
                <CardDescription>Vista administrativa de todos los sorteos del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{supabaseDraws.length}</div>
                    <div className="text-sm text-muted-foreground">Sorteos Registrados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{supabaseDraws.filter(d => (d.winnersCount || 0) > 0).length}</div>
                    <div className="text-sm text-muted-foreground">Con Ganadores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(supabaseDraws.reduce((sum, d) => sum + (d.totalPayout || 0), 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Premios Pagados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{supabaseDraws.filter(d => (d.winnersCount || 0) === 0).length}</div>
                    <div className="text-sm text-muted-foreground">Sin Ganadores</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {drawsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Cargando resultados...</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Administrar Sorteos</CardTitle>
                  <CardDescription>Gestionar resultados - crear, editar o eliminar sorteos del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por lotería, animal o fecha..."
                        value={drawSearch}
                        onChange={(e) => setDrawSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={drawFilters.lotteryId || "all"}
                      onValueChange={(value) =>
                        setDrawFilters((f) => ({ ...f, lotteryId: value === "all" ? undefined : value }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filtrar por lotería" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los sorteos</SelectItem>
                        {supabaseLotteries.map((lottery) => (
                          <SelectItem key={lottery.id} value={lottery.id}>
                            {lottery.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ScrollArea className="h-[400px] md:h-[500px]">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Fecha</TableHead>
                            <TableHead className="w-[80px]">Hora</TableHead>
                            <TableHead>Lotería</TableHead>
                            <TableHead>Animal</TableHead>
                            <TableHead className="w-[100px]">Estado</TableHead>
                            <TableHead className="w-[120px]">Premio</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supabaseDraws
                            .filter((draw) => {
                              if (drawSearch) {
                                const lottery = supabaseLotteries.find(l => l.id === draw.lotteryId)
                                const lotteryName = lottery?.name || ''
                                const searchLower = drawSearch.toLowerCase()
                                if (
                                  !lotteryName.toLowerCase().includes(searchLower) &&
                                  !draw.winningAnimalName.toLowerCase().includes(searchLower) &&
                                  !draw.winningAnimalNumber.includes(searchLower) &&
                                  !draw.drawTime.toLowerCase().includes(searchLower)
                                ) {
                                  return false
                                }
                              }
                              if (drawFilters.lotteryId && draw.lotteryId !== drawFilters.lotteryId) {
                                return false
                              }
                              return true
                            })
                            .map((draw) => {
                              const lottery = supabaseLotteries.find(l => l.id === draw.lotteryId)
                              return (
                                <TableRow key={draw.id}>
                                  <TableCell className="font-medium">
                                    {format(new Date(draw.drawTime), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell>{format(new Date(draw.drawTime), 'HH:mm')}</TableCell>
                                  <TableCell>{lottery?.name || draw.lotteryName || 'N/A'}</TableCell>
                                  <TableCell>
                                    <span className="font-mono">
                                      {draw.winningAnimalNumber} - {draw.winningAnimalName}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={(draw.winnersCount || 0) > 0 ? "default" : "outline"}>
                                      {(draw.winnersCount || 0) > 0 ? "Con ganadores" : "Sin ganadores"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {(draw.totalPayout || 0) > 0
                                      ? formatCurrency(draw.totalPayout)
                                      : "-"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingDraw(draw)
                                          setDrawManagementDialogOpen(true)
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteDraw(draw)}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="winners" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Consulta de Ganadores</h2>
                <p className="text-muted-foreground text-sm">Ver y consultar todas las jugadas ganadoras del sistema</p>
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">
              {/* Estadísticas de Ganadores */}
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas de Ganadores</CardTitle>
                  <CardDescription>Resumen general de jugadas ganadoras</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{winners.length}</div>
                      <div className="text-sm text-muted-foreground">Jugadas Ganadoras</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatCurrency(winners.reduce((sum, b) => sum + b.potentialWin, 0))}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Premios</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatCurrency(winners.reduce((sum, b) => sum + b.amount, 0))}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Apostado</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentDraws.length}</div>
                      <div className="text-sm text-muted-foreground">Sorteos Realizados</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Listado de Jugadas Ganadoras</CardTitle>
                  <CardDescription>Consulta detallada de todas las jugadas que ganaron premios</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por lotería o animal..."
                        value={winnerSearch}
                        onChange={(e) => setWinnerSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={winnerFilters.lotteryId || "all"}
                      onValueChange={(value) =>
                        setWinnerFilters((f) => ({ ...f, lotteryId: value === "all" ? undefined : value }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filtrar por sorteo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los sorteos</SelectItem>
                        {currentLotteries.map((lottery) => (
                          <SelectItem key={lottery.id} value={lottery.id}>
                            {lottery.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredWinners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {winners.length === 0 ? "No hay ganadores aún" : "No se encontraron ganadores"}
                    </p>
                  ) : (
                    <ScrollArea className="h-[400px] md:h-[500px]">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Fecha</TableHead>
                              <TableHead className="whitespace-nowrap">Lotería</TableHead>
                              <TableHead className="whitespace-nowrap">Animal</TableHead>
                              <TableHead className="whitespace-nowrap">Apuesta</TableHead>
                              <TableHead className="whitespace-nowrap">Premio</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWinners
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .map((bet) => (
                                <TableRow key={bet.id}>
                                  <TableCell className="whitespace-nowrap text-xs md:text-sm">
                                    {format(new Date(bet.timestamp), "dd/MM/yyyy", { locale: es })}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-xs md:text-sm">{bet.lotteryName}</TableCell>
                                  <TableCell className="whitespace-nowrap text-xs md:text-sm">
                                    {bet.animalNumber} - {bet.animalName}
                                  </TableCell>
                                  <TableCell className="tabular-nums whitespace-nowrap text-xs md:text-sm">
                                    {formatCurrency(bet.amount)}
                                  </TableCell>
                                  <TableCell className="tabular-nums font-semibold text-accent whitespace-nowrap text-xs md:text-sm">
                                    {formatCurrency(bet.potentialWin)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">Historial de Transacciones</h2>
              <p className="text-muted-foreground text-sm">Transferencias y retiros realizados</p>
            </div>

            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Transferencias Entre Potes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre de pote..."
                      value={transferSearch}
                      onChange={(e) => setTransferSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {filteredTransfers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {currentTransfers.length === 0
                        ? "No hay transferencias registradas"
                        : "No se encontraron transferencias"}
                    </p>
                  ) : (
                    <ScrollArea className="h-[350px] md:h-[400px]">
                      <div className="space-y-3">
                        {filteredTransfers
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((transfer) => (
                            <div key={transfer.id} className="p-3 border rounded-lg space-y-1">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                <div className="text-sm flex-1 min-w-0">
                                  <p className="font-medium truncate">De: {transfer.fromPot}</p>
                                  <p className="text-muted-foreground truncate">Para: {transfer.toPot}</p>
                                </div>
                                <p className="font-semibold tabular-nums shrink-0">
                                  {formatCurrency(transfer.amount)}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(transfer.timestamp), "dd/MM/yyyy HH:mm", {
                                  locale: es,
                                })}
                              </p>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Retiros de Ganancias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por pote..."
                      value={withdrawalSearch}
                      onChange={(e) => setWithdrawalSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {filteredWithdrawals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {currentWithdrawals.length === 0
                        ? "No hay retiros registrados"
                        : "No se encontraron retiros"}
                    </p>
                  ) : (
                    <ScrollArea className="h-[350px] md:h-[400px]">
                      <div className="space-y-3">
                        {filteredWithdrawals
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((withdrawal) => (
                            <div key={withdrawal.id} className="p-3 border rounded-lg space-y-1">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                <p className="text-sm font-medium truncate flex-1">{withdrawal.fromPot}</p>
                                <p className="font-semibold text-accent tabular-nums shrink-0">
                                  {formatCurrency(withdrawal.amount)}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(withdrawal.timestamp), "dd/MM/yyyy HH:mm", {
                                  locale: es,
                                })}
                              </p>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Gestión de Usuarios</h2>
                <p className="text-muted-foreground text-sm">Administrar usuarios del sistema (Híbrido: Supabase + Local)</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  onClick={syncUsersToSupabase} 
                  variant="outline"
                  className="w-full sm:w-auto"
                  title="Sincronizar usuarios locales con Supabase"
                >
                  <ShieldCheck className="mr-2" />
                  Sincronizar
                </Button>
                <Button 
                  onClick={cleanDuplicateUsers} 
                  variant="outline"
                  className="w-full sm:w-auto"
                  title="Limpiar usuarios duplicados en Supabase"
                >
                  <Trash className="mr-2" />
                  Limpiar Duplicados
                </Button>
                <Button onClick={() => setUserDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="mr-2" />
                  Nuevo Usuario
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select
                      value={userFilters.isActive === undefined ? "all" : userFilters.isActive.toString()}
                      onValueChange={(value) =>
                        setUserFilters((f) => ({
                          ...f,
                          isActive: value === "all" ? undefined : value === "true",
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="true">Activos</SelectItem>
                        <SelectItem value="false">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={userFilters.roleId || "all"}
                      onValueChange={(value) =>
                        setUserFilters((f) => ({ ...f, roleId: value === "all" ? undefined : value }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los roles</SelectItem>
                        {currentRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[400px] md:h-[600px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Nombre</TableHead>
                        <TableHead className="whitespace-nowrap">Email</TableHead>
                        <TableHead className="whitespace-nowrap">Roles</TableHead>
                        <TableHead className="whitespace-nowrap">Estado</TableHead>
                        <TableHead className="whitespace-nowrap">Fecha Creación</TableHead>
                        <TableHead className="whitespace-nowrap">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const userRoles = currentRoles.filter((r) => user.roleIds.includes(r.id))
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm">{user.name}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs md:text-sm">{user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {userRoles.map((role) => (
                                  <Badge key={role.id} variant="secondary" className="text-xs">
                                    {role.name}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                                {user.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs md:text-sm">
                              {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={user.id === currentUserId}
                                >
                                  <Trash />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold">Gestión de Roles</h2>
                <p className="text-muted-foreground text-sm">Definir roles y permisos de acceso</p>
              </div>
              <Button onClick={() => setRoleDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2" />
                Nuevo Rol
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar roles..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rolesLoading ? (
                <div className="col-span-full flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Cargando roles...</p>
                  </div>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No hay roles que mostrar</p>
                </div>
              ) : (
                filteredRoles.map((role) => {
                  const usersWithRole = currentUsers.filter((u) => u.roleIds && u.roleIds.includes(role.id))
                  return (
                    <Card key={role.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{role.name}</CardTitle>
                            {role.isSystem && (
                              <Badge variant="secondary" className="text-xs">
                                Sistema
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{role.description}</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRole(role)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={role.isSystem}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Permisos:</p>
                        <div className="flex flex-wrap gap-1">
                          {(role.permissions || []).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Usuarios:</span>
                        <span className="font-medium">{usersWithRole.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                  )
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                    Gestión de API Keys
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Conectar sistemas de ventas externos de forma segura
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setApiKeyDialogOpen(true)} 
                className="w-full sm:w-auto"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nueva API Key
              </Button>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Key className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Información importante:</strong> Las API Keys permiten que sistemas de ventas externos se conecten 
                de forma segura para enviar jugadas y consultar información. Mantenga sus keys privadas y revoque 
                acceso cuando sea necesario.
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar API Keys..."
                    value={apiKeySearch}
                    onChange={(e) => setApiKeySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {filteredApiKeys.length === 0 ? (
              <Card className="border-dashed border-2 border-blue-200">
                <CardContent className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="p-4 bg-blue-600 rounded-full mb-6">
                    <Key className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {currentApiKeys.length === 0 ? "No hay API Keys creadas" : "No se encontraron API Keys"}
                  </h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    {currentApiKeys.length === 0
                      ? "Crea tu primera API Key para conectar sistemas de ventas externos de forma segura"
                      : "Intente con otros criterios de búsqueda o cree una nueva API Key"}
                  </p>
                  {currentApiKeys.length === 0 && (
                    <Button 
                      onClick={() => setApiKeyDialogOpen(true)}
                      size="lg"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Crear Primera API Key
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApiKeys.map((apiKey) => {
                  const isVisible = visibleKeys.has(apiKey.id)
                  return (
                    <Card key={apiKey.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle>{apiKey.name}</CardTitle>
                              <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                                {apiKey.isActive ? "Activa" : "Inactiva"}
                              </Badge>
                            </div>
                            <CardDescription>{apiKey.description}</CardDescription>
                            {apiKey.lastUsed && (
                              <p className="text-xs text-muted-foreground">
                                Último uso: {format(new Date(apiKey.lastUsed), "dd/MM/yyyy HH:mm", { locale: es })}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditApiKey(apiKey)}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteApiKey(apiKey.id)}>
                              <Trash />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              value={isVisible ? apiKey.key : "sk_" + "•".repeat(48)}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                              title={isVisible ? "Ocultar" : "Mostrar"}
                            >
                              {isVisible ? <EyeSlash /> : <Eye />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(apiKey.key)}
                              title="Copiar"
                            >
                              <Copy />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">Permisos</Label>
                          <div className="flex flex-wrap gap-1">
                            {apiKey.permissions.map((perm) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Creada por:</span>
                            <p className="font-medium">
                              {currentUsers.find((u) => u.id === apiKey.createdBy)?.name || "Usuario desconocido"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fecha de creación:</span>
                            <p className="font-medium">
                              {format(new Date(apiKey.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <LotteryDialog
        open={lotteryDialogOpen}
        onOpenChange={(open) => {
          setLotteryDialogOpen(open)
          if (!open) setEditingLottery(undefined)
        }}
        lottery={editingLottery}
        onSave={handleSaveLottery}
        onPlayTomorrowChange={onPlayTomorrowChange}
      />

      <BetDialog
        open={betDialogOpen}
        onOpenChange={setBetDialogOpen}
        lotteries={currentLotteries}
        onSave={handleSaveBet}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={(open) => {
          setTransferDialogOpen(open)
          if (!open) setTransferFromIndex(undefined)
        }}
        pots={currentPots}
        initialFromIndex={transferFromIndex}
        onTransfer={handleTransfer}
      />

      <WithdrawDialog
        open={withdrawDialogOpen}
        onOpenChange={setWithdrawDialogOpen}
        pots={currentPots}
        onWithdraw={handleWithdraw}
        isLoading={withdrawalsLoading}
      />

      <DrawDialog
        open={drawDialogOpen}
        onOpenChange={setDrawDialogOpen}
        lotteries={currentLotteries}
        bets={currentBets}
        onDraw={handleDraw}
      />

      <DrawManagementDialog
        open={drawManagementDialogOpen}
        onOpenChange={(open) => {
          setDrawManagementDialogOpen(open)
          if (!open) setEditingDraw(undefined)
        }}
        draw={editingDraw}
        lotteries={supabaseLotteries}
        onSave={async (drawData) => {
          if (editingDraw) {
            // Actualizar sorteo existente
            return await updateDraw(editingDraw.id, drawData)
          } else {
            // Crear nuevo sorteo
            const success = await createDraw(drawData)
            
            if (success) {
              // Procesar ganadores automáticamente
              const { winnersCount, totalPayout } = await processWinnersAutomatically(drawData)
              
              // Actualizar el sorteo con la información de ganadores y premios
              // (El sorteo ya fue creado, solo actualizamos estos campos)
              console.log(`✅ Sorteo creado con ${winnersCount} ganadores y Bs. ${totalPayout} en premios`)
            }
            
            return success
          }
        }}
      />

      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open)
          if (!open) setEditingRole(undefined)
        }}
        role={editingRole}
        onSave={handleSaveRole}
      />

      <UserDialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open)
          if (!open) setEditingUser(undefined)
        }}
        user={editingUser}
        roles={currentRoles}
        currentUserId={currentUserId}
        onSave={handleSaveUser}
      />

      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={(open) => {
          setApiKeyDialogOpen(open)
          if (!open) setEditingApiKey(undefined)
        }}
        apiKey={editingApiKey}
        currentUserId={currentUserId}
        onSave={handleSaveApiKey}
      />

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SignOut className="h-5 w-5 text-destructive" />
              Cerrar Sesión
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea cerrar sesión? Será redirigido a la pantalla de inicio de sesión.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLogout}
              className="gap-2"
            >
              <SignOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteApiKeyDialogOpen} onOpenChange={setDeleteApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar API Key
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p className="font-medium">
                ¿Está seguro de que desea eliminar esta API Key?
              </p>
              <p className="text-sm">
                Esta acción es permanente y no se puede deshacer. Los sistemas externos que utilicen esta clave no podrán conectarse y dejarán de funcionar inmediatamente.
              </p>
              {apiKeyToDelete && (
                <div className="bg-muted p-3 rounded-md mt-3">
                  <p className="text-sm font-mono">
                    <span className="font-semibold">API Key:</span>{" "}
                    {supabaseApiKeys.find(k => k.id === apiKeyToDelete)?.name || "Sin nombre"}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteApiKeyDialogOpen(false)
                setApiKeyToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteApiKey}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Eliminar API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Rol
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p className="font-medium">
                ¿Está seguro de que desea eliminar este rol?
              </p>
              <p className="text-sm">
                Esta acción es permanente y no se puede deshacer. Los usuarios asignados a este rol perderán sus permisos asociados.
              </p>
              {roleToDelete && (
                <div className="bg-muted p-3 rounded-md mt-3">
                  <p className="text-sm">
                    <span className="font-semibold">Rol:</span>{" "}
                    {roles.find(r => r.id === roleToDelete)?.name || "Desconocido"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-semibold">Usuarios:</span>{" "}
                    {supabaseUsers.filter(u => u.roleIds?.includes(roleToDelete)).length}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteRoleDialogOpen(false)
                setRoleToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Eliminar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Usuario
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p className="font-medium">
                ¿Está seguro de que desea eliminar este usuario?
              </p>
              <p className="text-sm">
                Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos asociados a este usuario, incluyendo sus registros de actividad.
              </p>
              {userToDelete && (
                <div className="bg-muted p-3 rounded-md mt-3 space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">Nombre:</span>{" "}
                    {supabaseUsers.find(u => u.id === userToDelete)?.name || "Desconocido"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Email:</span>{" "}
                    {supabaseUsers.find(u => u.id === userToDelete)?.email || ""}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Roles:</span>{" "}
                    {supabaseUsers.find(u => u.id === userToDelete)?.roleIds?.map(roleId => 
                      roles.find(r => r.id === roleId)?.name
                    ).filter(Boolean).join(", ") || "Ninguno"}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserDialogOpen(false)
                setUserToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Eliminar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDrawDialogOpen} onOpenChange={setDeleteDrawDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Sorteo
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p className="font-medium">
                ¿Está seguro de que desea eliminar este sorteo?
              </p>
              <p className="text-sm">
                Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos del sorteo, incluyendo los resultados y ganadores asociados.
              </p>
              {drawToDelete && (
                <div className="bg-muted p-3 rounded-md mt-3 space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">Lotería:</span>{" "}
                    {supabaseLotteries.find(l => l.id === drawToDelete.lotteryId)?.name || drawToDelete.lotteryName || "Desconocida"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Animal:</span>{" "}
                    {drawToDelete.winningAnimalNumber} - {drawToDelete.winningAnimalName}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Fecha:</span>{" "}
                    {format(new Date(drawToDelete.drawTime), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  {(drawToDelete.winnersCount || 0) > 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-500 font-medium mt-2">
                      ⚠️ Este sorteo tiene {drawToDelete.winnersCount} ganador(es)
                    </p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDrawDialogOpen(false)
                setDrawToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDraw}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Eliminar Sorteo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteLotteryDialogOpen} onOpenChange={setDeleteLotteryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Lotería
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p className="font-medium">
                ¿Está seguro de que desea eliminar esta lotería?
              </p>
              <p className="text-sm">
                Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos asociados, incluyendo sorteos, jugadas y resultados vinculados a esta lotería.
              </p>
              {lotteryToDelete && (
                <div className="bg-muted p-3 rounded-md mt-3 space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">Lotería:</span>{" "}
                    {supabaseLotteries.find(l => l.id === lotteryToDelete)?.name || "Desconocida"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Estado:</span>{" "}
                    {supabaseLotteries.find(l => l.id === lotteryToDelete)?.isActive ? "Activa" : "Inactiva"}
                  </p>
                  {(() => {
                    const lottery = supabaseLotteries.find(l => l.id === lotteryToDelete);
                    const relatedBets = supabaseBets.filter(b => b.lotteryId === lotteryToDelete).length;
                    const relatedDraws = supabaseDraws.filter(d => d.lotteryId === lotteryToDelete).length;
                    return (
                      <>
                        {relatedDraws > 0 && (
                          <p className="text-sm text-amber-600 dark:text-amber-500 font-medium mt-2">
                            ⚠️ Esta lotería tiene {relatedDraws} sorteo(s) asociado(s)
                          </p>
                        )}
                        {relatedBets > 0 && (
                          <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
                            ⚠️ Esta lotería tiene {relatedBets} jugada(s) registrada(s)
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteLotteryDialogOpen(false)
                setLotteryToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLottery}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Eliminar Lotería
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
