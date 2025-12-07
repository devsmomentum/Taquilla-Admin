import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, MagnifyingGlass, Pencil, Trash, Building, Warning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { AgencyDialog } from './AgencyDialog'
import type { Agency, Comercializadora } from '@/lib/types'
import { toast } from 'sonner'
import type { SupabaseUser } from '@/hooks/use-supabase-auth'
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    comercializadoras: Comercializadora[]
    agencies: Agency[]
    isLoading: boolean
    onCreate: (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance'>) => Promise<boolean>
    onUpdate: (id: string, updates: Partial<Agency>) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
    canCreate?: boolean
    currentUser?: SupabaseUser | null
    createUser?: (userData: any) => Promise<any>
}

export function AgenciesTab({ comercializadoras, agencies, isLoading, onCreate, onUpdate, onDelete, canCreate = true, currentUser, createUser }: Props) {
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<Agency | undefined>()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const defaultParentId = useMemo(() => {
        // Si el usuario actual es comercializadora, usar su ID como parent
        if (currentUser?.userType === 'comercializadora') {
            return currentUser.id
        }

        // Si tiene parentId, usarlo
        if (currentUser?.parentId) {
            return currentUser.parentId
        }

        return undefined
    }, [currentUser])

    const safeComercializadoras = comercializadoras || []
    const safeAgencies = agencies || []

    const filteredAgencies = safeAgencies.filter(a => {
        const matchesSearch = search === '' ||
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.address.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && a.isActive) ||
            (statusFilter === 'inactive' && !a.isActive)

        return matchesSearch && matchesStatus
    })

    const handleSave = async (agencyData: any) => {
        if (editingAgency) {
            const success = await onUpdate(editingAgency.id, agencyData)
            if (success) {
                toast.success("Agencia actualizada exitosamente")
                setEditingAgency(undefined)
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

        const agencyParentId = agencyData.parentId || defaultParentId

        if (!agencyParentId) {
            toast.error('Debe seleccionar una comercializadora')
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
            parentId: agencyParentId
        })

        if (success) {
            setEditingAgency(undefined)
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
            const success = await onDelete(agencyToDelete.id)
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Agencias</CardTitle>
                            <CardDescription>
                                Gestiona las agencias que coordinan taquillas
                            </CardDescription>
                        </div>
                        {canCreate && (
                            <Button onClick={() => { setEditingAgency(undefined); setDialogOpen(true) }}>
                                <Plus className="mr-2" weight="bold" />
                                Nueva Agencia
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Barra de búsqueda */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o dirección..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Estadísticas - Filtros clickeables */}
                        <div className="flex gap-2">
                            <Button
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('all')}
                                className="h-8"
                            >
                                Total: {safeAgencies.length}
                            </Button>
                            <Button
                                variant={statusFilter === 'active' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('active')}
                                className={`h-8 ${statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
                            >
                                Activas: {safeAgencies.filter(a => a.isActive).length}
                            </Button>
                            <Button
                                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('inactive')}
                                className={`h-8 ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-600 hover:bg-red-50'}`}
                            >
                                Inactivas: {safeAgencies.filter(a => !a.isActive).length}
                            </Button>
                        </div>

                        {/* Tabla */}
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-sm text-muted-foreground">Cargando agencias...</p>
                            </div>
                        ) : filteredAgencies.length === 0 ? (
                            <div className="text-center py-8">
                                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    {search || statusFilter !== 'all' ? 'No se encontraron agencias' : 'No hay agencias registradas'}
                                </p>
                                {!search && statusFilter === 'all' && canCreate && (
                                    <Button onClick={() => setDialogOpen(true)} variant="outline" className="mt-4">
                                        <Plus className="mr-2" weight="bold" />
                                        Crear Primera Agencia
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Dirección</TableHead>
                                            <TableHead>Comercializadora</TableHead>
                                            <TableHead>Participación</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Creada</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAgencies.map((agency) => {
                                            const comercializadora = safeComercializadoras.find(c => c.id === agency.parentId)
                                            return (
                                                <TableRow key={agency.id}>
                                                    <TableCell>
                                                        <span className="font-medium">{agency.name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {agency.address || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {comercializadora?.name || 'Desconocida'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="w-fit">
                                                                Ventas: {agency.shareOnSales}%
                                                            </Badge>
                                                            <Badge variant="outline" className="w-fit">
                                                                Participación: {agency.shareOnProfits}%
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {agency.isActive ? (
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
                                                        {agency.createdAt ? format(new Date(agency.createdAt), "dd MMM yyyy", { locale: es }) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => { setEditingAgency(agency); setDialogOpen(true) }}
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AgencyDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                comercializadoras={safeComercializadoras}
                agency={editingAgency}
                defaultParentId={defaultParentId}
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
