import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LotteryDialog } from '@/components/LotteryDialog'
import { useApp } from '@/contexts/AppContext'
import { filterLotteries } from '@/lib/filter-utils'
import { Lottery } from '@/lib/types'
import { toast } from 'sonner'
import { Plus, Calendar, Pencil, Trash, MagnifyingGlass } from '@phosphor-icons/react'

export function LotteriesPage() {
  const {
    lotteries,
    loadLotteries,
    createLottery,
    updateLottery,
    deleteLottery
  } = useApp()

  const [lotteryDialogOpen, setLotteryDialogOpen] = useState(false)
  const [editingLottery, setEditingLottery] = useState<Lottery | undefined>()
  const [deleteLotteryDialogOpen, setDeleteLotteryDialogOpen] = useState(false)
  const [lotteryToDelete, setLotteryToDelete] = useState<string | null>(null)
  const [lotterySearch, setLotterySearch] = useState('')
  const [lotteryFilters, setLotteryFilters] = useState<{ isActive?: boolean }>({})
  const [isDeleting, setIsDeleting] = useState(false)

  // Filtrar y ordenar alfabéticamente por nombre
  const filteredLotteries = filterLotteries(lotteries, lotterySearch, lotteryFilters)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

  const handleSaveLottery = async (lottery: Lottery) => {
    const exists = lotteries.find((l) => l.id === lottery.id)

    let success: boolean
    if (exists) {
      success = await updateLottery(lottery.id, lottery)
    } else {
      success = await createLottery(lottery)
    }

    if (!success) {
      throw new Error("No se pudo guardar la lotería. Revisa la consola para más detalles.")
    }

    // Recargar loterías para asegurar que los prizes estén actualizados
    await loadLotteries()

    setEditingLottery(undefined)
    setLotteryDialogOpen(false)
  }

  const handleEditLottery = (lottery: Lottery) => {
    setEditingLottery(lottery)
    setLotteryDialogOpen(true)
  }

  const handleDeleteLottery = (id: string) => {
    setLotteryToDelete(id)
    setDeleteLotteryDialogOpen(true)
  }

  const confirmDeleteLottery = async () => {
    if (!lotteryToDelete) return

    setIsDeleting(true)
    try {
      await deleteLottery(lotteryToDelete)
      toast.success('Lotería eliminada exitosamente')
      setDeleteLotteryDialogOpen(false)
      setLotteryToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar lotería')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
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
              value={lotteryFilters.isActive === undefined ? 'all' : lotteryFilters.isActive.toString()}
              onValueChange={(value) =>
                setLotteryFilters((f) => ({
                  ...f,
                  isActive: value === 'all' ? undefined : value === 'true',
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
              {lotteries.length === 0 ? 'No hay sorteos creados' : 'No se encontraron sorteos'}
            </p>
            <p className="text-muted-foreground mb-4">
              {lotteries.length === 0
                ? 'Cree su primera lotería para empezar'
                : 'Intente con otros criterios de búsqueda'}
            </p>
            {lotteries.length === 0 && (
              <Button onClick={() => setLotteryDialogOpen(true)}>
                <Plus className="mr-2" />
                Crear Primer Sorteo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLotteries.map((lottery) => (
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
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant={lottery.isActive ? 'default' : 'secondary'}>
                    {lottery.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Badge variant={lottery.playsTomorrow ? 'outline' : 'secondary'}>
                    {lottery.playsTomorrow ? 'Juega Mañana' : 'No Juega'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LotteryDialog
        open={lotteryDialogOpen}
        onOpenChange={(open) => {
          setLotteryDialogOpen(open)
          if (!open) setEditingLottery(undefined)
        }}
        lottery={editingLottery}
        onSave={handleSaveLottery}
      />

      <Dialog open={deleteLotteryDialogOpen} onOpenChange={setDeleteLotteryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Lotería
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar esta lotería? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteLotteryDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLottery} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
