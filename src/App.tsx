import { useKV } from "@github/spark/hooks"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bet, DrawResult, Lottery, Transfer, Withdrawal, User, Role, ModulePermission } from "@/lib/types"
import { INITIAL_POTS, deductFromPot, distributeBetToPots, formatCurrency, transferBetweenPots } from "@/lib/pot-utils"
import { filterLotteries, filterBets, filterUsers, filterRoles } from "@/lib/filter-utils"
import { PotCard } from "@/components/PotCard"
import { LotteryDialog } from "@/components/LotteryDialog"
import { BetDialog } from "@/components/BetDialog"
import { TransferDialog } from "@/components/TransferDialog"
import { WithdrawDialog } from "@/components/WithdrawDialog"
import { DrawDialog } from "@/components/DrawDialog"
import { RoleDialog } from "@/components/RoleDialog"
import { UserDialog } from "@/components/UserDialog"
import { LoginScreen } from "@/components/LoginScreen"
import { useAuth } from "@/hooks/use-auth"
import { Plus, Ticket, Trophy, Vault, ListBullets, Calendar, Pencil, Trash, Users, ShieldCheck, SignOut, MagnifyingGlass, Funnel } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

function App() {
  const [lotteries, setLotteries] = useKV<Lottery[]>("lotteries", [])
  const [bets, setBets] = useKV<Bet[]>("bets", [])
  const [draws, setDraws] = useKV<DrawResult[]>("draws", [])
  const [pots, setPots] = useKV<typeof INITIAL_POTS>("pots", INITIAL_POTS)
  const [transfers, setTransfers] = useKV<Transfer[]>("transfers", [])
  const [withdrawals, setWithdrawals] = useKV<Withdrawal[]>("withdrawals", [])
  const [users, setUsers] = useKV<User[]>("users", [])
  const [roles, setRoles] = useKV<Role[]>("roles", [])
  const [currentUserId, setCurrentUserId] = useKV<string>("currentUserId", "")

  const { currentUser, hasPermission } = useAuth()

  const [lotteryDialogOpen, setLotteryDialogOpen] = useState(false)
  const [editingLottery, setEditingLottery] = useState<Lottery | undefined>()
  const [betDialogOpen, setBetDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferFromIndex, setTransferFromIndex] = useState<number | undefined>()
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [drawDialogOpen, setDrawDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>()
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

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

  useEffect(() => {
    const currentRoles = roles || []
    const currentUsers = users || []

    if (currentRoles.length === 0) {
      const defaultRoles: Role[] = [
        {
          id: "admin",
          name: "Administrador",
          description: "Acceso completo al sistema",
          permissions: ["dashboard", "lotteries", "bets", "winners", "history", "users", "roles"],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
        {
          id: "vendor",
          name: "Vendedor",
          description: "Puede registrar jugadas y ver loterías",
          permissions: ["lotteries", "bets"],
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
      ]
      setRoles(defaultRoles)
    }

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

  const handleSaveLottery = (lottery: Lottery) => {
    setLotteries((current) => {
      const currentList = current || []
      const exists = currentList.find((l) => l.id === lottery.id)
      if (exists) {
        return currentList.map((l) => (l.id === lottery.id ? lottery : l))
      }
      return [...currentList, lottery]
    })
    setEditingLottery(undefined)
  }

  const handleDeleteLottery = (id: string) => {
    if (confirm("¿Está seguro de eliminar esta lotería?")) {
      setLotteries((current) => (current || []).filter((l) => l.id !== id))
      toast.success("Lotería eliminada")
    }
  }

  const handleEditLottery = (lottery: Lottery) => {
    setEditingLottery(lottery)
    setLotteryDialogOpen(true)
  }

  const handleSaveBet = (bet: Bet) => {
    setBets((current) => [...(current || []), bet])
    setPots((current) => distributeBetToPots(bet.amount, current || INITIAL_POTS))
  }

  const handleTransfer = (fromIndex: number, toIndex: number, amount: number) => {
    setPots((current) => transferBetweenPots(fromIndex, toIndex, amount, current || INITIAL_POTS))

    const currentPots = pots || INITIAL_POTS
    const transfer: Transfer = {
      id: Date.now().toString(),
      fromPot: currentPots[fromIndex].name,
      toPot: currentPots[toIndex].name,
      amount,
      timestamp: new Date().toISOString(),
    }
    setTransfers((current) => [...(current || []), transfer])
  }

  const handleWithdraw = (amount: number) => {
    setPots((current) => deductFromPot(2, amount, current || INITIAL_POTS))

    const currentPots = pots || INITIAL_POTS
    const withdrawal: Withdrawal = {
      id: Date.now().toString(),
      amount,
      timestamp: new Date().toISOString(),
      fromPot: currentPots[2].name,
    }
    setWithdrawals((current) => [...(current || []), withdrawal])
  }

  const handleDraw = (result: DrawResult, winners: Bet[]) => {
    setDraws((current) => [...(current || []), result])

    setBets((current) =>
      (current || []).map((bet) => {
        if (winners.find((w) => w.id === bet.id)) {
          return { ...bet, isWinner: true }
        }
        return bet
      })
    )

    if (result.totalPayout > 0) {
      setPots((current) => deductFromPot(0, result.totalPayout, current || INITIAL_POTS))
    }
  }

  const openTransferDialog = (potIndex: number) => {
    setTransferFromIndex(potIndex)
    setTransferDialogOpen(true)
  }

  const handleSaveRole = (role: Role) => {
    setRoles((current) => {
      const currentList = current || []
      const exists = currentList.find((r) => r.id === role.id)
      if (exists) {
        return currentList.map((r) => (r.id === role.id ? role : r))
      }
      return [...currentList, role]
    })
    setEditingRole(undefined)
  }

  const handleDeleteRole = (id: string) => {
    const role = (roles || []).find((r) => r.id === id)
    if (role?.isSystem) {
      toast.error("No se pueden eliminar roles del sistema")
      return
    }
    if (confirm("¿Está seguro de eliminar este rol?")) {
      setRoles((current) => (current || []).filter((r) => r.id !== id))
      toast.success("Rol eliminado")
    }
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleDialogOpen(true)
  }

  const handleSaveUser = (user: User) => {
    setUsers((current) => {
      const currentList = current || []
      const exists = currentList.find((u) => u.id === user.id)
      if (exists) {
        return currentList.map((u) => (u.id === user.id ? user : u))
      }
      return [...currentList, user]
    })
    setEditingUser(undefined)
  }

  const handleDeleteUser = (id: string) => {
    if (id === currentUserId) {
      toast.error("No puede eliminar su propio usuario")
      return
    }
    if (confirm("¿Está seguro de eliminar este usuario?")) {
      setUsers((current) => (current || []).filter((u) => u.id !== id))
      toast.success("Usuario eliminado")
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserDialogOpen(true)
  }

  const handleLogout = () => {
    if (confirm("¿Está seguro de cerrar sesión?")) {
      setCurrentUserId("")
      toast.success("Sesión cerrada")
    }
  }

  const currentBets = bets || []
  const currentPots = pots || INITIAL_POTS
  const currentLotteries = lotteries || []
  const currentDraws = draws || []
  const currentTransfers = transfers || []
  const currentWithdrawals = withdrawals || []
  const currentUsers = users || []
  const currentRoles = roles || []

  const winners = currentBets.filter((b) => b.isWinner)
  const activeBets = currentBets.filter((b) => !b.isWinner)

  const filteredLotteries = filterLotteries(currentLotteries, lotterySearch, lotteryFilters)
  const filteredBets = filterBets(activeBets, betSearch, betFilters)
  const filteredUsers = filterUsers(currentUsers, userSearch, userFilters)
  const filteredRoles = filterRoles(currentRoles, roleSearch)
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

  if (!currentUserId || !currentUser) {
    return <LoginScreen users={currentUsers} onLogin={setCurrentUserId} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Sistema Administrativo</h1>
              <p className="text-muted-foreground mt-1">Lotería de Animalitos</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <SignOut />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            {hasPermission("dashboard") && (
              <TabsTrigger value="dashboard">
                <Vault className="mr-2" />
                Dashboard
              </TabsTrigger>
            )}
            {hasPermission("lotteries") && (
              <TabsTrigger value="lotteries">
                <Calendar className="mr-2" />
                Loterías
              </TabsTrigger>
            )}
            {hasPermission("bets") && (
              <TabsTrigger value="bets">
                <Ticket className="mr-2" />
                Jugadas
              </TabsTrigger>
            )}
            {hasPermission("winners") && (
              <TabsTrigger value="winners">
                <Trophy className="mr-2" />
                Ganadores
              </TabsTrigger>
            )}
            {hasPermission("history") && (
              <TabsTrigger value="history">
                <ListBullets className="mr-2" />
                Historial
              </TabsTrigger>
            )}
            {hasPermission("users") && (
              <TabsTrigger value="users">
                <Users className="mr-2" />
                Usuarios
              </TabsTrigger>
            )}
            {hasPermission("roles") && (
              <TabsTrigger value="roles">
                <ShieldCheck className="mr-2" />
                Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Balance de Potes</h2>
                <p className="text-muted-foreground">Gestión de fondos del sistema</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {currentPots.map((pot, index) => (
                <PotCard
                  key={index}
                  pot={pot}
                  index={index}
                  onTransfer={openTransferDialog}
                  onWithdraw={() => setWithdrawDialogOpen(true)}
                />
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Loterías Activas</CardTitle>
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
                  El pote de premios está bajo. Considere transferir fondos desde la reserva.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="lotteries" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Gestión de Loterías</h2>
                <p className="text-muted-foreground">Crear y administrar loterías disponibles</p>
              </div>
              <Button onClick={() => setLotteryDialogOpen(true)}>
                <Plus className="mr-2" />
                Nueva Lotería
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
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
                    <SelectTrigger className="w-[180px]">
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
                    {currentLotteries.length === 0 ? "No hay loterías creadas" : "No se encontraron loterías"}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {currentLotteries.length === 0
                      ? "Cree su primera lotería para empezar"
                      : "Intente con otros criterios de búsqueda"}
                  </p>
                  {currentLotteries.length === 0 && (
                    <Button onClick={() => setLotteryDialogOpen(true)}>
                      <Plus className="mr-2" />
                      Crear Primera Lotería
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

          <TabsContent value="bets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Jugadas</h2>
                <p className="text-muted-foreground">Registrar y ver jugadas de usuarios</p>
              </div>
              <Button onClick={() => setBetDialogOpen(true)}>
                <Plus className="mr-2" />
                Nueva Jugada
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
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
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por lotería" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las loterías</SelectItem>
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
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha/Hora</TableHead>
                        <TableHead>Lotería</TableHead>
                        <TableHead>Animal</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Premio Potencial</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBets
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((bet) => (
                          <TableRow key={bet.id}>
                            <TableCell>
                              {format(new Date(bet.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>{bet.lotteryName}</TableCell>
                            <TableCell>
                              {bet.animalNumber} - {bet.animalName}
                            </TableCell>
                            <TableCell className="tabular-nums">{formatCurrency(bet.amount)}</TableCell>
                            <TableCell className="tabular-nums font-medium text-accent">
                              {formatCurrency(bet.potentialWin)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="winners" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Ganadores y Sorteos</h2>
                <p className="text-muted-foreground">Realizar sorteos y ver ganadores</p>
              </div>
              <Button onClick={() => setDrawDialogOpen(true)}>
                <Trophy className="mr-2" />
                Realizar Sorteo
              </Button>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sorteos Realizados</CardTitle>
                  <CardDescription>Historial de sorteos y resultados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por lotería o animal..."
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
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrar por lotería" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las loterías</SelectItem>
                        {currentLotteries.map((lottery) => (
                          <SelectItem key={lottery.id} value={lottery.id}>
                            {lottery.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredDraws.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {currentDraws.length === 0 ? "No hay sorteos realizados" : "No se encontraron sorteos"}
                    </p>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {filteredDraws
                          .sort((a, b) => new Date(b.drawTime).getTime() - new Date(a.drawTime).getTime())
                          .map((draw) => (
                            <div
                              key={draw.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{draw.lotteryName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Ganador: {draw.winningAnimalNumber} - {draw.winningAnimalName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(draw.drawTime), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  {draw.winnersCount} ganador{draw.winnersCount !== 1 ? "es" : ""}
                                </p>
                                <p className="font-semibold tabular-nums">
                                  {formatCurrency(draw.totalPayout)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Jugadas Ganadoras</CardTitle>
                  <CardDescription>Todas las jugadas que han ganado premios</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
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
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrar por lotería" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las loterías</SelectItem>
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
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Lotería</TableHead>
                            <TableHead>Animal</TableHead>
                            <TableHead>Apuesta</TableHead>
                            <TableHead>Premio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredWinners
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((bet) => (
                              <TableRow key={bet.id}>
                                <TableCell>
                                  {format(new Date(bet.timestamp), "dd/MM/yyyy", { locale: es })}
                                </TableCell>
                                <TableCell>{bet.lotteryName}</TableCell>
                                <TableCell>
                                  {bet.animalNumber} - {bet.animalName}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {formatCurrency(bet.amount)}
                                </TableCell>
                                <TableCell className="tabular-nums font-semibold text-accent">
                                  {formatCurrency(bet.potentialWin)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Historial de Transacciones</h2>
              <p className="text-muted-foreground">Transferencias y retiros realizados</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {filteredTransfers
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((transfer) => (
                            <div key={transfer.id} className="p-3 border rounded-lg space-y-1">
                              <div className="flex justify-between items-start">
                                <div className="text-sm">
                                  <p className="font-medium">De: {transfer.fromPot}</p>
                                  <p className="text-muted-foreground">Para: {transfer.toPot}</p>
                                </div>
                                <p className="font-semibold tabular-nums">
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
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {filteredWithdrawals
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((withdrawal) => (
                            <div key={withdrawal.id} className="p-3 border rounded-lg space-y-1">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium">{withdrawal.fromPot}</p>
                                <p className="font-semibold text-accent tabular-nums">
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

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Gestión de Usuarios</h2>
                <p className="text-muted-foreground">Administrar usuarios del sistema</p>
              </div>
              <Button onClick={() => setUserDialogOpen(true)}>
                <Plus className="mr-2" />
                Nuevo Usuario
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={userFilters.isActive === undefined ? "all" : userFilters.isActive.toString()}
                    onValueChange={(value) =>
                      setUserFilters((f) => ({
                        ...f,
                        isActive: value === "all" ? undefined : value === "true",
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
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
                    <SelectTrigger className="w-[180px]">
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
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const userRoles = currentRoles.filter((r) => user.roleIds.includes(r.id))
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {userRoles.map((role) => (
                                <Badge key={role.id} variant="secondary">
                                  {role.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
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
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Gestión de Roles</h2>
                <p className="text-muted-foreground">Definir roles y permisos de acceso</p>
              </div>
              <Button onClick={() => setRoleDialogOpen(true)}>
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
              {filteredRoles.map((role) => {
                const usersWithRole = currentUsers.filter((u) => u.roleIds.includes(role.id))
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
                          {role.permissions.map((perm) => (
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
              })}
            </div>
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
        availableBalance={currentPots[2].balance}
        onWithdraw={handleWithdraw}
      />

      <DrawDialog
        open={drawDialogOpen}
        onOpenChange={setDrawDialogOpen}
        lotteries={currentLotteries}
        bets={currentBets}
        onDraw={handleDraw}
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
    </div>
  )
}

export default App
