import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Trash, MagnifyingGlass, CheckCircle, XCircle, Star, Warning } from "@phosphor-icons/react"
import { Comercializadora, User } from "@/lib/types"
import { ComercializadoraDialog } from "./ComercializadoraDialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface ComercializadorasTabProps {
    comercializadoras: Comercializadora[]
    isLoading: boolean
    onCreate: (comercializadora: Omit<Comercializadora, 'id' | 'createdAt'>) => Promise<boolean>
    onUpdate: (id: string, updates: Partial<Omit<Comercializadora, 'id' | 'createdAt'>>) => Promise<boolean>
    onDelete: (id: string) => Promise<void>
    onSetDefault: (id: string) => Promise<boolean>
    currentUserId?: string
    createUser?: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>
}

export function ComercializadorasTab({
    comercializadoras,
    isLoading,
    onCreate,
    onUpdate,
    onDelete,
    onSetDefault,
    currentUserId,
    createUser
}: ComercializadorasTabProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingComercializadora, setEditingComercializadora] = useState<Comercializadora | undefined>()
    const [search, setSearch] = useState('')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [comercializadoraToDelete, setComercializadoraToDelete] = useState<Comercializadora | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const filteredComercializadoras = comercializadoras.filter(c =>
        search === '' ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    )

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

    const handleSetDefault = async (id: string) => {
        await onSetDefault(id)
    }

    const handleDeleteClick = (comercializadora: Comercializadora) => {
        if (comercializadora.isDefault) {
            toast.error("No se puede eliminar la comercializadora predeterminada")
            return
        }
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Comercializadoras</CardTitle>
                            <CardDescription>
                                Gestiona las comercializadoras que coordinan agencias
                            </CardDescription>
                        </div>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2" weight="bold" />
                            Nueva Comercializadora
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Barra de búsqueda */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Estadísticas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Total</CardDescription>
                                    <CardTitle className="text-3xl">{comercializadoras.length}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Activas</CardDescription>
                                    <CardTitle className="text-3xl text-green-600">
                                        {comercializadoras.filter(c => c.isActive).length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Inactivas</CardDescription>
                                    <CardTitle className="text-3xl text-red-600">
                                        {comercializadoras.filter(c => !c.isActive).length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Tabla */}
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-sm text-muted-foreground">Cargando comercializadoras...</p>
                            </div>
                        ) : filteredComercializadoras.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    {search ? 'No se encontraron comercializadoras' : 'No hay comercializadoras registradas'}
                                </p>
                                {!search && (
                                    <Button onClick={handleCreate} variant="outline" className="mt-4">
                                        <Plus className="mr-2" weight="bold" />
                                        Crear Primera Comercializadora
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Participación</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Creada</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredComercializadoras.map((comercializadora) => (
                                            <TableRow key={comercializadora.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{comercializadora.name}</span>
                                                        {comercializadora.isDefault && (
                                                            <Badge variant="default" className="gap-1">
                                                                <Star weight="fill" size={12} />
                                                                Por Defecto
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {comercializadora.email}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant="outline" className="w-fit">
                                                            Ventas: {comercializadora.shareOnSales}%
                                                        </Badge>
                                                        <Badge variant="outline" className="w-fit">
                                                            Ganancias: {comercializadora.shareOnProfits}%
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {comercializadora.isActive ? (
                                                        <Badge variant="default" className="gap-1 bg-green-600">
                                                            <CheckCircle weight="fill" size={14} />
                                                            Activa
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <XCircle weight="fill" size={14} />
                                                            Inactiva
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(comercializadora.createdAt), "dd MMM yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {!comercializadora.isDefault && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleSetDefault(comercializadora.id)}
                                                                title="Marcar como predeterminada"
                                                            >
                                                                <Star size={16} />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(comercializadora)}
                                                        >
                                                            <Pencil size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteClick(comercializadora)}
                                                            disabled={comercializadora.isDefault}
                                                            title={comercializadora.isDefault ? 'No se puede eliminar la predeterminada' : 'Eliminar'}
                                                        >
                                                            <Trash size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <ComercializadoraDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                comercializadora={editingComercializadora}
                currentUserId={currentUserId}
                createUser={createUser}
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
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash className="mr-2 h-4 w-4" />
                                    Eliminar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

