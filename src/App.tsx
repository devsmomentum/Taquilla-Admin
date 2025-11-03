import { useKV } from "@github/spark/hooks"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bet, DrawResult, Lottery, Transfer, Withdrawal } from "@/lib/types"
import { INITIAL_POTS, deductFromPot, distributeBetToPots, formatCurrency, transferBetweenPots } from "@/lib/pot-utils"
import { PotCard } from "@/components/PotCard"
import { LotteryDialog } from "@/components/LotteryDialog"
import { BetDialog } from "@/components/BetDialog"
import { TransferDialog } from "@/components/TransferDialog"
import { WithdrawDialog } from "@/components/WithdrawDialog"
import { DrawDialog } from "@/components/DrawDialog"
import { Plus, Ticket, Trophy, Vault, ListBullets, Calendar, Pencil, Trash } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

function App() {
  const [lotteries, setLotteries] = useKV<Lottery[]>("lotteries", [])
  const [bets, setBets] = useKV<Bet[]>("bets", [])
  const [draws, setDraws] = useKV<DrawResult[]>("draws", [])
  const [pots, setPots] = useKV<typeof INITIAL_POTS>("pots", INITIAL_POTS)
  const [transfers, setTransfers] = useKV<Transfer[]>("transfers", [])
  const [withdrawals, setWithdrawals] = useKV<Withdrawal[]>("withdrawals", [])

  const [lotteryDialogOpen, setLotteryDialogOpen] = useState(false)
  const [editingLottery, setEditingLottery] = useState<Lottery | undefined>()
  const [betDialogOpen, setBetDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferFromIndex, setTransferFromIndex] = useState<number | undefined>()
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [drawDialogOpen, setDrawDialogOpen] = useState(false)

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

  const currentBets = bets || []
  const currentPots = pots || INITIAL_POTS
  const currentLotteries = lotteries || []
  const currentDraws = draws || []
  const currentTransfers = transfers || []
  const currentWithdrawals = withdrawals || []

  const winners = currentBets.filter((b) => b.isWinner)
  const activeBets = currentBets.filter((b) => !b.isWinner)

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold tracking-tight">Sistema Administrativo</h1>
          <p className="text-muted-foreground mt-1">Lotería de Animalitos</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <Vault className="mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="lotteries">
              <Calendar className="mr-2" />
              Loterías
            </TabsTrigger>
            <TabsTrigger value="bets">
              <Ticket className="mr-2" />
              Jugadas
            </TabsTrigger>
            <TabsTrigger value="winners">
              <Trophy className="mr-2" />
              Ganadores
            </TabsTrigger>
            <TabsTrigger value="history">
              <ListBullets className="mr-2" />
              Historial
            </TabsTrigger>
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

            {currentLotteries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No hay loterías creadas</p>
                  <p className="text-muted-foreground mb-4">Cree su primera lotería para empezar</p>
                  <Button onClick={() => setLotteryDialogOpen(true)}>
                    <Plus className="mr-2" />
                    Crear Primera Lotería
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentLotteries.map((lottery) => {
                  const lotteryBets = currentBets.filter((b) => b.lotteryId === lottery.id)
                  const lotteryWinners = lotteryBets.filter((b) => b.isWinner)

                  return (
                    <Card key={lottery.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle>{lottery.name}</CardTitle>
                            <CardDescription>Cierra: {lottery.closingTime}</CardDescription>
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

            {activeBets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No hay jugadas registradas</p>
                  <p className="text-muted-foreground mb-4">Cree una jugada para empezar</p>
                  <Button onClick={() => setBetDialogOpen(true)}>
                    <Plus className="mr-2" />
                    Registrar Primera Jugada
                  </Button>
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
                      {activeBets
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
                <CardContent>
                  {currentDraws.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No hay sorteos realizados</p>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {currentDraws
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
                <CardContent>
                  {winners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No hay ganadores aún</p>
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
                          {winners
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
                <CardContent>
                  {currentTransfers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay transferencias registradas
                    </p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {currentTransfers
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
                <CardContent>
                  {currentWithdrawals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No hay retiros registrados</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {currentWithdrawals
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
    </div>
  )
}

export default App
