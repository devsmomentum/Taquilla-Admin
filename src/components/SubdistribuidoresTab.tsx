import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, PencilSimpleLine, X, MagnifyingGlass, CheckCircle, XCircle, Warning, Envelope, CalendarBlank, UserCircle, Storefront } from "@phosphor-icons/react"
import { Subdistribuidor, User } from "@/lib/types"
import { SubdistribuidorDialog } from "./SubdistribuidorDialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface SubdistribuidoresTabProps {
    subdistribuidores: (Subdistribuidor & { parentId?: string })[]
    isLoading: boolean
    onCreate: (subdistribuidor: Omit<Subdistribuidor, 'id' | 'createdAt'>) => Promise<boolean>
    onUpdate: (id: string, updates: Partial<Omit<Subdistribuidor, 'id' | 'createdAt'> & { parentId?: string }>) => Promise<boolean>
    onDelete: (id: string) => Promise<void>
    currentUserId?: string
    createUser?: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>
    comercializadoraId: string
}

export function SubdistribuidoresTab({
    subdistribuidores,
    isLoading,
    onCreate,
    onUpdate,
    onDelete,
    currentUserId,
    createUser,
    comercializadoraId
}: SubdistribuidoresTabProps) {
    const navigate = useNavigate()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingSubdistribuidor, setEditingSubdistribuidor] = useState<(Subdistribuidor & { parentId?: string }) | undefined>()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [subdistribuidorToDelete, setSubdistribuidorToDelete] = useState<Subdistribuidor | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const filteredSubdistribuidores = subdistribuidores
        .filter(s => {
            const matchesSearch = search === '' ||
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.email.toLowerCase().includes(search.toLowerCase())

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && s.isActive) ||
                (statusFilter === 'inactive' && !s.isActive)

            return matchesSearch && matchesStatus
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    const handleCreate = () => {
        setEditingSubdistribuidor(undefined)
        setDialogOpen(true)
    }

    const handleEdit = (subdistribuidor: Subdistribuidor) => {
        setEditingSubdistribuidor(subdistribuidor)
        setDialogOpen(true)
    }

    const handleSave = async (data: Omit<Subdistribuidor, 'id' | 'createdAt'>) => {
        if (editingSubdistribuidor) {
            return await onUpdate(editingSubdistribuidor.id, data)
        } else {
            return await onCreate(data)
        }
    }

    const handleDeleteClick = (subdistribuidor: Subdistribuidor) => {
        setSubdistribuidorToDelete(subdistribuidor)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!subdistribuidorToDelete) return

        setIsDeleting(true)
        try {
            await onDelete(subdistribuidorToDelete.id)
            toast.success("Subdistribuidor eliminado exitosamente")
            setDeleteDialogOpen(false)
            setSubdistribuidorToDelete(null)
        } catch (error) {
            toast.error("Error al eliminar subdistribuidor")
        } finally {
            setIsDeleting(false)
        }
    }

    const activeCount = subdistribuidores.filter(s => s.isActive).length
    const inactiveCount = subdistribuidores.filter(s => !s.isActive).length

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
                        Todos ({subdistribuidores.length})
                    </Button>
                    <Button
                        variant={statusFilter === 'active' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('active')}
                        className={`cursor-pointer ${statusFilter === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    >
                        Activos ({activeCount})
                    </Button>
                    <Button
                        variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('inactive')}
                        className={`cursor-pointer ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                        Inactivos ({inactiveCount})
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Cargando subdistribuidores...</p>
                </div>
            ) : filteredSubdistribuidores.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <UserCircle className="h-6 w-6 text-muted-foreground" />
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
                    {filteredSubdistribuidores.map((subdistribuidor) => (
                        <Card
                            key={subdistribuidor.id}
                            className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
                            style={{
                                borderLeftColor: subdistribuidor.isActive ? 'rgb(16 185 129)' : 'rgb(156 163 175)'
                            }}
                        >
                            <CardContent className="px-4 py-2">
                                {/* Header de la card */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                                            subdistribuidor.isActive
                                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                        }`}>
                                            <UserCircle className="h-4 w-4 text-white" weight="fill" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm leading-tight">
                                                {subdistribuidor.name}
                                            </h3>
                                            <Badge
                                                variant={subdistribuidor.isActive ? "default" : "secondary"}
                                                className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${
                                                    subdistribuidor.isActive
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                        : ''
                                                }`}
                                            >
                                                {subdistribuidor.isActive ? (
                                                    <><CheckCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Activo</>
                                                ) : (
                                                    <><XCircle weight="fill" className="mr-0.5 h-2.5 w-2.5" /> Inactivo</>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/comercializadores/${comercializadoraId}/subdistribuidores/${subdistribuidor.userId}/agencias`)}
                                            title="Ver agencias"
                                        >
                                            <Storefront className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                            onClick={() => handleEdit(subdistribuidor)}
                                            title="Editar"
                                        >
                                            <PencilSimpleLine className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                            onClick={() => handleDeleteClick(subdistribuidor)}
                                            title="Eliminar"
                                        >
                                            <X className="h-4 w-4" weight="bold" />
                                        </button>
                                    </div>
                                </div>

                                {/* Email y creación */}
                                <div className="space-y-1.5 mt-3 text-xs">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Envelope className="h-3.5 w-3.5" />
                                        <span className="truncate">{subdistribuidor.email}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <CalendarBlank className="h-3.5 w-3.5" />
                                        <span>
                                            Creado {format(new Date(subdistribuidor.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                                        </span>
                                    </div>
                                </div>

                                {/* Porcentajes */}
                                <div className="mt-3 pt-3 border-t border-muted space-y-2">
                                    {subdistribuidor.shareOnSales > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Participación en ventas</span>
                                            <span className="text-xs font-medium">{subdistribuidor.shareOnSales}%</span>
                                        </div>
                                    )}
                                    {subdistribuidor.shareOnProfits > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Participación en ganancias</span>
                                            <span className="text-xs font-medium">{subdistribuidor.shareOnProfits}%</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialogs */}
            <SubdistribuidorDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                subdistribuidor={editingSubdistribuidor}
                onSave={handleSave}
                currentUserId={currentUserId}
                createUser={createUser}
            />

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar eliminación</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar el subdistribuidor "{subdistribuidorToDelete?.name}"?
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex gap-2">
                            <Warning className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Al eliminar este subdistribuidor, también se eliminarán todas las agencias y taquillas asociadas.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}