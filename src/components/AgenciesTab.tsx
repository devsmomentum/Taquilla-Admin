import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from "@/components/ui/badge"
import { Plus, MagnifyingGlass, Pencil, Trash, Building } from '@phosphor-icons/react'
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
}

export function AgenciesTab({ comercializadoras, agencies, isLoading, onCreate, onUpdate, onDelete, canCreate = true, currentUser }: Props) {
    const [search, setSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<Agency | undefined>()

    const defaultCommercializerId = currentUser?.comercializadoraId

    const safeComercializadoras = comercializadoras || []
    const safeAgencies = agencies || []

    const filteredAgencies = safeAgencies.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.address.toLowerCase().includes(search.toLowerCase())
    )


    const handleSave = async (agencyData: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>) => {
        try {
            if (editingAgency) {
                const success = await onUpdate(editingAgency.id, agencyData)
                if (success) toast.success("Agencia actualizada exitosamente")
                else throw new Error("Error al actualizar")
            } else {
                const success = await onCreate(agencyData)
                if (success) toast.success("Agencia creada exitosamente")
                else throw new Error("Error al crear")
            }
            setEditingAgency(undefined)
            return true
        } catch (error) {
            toast.error("Error al guardar la agencia")
            return false
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Está seguro de eliminar esta agencia?")) {
            const success = await onDelete(id)
            if (success) toast.success("Agencia eliminada")
            else toast.error("Error al eliminar agencia")
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
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(agency.id)}>
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
        </div>
    )
}
