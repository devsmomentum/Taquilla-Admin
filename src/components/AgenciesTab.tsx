import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, MagnifyingGlass, Pencil, Trash, Building, Warning } from '@phosphor-icons/react'
import { AgencyDialog } from './AgencyDialog'
import type { Agency, Comercializadora } from '@/lib/types'
import { toast } from 'sonner'
import type { SupabaseUser } from '@/hooks/use-supabase-auth'
import { formatCurrency } from "@/lib/pot-utils"

interface Props {
    comercializadoras: Comercializadora[]
    agencies: Agency[]
    isLoading: boolean
    onCreate: (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>) => Promise<boolean>
    onUpdate: (id: string, updates: Partial<Agency>) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
    canCreate?: boolean
    currentUser?: SupabaseUser | null
    createUser?: (userData: any) => Promise<any>
}

export function AgenciesTab({ comercializadoras, agencies, isLoading, onCreate, onUpdate, onDelete, canCreate = true, currentUser, createUser }: Props) {
    const [search, setSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<Agency | undefined>()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Calcular defaultCommercializerId: primero desde currentUser, luego desde localStorage
    const defaultCommercializerId = useMemo(() => {
        // Si ya está en currentUser, usar ese
        if (currentUser?.comercializadoraId) {
            return currentUser.comercializadoraId
        }

        // Si es comercializadora pero no tiene el ID, buscar en localStorage
        if (currentUser?.userType === 'comercializadora') {
            try {
                const localComs = JSON.parse(localStorage.getItem('comercializadoras_backup') || '[]')

                // Si solo hay una, usar esa
                if (localComs.length === 1) {
                    console.log('✅ Auto-seleccionando única comercializadora:', localComs[0].name)
                    return localComs[0].id
                }

                // Buscar por email
                const myCom = localComs.find((c: any) => c.email === currentUser.email)
                if (myCom) {
                    console.log('✅ Comercializadora encontrada por email:', myCom.name)
                    return myCom.id
                }
            } catch (e) {
                console.warn('Error buscando comercializadora:', e)
            }
        }

        return undefined
    }, [currentUser])

    const safeComercializadoras = comercializadoras || []
    const safeAgencies = agencies || []

    const filteredAgencies = safeAgencies.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.address.toLowerCase().includes(search.toLowerCase())
    )


    const handleSave = async (agencyData: any) => {
        // Si estamos editando, actualizar
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

        // CREAR AGENCIA = CREAR USUARIO con userType='agencia'
        if (!agencyData.userEmail || !agencyData.userPassword) {
            toast.error('Email y contraseña son requeridos')
            return false
        }

        if (!createUser) {
            toast.error('Sistema de usuarios no disponible')
            return false
        }

        // Determinar commercializerId: puede venir del form o del usuario actual
        const commercializerId = agencyData.commercializerId || defaultCommercializerId

        if (!commercializerId) {
            toast.error('Debe seleccionar una comercializadora')
            return false
        }

        console.log('🔐 Creando usuario tipo agencia:', agencyData.userEmail)
        console.log('📍 Comercializadora asignada:', commercializerId)

        // Crear usuario en auth + users con userType='agencia'
        const success = await createUser({
            name: agencyData.name,
            email: agencyData.userEmail,
            password: agencyData.userPassword,
            userType: 'agencia',
            isActive: true,
            roleIds: [],
            createdBy: currentUser?.id || 'system',
            // Campos específicos de agencia
            address: agencyData.address || '',
            shareOnSales: agencyData.shareOnSales || 0,
            shareOnProfits: agencyData.shareOnProfits || 0,
            // Para RLS jerárquico - MUY IMPORTANTE
            comercializadoraId: commercializerId
        })

        if (success) {
            console.log('✅ Usuario agencia creado exitosamente')
            // El toast de éxito ya lo muestra createUser
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
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-semibold">Gestión de Agencias</h2>
                    <p className="text-muted-foreground text-sm">Administre los grupos financieros y sus límites</p>
                </div>
                {canCreate && (
                    <Button onClick={() => { setEditingAgency(undefined); setDialogOpen(true) }} className="w-full sm:w-auto">
                        <Plus className="mr-2" />
                        Nueva Agencia
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar agencias..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredAgencies.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Building className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No hay agencias registradas</p>
                        <p className="text-muted-foreground mb-4">Comience creando la primera agencia para agrupar sus taquillas</p>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2" />
                            Crear Primera Agencia
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAgencies.map((agency) => {
                        const comercializadora = safeComercializadoras.find(c => c.id === agency.commercializerId)
                        return (
                            <Card key={agency.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2">
                                                {agency.name}
                                                <Badge variant={agency.isActive ? "default" : "secondary"}>
                                                    {agency.isActive ? "Activa" : "Inactiva"}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription>{agency.address}</CardDescription>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingAgency(agency); setDialogOpen(true) }}>
                                                <Pencil />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(agency)}>
                                                <Trash />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block">Comercializadora</span>
                                            <span className="font-medium">{comercializadora?.name || "Desconocida"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Participación</span>
                                            <div className="flex flex-col text-xs font-medium">
                                                <span>Ventas: {agency.shareOnSales}%</span>
                                                <span>Ganancias: {agency.shareOnProfits}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Saldo Actual</span>
                                            <span className={agency.currentBalance > 0 ? "text-green-600 font-bold" : "font-bold"}>
                                                {formatCurrency(agency.currentBalance)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <AgencyDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                comercializadoras={safeComercializadoras}
                agency={editingAgency}
                defaultCommercializerId={defaultCommercializerId}
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

