import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, PencilSimpleLine, X, MagnifyingGlass, CheckCircle, XCircle, Warning, MapPin, Envelope, CalendarBlank, Building, Storefront } from '@phosphor-icons/react'
import { AgencyDialog } from '@/components/AgencyDialog'
import { Agency } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function ComercializadoraAgenciasPage() {
  const { id, comercializadoraId, subdistribuidorId } = useParams<{ id?: string; comercializadoraId?: string; subdistribuidorId?: string }>()
  const navigate = useNavigate()
  const {
    comercializadoras,
    subdistribuidores,
    agencies,
    agenciesLoading,
    updateUser,
    deleteUser,
    canViewModule,
    currentUser,
    createUser,
    taquillas
  } = useApp()
  
  // Si es un subdistribuidor viendo sus propias agencias
  const isSubdistribuidorSelf = currentUser?.userType === 'subdistribuidor' && !subdistribuidorId && !id && !comercializadoraId
  
  // Determine which ID to use based on the route
  const parentId = isSubdistribuidorSelf ? currentUser.id : (subdistribuidorId || id)
  const isSubdistribuidorView = !!subdistribuidorId || isSubdistribuidorSelf

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgency, setEditingAgency] = useState<Agency | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const comercializadora = isSubdistribuidorSelf 
    ? comercializadoras.find(c => c.id === currentUser.parentId)
    : comercializadoras.find(c => c.id === (comercializadoraId || id))
  
  const subdistribuidor = isSubdistribuidorView 
    ? (isSubdistribuidorSelf 
        ? subdistribuidores.find(s => s.id === currentUser.id)
        : subdistribuidores.find(s => s.id === subdistribuidorId)) 
    : null
  const filteredAgencies = agencies
    .filter(a => a.parentId === parentId)
    .filter(a => {
      const matchesSearch = search === '' ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.address && a.address.toLowerCase().includes(search.toLowerCase()))

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && a.isActive) ||
        (statusFilter === 'inactive' && !a.isActive)

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

  const allAgenciesOfParent = agencies.filter(a => a.parentId === parentId)
  const activeCount = allAgenciesOfParent.filter(a => a.isActive).length
  const inactiveCount = allAgenciesOfParent.filter(a => !a.isActive).length

  const getTaquillasCount = (agencyId: string) => {
    return taquillas?.filter(t => t.parentId === agencyId).length || 0
  }

  const handleEdit = (agency: Agency) => {
    setEditingAgency(agency)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingAgency(undefined)
    setDialogOpen(true)
  }

  const handleSave = async (agencyData: any) => {
    if (editingAgency) {
      const success = await updateUser(editingAgency.id, {
        name: agencyData.name,
        address: agencyData.address,
        parentId: agencyData.parentId || parentId,
        shareOnSales: agencyData.shareOnSales,
        shareOnProfits: agencyData.shareOnProfits,
        isActive: agencyData.isActive,
        // Incluir password solo si se proporcionó
        ...(agencyData.password ? { password: agencyData.password } : {})
      })
      if (success) {
        toast.success("Agencia actualizada exitosamente")
        setEditingAgency(undefined)
        setDialogOpen(false)
      } else {
        toast.error("Error al actualizar la agencia")
      }
      return success
    }

    if (!agencyData.userEmail || !agencyData.userPassword) {
      toast.error('Email y contraseña son requeridos')
      return false
    }

    if (!createUser) {
      toast.error('Sistema de usuarios no disponible')
      return false
    }

    const success = await createUser({
      name: agencyData.name,
      email: agencyData.userEmail,
      password: agencyData.userPassword,
      userType: 'agencia',
      isActive: true,
      roleIds: [],
      createdBy: currentUser?.id || 'system',
      address: agencyData.address || '',
      shareOnSales: agencyData.shareOnSales || 0,
      shareOnProfits: agencyData.shareOnProfits || 0,
      parentId: parentId
    })

    if (success) {
      setEditingAgency(undefined)
      setDialogOpen(false)
    }

    return success
  }

  const handleDeleteClick = (agency: Agency) => {
    setAgencyToDelete(agency)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!agencyToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteUser(agencyToDelete.id)
      if (success) {
        toast.success("Agencia eliminada exitosamente")
        setDeleteDialogOpen(false)
        setAgencyToDelete(null)
      } else {
        toast.error("Error al eliminar agencia")
      }
    } catch (error) {
      toast.error("Error al eliminar agencia")
    } finally {
      setIsDeleting(false)
    }
  }

  if ((!isSubdistribuidorView && !comercializadora) || (isSubdistribuidorView && !subdistribuidor)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate('/comercializadores')}
            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Comercializadores
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">No encontrado</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">{isSubdistribuidorView ? 'Subdistribuidor no encontrado' : 'Comercializadora no encontrada'}</p>
          <p className="text-muted-foreground">{isSubdistribuidorView ? 'El subdistribuidor solicitado no existe' : 'La comercializadora solicitada no existe'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      {!isSubdistribuidorSelf && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate('/comercializadores')}
            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Comercializadores
          </button>
          {isSubdistribuidorView && comercializadora && (
            <>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => navigate(`/comercializadores/${comercializadoraId}/subdistribuidores`)}
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {comercializadora.name}
              </button>
            </>
          )}
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">{isSubdistribuidorView ? subdistribuidor?.name : comercializadora.name}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agencias</h2>
          <p className="text-muted-foreground">
            Gestiona las agencias de {isSubdistribuidorView ? subdistribuidor?.name : comercializadora.name}
          </p>
        </div>
        {(canViewModule("comercializadoras") || currentUser?.userType === 'subdistribuidor') && (
          <Button onClick={handleCreate} className="gap-2 cursor-pointer">
            <Plus weight="bold" />
            Nueva Agencia
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o dirección..."
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
            Todas ({allAgenciesOfParent.length})
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
      {agenciesLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando agencias...</p>
        </div>
      ) : filteredAgencies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              {search ? 'No se encontraron agencias' : 'No hay agencias registradas'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? 'Intenta con otros criterios de búsqueda' : 'Crea tu primera agencia para comenzar'}
            </p>
            {!search && (canViewModule("comercializadoras") || currentUser?.userType === 'subdistribuidor') && (
              <Button onClick={handleCreate} variant="outline" className="gap-2 cursor-pointer">
                <Plus weight="bold" />
                Crear Primera Agencia
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgencies.map((agency) => (
            <Card
              key={agency.id}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
              style={{
                borderLeftColor: agency.isActive ? 'rgb(16 185 129)' : 'rgb(156 163 175)'
              }}
            >
              <CardContent className="px-4 py-2">
                {/* Header de la card */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      agency.isActive
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      <Building className="h-4 w-4 text-white" weight="fill" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        {agency.name}
                      </h3>
                      <Badge
                        variant={agency.isActive ? "default" : "secondary"}
                        className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${
                          agency.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : ''
                        }`}
                      >
                        {agency.isActive ? (
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
                      onClick={() => {
                        if (isSubdistribuidorView) {
                          navigate(`/comercializadores/${comercializadoraId}/subdistribuidores/${subdistribuidorId}/agencias/${agency.id}/taquillas`)
                        } else {
                          navigate(`/comercializadores/${id}/agencias/${agency.id}/taquillas`)
                        }
                      }}
                      title="Ver taquillas"
                    >
                      <Storefront className="h-4 w-4" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      onClick={() => handleEdit(agency)}
                      title="Editar"
                    >
                      <PencilSimpleLine className="h-4 w-4" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      onClick={() => handleDeleteClick(agency)}
                      title="Eliminar"
                    >
                      <X className="h-4 w-4" weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Info de la card */}
                <div className="space-y-1.5">
                  {agency.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Envelope className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{agency.email}</span>
                    </div>
                  )}

                  {agency.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{agency.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Creada el {format(new Date(agency.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>

                  {/* Estadísticas */}
                  <div className="pt-1.5 border-t mt-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-muted/50 rounded p-1 text-center">
                        <p className="text-sm font-bold text-primary">{agency.shareOnSales}%</p>
                        <p className="text-[10px] text-muted-foreground">Ventas</p>
                      </div>
                      <div className="bg-muted/50 rounded p-1 text-center">
                        <p className="text-sm font-bold text-primary">{agency.shareOnProfits}%</p>
                        <p className="text-[10px] text-muted-foreground">Participación</p>
                      </div>
                      <div className="bg-muted/50 rounded p-1 text-center">
                        <p className="text-sm font-bold text-primary">{getTaquillasCount(agency.id)}</p>
                        <p className="text-[10px] text-muted-foreground">Taquillas</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AgencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        comercializadoras={comercializadoras}
        agency={editingAgency}
        defaultParentId={parentId}
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
                <DialogTitle>Eliminar Agencia</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro que desea eliminar la agencia <span className="font-semibold text-foreground">"{agencyToDelete?.name}"</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Todas las taquillas asociadas a esta agencia quedarán sin asignar.
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
    </div>
  )
}
