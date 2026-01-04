import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, PencilSimpleLine, X, MagnifyingGlass, CheckCircle, XCircle, Warning, Envelope, CalendarBlank, Buildings, Storefront } from "@phosphor-icons/react"
import { Comercializadora, User, Agency } from "@/lib/types"
import { ComercializadoraDialog } from "./ComercializadoraDialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface ComercializadorasTabProps {
    comercializadoras: (Comercializadora & { parentId?: string })[]
    agencies: Agency[]
    isLoading: boolean
    onCreate: (comercializadora: Omit<Comercializadora, 'id' | 'createdAt'>) => Promise<boolean>
    onUpdate: (id: string, updates: Partial<Omit<Comercializadora, 'id' | 'createdAt'> & { parentId?: string }>) => Promise<boolean>
    onDelete: (id: string) => Promise<void>
    currentUserId?: string
    createUser?: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>
    isSuperAdmin?: boolean
    users?: User[]
}

export function ComercializadorasTab({
    comercializadoras,
    agencies,
    isLoading,
    onCreate,
    onUpdate,
    onDelete,
    currentUserId,
    createUser,
    isSuperAdmin = false,
    users = []
}: ComercializadorasTabProps) {
    const navigate = useNavigate()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingComercializadora, setEditingComercializadora] = useState<(Comercializadora & { parentId?: string }) | undefined>()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [comercializadoraToDelete, setComercializadoraToDelete] = useState<Comercializadora | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const filteredComercializadoras = comercializadoras
        .filter(c => {
            const matchesSearch = search === '' ||
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.email.toLowerCase().includes(search.toLowerCase())

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && c.isActive) ||
                (statusFilter === 'inactive' && !c.isActive)

            return matchesSearch && matchesStatus
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    const handleCreate = () => {
        setEditingComercializadora(undefined)
        setDialogOpen(true)
    }

    const handleEdit = (comercializadora: Comercializadora) => {
        setEditingComercializadora(comercializadora)
        setDialogOpen(true)
    }

    const handleSave = async (data: Omit<Comercializadora, 'id' | 'createdAt'>) => {
        if (editingComercializadora) {
            return await onUpdate(editingComercializadora.id, data)
        } else {
            return await onCreate(data)
        }
    }

    const handleDeleteClick = (comercializadora: Comercializadora) => {
        setComercializadoraToDelete(comercializadora)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!comercializadoraToDelete) return

        setIsDeleting(true)
        try {
            await onDelete(comercializadoraToDelete.id)
            toast.success("Comercializadora eliminada exitosamente")
            setDeleteDialogOpen(false)
            setComercializadoraToDelete(null)
        } catch (error) {
            toast.error("Error al eliminar comercializadora")
        } finally {
            setIsDeleting(false)
        }
    }

    const activeCount = comercializadoras.filter(c => c.isActive).length
    const inactiveCount = comercializadoras.filter(c => !c.isActive).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Subdistribuidores</h2>
                    <p className="text-muted-foreground">
                        Gestiona los subdistribuidores que coordinan agencias
                    </p>
                </div>
                <Button onClick={handleCreate} className="gap-2 cursor-pointer">
                    <Plus weight="bold" />
                    Nuevo Subdistribuidor
                </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Buscar por nombre o email..."
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
                        Todas ({comercializadoras.length})
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
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Cargando comercializadoras...</p>
                </div>
            ) : filteredComercializadoras.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Buildings className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium">
                            {search ? 'No se encontraron subdistribuidores' : 'No hay subdistribuidores registrados'}
                        </p>
                        <p className="text-muted-foreground text-sm mb-4">
                            {search ? 'Intenta con otros criterios de búsqueda' : 'Crea tu primer subdistribuidor para comenzar'}
                        </p>
                        {!search && (
                            <Button onClick={handleCreate} variant="outline" className="gap-2 cursor-pointer">
                                <Plus weight="bold" />
                                Crear Primer Subdistribuidor
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredComercializadoras.map((comercializadora) => (
                        <Card
                            key={comercializadora.id}
                            className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
                            style={{
                                borderLeftColor: comercializadora.isActive ? 'rgb(16 185 129)' : 'rgb(156 163 175)'
                            }}
                        >
                            <CardContent className="px-4 py-2">
                                {/* Header de la card */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                                            comercializadora.isActive
                                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                        }`}>
                                            <Buildings className="h-4 w-4 text-white" weight="fill" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm leading-tight">
                                                {comercializadora.name}
                                            </h3>
                                            <Badge
                                                variant={comercializadora.isActive ? "default" : "secondary"}
                                                className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${
                                                    comercializadora.isActive
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                        : ''
                                                }`}
                                            >
                                                {comercializadora.isActive ? (
                                                    <><CheckCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Activa</>
                                                ) : (
                                                    <><XCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Inactiva</>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/comercializadoras/${comercializadora.id}/agencias`)}
                                            title="Ver agencias"
                                        >
                                            <Storefront className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                            onClick={() => handleEdit(comercializadora)}
                                            title="Editar"
                                        >
                                            <PencilSimpleLine className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                            onClick={() => handleDeleteClick(comercializadora)}
                                            title="Eliminar"
                                        >
                                            <X className="h-4 w-4" weight="bold" />
                                        </button>
                                    </div>
                                </div>

                                {/* Info de la card */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Envelope className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{comercializadora.email}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            Creada el {format(new Date(comercializadora.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                                        </span>
                                    </div>

                                    {/* Estadísticas */}
                                    <div className="pt-1.5 border-t mt-2">
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <div className="bg-muted/50 rounded p-1 text-center">
                                                <p className="text-sm font-bold text-primary">{comercializadora.shareOnSales}%</p>
                                                <p className="text-[10px] text-muted-foreground">Ventas</p>
                                            </div>
                                            <div className="bg-muted/50 rounded p-1 text-center">
                                                <p className="text-sm font-bold text-primary">{comercializadora.shareOnProfits}%</p>
                                                <p className="text-[10px] text-muted-foreground">Participación</p>
                                            </div>
                                            <div className="bg-muted/50 rounded p-1 text-center">
                                                <p className="text-sm font-bold text-primary">{agencies.filter(a => a.parentId === comercializadora.id).length}</p>
                                                <p className="text-[10px] text-muted-foreground">Agencias</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ComercializadoraDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                comercializadora={editingComercializadora}
                currentUserId={currentUserId}
                createUser={createUser}
                isSuperAdmin={isSuperAdmin}
                users={users}
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
                                <DialogTitle>Eliminar Comercializadora</DialogTitle>
                                <DialogDescription>
                                    Esta acción no se puede deshacer
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            ¿Está seguro que desea eliminar la comercializadora <span className="font-semibold text-foreground">"{comercializadoraToDelete?.name}"</span>?
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Todas las agencias asociadas a esta comercializadora quedarán sin asignar.
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
