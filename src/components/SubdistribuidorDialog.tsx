import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "@phosphor-icons/react"
import { Subdistribuidor, User, Comercializadora } from "@/lib/types"
import { toast } from "sonner"
import { useApp } from '@/contexts/AppContext'

interface SubdistribuidorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (subdistribuidor: Omit<Subdistribuidor, 'id' | 'createdAt'> & { parentId?: string; password?: string }) => Promise<boolean>
    subdistribuidor?: Subdistribuidor & { parentId?: string }
    currentUserId?: string
    createUser?: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>
}

export function SubdistribuidorDialog({
    open,
    onOpenChange,
    onSave,
    subdistribuidor,
    currentUserId,
    createUser
}: SubdistribuidorDialogProps) {
    const { comercializadoras, currentUser } = useApp()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [address, setAddress] = useState("")
    const [shareOnSales, setShareOnSales] = useState(0)
    const [shareOnProfits, setShareOnProfits] = useState(0)
    const [isActive, setIsActive] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    
    // Obtener la comercializadora padre y sus límites de porcentaje
    const parentComercializadora = useMemo(() => {
        if (!currentUserId && !subdistribuidor?.parentId) return null
        const parentId = subdistribuidor?.parentId || currentUserId
        return comercializadoras.find(c => c.id === parentId) || null
    }, [currentUserId, subdistribuidor?.parentId, comercializadoras])

    const maxShareOnSales = parentComercializadora?.shareOnSales ?? 100
    const maxShareOnProfits = parentComercializadora?.shareOnProfits ?? 100

    useEffect(() => {
        if (subdistribuidor) {
            setName(subdistribuidor.name)
            setEmail(subdistribuidor.email)
            setAddress(subdistribuidor.address || '')
            setShareOnSales(subdistribuidor.shareOnSales || 0)
            setShareOnProfits(subdistribuidor.shareOnProfits || 0)
            setIsActive(subdistribuidor.isActive)
            setPassword('')
        } else {
            resetForm()
        }
    }, [subdistribuidor, open])

    const resetForm = () => {
        setName('')
        setEmail('')
        setPassword('')
        setAddress('')
        setShareOnSales(0)
        setShareOnProfits(0)
        setIsActive(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('El nombre es requerido')
            return
        }

        if (!email.trim()) {
            toast.error('El email es requerido')
            return
        }

        // Validar contraseña: requerida al crear, opcional al editar
        if (!subdistribuidor && (!password || password.length < 6)) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (subdistribuidor && password && password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        if (shareOnSales < 0) {
            toast.error('El porcentaje de ventas no puede ser negativo')
            return
        }
        
        if (shareOnSales > maxShareOnSales) {
            toast.error(`El porcentaje de ventas no puede superar ${maxShareOnSales}% (límite de la comercializadora)`)
            return
        }

        if (shareOnProfits < 0) {
            toast.error('El porcentaje de participación no puede ser negativo')
            return
        }
        
        if (shareOnProfits > maxShareOnProfits) {
            toast.error(`El porcentaje de participación no puede superar ${maxShareOnProfits}% (límite de la comercializadora)`)
            return
        }

        setIsSaving(true)
        try {
            // Si es un nuevo subdistribuidor, crear el usuario primero
            if (!subdistribuidor && createUser) {
                try {
                    const userCreated = await createUser({
                        name: name.trim(),
                        email: email.trim(),
                        password: password,
                        userType: 'subdistribuidor',
                        roleIds: [],
                        isActive: isActive,
                        createdBy: currentUserId || 'system',
                        parentId: currentUserId, // La comercializadora que lo crea
                        address: address.trim() || undefined,
                        shareOnSales: shareOnSales,
                        shareOnProfits: shareOnProfits
                    })

                    if (!userCreated) {
                        toast.error('No se pudo crear el usuario. Verifica que el email no esté en uso.')
                        setIsSaving(false)
                        return
                    }

                    // El subdistribuidor ya fue creado como usuario
                    toast.success('Subdistribuidor creado exitosamente')
                    resetForm()
                    onOpenChange(false)
                    return
                } catch (error: any) {
                    console.error('Error creando usuario:', error)
                    toast.error(`Error al crear subdistribuidor: ${error.message || 'Error desconocido'}`)
                    setIsSaving(false)
                    return
                }
            }

            // Si estamos editando, usar onSave
            const success = await onSave({
                name: name.trim(),
                email: email.trim(),
                address: address.trim() || undefined,
                shareOnSales,
                shareOnProfits,
                isActive,
                createdBy: currentUserId,
                parentId: subdistribuidor?.parentId || '',
                // Solo incluir password si se proporcionó un valor
                ...(password.trim() ? { password: password.trim() } : {}),
            })

            if (success) {
                resetForm()
                onOpenChange(false)
                toast.success('Subdistribuidor actualizado exitosamente')
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {subdistribuidor ? 'Editar Subdistribuidor' : 'Nuevo Subdistribuidor'}
                    </DialogTitle>
                    <DialogDescription>
                        {subdistribuidor
                            ? 'Actualiza los datos del subdistribuidor'
                            : 'Crea un nuevo subdistribuidor. Se creará un usuario con estos datos para gestionar agencias.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Subdistribuidor Principal"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="subdistribuidor@ejemplo.com"
                            required
                            disabled={!!subdistribuidor}
                        />
                        {!subdistribuidor && (
                            <p className="text-xs text-muted-foreground">
                                Este email se usará para iniciar sesión
                            </p>
                        )}
                    </div>

                    {/* Contraseña: requerida al crear, opcional al editar */}
                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Contraseña {!subdistribuidor && '*'}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={subdistribuidor ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                            required={!subdistribuidor}
                            minLength={6}
                        />
                        {subdistribuidor && (
                            <p className="text-xs text-muted-foreground">
                                Solo se actualizará si ingresas una nueva contraseña
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Dirección del subdistribuidor"
                        />
                    </div>

                    {parentComercializadora && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Los porcentajes no pueden superar los límites de la comercializadora: 
                                <strong> {maxShareOnSales}% en ventas</strong> y 
                                <strong> {maxShareOnProfits}% en participación</strong>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="shareOnSales">Participación en Ventas (%)</Label>
                            <Input
                                id="shareOnSales"
                                type="number"
                                min="0"
                                max={maxShareOnSales}
                                step="0.01"
                                value={shareOnSales}
                                onChange={(e) => setShareOnSales(parseFloat(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                % sobre el total vendido (máximo: {maxShareOnSales}%)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shareOnProfits">Participación (%)</Label>
                            <Input
                                id="shareOnProfits"
                                type="number"
                                min="0"
                                max={maxShareOnProfits}
                                step="0.01"
                                value={shareOnProfits}
                                onChange={(e) => setShareOnProfits(parseFloat(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                % sobre la ganancia neta (máximo: {maxShareOnProfits}%)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="is-active">Estado Activo</Label>
                            <p className="text-sm text-muted-foreground">
                                Solo los subdistribuidores activos pueden operar
                            </p>
                        </div>
                        <Switch
                            id="is-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : subdistribuidor ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}