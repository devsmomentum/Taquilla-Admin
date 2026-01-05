import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, PencilSimpleLine, X, MagnifyingGlass, CheckCircle, XCircle, Warning, MapPin, Envelope, CalendarBlank, Storefront, Phone, Buildings, Info, ChartBar } from '@phosphor-icons/react'
import { TaquillaDialog } from '@/components/TaquillaDialog'
import { TaquillaEditDialog } from '@/components/TaquillaEditDialog'
import { TaquillaStatsDialog } from '@/components/TaquillaStatsDialog'
import { Taquilla } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function AgenciaTaquillasPage() {
  const { id: comercializadoraId, agencyId, comercializadoraId: comercializadoraIdAlt, subdistribuidorId } = useParams<{ id?: string; agencyId?: string; comercializadoraId?: string; subdistribuidorId?: string }>()
  const navigate = useNavigate()
  const {
    comercializadoras,
    subdistribuidores,
    agencies,
    taquillas,
    taquillasLoading,
    createTaquilla,
    updateTaquilla,
    deleteTaquilla,
    canViewModule,
    currentUser
  } = useApp()
  
  // Si es una agencia viendo sus propias taquillas
  const isAgenciaSelf = currentUser?.userType === 'agencia' && !agencyId && !comercializadoraId

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTaquilla, setEditingTaquilla] = useState<Taquilla | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taquillaToDelete, setTaquillaToDelete] = useState<Taquilla | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statsDialogOpen, setStatsDialogOpen] = useState(false)
  const [statsTaquilla, setStatsTaquilla] = useState<Taquilla | null>(null)

  // Usar comercializadoraIdAlt si viene de la ruta con subdistribuidor
  const effectiveComercializadoraId = comercializadoraIdAlt || comercializadoraId
  const comercializadora = comercializadoras.find(c => c.id === effectiveComercializadoraId)
  const subdistribuidor = subdistribuidorId ? subdistribuidores.find(s => s.id === subdistribuidorId) : null
  const agency = isAgenciaSelf 
    ? agencies.find(a => a.id === currentUser.id)
    : agencies.find(a => a.id === agencyId)
  
  const effectiveAgencyId = isAgenciaSelf ? currentUser.id : agencyId
  
  // Obtener el subdistribuidor padre para agencias
  const parentSubdistribuidor = isAgenciaSelf && agency
    ? subdistribuidores.find(s => s.id === agency.parentId)
    : null

  const filteredTaquillas = (taquillas || [])
    .filter(t => t.parentId === effectiveAgencyId)
    .filter(t => {
      const matchesSearch = search === '' ||
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(search.toLowerCase())) ||
        (t.address && t.address.toLowerCase().includes(search.toLowerCase()))

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && t.isApproved) ||
        (statusFilter === 'inactive' && !t.isApproved)

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' }))

  const allTaquillasOfAgency = (taquillas || []).filter(t => t.parentId === agencyId)
  const activeCount = allTaquillasOfAgency.filter(t => t.isApproved).length
  const inactiveCount = allTaquillasOfAgency.filter(t => !t.isApproved).length

  const handleEdit = (taquilla: Taquilla) => {
    setEditingTaquilla(taquilla)
    setEditDialogOpen(true)
  }

  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  const handleCreateSave = async (taquillaData: any) => {
    const success = await createTaquilla({
      ...taquillaData,
      parentId: effectiveAgencyId,
      isApproved: true,
      createdAt: new Date().toISOString()
    })

    if (success) {
      toast.success("Taquilla creada exitosamente")
      setCreateDialogOpen(false)
    } else {
      toast.error("Error al crear la taquilla")
    }

    return success
  }

  const handleEditSave = async (id: string, updates: any) => {
    const success = await updateTaquilla(id, {
      ...updates,
      parentId: effectiveAgencyId
    })
    if (success) {
      toast.success("Taquilla actualizada exitosamente")
      setEditingTaquilla(undefined)
      setEditDialogOpen(false)
    } else {
      toast.error("Error al actualizar la taquilla")
    }
    return success
  }

  const handleDeleteClick = (taquilla: Taquilla) => {
    setTaquillaToDelete(taquilla)
    setDeleteDialogOpen(true)
  }

  const handleStatsClick = (taquilla: Taquilla) => {
    setStatsTaquilla(taquilla)
    setStatsDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!taquillaToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteTaquilla(taquillaToDelete.id)
      if (success) {
        toast.success("Taquilla eliminada exitosamente")
        setDeleteDialogOpen(false)
        setTaquillaToDelete(null)
      } else {
        toast.error("Error al eliminar taquilla")
      }
    } catch (error) {
      toast.error("Error al eliminar taquilla")
    } finally {
      setIsDeleting(false)
    }
  }

  // Si es agencia viendo sus propias taquillas y no se encuentra, mostrar error específico
  if (isAgenciaSelf && !agency) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">Error de configuración</p>
          <p className="text-muted-foreground">No se pudo cargar la información de la agencia</p>
        </div>
      </div>
    )
  }
  
  // Para otras vistas, verificar comercializadora y agencia
  if (!isAgenciaSelf && (!comercializadora || !agency)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate('/comercializadoras')}
            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Comercializadoras
          </button>
          <span className="text-muted-foreground">/</span>
          {comercializadora ? (
            <>
              <button
                onClick={() => navigate(`/comercializadoras/${comercializadoraId}/agencias`)}
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {comercializadora.name}
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground">No encontrada</span>
            </>
          ) : (
            <span className="font-medium text-foreground">No encontrada</span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">
            {!comercializadora ? 'Comercializadora no encontrada' : 'Agencia no encontrada'}
          </p>
          <p className="text-muted-foreground">El recurso solicitado no existe</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb - Solo visible para admins y comercializadoras */}
      {!isAgenciaSelf && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate('/comercializadoras')}
            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Comercializadoras
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={() => navigate(`/comercializadoras/${effectiveComercializadoraId}/${subdistribuidor ? 'subdistribuidores' : 'agencias'}`)}
            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {comercializadora.name}
          </button>
          {subdistribuidor && (
            <>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => navigate(`/comercializadoras/${effectiveComercializadoraId}/subdistribuidores/${subdistribuidorId}/agencias`)}
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {subdistribuidor.name}
              </button>
            </>
          )}
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">{agency.name}</span>
        </div>
      )}

      {/* Info de Subdistribuidor padre - Solo visible para agencias */}
      {isAgenciaSelf && agency && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Buildings className="h-5 w-5 text-white" weight="fill" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Subdistribuidor</p>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">{parentSubdistribuidor?.name || 'Subdistribuidor no encontrado'}</p>
              </div>
              <Badge variant="outline" className="bg-white/50 dark:bg-black/20">
                Tu organización
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {currentUser?.userType === 'agencia' ? 'Mis Taquillas' : 'Taquillas'}
          </h2>
          <p className="text-muted-foreground">
            {currentUser?.userType === 'agencia'
              ? `Gestiona las taquillas de tu agencia (${agency.name})`
              : `Gestiona las taquillas de ${agency.name}`
            }
          </p>
        </div>
        {(canViewModule("comercializadoras") || currentUser?.userType === 'agencia') && (
          <Button onClick={handleCreate} className="gap-2 cursor-pointer">
            <Plus weight="bold" />
            Nueva Taquilla
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, email o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="cursor-pointer"
          >
            Todas ({allTaquillasOfAgency.length})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className={`cursor-pointer ${statusFilter === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            Activas ({activeCount})
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
            className={`cursor-pointer ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            Inactivas ({inactiveCount})
          </Button>
        </div>
      </div>

      {/* Content */}
      {taquillasLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando taquillas...</p>
        </div>
      ) : filteredTaquillas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Storefront className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              {search ? 'No se encontraron taquillas' : 'No hay taquillas registradas'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? 'Intenta con otros criterios de búsqueda' : 'Crea tu primera taquilla para comenzar'}
            </p>
            {!search && (canViewModule("comercializadoras") || currentUser?.userType === 'agencia') && (
              <Button onClick={handleCreate} variant="outline" className="gap-2 cursor-pointer">
                <Plus weight="bold" />
                Crear Primera Taquilla
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredTaquillas.map((taquilla) => (
            <Card
              key={taquilla.id}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
              style={{
                borderLeftColor: taquilla.isApproved ? 'rgb(16 185 129)' : 'rgb(156 163 175)'
              }}
            >
              <CardContent className="px-4 py-2">
                {/* Header de la card */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      taquilla.isApproved
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      <Storefront className="h-4 w-4 text-white" weight="fill" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        {taquilla.fullName}
                      </h3>
                      <Badge
                        variant={taquilla.isApproved ? "default" : "secondary"}
                        className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${
                          taquilla.isApproved
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : ''
                        }`}
                      >
                        {taquilla.isApproved ? (
                          <><CheckCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Activa</>
                        ) : (
                          <><XCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Inactiva</>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => handleStatsClick(taquilla)}
                      title="Ver Reportes"
                    >
                      <ChartBar className="h-4 w-4" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      onClick={() => handleEdit(taquilla)}
                      title="Editar"
                    >
                      <PencilSimpleLine className="h-4 w-4" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      onClick={() => handleDeleteClick(taquilla)}
                      title="Eliminar"
                    >
                      <X className="h-4 w-4" weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Info de la card */}
                <div className="space-y-1.5">
                  {taquilla.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Envelope className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{taquilla.email}</span>
                    </div>
                  )}

                  {taquilla.telefono && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{taquilla.telefono}</span>
                    </div>
                  )}

                  {taquilla.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{taquilla.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Creada el {format(new Date(taquilla.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>

                  {/* Estadísticas */}
                  {(taquilla.shareOnSales !== undefined || taquilla.shareOnProfits !== undefined) && (
                    <div className="pt-1.5 border-t mt-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-muted/50 rounded p-1 text-center">
                          <p className="text-sm font-bold text-primary">{taquilla.shareOnSales || 0}%</p>
                          <p className="text-[10px] text-muted-foreground">Ventas</p>
                        </div>
                        <div className="bg-muted/50 rounded p-1 text-center">
                          <p className="text-sm font-bold text-primary">{taquilla.shareOnProfits || 0}%</p>
                          <p className="text-[10px] text-muted-foreground">Participación</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo para crear taquilla */}
      <TaquillaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateSave}
        agencies={isAgenciaSelf ? [agency].filter(Boolean) : 
                 subdistribuidorId ? agencies.filter(a => a.parentId === subdistribuidorId) :
                 agencies.filter(a => a.parentId === effectiveComercializadoraId)}
        defaultAgencyId={effectiveAgencyId}
      />

      {/* Diálogo para editar taquilla */}
      <TaquillaEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditSave}
        taquilla={editingTaquilla}
        agencies={isAgenciaSelf ? [agency].filter(Boolean) : 
                 subdistribuidorId ? agencies.filter(a => a.parentId === subdistribuidorId) :
                 agencies.filter(a => a.parentId === effectiveComercializadoraId)}
      />

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Warning className="h-6 w-6 text-destructive" weight="fill" />
              </div>
              <div>
                <DialogTitle>Eliminar Taquilla</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro que desea eliminar la taquilla <span className="font-semibold text-foreground">"{taquillaToDelete?.fullName}"</span>?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de estadísticas de taquilla */}
      <TaquillaStatsDialog
        open={statsDialogOpen}
        onOpenChange={setStatsDialogOpen}
        taquilla={statsTaquilla}
      />
    </div>
  )
}
